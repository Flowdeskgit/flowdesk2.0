import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileManager } from '@/api/flowdeskClient';
import { useAuth } from '@/lib/AuthContext';
import { DEFAULT_ALLOWED_TABS, PROFILE_TAB_ITEMS } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2, Plus, Trash2, Settings2, ShieldCheck, User,
  Eye, EyeOff, KeyRound, Mail,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
      <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <span className="text-slate-400 flex-shrink-0">{label}:</span>
      <span className="font-mono truncate">{value || '—'}</span>
    </div>
  );
}

// ─── Tab Permissions Modal ────────────────────────────────────────────────────
function TabPermissionsModal({ profile, open, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState(profile?.allowed_tabs ?? []);

  const mutation = useMutation({
    mutationFn: () => profileManager.updateProfile(profile.id, { allowed_tabs: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Permissões atualizadas', description: `Tabs de ${profile.full_name} foram salvas.` });
      onClose();
    },
    onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggle = (page) =>
    setSelected(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-brand-electric" />
            Tabs de {profile?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap mb-3">
          <Button variant="outline" size="sm" onClick={() => setSelected(PROFILE_TAB_ITEMS.map(t => t.page))}>Todas</Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(DEFAULT_ALLOWED_TABS)}>Padrão</Button>
          <Button variant="outline" size="sm" onClick={() => setSelected([])}>Nenhuma</Button>
          <span className="ml-auto text-xs text-slate-500 self-center">
            {selected.length}/{PROFILE_TAB_ITEMS.length} selecionadas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {PROFILE_TAB_ITEMS.map(({ page, label }) => (
            <label
              key={page}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <Checkbox checked={selected.includes(page)} onCheckedChange={() => toggle(page)} />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-brand-electric hover:bg-brand-electric/90 text-white"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ profile, open, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => profileManager.updatePassword(profile.id, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Senha alterada', description: `Senha de ${profile.full_name} atualizada.` });
      setPassword(''); setConfirm(''); setError('');
      onClose();
    },
    onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const handleSubmit = () => {
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-electric" />
            Alterar Senha — {profile?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !password || !confirm}
            className="bg-brand-electric hover:bg-brand-electric/90 text-white"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Profile Modal ─────────────────────────────────────────────────────
function CreateProfileModal({ open, onClose }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'user', allowed_tabs: DEFAULT_ALLOWED_TABS,
  });
  const [showPw, setShowPw] = useState(false);
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const mutation = useMutation({
    mutationFn: () => profileManager.createProfile(form),
    onSuccess: (profile) => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Perfil criado', description: `${profile.full_name} adicionado ao sistema.` });
      onClose();
      setForm({ full_name: '', email: '', password: '', role: 'user', allowed_tabs: DEFAULT_ALLOWED_TABS });
    },
    onError: (err) => toast({ title: 'Erro ao criar perfil', description: err.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-electric" />
            Novo Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input placeholder="Ana Silva" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" placeholder="ana@mcr.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha inicial</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Função</Label>
            <div className="flex gap-3">
              {['user', 'admin'].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => set('role', r)} className="accent-brand-electric" />
                  <span className="text-sm">{r === 'admin' ? 'Administrador' : 'Usuário'}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            As tabs visíveis podem ser configuradas depois em <strong>Configurar Tabs</strong>.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.full_name || !form.email || !form.password}
            className="bg-brand-electric hover:bg-brand-electric/90 text-white"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Perfis() {
  const { isAdmin, profile: myProfile } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen]   = useState(false);
  const [tabsTarget, setTabsTarget]   = useState(null);
  const [pwTarget, setPwTarget]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => profileManager.listProfiles(),
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => profileManager.deleteProfile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Perfil removido' });
      setDeleteTarget(null);
    },
    onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  const admins = profiles.filter(p => p.role === 'admin');
  const users  = profiles.filter(p => p.role !== 'admin');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Perfis de Usuário</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie acessos, abas e senhas de cada membro.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-electric hover:bg-brand-electric/90 text-white gap-2">
          <Plus className="h-4 w-4" />
          Novo Perfil
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-brand-electric" />
            <div>
              <p className="text-2xl font-bold text-slate-800">{admins.length}</p>
              <p className="text-xs text-slate-500">Administradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <User className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-slate-800">{users.length}</p>
              <p className="text-xs text-slate-500">Usuários</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map(p => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 flex items-start gap-4">

                {/* Avatar */}
                <Avatar className="h-11 w-11 flex-shrink-0 mt-0.5">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.full_name} className="rounded-full object-cover" />
                    : <AvatarFallback className="bg-brand-electric text-white text-sm font-semibold">
                        {initials(p.full_name)}
                      </AvatarFallback>
                  }
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{p.full_name}</p>
                    {p.id === myProfile?.id && (
                      <Badge variant="outline" className="text-xs text-slate-500">Você</Badge>
                    )}
                    <Badge className={p.role === 'admin'
                    ? 'bg-brand-electric/10 text-brand-steel border-brand-electric/20'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                    }>
                      {p.role === 'admin' ? 'Admin' : 'Usuário'}
                    </Badge>
                  </div>

                  <InfoRow icon={Mail} label="E-mail" value={p.email} />

                  {p.role !== 'admin' && (
                    <p className="text-xs text-slate-400 pt-0.5">
                      {p.allowed_tabs?.length ?? 0} tabs habilitadas
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {p.role !== 'admin' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setTabsTarget(p)}
                      className="gap-1.5 text-slate-600"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Tabs
                    </Button>
                  )}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPwTarget(p)}
                    className="gap-1.5 text-slate-600"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Senha
                  </Button>
                  {p.id !== myProfile?.id && (
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setDeleteTarget(p)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateProfileModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {tabsTarget && (
        <TabPermissionsModal
          profile={tabsTarget}
          open={!!tabsTarget}
          onClose={() => setTabsTarget(null)}
        />
      )}

      {pwTarget && (
        <ChangePasswordModal
          profile={pwTarget}
          open={!!pwTarget}
          onClose={() => setPwTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              O perfil de <strong>{deleteTarget?.full_name}</strong> e todos os seus dados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
