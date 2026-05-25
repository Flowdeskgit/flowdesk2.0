import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-anon-key';

export const hasSupabaseConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const SUPABASE_CONFIG_ERROR_MESSAGE =
  'Supabase não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local ou no painel da Netlify.';

export const requireSupabaseConfig = () => {
  if (!hasSupabaseConfig) {
    throw new Error(SUPABASE_CONFIG_ERROR_MESSAGE);
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const ENTITY_TABLE_MAP = {
  AcaoCorretiva12Semanas: 'acao_corretiva_12_semanas',
  AdministrativoINSS: 'administrativo_inss',
  Agenda: 'agenda',
  AgendaComercial: 'agenda_comercial',
  AgendamentoAdmINSS: 'agendamento_adm_inss',
  AgendamentoINSS: 'agendamento_inss',
  AgendamentoINSSAdmin: 'agendamento_inss_admin',
  AguardandoDocumento: 'aguardando_documento',
  Alerta: 'alerta',
  AndamentoAdministrativo: 'andamento_administrativo',
  Atendimento: 'atendimento',
  Auditoria: 'auditoria',
  BlocosDeNotasUsuario: 'blocos_de_notas_usuario',
  CentralAdminINSS: 'central_admin_inss',
  Ciclo12Semanas: 'ciclo_12_semanas',
  Cliente: 'cliente',
  ClubeDoLivro: 'clube_do_livro',
  ConclusaoAdmINSS: 'conclusao_adm_inss',
  ConclusaoINSS: 'conclusao_inss',
  ConfiguracaoAgenda: 'configuracao_agenda',
  ConfiguracaoIA: 'configuracao_ia',
  ControleProcessoExecucao: 'controle_processo_execucao',
  CopiasPA: 'copias_pa',
  CredencialINSS: 'credencial_inss',
  DeferidoAdmINSS: 'deferido_adm_inss',
  DeferidoINSS: 'deferido_inss',
  DocumentoGerado: 'documento_gerado',
  DocumentoVinculado: 'documento_vinculado',
  ExigenciaAdmINSS: 'exigencia_adm_inss',
  ExigenciaINSS: 'exigencia_inss',
  Feedback12Semanas: 'feedback_12_semanas',
  FolhaDePonto: 'folha_de_ponto',
  HistoricoAgenda: 'historico_agenda',
  HistoricoAtendimento: 'historico_atendimento',
  IndeferidoAdmINSS: 'indeferido_adm_inss',
  IndeferidoINSS: 'indeferido_inss',
  Indicador12Semanas: 'indicador_12_semanas',
  InstagramCanal: 'instagram_canal',
  LancamentoFinanceiro: 'lancamento_financeiro',
  LandingPage: 'landing_page',
  LeadComercial: 'lead_comercial',
  LeadMarketing: 'lead_marketing',
  LivroVenda: 'livro_venda',
  ManualEscritorio: 'manual_escritorio',
  MentoriaModulo: 'mentoria_modulo',
  MetaCiclo12Semanas: 'meta_ciclo_12_semanas',
  MetaProdutividade: 'meta_produtividade',
  MetodoRESULT: 'metodo_result',
  ModeloDocumento: 'modelo_documento',
  MonitoramentoProcessual: 'monitoramento_processual',
  Notificacao: 'notificacao',
  Pessoa: 'pessoa',
  PostMarketing: 'post_marketing',
  Processo: 'processo',
  ProcessoAdministrativoINSS: 'processo_administrativo_inss',
  ProtocoloAdmINSS: 'protocolo_adm_inss',
  ProtocoloINSS: 'protocolo_inss',
  RetornoCliente: 'retorno_cliente',
  RevisaoEstrategica12Semanas: 'revisao_estrategica_12_semanas',
  Setor: 'setor',
  SnapshotProdutividade: 'snapshot_produtividade',
  SocialSelling: 'social_selling',
  Tarefa: 'tarefa',
  TarefaINSS: 'tarefa_inss',
  TemplateMinuta: 'template_minuta',
};

const TOP_LEVEL_FIELDS = new Set([
  'id',
  'user_id',
  'created_at',
  'created_date',
  'updated_at',
  'updated_date',
]);

const FIELD_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

const normalizeProfile = (profile, authUser) => {
  if (!profile) return null;
  const email = profile.email || authUser?.email || '';
  const avatar = profile.avatar_url || profile.foto_perfil || '';
  return {
    ...profile,
    email,
    avatar_url: avatar,
    foto_perfil: profile.foto_perfil || avatar,
  };
};

const toProfileUpdate = (updates = {}) => {
  const allowed = [
    'full_name',
    'email',
    'role',
    'allowed_tabs',
    'avatar_url',
    'foto_perfil',
    'tema_cor',
    'modo_exibicao',
    'telefone',
    'cargo',
    'senha_fj',
    'last_updated',
  ];
  const payload = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      payload[key] = updates[key];
    }
  }
  if (payload.foto_perfil && !payload.avatar_url) payload.avatar_url = payload.foto_perfil;
  if (payload.avatar_url && !payload.foto_perfil) payload.foto_perfil = payload.avatar_url;
  return payload;
};

export function flattenRow(row) {
  if (!row) return null;
  return {
    ...(row.data || {}),
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    created_date: row.created_at,
    updated_at: row.updated_at,
    updated_date: row.updated_at,
  };
}

export function splitCriteria(criteria = {}) {
  const topLevel = {};
  const data = {};

  for (const [field, value] of Object.entries(criteria || {})) {
    if (value === undefined) continue;
    const resolvedField = FIELD_ALIASES[field] || field;
    if (TOP_LEVEL_FIELDS.has(field) || TOP_LEVEL_FIELDS.has(resolvedField)) {
      topLevel[resolvedField] = value;
    } else {
      data[field] = value;
    }
  }

  return { topLevel, data };
}

export function dataFieldsFromRecord(record = {}) {
  const data = {};
  for (const [field, value] of Object.entries(record || {})) {
    if (!TOP_LEVEL_FIELDS.has(field) && value !== undefined) {
      data[field] = value;
    }
  }
  return data;
}

export function sortRows(rows = [], sort = '-created_date') {
  if (!sort) return [...rows];
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  const resolvedField = FIELD_ALIASES[field] || field;

  return [...rows].sort((a, b) => {
    const aValue = a?.[field] ?? a?.[resolvedField];
    const bValue = b?.[field] ?? b?.[resolvedField];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return descending ? 1 : -1;
    if (bValue == null) return descending ? -1 : 1;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return descending ? bValue - aValue : aValue - bValue;
    }

    const aTime = Date.parse(aValue);
    const bTime = Date.parse(bValue);
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return descending ? bTime - aTime : aTime - bTime;
    }

    return descending
      ? String(bValue).localeCompare(String(aValue), 'pt-BR', { numeric: true })
      : String(aValue).localeCompare(String(bValue), 'pt-BR', { numeric: true });
  });
}

const applyTopLevelCriteria = (query, criteria) => {
  let nextQuery = query;
  for (const [field, value] of Object.entries(criteria)) {
    if (Array.isArray(value)) {
      nextQuery = nextQuery.in(field, value);
    } else {
      nextQuery = nextQuery.eq(field, value);
    }
  }
  return nextQuery;
};

const throwIfSupabaseError = (error) => {
  if (error) throw new Error(error.message || 'Erro ao acessar o banco de dados.');
};

const createEntityClient = (entityName, tableName) => ({
  async list(sort = '-created_date', limit = 1000) {
    requireSupabaseConfig();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 10000)) : 1000;
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(safeLimit);

    throwIfSupabaseError(error);
    return sortRows((data || []).map(flattenRow), sort).slice(0, safeLimit);
  },

  async filter(criteria = {}, sort = '-created_date', limit = 1000) {
    requireSupabaseConfig();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 10000)) : 1000;
    const { topLevel, data: dataCriteria } = splitCriteria(criteria);
    let query = applyTopLevelCriteria(
      supabase.from(tableName).select('*'),
      topLevel
    );

    if (Object.keys(dataCriteria).length > 0) {
      query = query.contains('data', dataCriteria);
    }

    const { data, error } = await query.limit(safeLimit);
    throwIfSupabaseError(error);
    return sortRows((data || []).map(flattenRow), sort).slice(0, safeLimit);
  },

  async get(id) {
    requireSupabaseConfig();
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    throwIfSupabaseError(error);
    return flattenRow(data);
  },

  async create(fields = {}) {
    requireSupabaseConfig();
    const payload = {
      data: dataFieldsFromRecord(fields),
    };
    if (fields.id) payload.id = fields.id;
    if (fields.user_id) payload.user_id = fields.user_id;

    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select('*')
      .single();

    throwIfSupabaseError(error);
    return flattenRow(data);
  },

  async update(id, fields = {}) {
    requireSupabaseConfig();
    const { data: current, error: getError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    throwIfSupabaseError(getError);

    const payload = {
      data: {
        ...(current?.data || {}),
        ...dataFieldsFromRecord(fields),
      },
      updated_at: new Date().toISOString(),
    };
    if (fields.user_id) payload.user_id = fields.user_id;

    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    throwIfSupabaseError(error);
    return flattenRow(data);
  },

  async delete(id) {
    requireSupabaseConfig();
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    throwIfSupabaseError(error);
    return { id, deleted: true, entity: entityName };
  },
});

const withSessionAuth = async (options = {}) => {
  requireSupabaseConfig();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return { ...options, headers };
};

const adminRequest = async (path = '', options = {}) => {
  const response = await fetch(`/api/admin-profiles${path}`, await withSessionAuth(options));
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível concluir a solicitação.');
  }

  return payload;
};

export const profileManager = {
  async hasAdmin() {
    const payload = await adminRequest('/has-admin');
    return payload.hasAdmin === true;
  },

  async bootstrapAdmin(profile) {
    const payload = await adminRequest('/bootstrap', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    return payload.profile;
  },

  async listProfiles() {
    const payload = await adminRequest('');
    return payload.profiles || [];
  },

  async createProfile(profile) {
    const payload = await adminRequest('', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    return payload.profile;
  },

  async updateProfile(id, updates) {
    const payload = await adminRequest(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return payload.profile;
  },

  async updatePassword(id, password) {
    const payload = await adminRequest(`/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return payload.profile;
  },

  async deleteProfile(id) {
    await adminRequest(`/${id}`, { method: 'DELETE' });
    return { id, deleted: true };
  },
};

const entityClients = Object.fromEntries(
  Object.entries(ENTITY_TABLE_MAP).map(([entityName, tableName]) => [
    entityName,
    createEntityClient(entityName, tableName),
  ])
);

entityClients.User = {
  async list() {
    return profileManager.listProfiles();
  },
};

export const flowdesk = {
  entities: entityClients,
  auth: {
    async me() {
      requireSupabaseConfig();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      throwIfSupabaseError(userError);
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      throwIfSupabaseError(error);
      return normalizeProfile(profile, user);
    },

    async signIn(email, password) {
      requireSupabaseConfig();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      throwIfSupabaseError(error);
      return data;
    },

    async signUp(email, password, options) {
      requireSupabaseConfig();
      const { data, error } = await supabase.auth.signUp({ email, password, options });
      throwIfSupabaseError(error);
      return data;
    },

    async updateMe(updates = {}) {
      requireSupabaseConfig();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      throwIfSupabaseError(userError);
      if (!user) throw new Error('Usuário não autenticado.');

      const payload = toProfileUpdate(updates);
      if (Object.keys(payload).length === 0) return flowdesk.auth.me();

      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('*')
        .single();

      throwIfSupabaseError(error);
      return normalizeProfile(profile, user);
    },

    async logout() {
      requireSupabaseConfig();
      const { error } = await supabase.auth.signOut();
      throwIfSupabaseError(error);
    },

    onAuthStateChange(callback) {
      return supabase.auth.onAuthStateChange(callback);
    },

    redirectToLogin() {
      window.location.assign('/');
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        requireSupabaseConfig();
        if (!file) throw new Error('Nenhum arquivo informado.');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        throwIfSupabaseError(userError);
        if (!user) throw new Error('Usuário não autenticado.');

        const safeName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 120);
        const uniquePart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        const path = `${user.id}/${Date.now()}-${uniquePart}-${safeName || 'arquivo'}`;

        const { error } = await supabase.storage
          .from('uploads')
          .upload(path, file, {
            cacheControl: '3600',
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });

        throwIfSupabaseError(error);

        const { data } = supabase.storage.from('uploads').getPublicUrl(path);
        return {
          file_url: data.publicUrl,
          url: data.publicUrl,
          path,
        };
      },

      async SendEmail() {
        return {
          success: false,
          message: 'Envio de e-mail não configurado neste ambiente.',
        };
      },
    },
  },
  appLogs: {
    async logUserInApp() {
      return { ok: true };
    },
  },
};
