import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type ProfileRole = 'admin' | 'user';

type ProfilePayload = {
  full_name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  allowed_tabs?: unknown;
  avatar_url?: unknown;
  foto_perfil?: unknown;
  tema_cor?: unknown;
  modo_exibicao?: unknown;
};

type AdminContext = {
  adminClient: ReturnType<typeof createClient>;
  requester: { id: string; email?: string };
  requesterProfile: { id: string; role: ProfileRole };
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const env = (name: string) => {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get?: (key: string) => string | undefined } } }).Netlify?.env?.get?.(name);
  return netlifyEnv || process.env[name];
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });

const readJson = async <T>(request: Request): Promise<T> => {
  try {
    return await request.json();
  } catch {
    throw new Error('Payload JSON inválido.');
  }
};

const normalizePath = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname
    .replace(/^\/\.netlify\/functions\/admin-profiles/, '')
    .replace(/^\/api\/admin-profiles/, '')
    .replace(/^\/+|\/+$/g, '');
};

const getClients = () => {
  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente Supabase do servidor não configuradas.');
  }

  return {
    publicClient: createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
};

const getBearerToken = (request: Request) => {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

const getAdminContext = async (request: Request): Promise<AdminContext> => {
  const token = getBearerToken(request);
  if (!token) throw Object.assign(new Error('Autenticação obrigatória.'), { status: 401 });

  const { publicClient, adminClient } = getClients();
  const { data: userData, error: userError } = await publicClient.auth.getUser(token);
  if (userError || !userData.user) {
    throw Object.assign(new Error('Sessão inválida ou expirada.'), { status: 401 });
  }

  const { data: requesterProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || requesterProfile?.role !== 'admin') {
    throw Object.assign(new Error('Acesso restrito ao administrador.'), { status: 403 });
  }

  return {
    adminClient,
    requester: { id: userData.user.id, email: userData.user.email || undefined },
    requesterProfile: requesterProfile as { id: string; role: ProfileRole },
  };
};

const assertText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw Object.assign(new Error(`${field} é obrigatório.`), { status: 400 });
  }
  return value.trim();
};

const assertEmail = (value: unknown) => {
  const email = assertText(value, 'E-mail').toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw Object.assign(new Error('E-mail inválido.'), { status: 400 });
  }
  return email;
};

const assertPassword = (value: unknown) => {
  const password = assertText(value, 'Senha');
  if (password.length < 6) {
    throw Object.assign(new Error('A senha deve ter pelo menos 6 caracteres.'), { status: 400 });
  }
  return password;
};

const normalizeAllowedTabs = (value: unknown) => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw Object.assign(new Error('allowed_tabs deve ser uma lista de abas.'), { status: 400 });
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
};

const normalizeRole = (value: unknown): ProfileRole => {
  if (value == null) return 'user';
  if (value !== 'admin' && value !== 'user') {
    throw Object.assign(new Error('Função inválida.'), { status: 400 });
  }
  return value;
};

const listProfiles = async (adminClient: ReturnType<typeof createClient>) => {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, allowed_tabs, avatar_url, foto_perfil, tema_cor, modo_exibicao, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

const hasAdmin = async (adminClient: ReturnType<typeof createClient>) => {
  const { count, error } = await adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');

  if (error) throw error;
  return (count || 0) > 0;
};

const createProfile = async (
  adminClient: ReturnType<typeof createClient>,
  payload: ProfilePayload,
  forcedRole?: ProfileRole
) => {
  const fullName = assertText(payload.full_name, 'Nome completo');
  const email = assertEmail(payload.email);
  const password = assertPassword(payload.password);
  const role = forcedRole || normalizeRole(payload.role);
  const allowedTabs = role === 'admin' ? [] : normalizeAllowedTabs(payload.allowed_tabs);

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) throw createError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Não foi possível criar o usuário.');

  const profile = {
    id: userId,
    email,
    full_name: fullName,
    role,
    allowed_tabs: allowedTabs,
  };

  const { data, error } = await adminClient
    .from('profiles')
    .insert(profile)
    .select('id, email, full_name, role, allowed_tabs, avatar_url, foto_perfil, tema_cor, modo_exibicao, created_at, updated_at')
    .single();

  if (error) {
    await adminClient.auth.admin.deleteUser(userId).catch(() => undefined);
    throw error;
  }

  return data;
};

const updateProfile = async (
  adminClient: ReturnType<typeof createClient>,
  id: string,
  payload: ProfilePayload
) => {
  const updates: Record<string, unknown> = {};

  if (payload.full_name !== undefined) updates.full_name = assertText(payload.full_name, 'Nome completo');
  if (payload.email !== undefined) updates.email = assertEmail(payload.email);
  if (payload.role !== undefined) updates.role = normalizeRole(payload.role);
  if (payload.allowed_tabs !== undefined) updates.allowed_tabs = normalizeAllowedTabs(payload.allowed_tabs);
  if (typeof payload.avatar_url === 'string') updates.avatar_url = payload.avatar_url;
  if (typeof payload.foto_perfil === 'string') updates.foto_perfil = payload.foto_perfil;
  if (typeof payload.tema_cor === 'string') updates.tema_cor = payload.tema_cor;
  if (typeof payload.modo_exibicao === 'string') updates.modo_exibicao = payload.modo_exibicao;

  if (updates.role === 'admin') updates.allowed_tabs = [];
  updates.updated_at = new Date().toISOString();

  if (updates.email) {
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      email: String(updates.email),
      email_confirm: true,
    });
    if (error) throw error;
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, email, full_name, role, allowed_tabs, avatar_url, foto_perfil, tema_cor, modo_exibicao, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
};

const updatePassword = async (
  adminClient: ReturnType<typeof createClient>,
  id: string,
  password: string
) => {
  const { error } = await adminClient.auth.admin.updateUserById(id, { password });
  if (error) throw error;

  const { data, error: profileError } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, allowed_tabs, avatar_url, foto_perfil, tema_cor, modo_exibicao, created_at, updated_at')
    .eq('id', id)
    .single();

  if (profileError) throw profileError;
  return data;
};

const deleteProfile = async (
  adminClient: ReturnType<typeof createClient>,
  id: string,
  requesterId: string
) => {
  if (id === requesterId) {
    throw Object.assign(new Error('Você não pode remover o próprio perfil.'), { status: 400 });
  }

  const { data: target, error: targetError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .single();

  if (targetError) throw targetError;

  if (target?.role === 'admin') {
    const { count, error } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (error) throw error;
    if ((count || 0) <= 1) {
      throw Object.assign(new Error('Não é possível remover o último administrador.'), { status: 400 });
    }
  }

  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) throw error;

  await adminClient.from('profiles').delete().eq('id', id);
};

export default async (request: Request, _context: Context) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    const path = normalizePath(request);
    const segments = path ? path.split('/') : [];
    const { adminClient } = getClients();

    if (request.method === 'GET' && segments[0] === 'has-admin') {
      return json(200, { hasAdmin: await hasAdmin(adminClient) });
    }

    if (request.method === 'POST' && segments[0] === 'bootstrap') {
      if (await hasAdmin(adminClient)) {
        return json(409, { error: 'O administrador inicial já foi configurado.' });
      }
      const profile = await createProfile(adminClient, await readJson<ProfilePayload>(request), 'admin');
      return json(201, { profile });
    }

    const adminContext = await getAdminContext(request);

    if (request.method === 'GET' && segments.length === 0) {
      return json(200, { profiles: await listProfiles(adminContext.adminClient) });
    }

    if (request.method === 'POST' && segments.length === 0) {
      const profile = await createProfile(adminContext.adminClient, await readJson<ProfilePayload>(request));
      return json(201, { profile });
    }

    if (segments.length >= 1) {
      const id = segments[0];

      if (request.method === 'PATCH' && segments.length === 1) {
        const profile = await updateProfile(adminContext.adminClient, id, await readJson<ProfilePayload>(request));
        return json(200, { profile });
      }

      if (request.method === 'POST' && segments[1] === 'password') {
        const body = await readJson<{ password?: unknown }>(request);
        const profile = await updatePassword(adminContext.adminClient, id, assertPassword(body.password));
        return json(200, { profile });
      }

      if (request.method === 'DELETE' && segments.length === 1) {
        await deleteProfile(adminContext.adminClient, id, adminContext.requester.id);
        return json(200, { deleted: true });
      }
    }

    return json(404, { error: 'Rota não encontrada.' });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === 'number'
      ? Number((error as { status: number }).status)
      : 500;
    if (status >= 500) console.error('admin-profiles error', error);
    return json(status, { error: (error as Error).message || 'Erro interno.' });
  }
};

export const config: Config = {
  path: [
    '/api/admin-profiles',
    '/api/admin-profiles/*',
    '/.netlify/functions/admin-profiles',
    '/.netlify/functions/admin-profiles/*',
  ],
};

export const __testables = {
  assertEmail,
  assertPassword,
  normalizeAllowedTabs,
  normalizeRole,
};
