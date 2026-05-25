import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { motion } from 'framer-motion';
import {
  Archive, BarChart3, Brain, CheckCircle, ChevronDown, ChevronRight, Edit, Filter,
  MapPin, MessageCircle, Mic, Paperclip, Phone, Plus, Search, Send, Square, Tag,
  Target, Trash2, User, UserCheck, Users, X, XCircle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const N8N_INBOX_ROUTER_URL = 'https://marciaribeiro.app.n8n.cloud/webhook/b0a4f477-8577-40ef-81f1-99864449951f';
const INBOX_COMPAT_URL =
  import.meta?.env?.VITE_INBOX_COMPAT_URL ||
  import.meta?.env?.VITE_APPS_SCRIPT_INBOX_LIST_URL ||
  'https://qckcfxhnctyecexivbbi.functions.supabase.co/inbox-compat';
const SUPABASE_PROJECT_URL = 'https://qckcfxhnctyecexivbbi.supabase.co';

const ETAPAS_KANBAN = [
  { id: 'Novo', label: 'Novo Lead', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { id: 'Em Contato', label: 'Primeiro Contato', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-amber-100 border-amber-300 text-amber-800' },
  { id: 'Convertido', label: 'Convertido', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  { id: 'Fechado', label: 'Fechado', color: 'bg-teal-100 border-teal-300 text-teal-800' },
  { id: 'Perdido', label: 'Perdido', color: 'bg-red-100 border-red-300 text-red-800' },
  { id: 'Desqualificado', label: 'Desqualificado', color: 'bg-slate-100 border-slate-300 text-slate-600' },
];

const ETAPA_DOT_COLORS = {
  Novo: 'bg-blue-500',
  'Em Contato': 'bg-purple-500',
  Qualificado: 'bg-amber-500',
  Convertido: 'bg-emerald-500',
  Fechado: 'bg-teal-500',
  Perdido: 'bg-red-500',
  Desqualificado: 'bg-slate-400',
};

const STATUS_OPTS = ['Novo', 'Em Contato', 'Qualificado', 'Convertido', 'Fechado', 'Perdido', 'Desqualificado'];
const ORIGEM_OPTS = ['Previdenciária', 'Trabalhista', 'Mentoria', 'WhatsApp', 'Outro'];
const KHELP_DEFAULT_TAGS = [
  'AGENDADO PESSOALMENTE', 'AGENDAR ONLINE', 'DESQUALIFICADO', 'EM QUALIFICAÇÃO',
  'FALTA DOCUMENTOS', 'FOLLOW UP', 'JÁ TEM PROCESSO', 'NOVO CLIENTE',
  'PREVIDENCIÁRIO', 'QUALIFICADO', 'URGENTE'
];

function buildN8nUrl(path) {
  const clean = String(path || '').startsWith('/') ? String(path) : `/${path}`;
  return `${N8N_INBOX_ROUTER_URL}?path=${encodeURIComponent(clean)}`;
}

function toMillis(value) {
  if (!value) return 0;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

function toBool(value) {
  if (value === true || value === 1) return true;
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'sim';
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function mapSenderToFrom(senderRaw) {
  const sender = String(senderRaw || '').trim().toLowerCase();
  if (sender === 'client' || sender === 'ai' || sender === 'human') return sender;
  if (sender.includes('client') || sender.includes('user') || sender.includes('inbound')) return 'client';
  if (sender.includes('ai') || sender.includes('assistant') || sender.includes('bot')) return 'ai';
  if (sender.includes('human') || sender.includes('agent') || sender.includes('closer')) return 'human';
  return 'client';
}

function normalizeAttachmentUrl(value) {
  let url = String(value || '').trim().replace(/&amp;/g, '&');
  if (!url) return '';
  for (let i = 0; i < 2; i += 1) {
    if (!/%(?:3A|2F|3F|3D|26)/i.test(url)) break;
    try { url = decodeURIComponent(url); } catch { break; }
  }
  if (url.startsWith('?')) return `${INBOX_COMPAT_URL}${url}`;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;
  if (url.startsWith('/storage/')) return `${SUPABASE_PROJECT_URL}${url}`;
  if (url.startsWith('storage/')) return `${SUPABASE_PROJECT_URL}/${url}`;
  return url;
}

function proxyAttachmentUrl(att, download = false) {
  const storagePath = String(att?.storagePath ?? att?.storage_path ?? att?.path ?? '').trim();
  if (!storagePath) return '';
  const bucket = String(att?.bucket || 'flowdesk-media').trim();
  const name = String(att?.name || att?.fileName || att?.filename || (att?.type === 'image' ? 'imagem-recebida.jpg' : 'arquivo-recebido')).trim();
  const params = new URLSearchParams({ action: 'file', bucket, path: storagePath, name, download: download ? '1' : '0' });
  return `${INBOX_COMPAT_URL}?${params.toString()}`;
}

function resolveAttachmentUrl(att, { download = false } = {}) {
  if (!att) return '';
  const proxied = proxyAttachmentUrl(att, download);
  if (proxied) return proxied;
  const raw = download
    ? (att.downloadUrl ?? att.download_url ?? att.openUrl ?? att.open_url ?? att.signedUrl ?? att.signed_url ?? att.url)
    : (att.openUrl ?? att.open_url ?? att.downloadUrl ?? att.download_url ?? att.signedUrl ?? att.signed_url ?? att.url);
  return normalizeAttachmentUrl(raw);
}

function attachmentFileName(att) {
  const explicit = String(att?.name || att?.fileName || att?.filename || att?.title || '').trim();
  if (explicit) return explicit;
  if (att?.type === 'image') return 'imagem-recebida.jpg';
  if (att?.type === 'audio') return 'audio-recebido.ogg';
  if (att?.type === 'video') return 'video-recebido.mp4';
  return 'arquivo-recebido';
}

function guessAttachmentType({ explicitType, mimeType, url }) {
  const type = String(explicitType || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  const lowerUrl = String(url || '').toLowerCase();
  if (type.includes('image') || mime.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?|$)/.test(lowerUrl)) return 'image';
  if (type.includes('audio') || mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(lowerUrl)) return 'audio';
  if (type.includes('video') || mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)(\?|$)/.test(lowerUrl)) return 'video';
  if (type.includes('pdf') || mime.includes('pdf') || /\.pdf(\?|$)/.test(lowerUrl)) return 'file';
  return 'file';
}

function normalizeAttachmentCandidate(candidate, idx = 0) {
  if (!candidate) return null;
  if (typeof candidate === 'string') {
    const url = normalizeAttachmentUrl(candidate);
    if (!url) return null;
    return { id: `att-${idx}-${url.slice(0, 24)}`, type: guessAttachmentType({ url }), url, openUrl: url, downloadUrl: url, name: '', mimeType: '', caption: '' };
  }
  if (typeof candidate !== 'object') return null;
  const storagePath = String(candidate.storagePath ?? candidate.storage_path ?? candidate.path ?? '').trim();
  const rawUrl = candidate.openUrl ?? candidate.open_url ?? candidate.downloadUrl ?? candidate.download_url ?? candidate.signedUrl ?? candidate.signed_url ?? candidate.url ?? candidate.mediaUrl ?? candidate.media_url ?? candidate.link ?? candidate.href ?? candidate.src ?? '';
  const url = storagePath ? proxyAttachmentUrl(candidate, false) : normalizeAttachmentUrl(rawUrl);
  if (!url) return null;
  const mimeType = String(candidate.mimeType ?? candidate.mimetype ?? candidate.contentType ?? candidate.mediaMimeType ?? '').trim();
  const explicitType = String(candidate.type ?? candidate.mediaType ?? candidate.kind ?? '').trim();
  return {
    id: String(candidate.id ?? `att-${idx}-${url.slice(0, 24)}`),
    type: guessAttachmentType({ explicitType, mimeType, url }),
    url,
    openUrl: storagePath ? proxyAttachmentUrl(candidate, false) : normalizeAttachmentUrl(candidate.openUrl ?? candidate.open_url ?? rawUrl),
    downloadUrl: storagePath ? proxyAttachmentUrl(candidate, true) : normalizeAttachmentUrl(candidate.downloadUrl ?? candidate.download_url ?? rawUrl),
    storagePath,
    bucket: String(candidate.bucket || 'flowdesk-media').trim(),
    name: String(candidate.fileName ?? candidate.filename ?? candidate.name ?? candidate.title ?? '').trim(),
    mimeType,
    caption: String(candidate.caption ?? '').trim(),
  };
}

function extractMessageAttachments(message) {
  if (!message || typeof message !== 'object') return [];
  const collected = [];
  const pushCandidate = (candidate) => {
    const normalized = normalizeAttachmentCandidate(candidate, collected.length);
    if (normalized?.url) collected.push(normalized);
  };
  if (Array.isArray(message.media)) message.media.forEach(pushCandidate);
  else if (message.media) pushCandidate(message.media);
  if (Array.isArray(message.attachments)) message.attachments.forEach(pushCandidate);
  else if (message.attachments) pushCandidate(message.attachments);
  const singleUrl = message.mediaUrl ?? message.media_url ?? message.fileUrl ?? message.file_url ?? message.documentUrl ?? message.document_url ?? message.imageUrl ?? message.image_url ?? message.audioUrl ?? message.audio_url ?? message.videoUrl ?? message.video_url;
  if (singleUrl) {
    pushCandidate({
      url: singleUrl,
      type: message.mediaType ?? message.media_type,
      mimeType: message.mediaMimeType ?? message.media_mime_type ?? message.mimeType ?? message.mime_type,
      fileName: message.fileName ?? message.filename ?? message.file_name ?? message.documentName,
      caption: message.caption,
    });
  }
  const seen = new Set();
  return collected.filter((att) => {
    const key = `${att.type}|${att.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildMessagePreview(message) {
  if (!message) return '';
  if (message.text) return message.text;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  if (!attachments.length) return '';
  const first = attachments[0];
  if (first?.caption) return first.caption;
  if (first?.type === 'image') return '[Imagem]';
  if (first?.type === 'audio') return '[Audio]';
  if (first?.type === 'video') return '[Video]';
  if (String(first?.mimeType || '').includes('pdf')) return '[PDF]';
  return attachments.length > 1 ? `[Arquivos (${attachments.length})]` : '[Arquivo]';
}

function buildMessageSignature(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '0';
  const last = messages[messages.length - 1];
  return `${messages.length}|${last?.id || ''}|${last?.ts || ''}|${last?.text || ''}|${last?.attachments?.length || 0}`;
}

function buildMessageDedupKey(message) {
  const id = String(message?.id || '').trim();
  if (id) return `id:${id}`;
  const att = Array.isArray(message?.attachments) ? message.attachments.map((a) => `${a.type}:${a.storagePath || a.url}`).join('|') : '';
  return `fallback:${message?.ts || ''}|${message?.from || ''}|${message?.text || ''}|${att}`;
}

function mergeMessages(previousMessages = [], incomingMessages = []) {
  const map = new Map();
  [...previousMessages, ...incomingMessages].forEach((m) => {
    const key = buildMessageDedupKey(m);
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, ...m, attachments: m.attachments?.length ? m.attachments : prev.attachments || [] } : m);
  });
  return Array.from(map.values()).sort((a, b) => toMillis(a.ts) - toMillis(b.ts));
}

function cleanPersonName(value) {
  const name = String(value || '')
    .replace(/[0-9@#$%^*_+=<>[\]{}|\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"`()]+$/g, '')
    .trim();
  if (name.length < 2 || name.length > 80) return '';
  const lower = name.toLowerCase();
  const blocked = ['bom dia', 'boa tarde', 'boa noite', 'sim', 'não', 'nao', 'olá', 'ola', 'oi', 'quero', 'preciso', 'aposentadoria', 'trabalhista', 'benefício', 'beneficio'];
  if (blocked.includes(lower)) return '';
  return name.split(' ').slice(0, 5).join(' ');
}

function extractNameFromText(text) {
  const source = String(text || '').replace(/\n/g, ' ').trim();
  if (!source) return '';
  const patterns = [
    /\bmeu nome completo\s+(?:é|e|eh)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i,
    /\bmeu nome\s+(?:é|e|eh)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i,
    /\bme chamo\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i,
    /\beu sou\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i,
    /\bsou\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i,
    /\baqui\s+(?:é|e|eh)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const candidate = cleanPersonName(match?.[1]);
    if (candidate) return candidate;
  }
  return '';
}

function extractNameFromQualification(data) {
  if (!data || typeof data !== 'object') return '';
  const candidates = [
    data.name, data.nome, data.client_name, data.clientName,
    data?.lead?.name, data?.lead?.nome,
    data?.client?.name, data?.client?.nome,
    data?.collected_fields?.name, data?.collected_fields?.nome,
    data?.collectedFields?.name, data?.collectedFields?.nome,
  ];
  for (const candidate of candidates) {
    const name = cleanPersonName(candidate);
    if (name) return name;
  }
  return '';
}

function isPlaceholderName(name) {
  const value = String(name || '').trim().toLowerCase();
  return !value || value.startsWith('conv.') || value.startsWith('whatsapp') || value === 'sem nome';
}

function isThreadNearBottom(element, threshold = 120) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

function pickAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function normalizeWhatsAppAudioMimeType(mimeType, fileName = '') {
  const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const name = String(fileName || '').toLowerCase();

  if (mime === 'audio/ogg' || name.endsWith('.ogg') || name.endsWith('.opus')) return 'audio/ogg';
  if (mime === 'audio/mp4' || mime === 'audio/m4a' || mime === 'audio/x-m4a' || name.endsWith('.m4a') || name.endsWith('.mp4')) return 'audio/mp4';
  if (mime === 'audio/mpeg' || mime === 'audio/mp3' || name.endsWith('.mp3')) return 'audio/mpeg';
  if (mime === 'audio/aac' || name.endsWith('.aac')) return 'audio/aac';
  if (mime === 'audio/amr' || name.endsWith('.amr')) return 'audio/amr';

  return mime;
}

function isWhatsAppNativeAudioMime(mimeType, fileName = '') {
  const mime = normalizeWhatsAppAudioMimeType(mimeType, fileName);
  return ['audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/amr'].includes(mime);
}

function audioMimeFromFile(file) {
  const explicit = String(file?.type || '').toLowerCase();
  if (explicit) return explicit;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.aac')) return 'audio/aac';
  if (name.endsWith('.m4a') || name.endsWith('.mp4')) return 'audio/mp4';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.amr')) return 'audio/amr';
  if (name.endsWith('.ogg') || name.endsWith('.opus')) return 'audio/ogg';
  return 'application/octet-stream';
}

function audioExtension(mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler o áudio gravado.'));
    reader.readAsDataURL(blob);
  });
}

function origemBadgeClass(origem) {
  const o = String(origem || '').toLowerCase();
  if (o.includes('prev')) return 'bg-emerald-600 text-white';
  if (o.includes('trab')) return 'bg-indigo-600 text-white';
  if (o.includes('ment')) return 'bg-purple-600 text-white';
  return 'bg-slate-500 text-white';
}

function Avatar({ name, phone, size = 'md' }) {
  const initials = name ? name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() : (phone ? phone.slice(-2) : '?');
  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500', 'bg-rose-500', 'bg-sky-500'];
  const idx = (name || phone || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const sz = size === 'lg' ? 'h-12 w-12 text-base' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-sm';
  return <div className={`${sz} ${colors[idx]} rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none`}>{initials}</div>;
}

function CrmStatusBadge({ status }) {
  const map = {
    Novo: 'bg-blue-100 text-blue-700 border-blue-200',
    'Em Contato': 'bg-purple-100 text-purple-700 border-purple-200',
    Qualificado: 'bg-amber-100 text-amber-700 border-amber-200',
    Convertido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Fechado: 'bg-teal-100 text-teal-700 border-teal-200',
    Perdido: 'bg-red-100 text-red-700 border-red-200',
    Desqualificado: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status] || map.Novo}`}>{status || 'Novo'}</span>;
}

function TagsEditor({ tags = [], onUpdateTags, allExistingTags = [], origemTag = '' }) {
  const [searchText, setSearchText] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const globalTagPool = useMemo(() => Array.from(new Set([...KHELP_DEFAULT_TAGS, ...allExistingTags])).sort(), [allExistingTags]);
  const filteredSuggestions = useMemo(() => {
    const q = searchText.trim().toUpperCase();
    return globalTagPool.filter((t) => !tags.includes(t) && (!q || t.toUpperCase().includes(q)));
  }, [globalTagPool, tags, searchText]);

  const addTag = (tagName) => {
    const val = tagName.trim().toUpperCase();
    if (val && !tags.includes(val)) onUpdateTags([...tags, val]);
    setSearchText('');
    setDropdownOpen(false);
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {origemTag && <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${origemBadgeClass(origemTag)}`}>{origemTag}</span>}
        {tags.length === 0 && !origemTag && <span className="text-xs text-slate-400">Nenhuma tag</span>}
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-700 text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {t}
            <button onClick={() => onUpdateTags(tags.filter((tag) => tag !== t))} className="rounded-full hover:bg-slate-500 p-0.5"><X className="h-2.5 w-2.5" /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-100">
          <Tag className="h-3 w-3 text-slate-400 shrink-0" />
          <input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' && searchText.trim()) { e.preventDefault(); addTag(searchText); } }}
            placeholder="Adicionar tag..."
            className="flex-1 text-xs outline-none bg-transparent placeholder:text-slate-400 text-slate-700"
          />
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="text-slate-400 hover:text-slate-600"><ChevronDown className="h-3 w-3" /></button>
        </div>
        {dropdownOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl" onMouseDown={(e) => e.preventDefault()}>
            {filteredSuggestions.length === 0 && searchText.trim() && (
              <button onClick={() => addTag(searchText)} className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 font-medium">+ Criar tag "{searchText.trim().toUpperCase()}"</button>
            )}
            {filteredSuggestions.map((tag) => (
              <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 uppercase tracking-wide border-b border-slate-50 last:border-0 font-medium">{tag}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WhatsAppInbox({ leads, onUpdateLead, onCreateLead, onNeedsHumanCount }) {
  const [filter, setFilter] = useState('needs_human');
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrigem, setFilterOrigem] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [archivedPhones, setArchivedPhones] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wpp_archived_phones') || '[]'); } catch { return []; }
  });
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(40);
  const [profileOpen, setProfileOpen] = useState(false);
  const [attachmentErrors, setAttachmentErrors] = useState({});
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [audioDraft, setAudioDraft] = useState(null);

  const pollRef = useRef(null);
  const selectedPhoneRef = useRef('');
  const conversationsRef = useRef([]);
  const messageCacheRef = useRef(new Map());
  const nameSyncRef = useRef(new Set());
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioFileInputRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);
  const messagesContainerRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);
  const userPinnedToBottomRef = useRef(true);
  const isComposingRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const prependAdjustRef = useRef(null);

  const INITIAL_VISIBLE_MESSAGES = 40;
  const MESSAGE_PAGE_SIZE = 30;
  const closerId = 'closer1';

  const allExistingTags = useMemo(() => {
    const s = new Set();
    (leads || []).forEach((l) => { if (Array.isArray(l.tags)) l.tags.forEach((t) => s.add(t)); });
    return Array.from(s);
  }, [leads]);

  useEffect(() => { selectedPhoneRef.current = selectedPhone; }, [selectedPhone]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => {
    if (audioDraft?.url) URL.revokeObjectURL(audioDraft.url);
  }, [audioDraft?.url]);

  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const rawText = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${rawText || res.statusText}`);
    try { return rawText ? JSON.parse(rawText) : null; } catch { throw new Error(`Invalid JSON from endpoint: ${rawText.slice(0, 200)}`); }
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  }

  function stopAudioTracks() {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  }

  async function startRecording() {
    if (!selected?.phone || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este navegador não permite gravar áudio direto pelo painel.');
      return;
    }
    try {
      setError('');
      if (audioDraft?.url) URL.revokeObjectURL(audioDraft.url);
      setAudioDraft(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecordingMs(0);
      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('A gravação falhou. Tente novamente.');
        setRecording(false);
        clearRecordingTimer();
        stopAudioTracks();
      };
      recorder.onstop = () => {
        clearRecordingTimer();
        stopAudioTracks();
        const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current);
        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType });
        audioChunksRef.current = [];
        setRecording(false);
        setRecordingMs(durationMs);
        if (!blob.size) {
          setError('Não consegui capturar áudio. Confira o microfone e tente de novo.');
          return;
        }
        const ext = audioExtension(finalMimeType);
        setAudioDraft({
          blob,
          url: URL.createObjectURL(blob),
          mimeType: finalMimeType,
          durationMs,
          name: `audio-flowdesk-${Date.now()}.${ext}`,
          size: blob.size,
        });
      };
      recorder.start(250);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingMs(Date.now() - recordingStartedAtRef.current);
      }, 250);
    } catch (e) {
      setRecording(false);
      clearRecordingTimer();
      stopAudioTracks();
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setError('Permissão do microfone negada. Libere o microfone no navegador para enviar áudio.');
      } else {
        setError(e?.message || 'Não foi possível iniciar a gravação.');
      }
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }

  function discardAudioDraft() {
    if (audioDraft?.url) URL.revokeObjectURL(audioDraft.url);
    setAudioDraft(null);
    setRecordingMs(0);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
  }

  function chooseAudioFile() {
    if (!selected?.phone || sending || recording) return;
    audioFileInputRef.current?.click();
  }

  function handleAudioFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const mimeType = normalizeWhatsAppAudioMimeType(audioMimeFromFile(file), file.name);
    if (!String(mimeType).startsWith('audio/') || !isWhatsAppNativeAudioMime(mimeType, file.name)) {
      setError('WhatsApp aceita áudio em AAC, M4A/MP4, MP3, AMR ou OGG/Opus. Escolha um arquivo nesse formato.');
      event.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('O áudio precisa ter menos de 16 MB para o WhatsApp.');
      event.target.value = '';
      return;
    }
    if (audioDraft?.url) URL.revokeObjectURL(audioDraft.url);
    setError('');
    setAudioDraft({
      blob: file,
      url: URL.createObjectURL(file),
      mimeType,
      durationMs: 0,
      name: file.name || `audio-flowdesk-${Date.now()}.${audioExtension(mimeType)}`,
      size: file.size,
      fromFile: true,
    });
  }

  function normalizeInboxResponse(raw, leadsList) {
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.conversations) ? raw.conversations : Array.isArray(raw?.data) ? raw.data : [];
    const byPhone = new Map();
    items.forEach((item) => {
      const c = item?.json ? item.json : item;
      const phone = String(c?.phone ?? c?.waId ?? c?.wa_id ?? c?.number ?? c?.numero ?? c?.phoneNumber ?? '').trim();
      if (!phone) return;
      const phoneDigits = digits(phone);
      const mappedLead = (leadsList || []).find((l) => digits(l.contato) === phoneDigits);
      const sourceMessages = Array.isArray(c?.lastMessages) ? c.lastMessages : Array.isArray(c?.last_messages) ? c.last_messages : Array.isArray(c?.messages) ? c.messages : Array.isArray(c?.lastMessage) ? c.lastMessage : [];
      const messages = sourceMessages.map((m) => {
        const rawMessage = m?.json ? m.json : m;
        const text = String(rawMessage?.text ?? rawMessage?.message ?? rawMessage?.body ?? rawMessage?.content ?? '');
        const ts = String(rawMessage?.timestamp ?? rawMessage?.ts ?? rawMessage?.date ?? rawMessage?.Date ?? rawMessage?.createdAt ?? '');
        const from = mapSenderToFrom(rawMessage?.sender ?? rawMessage?.from ?? rawMessage?.direction ?? rawMessage?.role ?? '');
        const attachments = extractMessageAttachments(rawMessage);
        const id = String(rawMessage?.id ?? rawMessage?.messageId ?? rawMessage?.message_id ?? `${phone}-${ts || 'no-ts'}-${from}-${text.slice(0, 32)}`);
        return { id, from, ts, text, attachments };
      }).sort((a, b) => toMillis(a.ts) - toMillis(b.ts));

      const qualificationData = c?.qualificationData ?? c?.qualification_data ?? {};
      const explicitName = cleanPersonName(c?.name ?? c?.clientName ?? c?.client_name ?? c?.nome ?? c?.profileName ?? c?.profile_name ?? c?.contactName ?? c?.contact_name);
      const qualificationName = extractNameFromQualification(qualificationData);
      const messageName = messages.filter((m) => m.from === 'client').map((m) => extractNameFromText(m.text)).find(Boolean) || '';
      const detectedName = [qualificationName, messageName, explicitName].filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
      const displayName = detectedName || mappedLead?.nome || '';
      const existing = byPhone.get(phone);
      const mergedMessages = existing ? mergeMessages(existing.messages, messages) : messages;
      const last = mergedMessages.length ? mergedMessages[mergedMessages.length - 1] : null;
      const incomingLastAt = String(c?.lastMessageAt ?? c?.updatedAt ?? c?.last_message_at ?? '');
      const lastMessageAt = incomingLastAt || last?.ts || existing?.lastMessageAt || '';
      const rawOrigem = String(c?.origem || '').trim();
      const origem = mappedLead?.origem || (rawOrigem.toLowerCase().includes('prev') ? 'Previdenciária' : rawOrigem.toLowerCase().includes('trab') ? 'Trabalhista' : rawOrigem.toLowerCase().includes('ment') ? 'Mentoria' : rawOrigem || 'WhatsApp');
      const paused = toBool(c?.paused ?? c?.['paused '] ?? c?.phoneStatus ?? false);
      const statusRaw = String(c?.status ?? c?.['status '] ?? '').trim().toUpperCase();
      byPhone.set(phone, {
        phone,
        name: displayName || existing?.name || '',
        inferredName: detectedName && detectedName !== explicitName ? detectedName : '',
        paused,
        rawStatus: statusRaw || existing?.rawStatus || '',
        lastMessageAt,
        lastMessagePreview: String(c?.lastMessagePreview ?? c?.last_message_preview ?? '') || buildMessagePreview(last),
        messages: mergedMessages,
        lead: mappedLead || null,
        crmStatus: c?.crmStatus || c?.crmstatus || mappedLead?.status || 'Novo',
        crmOrigem: origem,
        crmTags: Array.isArray(c?.tags) && c.tags.length > 0 ? c.tags : (mappedLead?.tags || []),
        resumoCliente: c?.resumo_cliente || c?.resumoCliente || c?.resumo || '',
        qualificationSummary: c?.qualification_summary || c?.qualificationSummary || mappedLead?.qualification_summary || '',
        interventionPriority: c?.intervention_priority || c?.interventionPriority || '',
        interventionSummary: c?.intervention_summary || c?.interventionSummary || '',
        needsHuman: paused || statusRaw === 'HUMAN' || toBool(c?.needs_human ?? c?.needsHuman),
      });
    });
    return Array.from(byPhone.values());
  }

  async function persistConversationName(phone, name) {
    const cleaned = cleanPersonName(name);
    if (!cleaned) return;
    const key = `${digits(phone)}:${cleaned.toLowerCase()}`;
    if (nameSyncRef.current.has(key)) return;
    nameSyncRef.current.add(key);
    await postJson(INBOX_COMPAT_URL, { action: 'update_lead', phone, name: cleaned });
  }

  function syncDetectedNames(convs) {
    convs.forEach((c) => {
      const candidate = cleanPersonName(c.name || c.inferredName);
      if (!candidate) return;
      if (c.inferredName || isPlaceholderName(c.name)) persistConversationName(c.phone, candidate).catch(() => {});
      if (c.lead?.id && onUpdateLead && isPlaceholderName(c.lead.nome)) onUpdateLead(c.lead.id, { nome: candidate });
    });
  }

  async function refreshInbox({ initial = false } = {}) {
    try {
      if (initial) setLoading(true);
      setError('');
      const currentSelectedPhone = selectedPhoneRef.current;
      const previousConversations = conversationsRef.current;
      const stickToBottom = userPinnedToBottomRef.current;
      const previousSelected = previousConversations.find((c) => c.phone === currentSelectedPhone) || null;
      const previousSignature = buildMessageSignature(previousSelected?.messages);
      const raw = await postJson(INBOX_COMPAT_URL, { limit: 50, filter, closerId });
      const serverConvs = normalizeInboxResponse(raw, leads);
      const convs = serverConvs.map((c) => {
        const cachedMessages = messageCacheRef.current.get(c.phone) || [];
        const mergedMessages = mergeMessages(cachedMessages, c.messages);
        messageCacheRef.current.set(c.phone, mergedMessages);
        const last = mergedMessages.length ? mergedMessages[mergedMessages.length - 1] : null;
        return { ...c, messages: mergedMessages, lastMessageAt: c.lastMessageAt || last?.ts || '', lastMessagePreview: c.lastMessagePreview || buildMessagePreview(last) };
      });
      syncDetectedNames(convs);
      let nextSelectedPhone = currentSelectedPhone;
      if (!nextSelectedPhone && convs.length > 0) nextSelectedPhone = convs[0].phone;
      else if (nextSelectedPhone && !convs.some((c) => c.phone === nextSelectedPhone)) nextSelectedPhone = convs[0]?.phone || '';
      const hasNewMessages = previousSignature !== buildMessageSignature(convs.find((c) => c.phone === nextSelectedPhone)?.messages);
      if (nextSelectedPhone !== currentSelectedPhone) {
        shouldScrollToBottomRef.current = true;
        userPinnedToBottomRef.current = true;
        selectedPhoneRef.current = nextSelectedPhone;
        setSelectedPhone(nextSelectedPhone);
      } else if (hasNewMessages && stickToBottom) {
        shouldScrollToBottomRef.current = true;
      }
      conversationsRef.current = convs;
      setConversations(convs);
    } catch (e) {
      setError(e?.message || 'Failed to refresh inbox');
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    refreshInbox({ initial: true });
    pollRef.current = setInterval(() => refreshInbox(), 10000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [filter, leads]);

  useEffect(() => {
    setVisibleMessageCount(INITIAL_VISIBLE_MESSAGES);
    if (selectedPhone) {
      shouldScrollToBottomRef.current = true;
      userPinnedToBottomRef.current = true;
    }
  }, [selectedPhone]);

  const selected = useMemo(() => conversations.find((c) => c.phone === selectedPhone) || null, [conversations, selectedPhone]);
  const selectedMessages = selected?.messages || [];
  const displayedMessages = useMemo(() => {
    const visible = Math.max(INITIAL_VISIBLE_MESSAGES, visibleMessageCount);
    return selectedMessages.slice(Math.max(0, selectedMessages.length - visible));
  }, [selectedMessages, visibleMessageCount]);
  const hasOlderMessages = selectedMessages.length > displayedMessages.length;

  const sortedConversations = useMemo(() => [...conversations].sort((a, b) => toMillis(b.lastMessageAt) - toMillis(a.lastMessageAt)), [conversations]);
  const activeConversations = useMemo(() => sortedConversations.filter((c) => !archivedPhones.includes(c.phone)), [sortedConversations, archivedPhones]);
  const archivedConversations = useMemo(() => sortedConversations.filter((c) => archivedPhones.includes(c.phone)), [sortedConversations, archivedPhones]);

  useEffect(() => {
    onNeedsHumanCount?.(activeConversations.filter((c) => c.needsHuman).length);
  }, [activeConversations, onNeedsHumanCount]);

  const visibleConversations = useMemo(() => {
    let result = showArchived ? archivedConversations : activeConversations;
    if (filterStatus !== 'all') result = result.filter((c) => c.crmStatus === filterStatus);
    if (filterOrigem !== 'all') result = result.filter((c) => c.crmOrigem === filterOrigem);
    if (filterTag !== 'all') result = result.filter((c) => Array.isArray(c.crmTags) && c.crmTags.includes(filterTag));
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return result;
    const qDigits = digits(q);
    return result.filter((c) => {
      const haystack = [c.name, c.lead?.nome, c.phone, c.crmOrigem, c.qualificationSummary, c.resumoCliente].map((v) => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(q) || (qDigits.length > 0 && digits(c.phone).includes(qDigits));
    });
  }, [showArchived, archivedConversations, activeConversations, filterStatus, filterOrigem, filterTag, searchTerm]);

  function persistArchived(phones) {
    setArchivedPhones(phones);
    localStorage.setItem('wpp_archived_phones', JSON.stringify(phones));
  }

  function timeAgo(iso) {
    const t = toMillis(iso);
    if (!t) return '';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function formatMessageDate(ts) {
    const ms = toMillis(ts);
    return ms ? new Date(ms).toLocaleString('pt-BR') : '';
  }

  function loadOlderMessages() {
    if (!selected?.phone || loadingOlderRef.current || visibleMessageCount >= selectedMessages.length) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    prependAdjustRef.current = { prevTop: container.scrollTop, prevHeight: container.scrollHeight };
    loadingOlderRef.current = true;
    setVisibleMessageCount((prev) => Math.min(prev + MESSAGE_PAGE_SIZE, selectedMessages.length));
  }

  function handleMessagesScroll(e) {
    const el = e.currentTarget;
    userPinnedToBottomRef.current = isThreadNearBottom(el, 120);
    if (el.scrollTop <= 48) loadOlderMessages();
  }

  useEffect(() => {
    if (!loadingOlderRef.current || !prependAdjustRef.current) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    const { prevTop, prevHeight } = prependAdjustRef.current;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
      prependAdjustRef.current = null;
      loadingOlderRef.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [displayedMessages, selectedPhone]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current || loadingOlderRef.current) return;
    const raf = requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      shouldScrollToBottomRef.current = false;
      userPinnedToBottomRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [conversations, selectedPhone, displayedMessages.length]);

  async function handleUpdateInbox(phone, data) {
    try {
      setConversations((prev) => prev.map((c) => c.phone === phone ? {
        ...c,
        crmTags: data.tags !== undefined ? data.tags : c.crmTags,
        crmStatus: data.status !== undefined ? data.status : c.crmStatus,
        name: data.name !== undefined ? data.name : c.name,
      } : c));
      await postJson(INBOX_COMPAT_URL, { action: 'update_lead', phone, ...data });
      await refreshInbox({ initial: false });
    } catch (err) {
      console.error('Failed to update inbox compatibility endpoint', err);
      setError(err?.message || 'Failed to update conversation');
    }
  }

  async function sendMessage() {
    if (!selected?.phone) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError('');
    try {
      await postJson(buildN8nUrl('/inbox-send'), { phone: selected.phone, text, closerId });
      if (!selected.lead && onCreateLead) {
        onCreateLead({
          nome: selected.name || `Conv. ${selected.phone}`,
          contato: selected.phone,
          status: 'Em Contato',
          origem: selected.crmOrigem || 'WhatsApp',
          historico: [`[${new Date().toLocaleString('pt-BR')}] WhatsApp: Mensagem enviada via Inbox ("${text.slice(0, 30)}...")`],
        });
      }
      setDraft('');
      shouldScrollToBottomRef.current = true;
      userPinnedToBottomRef.current = true;
      await refreshInbox();
    } catch (e) {
      setError(e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function sendAudioMessage() {
    if (!selected?.phone || !audioDraft?.blob) return;

    const normalizedMimeType = normalizeWhatsAppAudioMimeType(audioDraft.mimeType, audioDraft.name);
    if (!isWhatsAppNativeAudioMime(normalizedMimeType, audioDraft.name)) {
      setError('Este áudio não está em um formato aceito pelo WhatsApp Cloud API. Envie MP3, M4A/MP4, AAC, AMR ou OGG/Opus.');
      return;
    }

    if (audioDraft.size && audioDraft.size > 16 * 1024 * 1024) {
      setError('O áudio precisa ter no máximo 16 MB para envio pelo WhatsApp.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const textAfterAudio = draft.trim();
      const audioBase64 = await blobToBase64(audioDraft.blob);
      const fileName = audioDraft.name || `audio-flowdesk-${Date.now()}.${audioExtension(normalizedMimeType)}`;

      await postJson(buildN8nUrl('/inbox-send'), {
        phone: selected.phone,
        closerId,

        // Canonical fields expected by the n8n audio branch.
        mediaType: 'audio',
        mimeType: normalizedMimeType,
        fileName,
        size: audioDraft.size || audioDraft.blob.size || null,
        durationMs: audioDraft.durationMs || null,
        audioBase64,

        // Compatibility aliases for n8n/Webhook/router variants.
        media_type: 'audio',
        mime_type: normalizedMimeType,
        filename: fileName,
        base64: audioBase64,
        originalMimeType: audioDraft.mimeType || normalizedMimeType,
      });

      if (textAfterAudio) {
        await postJson(buildN8nUrl('/inbox-send'), { phone: selected.phone, text: textAfterAudio, closerId });
      }
      if (!selected.lead && onCreateLead) {
        onCreateLead({
          nome: selected.name || `Conv. ${selected.phone}`,
          contato: selected.phone,
          status: 'Em Contato',
          origem: selected.crmOrigem || 'WhatsApp',
          historico: [`[${new Date().toLocaleString('pt-BR')}] WhatsApp: Áudio enviado via Inbox`],
        });
      }
      discardAudioDraft();
      setDraft('');
      shouldScrollToBottomRef.current = true;
      userPinnedToBottomRef.current = true;
      await refreshInbox();
    } catch (e) {
      setError(e?.message || 'Falha ao enviar áudio');
    } finally {
      setSending(false);
    }
  }

  function handleSendClick() {
    if (audioDraft) sendAudioMessage();
    else sendMessage();
  }

  async function setPaused(paused) {
    if (!selected?.phone) return;
    setToggling(true);
    setError('');
    try {
      await postJson(buildN8nUrl('/inbox-takeover'), { phone: selected.phone, paused, closerId });
      await refreshInbox();
    } catch (e) {
      setError(e?.message || 'Failed to update takeover state');
    } finally {
      setToggling(false);
    }
  }

  function openAttachment(att) {
    const url = resolveAttachmentUrl(att, { download: false });
    if (!url) {
      setError('Link da imagem indisponível. Atualize a conversa e tente novamente.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function downloadAttachment(att) {
    const url = resolveAttachmentUrl(att, { download: true });
    if (!url) {
      setError('Link da imagem indisponível. Atualize a conversa e tente novamente.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = attachmentFileName(att);
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function markAttachmentFailed(att, idx) {
    const key = `${att?.storagePath || att?.url || att?.id || idx}`;
    setAttachmentErrors((prev) => ({ ...prev, [key]: true }));
  }

  function renderAttachmentActions(att) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => openAttachment(att)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Abrir</button>
        <button type="button" onClick={() => downloadAttachment(att)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Baixar</button>
      </div>
    );
  }

  function renderAttachmentFallback(att, title, detail) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-700">
        <div className="text-sm font-semibold">{title}</div>
        {detail && <div className="mt-0.5 text-xs text-slate-500">{detail}</div>}
        <div className="mt-2">{renderAttachmentActions(att)}</div>
      </div>
    );
  }

  function renderAttachment(att, idx, messageText) {
    const url = resolveAttachmentUrl(att);
    if (!url) return null;
    const key = `${att?.storagePath || att?.url || att?.id || idx}`;
    const caption = att.caption && att.caption !== messageText ? att.caption : '';
    const failed = Boolean(attachmentErrors[key]);
    const fileName = attachmentFileName(att);

    if (att.type === 'image') {
      return (
        <div key={`${key}-${idx}`} className="space-y-2">
          {failed ? renderAttachmentFallback(att, 'Imagem recebida', 'A prévia não carregou. Clique em Abrir ou Baixar.') : (
            <>
              <button type="button" onClick={() => openAttachment(att)} className="block w-full cursor-pointer rounded-lg text-left">
                <img src={url} alt={fileName} onError={() => markAttachmentFailed(att, idx)} className="max-h-64 w-full rounded-lg border border-slate-200 object-cover bg-white" />
              </button>
              {renderAttachmentActions(att)}
            </>
          )}
          {caption ? <p className="text-xs text-slate-600 whitespace-pre-wrap">{caption}</p> : null}
        </div>
      );
    }

    if (att.type === 'audio') return <div key={`${key}-${idx}`} className="space-y-2"><audio controls src={url} onError={() => markAttachmentFailed(att, idx)} className="w-full" />{renderAttachmentActions(att)}{caption ? <p className="text-xs text-slate-600 whitespace-pre-wrap">{caption}</p> : null}</div>;
    if (att.type === 'video') return <div key={`${key}-${idx}`} className="space-y-2"><video controls src={url} onError={() => markAttachmentFailed(att, idx)} className="max-h-72 w-full rounded-lg border border-slate-200 bg-black" />{renderAttachmentActions(att)}{caption ? <p className="text-xs text-slate-600 whitespace-pre-wrap">{caption}</p> : null}</div>;
    return <div key={`${key}-${idx}`} className="space-y-2">{renderAttachmentFallback(att, att?.mimeType?.includes('pdf') ? 'PDF recebido' : 'Arquivo recebido', fileName)}{caption ? <p className="text-xs text-slate-600 whitespace-pre-wrap">{caption}</p> : null}</div>;
  }

  function senderLabel(from) {
    if (from === 'client') return 'Cliente';
    if (from === 'ai') return 'IA';
    if (from === 'human') return 'Agente';
    return from;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
      {error && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="rounded p-0.5 hover:bg-red-100"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="h-[80vh] min-h-[580px] max-h-[900px] overflow-hidden">
        <div className={`grid h-full min-h-0 transition-all duration-200 ${profileOpen && selected ? 'lg:grid-cols-[320px_1fr_300px]' : 'lg:grid-cols-[320px_1fr]'}`}>
          <aside className="flex h-full min-h-0 flex-col border-r border-slate-100 bg-slate-50">
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 pt-4 pb-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500"><MessageCircle className="h-4 w-4 text-white" /></div>
                  <h3 className="font-semibold text-slate-800 text-[15px]">Inbox</h3>
                  {visibleConversations.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{visibleConversations.length}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 font-medium">
                    <option value="needs_human">Humano</option>
                    <option value="ai">IA</option>
                    <option value="all">Todas</option>
                  </select>
                  <button onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)} className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${advancedFiltersOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Filter className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou telefone..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white transition-all" />
              </div>
              {advancedFiltersOpen && (
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <div><p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Status</p><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"><option value="all">Todos</option>{STATUS_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                  <div><p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Origem</p><select value={filterOrigem} onChange={(e) => setFilterOrigem(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"><option value="all">Todas</option><option value="Trabalhista">Trabalhista</option><option value="Previdenciária">Previdenciária</option><option value="Mentoria">Mentoria</option></select></div>
                  <div><p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Tag</p><select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"><option value="all">Todas</option>{[...new Set([...KHELP_DEFAULT_TAGS, ...allExistingTags])].sort().map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>
              )}
            </div>
            {!showArchived && archivedConversations.length > 0 && <button onClick={() => setShowArchived(true)} className="flex w-full items-center gap-2.5 border-b border-slate-100 bg-white px-4 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50"><Archive className="h-3.5 w-3.5" /><span>Arquivados</span><span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">{archivedConversations.length}</span></button>}
            {showArchived && <button onClick={() => setShowArchived(false)} className="flex w-full items-center gap-2 border-b border-slate-100 bg-indigo-50 px-4 py-2 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100">Voltar para Inbox</button>}
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="space-y-1 p-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div> : visibleConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2"><MessageCircle className="h-8 w-8 opacity-30" /><p className="text-sm">Nenhuma conversa</p></div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {visibleConversations.map((c) => {
                    const active = c.phone === selectedPhone;
                    const isArchived = archivedPhones.includes(c.phone);
                    return (
                      <div key={c.phone} className="relative group">
                        <button onClick={() => { shouldScrollToBottomRef.current = true; userPinnedToBottomRef.current = true; selectedPhoneRef.current = c.phone; setSelectedPhone(c.phone); }} className={`w-full rounded-xl px-3 py-2.5 text-left transition-all ${active ? 'bg-white shadow-sm border border-slate-200 ring-1 ring-indigo-100' : 'hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100'}`}>
                          <div className="flex items-start gap-2.5">
                            <div className="relative shrink-0 mt-0.5"><Avatar name={c.name} phone={c.phone} size="md" />{c.needsHuman && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1"><span className={`truncate text-[13px] font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{c.name || c.phone}</span><span className="shrink-0 text-[10px] text-slate-400 font-medium">{timeAgo(c.lastMessageAt)}</span></div>
                              <p className="mt-0.5 truncate text-[12px] text-slate-500 leading-tight">{c.lastMessagePreview || ''}</p>
                              <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                                {c.crmOrigem && <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide leading-[16px] ${origemBadgeClass(c.crmOrigem)}`}>{c.crmOrigem}</span>}
                                {c.crmStatus && c.crmStatus !== 'Novo' && <CrmStatusBadge status={c.crmStatus} />}
                                {(c.crmTags || []).slice(0, 1).map((tag) => <span key={tag} className="inline-flex items-center rounded-full bg-slate-700 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-white leading-[16px] max-w-[72px] truncate">{tag}</span>)}
                                {(c.crmTags || []).length > 1 && <span className="text-[9px] text-slate-400">+{c.crmTags.length - 1}</span>}
                              </div>
                            </div>
                          </div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); persistArchived(isArchived ? archivedPhones.filter((p) => p !== c.phone) : [...archivedPhones, c.phone]); }} title={isArchived ? 'Desarquivar' : 'Arquivar'} className="absolute right-2 top-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm text-slate-400 hover:text-slate-600 z-10"><Archive className="h-3 w-3" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex h-full min-w-0 min-h-0 flex-col bg-[#f0ede8] border-r border-slate-100">
            <div className="shrink-0 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selected && <Avatar name={selected.name} phone={selected.phone} size="md" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="truncate font-semibold text-slate-800">{selected ? (selected.name || selected.phone) : 'Selecione uma conversa'}</span>{selected?.crmOrigem && <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${origemBadgeClass(selected.crmOrigem)}`}>{selected.crmOrigem}</span>}{selected?.needsHuman && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase tracking-wide">Humano</span>}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{selected?.phone || ''}</div>
                  </div>
                </div>
                {selected && <div className="flex items-center gap-1.5 shrink-0"><button onClick={() => setProfileOpen(!profileOpen)} className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium ${profileOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><User className="h-3.5 w-3.5" /> Perfil</button><button onClick={() => setPaused(true)} disabled={toggling || selected.paused} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"><UserCheck className="h-3.5 w-3.5" /> Assumir</button><button onClick={() => setPaused(false)} disabled={toggling || !selected.paused} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"><Brain className="h-3.5 w-3.5" /> Retornar IA</button></div>}
              </div>
              {selected && <div className="border-t border-slate-100 px-4 py-2"><TagsEditor tags={selected.crmTags || []} origemTag={selected.crmOrigem || ''} allExistingTags={allExistingTags} onUpdateTags={(newTags) => handleUpdateInbox(selected.phone, { tags: newTags })} /></div>}
            </div>

            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-1">
              {hasOlderMessages && <div className="flex justify-center mb-2"><button type="button" onClick={loadOlderMessages} className="rounded-full border border-slate-300 bg-white px-4 py-1 text-xs text-slate-600 hover:bg-slate-50 shadow-sm">Carregar mensagens antigas</button></div>}
              {displayedMessages.length ? displayedMessages.map((m) => {
                const isClient = m.from === 'client';
                const isAI = m.from === 'ai';
                const bubbleBg = isClient ? 'bg-white shadow-sm border border-slate-200/80' : isAI ? 'bg-indigo-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm';
                const textColor = isClient ? 'text-slate-800' : 'text-white';
                const metaColor = isClient ? 'text-slate-400' : 'text-white/70';
                return (
                  <div key={m.id || `${m.ts}-${m.from}-${m.text}`} className={`flex ${isClient ? 'justify-start' : 'justify-end'} mb-2`}>
                    <div className={`max-w-[76%] rounded-2xl px-3.5 py-2.5 ${bubbleBg} ${isClient ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>
                      <div className={`mb-1 flex items-center gap-2 text-[10px] font-semibold ${metaColor}`}><span>{senderLabel(m.from)}</span>{m.ts && <span className="font-normal opacity-80">{formatMessageDate(m.ts)}</span>}</div>
                      {Array.isArray(m.attachments) && m.attachments.length > 0 && <div className={`space-y-2 ${m.text ? 'mb-2' : ''}`}>{m.attachments.map((att, idx) => renderAttachment(att, idx, m.text))}</div>}
                      {m.text && <div className={`whitespace-pre-wrap text-[13px] leading-relaxed ${textColor}`}>{m.text}</div>}
                    </div>
                  </div>
                );
              }) : <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-60"><MessageCircle className="h-10 w-10" /><p className="text-sm">Nenhuma mensagem carregada</p></div>}
              <div ref={bottomAnchorRef} />
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
              {audioDraft && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                  <audio controls src={audioDraft.url} className="h-9 min-w-[220px] flex-1" />
                  <span className="text-xs font-medium text-indigo-700">{audioDraft.durationMs ? formatDuration(audioDraft.durationMs) : 'arquivo'}</span>
                  {!isWhatsAppNativeAudioMime(audioDraft.mimeType) && <span className="text-[11px] font-medium text-red-600">formato não aceito pelo WhatsApp</span>}
                  <button type="button" title="Descartar áudio" onClick={discardAudioDraft} disabled={sending} className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={audioFileInputRef} type="file" accept="audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,.aac,.m4a,.mp4,.mp3,.amr,.ogg,.opus" onChange={handleAudioFileSelected} className="hidden" />
                <button type="button" title={recording ? 'Parar gravação' : 'Gravar áudio'} onClick={recording ? stopRecording : startRecording} disabled={!selected || sending} className={`flex h-[60px] w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${recording ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
                <button type="button" title="Anexar áudio" onClick={chooseAudioFile} disabled={!selected || sending || recording} className="flex h-[60px] w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"><Paperclip className="h-4 w-4" /></button>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {recording && <div className="text-xs font-semibold text-red-600">Gravando áudio... {formatDuration(recordingMs)}</div>}
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onCompositionStart={() => { isComposingRef.current = true; }} onCompositionEnd={() => { isComposingRef.current = false; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing && !isComposingRef.current) { e.preventDefault(); handleSendClick(); } }} disabled={!selected || recording} rows={2} className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white transition-all leading-relaxed disabled:opacity-60" placeholder={selected ? (audioDraft ? 'Opcional: escreva uma mensagem que será enviada depois do áudio' : 'Escreva uma resposta... (Enter para enviar)') : 'Selecione uma conversa'} />
                </div>
                <button onClick={handleSendClick} disabled={!selected || sending || recording || (!draft.trim() && !audioDraft)} className="flex h-[60px] w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </section>

          {profileOpen && selected && (
            <aside className="flex h-full min-h-0 flex-col bg-white overflow-y-auto">
              <div className="shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 px-4 pt-5 pb-4">
                <div className="flex items-start justify-between mb-4"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Perfil do Lead</span><button onClick={() => setProfileOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-200 hover:bg-white/10"><X className="h-4 w-4" /></button></div>
                <div className="flex items-center gap-3"><Avatar name={selected.name} phone={selected.phone} size="lg" /><div className="min-w-0"><div className="font-semibold text-white truncate">{selected.name || 'Sem nome'}</div><div className="text-[11px] text-slate-400 mt-0.5">{selected.phone}</div><div className="mt-2 flex items-center gap-1.5 flex-wrap">{selected.crmOrigem && <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${origemBadgeClass(selected.crmOrigem)}`}>{selected.crmOrigem}</span>}{selected.needsHuman && <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">Aguardando</span>}</div></div></div>
              </div>
              <div className="flex-1 p-4 space-y-4">
                {selected.needsHuman && <div className="rounded-xl bg-red-50 p-3 border border-red-200"><div className="flex items-center gap-1.5 mb-1.5"><Target className="h-3.5 w-3.5 text-red-600" /><span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Intervenção Necessária</span>{selected.interventionPriority && <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">P{selected.interventionPriority}</span>}</div><p className="text-xs text-red-900 leading-relaxed">{selected.interventionSummary || 'O lead solicitou atendimento humano ou a IA atingiu um limite.'}</p></div>}
                {(selected.resumoCliente || selected.lead?.observacoes) && <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-3 border border-indigo-100"><div className="flex items-center gap-1.5 mb-2"><Brain className="h-3.5 w-3.5 text-indigo-600" /><span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">Resumo IA</span></div><p className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.resumoCliente || selected.lead?.observacoes}</p></div>}
                {selected.qualificationSummary && <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-3 border border-emerald-100"><div className="flex items-center gap-1.5 mb-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /><span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Qualificação</span></div><p className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.qualificationSummary}</p></div>}
                <div className="border-t border-slate-100" />
                <div className="space-y-1.5"><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Etapa CRM</p><Select value={selected.crmStatus || 'Novo'} onValueChange={(newStatus) => handleUpdateInbox(selected.phone, { status: newStatus })}><SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{STATUS_OPTS.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tags</p><TagsEditor tags={selected.crmTags || []} origemTag={selected.crmOrigem || ''} allExistingTags={allExistingTags} onUpdateTags={(newTags) => handleUpdateInbox(selected.phone, { tags: newTags })} /></div>
                {selected.lead?.historico?.length > 0 && <div className="space-y-1.5"><div className="border-t border-slate-100 pt-3" /><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Histórico</p><div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">{selected.lead.historico.slice().reverse().slice(0, 5).map((log, i) => <div key={i} className="flex gap-2 text-[11px] text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" /><span className="leading-relaxed">{log}</span></div>)}</div></div>}
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5"><p className="text-[10px] text-slate-400 leading-relaxed">A <strong>origem</strong> ({selected.crmOrigem || 'não definida'}) é detectada automaticamente pelo fluxo de IA e não pode ser alterada.</p></div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function CRMIndicadores({ leads, onCardClick }) {
  const icons = { 'Leads Novos': Users, 'Em Atendimento': UserCheck, Qualificados: CheckCircle, Convertidos: CheckCircle, Perdidos: XCircle, 'Taxa de Conversão': BarChart3, 'Total de Leads': BarChart3, 'Melhor Origem': MapPin };
  const colors = { 'Leads Novos': 'from-blue-500 to-blue-600', 'Em Atendimento': 'from-purple-500 to-purple-600', Qualificados: 'from-amber-500 to-orange-500', Convertidos: 'from-emerald-500 to-green-600', Perdidos: 'from-red-500 to-red-600', 'Taxa de Conversão': 'from-indigo-500 to-indigo-600', 'Total de Leads': 'from-slate-500 to-slate-600', 'Melhor Origem': 'from-pink-500 to-pink-600' };
  const count = (status) => leads.filter((l) => l.status === status).length;
  const convertidos = count('Convertido');
  const taxa = leads.length > 0 ? ((convertidos / leads.length) * 100).toFixed(1) : '0.0';
  const origemMap = {};
  leads.forEach((l) => { if (l.origem) origemMap[l.origem] = (origemMap[l.origem] || 0) + 1; });
  const melhorOrigem = Object.entries(origemMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const cards = [
    { label: 'Leads Novos', value: count('Novo'), filter: 'Novo' },
    { label: 'Em Atendimento', value: count('Em Contato'), filter: 'Em Contato' },
    { label: 'Qualificados', value: count('Qualificado'), filter: 'Qualificado' },
    { label: 'Convertidos', value: convertidos, filter: 'Convertido' },
    { label: 'Perdidos', value: count('Perdido'), filter: 'Perdido' },
    { label: 'Taxa de Conversão', value: `${taxa}%`, filter: null },
    { label: 'Total de Leads', value: leads.length, filter: null },
    { label: 'Melhor Origem', value: melhorOrigem, filter: null },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
      {cards.map((card, i) => {
        const Icon = icons[card.label];
        return <motion.div key={card.label} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => card.filter && onCardClick(card.filter)} className={`rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow ${card.filter ? 'cursor-pointer hover:border-slate-300' : ''}`}><div className={`inline-flex rounded-xl bg-gradient-to-br ${colors[card.label]} p-2 mb-2`}><Icon className="h-4 w-4 text-white" /></div><p className="text-2xl font-bold text-slate-800 leading-tight">{card.value}</p><p className="text-xs text-slate-500 mt-0.5 leading-tight">{card.label}</p></motion.div>;
      })}
    </div>
  );
}

function LeadKanban({ leads, onUpdateLead, onEditLead }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const lead = leads.find((l) => l.id === result.draggableId);
    if (!lead || lead.status === result.destination.droppableId) return;
    onUpdateLead(lead.id, { status: result.destination.droppableId });
  };
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS_KANBAN.map((etapa) => {
          const etapaLeads = leads.filter((l) => l.status === etapa.id);
          return (
            <div key={etapa.id} className="flex-shrink-0 w-64">
              <div className={`flex items-center justify-between rounded-t-xl border px-3 py-2 ${etapa.color}`}><span className="text-sm font-semibold">{etapa.label}</span><Badge className={`${ETAPA_DOT_COLORS[etapa.id]} text-white border-0 text-xs`}>{etapaLeads.length}</Badge></div>
              <Droppable droppableId={etapa.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-32 rounded-b-xl border-x border-b border-slate-200 p-2 space-y-2 ${snapshot.isDraggingOver ? 'bg-slate-50' : 'bg-white'}`}>
                    {etapaLeads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${snap.isDragging ? 'shadow-lg rotate-1' : 'hover:shadow-md'}`}>
                            <div className="flex items-start justify-between gap-1"><p className="font-semibold text-slate-800 text-sm leading-tight">{lead.nome}</p><button onClick={() => onEditLead(lead)} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><Edit className="h-3.5 w-3.5" /></button></div>
                            {lead.contato && <p className="text-xs text-slate-500 mt-1">{lead.contato}</p>}
                            {lead.interesse && <Badge variant="outline" className="text-xs mt-1 h-5">{lead.interesse}</Badge>}
                            {lead.origem && <p className="text-xs text-slate-400 mt-1">{lead.origem}</p>}
                            <div className="flex gap-1 mt-2">
                              {lead.contato && <><a href={`tel:${lead.contato}`} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={(e) => e.stopPropagation()}><Phone className="h-3 w-3" /></a><a href={`https://wa.me/55${digits(lead.contato)}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-green-200 bg-green-50 py-1 text-xs text-green-700 hover:bg-green-100" onClick={(e) => e.stopPropagation()}><MessageCircle className="h-3 w-3" /></a></>}
                              <button onClick={() => onEditLead(lead)} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"><ChevronRight className="h-3 w-3" /></button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function LeadDialog({ open, onOpenChange, lead, onSave }) {
  const [form, setForm] = useState({ nome: '', contato: '', email: '', origem: '', interesse: '', responsavel_id: '', observacoes: '', status: 'Novo', proxima_acao: '', data_proxima_acao: '' });
  const [newInteracao, setNewInteracao] = useState('');
  const [tipoInteracao, setTipoInteracao] = useState('Ligação');

  useEffect(() => {
    if (lead) setForm({ nome: lead.nome || '', contato: lead.contato || '', email: lead.email || '', origem: lead.origem || '', interesse: lead.interesse || '', responsavel_id: lead.responsavel_id || '', observacoes: lead.observacoes || '', status: lead.status || 'Novo', proxima_acao: lead.proxima_acao || '', data_proxima_acao: lead.data_proxima_acao || '' });
    else setForm({ nome: '', contato: '', email: '', origem: '', interesse: '', responsavel_id: '', observacoes: '', status: 'Novo', proxima_acao: '', data_proxima_acao: '' });
    setNewInteracao('');
  }, [lead, open]);

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave({ ...form }, newInteracao.trim() ? { tipo: tipoInteracao, descricao: newInteracao.trim() } : null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lead ? `Lead: ${lead.nome}` : 'Novo Lead'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></div><div className="space-y-1"><Label>Telefone / WhatsApp</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} placeholder="(11) 99999-9999" /></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1"><Label>Origem {lead && <span className="text-[10px] text-slate-400 font-normal">(somente leitura)</span>}</Label>{lead ? <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">{form.origem || 'Não definida'}</div> : <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"><option value="">Selecione</option>{ORIGEM_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}</select>}</div>
            <div className="space-y-1"><Label>Status</Label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">{STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="space-y-1"><Label>Interação</Label><select value={tipoInteracao} onChange={(e) => setTipoInteracao(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"><option>Ligação</option><option>WhatsApp</option><option>Email</option><option>Nota</option></select></div><div className="space-y-1"><Label>Descrição</Label><Input value={newInteracao} onChange={(e) => setNewInteracao(e.target.value)} placeholder="Opcional" /></div></div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">{lead ? 'Salvar' : 'Criar Lead'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ComercialDashboard() {
  const [view, setView] = useState('crm');
  const [filterStatus, setFilterStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [needsHumanCount, setNeedsHumanCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({ queryKey: ['leads-comercial'], queryFn: () => flowdesk.entities.LeadComercial.list('-created_date', 200) });
  useQuery({ queryKey: ['pessoas'], queryFn: () => flowdesk.entities.Pessoa.list() });

  const createLeadMutation = useMutation({ mutationFn: (data) => flowdesk.entities.LeadComercial.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads-comercial'] }) });
  const updateLeadMutation = useMutation({ mutationFn: ({ id, data }) => flowdesk.entities.LeadComercial.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads-comercial'] }) });

  const handleSaveLead = (formData, interacao) => {
    const agora = new Date().toLocaleString('pt-BR');
    if (editingLead) {
      const historico = Array.isArray(editingLead.historico) ? [...editingLead.historico] : [];
      if (interacao) historico.push(`[${agora}] ${interacao.tipo}: ${interacao.descricao}`);
      updateLeadMutation.mutate({ id: editingLead.id, data: { ...formData, historico } });
    } else {
      const historico = interacao ? [`[${agora}] ${interacao.tipo}: ${interacao.descricao}`] : [];
      createLeadMutation.mutate({ ...formData, historico });
    }
    setLeadDialogOpen(false);
    setEditingLead(null);
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterStatus) result = result.filter((l) => l.status === filterStatus);
    const q = searchTerm.trim().toLowerCase();
    if (q) result = result.filter((l) => [l.nome, l.contato, l.origem, l.interesse].some((v) => String(v || '').toLowerCase().includes(q)));
    return result;
  }, [leads, filterStatus, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-full space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-3"><BarChart3 className="h-7 w-7 text-white" /></div><div><h1 className="text-2xl font-bold text-slate-800">Comercial & Marketing</h1></div></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={view === 'crm' ? 'default' : 'outline'} onClick={() => setView('crm')}><Users className="mr-1.5 h-4 w-4" /> CRM / Leads</Button>
            <Button size="sm" variant={view === 'dashboard' ? 'default' : 'outline'} onClick={() => setView('dashboard')}><BarChart3 className="mr-1.5 h-4 w-4" /> Dashboard</Button>
            <Button size="sm" variant={view === 'whatsapp' ? 'default' : 'outline'} onClick={() => setView('whatsapp')} className="relative"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp{needsHumanCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">{needsHumanCount}</span>}</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditingLead(null); setLeadDialogOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> Novo Lead</Button>
          </div>
        </div>

        {view === 'whatsapp' && <WhatsAppInbox leads={leads} onUpdateLead={(id, data) => updateLeadMutation.mutate({ id, data })} onCreateLead={(data) => createLeadMutation.mutate(data)} onNeedsHumanCount={setNeedsHumanCount} />}

        {view === 'crm' && (
          <div className="space-y-5">
            <div className="relative max-w-md"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar lead..." className="pl-8 bg-white" /></div>
            <CRMIndicadores leads={leads} onCardClick={(status) => setFilterStatus(filterStatus === status ? null : status)} />
            <div className="rounded-2xl bg-white border border-slate-200 p-4 overflow-x-auto"><LeadKanban leads={filteredLeads} onUpdateLead={(id, data) => updateLeadMutation.mutate({ id, data })} onEditLead={(lead) => { setEditingLead(lead); setLeadDialogOpen(true); }} /></div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-sm text-slate-500">
            Os indicadores principais continuam disponíveis nos cards do CRM. Esta aba fica reservada para gráficos adicionais quando você quiser expandir.
          </div>
        )}
      </div>
      <LeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} lead={editingLead} onSave={handleSaveLead} />
    </div>
  );
}