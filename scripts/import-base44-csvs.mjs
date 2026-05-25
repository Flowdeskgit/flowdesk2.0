#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

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

const DEFAULT_CSV_DIR = '/home/ricardo/Downloads';
const DEFAULT_PROFILE_NAME = 'Marcia Cleide Ribeiro ADV';
const DEFAULT_PROFILE_EMAIL = 'dramarcia@dramarcia.adv.br';
const DEFAULT_PROFILE_ROLE = 'admin';
const BASE44_ID_RE = /^[a-f0-9]{24}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOP_LEVEL_FIELDS = new Set(['id', 'user_id', 'created_at', 'created_date', 'updated_at', 'updated_date']);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const toUuid = (bytes) => [
  bytes.toString('hex', 0, 4),
  bytes.toString('hex', 4, 6),
  bytes.toString('hex', 6, 8),
  bytes.toString('hex', 8, 10),
  bytes.toString('hex', 10, 16),
].join('-');

export const uuidFromText = (value) => {
  const hash = crypto.createHash('sha1').update('flowdesk-base44-import:').update(String(value)).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return toUuid(bytes);
};

export const isBase44Id = (value) => typeof value === 'string' && BASE44_ID_RE.test(value.trim());

export const normalizeRecordId = (entityName, rawId, rowIndex = 0, record = {}) => {
  const value = typeof rawId === 'string' ? rawId.trim() : String(rawId || '').trim();
  if (UUID_RE.test(value)) return value;
  if (value) return uuidFromText(value);
  return uuidFromText(`${entityName}:${rowIndex}:${JSON.stringify(record)}`);
};

const isReferenceField = (field) => /(^id$|_id$|_ids$|Id$|Ids$)/.test(field);

export const remapBase44References = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return isBase44Id(trimmed) ? uuidFromText(trimmed) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => remapBase44References(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        isReferenceField(key) ? remapBase44References(item) : item,
      ])
    );
  }

  return value;
};

export const parseCell = (value) => {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
};

const toIsoDate = (value) => {
  const parsed = parseCell(value);
  if (typeof parsed !== 'string') return undefined;
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const buildImportRow = (entityName, record, ownerUserId, rowIndex = 0) => {
  const rawId = record.id;
  const row = {
    id: normalizeRecordId(entityName, rawId, rowIndex, record),
    user_id: ownerUserId,
    data: {},
  };

  const createdAt = toIsoDate(record.created_at || record.created_date);
  const updatedAt = toIsoDate(record.updated_at || record.updated_date);
  if (createdAt) row.created_at = createdAt;
  if (updatedAt) row.updated_at = updatedAt;

  if (rawId) row.data.base44_id = String(rawId).trim();
  row.data.base44_entity = entityName;

  for (const [field, rawValue] of Object.entries(record)) {
    if (TOP_LEVEL_FIELDS.has(field) || field === 'is_sample') continue;
    const parsed = parseCell(rawValue);
    if (parsed === undefined) continue;
    row.data[field] = isReferenceField(field) ? remapBase44References(parsed) : parsed;
  }

  return row;
};

export const readCsvRecords = (filePath) => parse(fs.readFileSync(filePath, 'utf8'), {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
});

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const parseArgs = (argv) => {
  const options = {
    csvDir: DEFAULT_CSV_DIR,
    name: DEFAULT_PROFILE_NAME,
    email: DEFAULT_PROFILE_EMAIL,
    role: DEFAULT_PROFILE_ROLE,
    allowEmpty: false,
    dryRun: false,
    password: undefined,
    envFile: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === '--csv-dir') options.csvDir = next();
    else if (arg === '--name') options.name = next();
    else if (arg === '--email') options.email = next();
    else if (arg === '--role') options.role = next();
    else if (arg === '--password') options.password = next();
    else if (arg === '--env-file') options.envFile = next();
    else if (arg === '--allow-empty') options.allowEmpty = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  return options;
};

const loadEnvFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rawValue = match[2].trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
};

const loadEnvironment = (options) => {
  loadEnvFile(options.envFile);
  loadEnvFile(path.join(PROJECT_ROOT, '.env.local'));
  loadEnvFile(path.join(PROJECT_ROOT, '.env'));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Put them in .env.local or pass --env-file.');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Warning: using a legacy VITE_SUPABASE_SERVICE_ROLE_KEY value. Move it to SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const generatePassword = () => `${crypto.randomBytes(18).toString('base64url')}Aa1!`;

const writeCredentialFile = (profile, password) => {
  if (!password) return undefined;
  const dir = path.join(PROJECT_ROOT, '.local-credentials');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const filePath = path.join(dir, 'marcia-cleide-ribeiro-adv.txt');
  fs.writeFileSync(
    filePath,
    [
      'Flowdesk ADV temporary credential',
      `Created at: ${new Date().toISOString()}`,
      `Name: ${profile.full_name}`,
      `Email: ${profile.email}`,
      `Temporary password: ${password}`,
      '',
      'Store this outside the repository after first login.',
      '',
    ].join('\n'),
    { mode: 0o600 }
  );
  return filePath;
};

const findAuthUserByEmail = async (adminClient, email) => {
  const target = email.toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data?.users?.find((item) => item.email?.toLowerCase() === target);
    if (user) return user;
    if (!data?.users || data.users.length < perPage) break;
  }

  return null;
};

const ensureProfile = async (adminClient, options) => {
  const email = options.email.toLowerCase();
  const role = options.role === 'user' ? 'user' : 'admin';

  const { data: existingProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (profileError) throw profileError;

  if (existingProfile) {
    const { data, error } = await adminClient
      .from('profiles')
      .update({
        full_name: options.name,
        role,
        allowed_tabs: role === 'admin' ? [] : existingProfile.allowed_tabs || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id)
      .select('*')
      .single();
    if (error) throw error;
    return { profile: data, createdAuthUser: false, password: undefined };
  }

  let authUser = await findAuthUserByEmail(adminClient, email);
  let generatedPassword;

  if (!authUser) {
    generatedPassword = options.password || generatePassword();
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: options.name },
    });
    if (error) throw error;
    authUser = data.user;
  }

  if (!authUser?.id) throw new Error('Could not create or find the Supabase auth user.');

  const { data, error } = await adminClient
    .from('profiles')
    .upsert({
      id: authUser.id,
      email,
      full_name: options.name,
      role,
      allowed_tabs: role === 'admin' ? [] : [],
    }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return { profile: data, createdAuthUser: Boolean(generatedPassword), password: generatedPassword };
};

const collectCsvFiles = (csvDir) => {
  const files = [];
  for (const [entityName, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
    const filePath = path.join(csvDir, `${entityName}_export.csv`);
    if (fs.existsSync(filePath)) {
      files.push({ entityName, tableName, filePath });
    }
  }
  return files;
};

const importCsvFile = async (adminClient, ownerUserId, file) => {
  const records = readCsvRecords(file.filePath);
  const rows = records.map((record, index) => buildImportRow(file.entityName, record, ownerUserId, index));

  for (const batch of chunk(rows, 500)) {
    const { error } = await adminClient
      .from(file.tableName)
      .upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`${file.entityName}: ${error.message}`);
  }

  return rows.length;
};

const printHelp = () => {
  console.log(`Usage: node scripts/import-base44-csvs.mjs [options]

Options:
  --csv-dir <path>    Directory containing *_export.csv files. Default: ${DEFAULT_CSV_DIR}
  --name <name>       Profile name. Default: ${DEFAULT_PROFILE_NAME}
  --email <email>     Profile email. Default: ${DEFAULT_PROFILE_EMAIL}
  --role <role>       Profile role: admin or user. Default: ${DEFAULT_PROFILE_ROLE}
  --password <value>  Password for a newly created auth user.
  --env-file <path>   Extra env file to load before .env.local/.env.
  --allow-empty       Do not fail when no CSV export files are found.
  --dry-run           Parse files and show actions without writing to Supabase.
`);
};

export const main = async (argv = process.argv.slice(2)) => {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  const csvDir = path.resolve(options.csvDir);
  const files = collectCsvFiles(csvDir);
  const adminClient = options.dryRun ? undefined : loadEnvironment(options);

  let profile = { id: 'dry-run-user-id', email: options.email.toLowerCase(), full_name: options.name };
  let credentialsFile;

  if (options.dryRun) {
    console.log(`[dry-run] Would ensure profile ${options.name} <${options.email}> as ${options.role}.`);
  } else {
    const result = await ensureProfile(adminClient, options);
    profile = result.profile;
    credentialsFile = writeCredentialFile(result.profile, result.password);
    console.log(`Profile ready: ${profile.full_name} <${profile.email}> (${profile.id})`);
    if (credentialsFile) console.log(`Temporary credential written to ${credentialsFile}`);
  }

  if (files.length === 0) {
    const message = `No *_export.csv files were found in ${csvDir}.`;
    if (options.allowEmpty) {
      console.warn(message);
      return;
    }
    throw new Error(message);
  }

  console.log(`Found ${files.length} export files in ${csvDir}.`);
  let total = 0;

  for (const file of files) {
    if (options.dryRun) {
      const count = readCsvRecords(file.filePath).length;
      total += count;
      console.log(`[dry-run] ${file.entityName}: ${count} rows`);
      continue;
    }

    const count = await importCsvFile(adminClient, profile.id, file);
    total += count;
    console.log(`${file.entityName}: imported ${count} rows into ${file.tableName}`);
  }

  console.log(`Import complete: ${total} rows assigned to ${profile.full_name}.`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
