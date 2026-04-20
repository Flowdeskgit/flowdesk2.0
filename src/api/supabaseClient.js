import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Public client — used for all normal operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service-role client — used ONLY by admin for user management (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Entity name → table name ──────────────────────────────────────────────

const ENTITY_TABLE_MAP = {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function flattenRow(row) {
  if (!row) return null;
  const { id, created_at, updated_at, user_id, data } = row;
  return { id, created_date: created_at, created_at, updated_at, user_id, ...data };
}

function resolveSort(sort) {
  if (!sort) return { column: 'created_at', ascending: false, isDataField: false };
  const ascending = !sort.startsWith('-');
  const field = sort.replace(/^-/, '');
  if (field === 'created_date') return { column: 'created_at', ascending, isDataField: false };
  if (field === 'updated_date') return { column: 'updated_at', ascending, isDataField: false };
  return { column: field, ascending, isDataField: true };
}

function throwOnError({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Entity client factory ─────────────────────────────────────────────────

function createEntityClient(entityName) {
  const tableName = ENTITY_TABLE_MAP[entityName];
  if (!tableName) throw new Error(`Unknown entity: ${entityName}`);

  return {
    async list(sort = '-created_date', limit = 1000) {
      const { column, ascending, isDataField } = resolveSort(sort);
      let query = supabase.from(tableName).select('*');
      if (!isDataField) {
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      if (limit) query = query.limit(limit);
      const rows = throwOnError(await query);
      return (rows || []).map(flattenRow);
    },

    async filter(criteria = {}, sort = '-created_date', limit = 1000) {
      let query = supabase.from(tableName).select('*');
      if (Object.keys(criteria).length > 0) {
        query = query.contains('data', criteria);
      }
      const { column, ascending, isDataField } = resolveSort(sort);
      if (!isDataField) {
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      if (limit) query = query.limit(limit);
      const rows = throwOnError(await query);
      return (rows || []).map(flattenRow);
    },

    async get(id) {
      const row = throwOnError(
        await supabase.from(tableName).select('*').eq('id', id).single()
      );
      return flattenRow(row);
    },

    async create(fields) {
      const user_id = await getCurrentUserId();
      const { id, created_at, created_date, updated_at, user_id: _uid, ...dataFields } = fields;
      const rows = throwOnError(
        await supabase.from(tableName).insert({ data: dataFields, user_id }).select()
      );
      return flattenRow(rows?.[0]);
    },

    async update(id, fields) {
      const { id: _id, created_at, created_date, updated_at, user_id: _uid, ...dataFields } = fields;
      const rows = throwOnError(
        await supabase
          .from(tableName)
          .update({ data: dataFields, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
      );
      return flattenRow(rows?.[0]);
    },

    async delete(id) {
      throwOnError(await supabase.from(tableName).delete().eq('id', id));
    },
  };
}

const entitiesProxy = new Proxy({}, {
  get(_, entityName) {
    return createEntityClient(entityName);
  },
});

// ─── Auth ─────────────────────────────────────────────────────────────────

const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return profile ? { ...profile, email: user.email } : null;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  redirectToLogin() {
    // handled in-app by AuthContext
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ─── App logs (no-op) ─────────────────────────────────────────────────────

const appLogs = {
  logUserInApp: () => Promise.resolve(),
};

// ─── Integrations ─────────────────────────────────────────────────────────

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const { data: { user } } = await supabase.auth.getUser();
      const folder = user?.id ?? 'public';
      const ext = file.name.split('.').pop();
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      return { file_url: data.publicUrl };
    },

    async SendEmail(params) {
      console.warn('SendEmail: no email provider configured.', params);
      return { success: false };
    },
  },
};

// ─── Profile management (admin only, uses service role) ───────────────────

export const profileManager = {
  async listProfiles() {
    // Use service-role client so password_display is readable without RLS interference
    const { data, error } = await supabaseAdmin.from('profiles').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createProfile({ full_name, email, password, role = 'user', allowed_tabs = [] }) {
    // Create auth user via service-role client (auto-confirms email, bypasses RLS)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw new Error(authError.message);

    const userId = authData.user.id;

    // Insert profile record — store password_display so admin can see it later
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, full_name, email, role, allowed_tabs, password_display: password })
      .select()
      .single();
    if (profileError) throw new Error(profileError.message);

    return profile;
  },

  async updateProfile(id, updates) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updatePassword(id, newPassword) {
    // Update the auth password via service-role
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });
    if (authError) throw new Error(authError.message);

    // Keep password_display in sync
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ password_display: newPassword, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (profileError) throw new Error(profileError.message);
  },

  async deleteProfile(id) {
    // Delete auth user via service-role (cascades to profile row)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  },
};

// ─── Exported shim ────────────────────────────────────────────────────────

export const base44 = {
  entities: entitiesProxy,
  auth,
  appLogs,
  integrations,
};
