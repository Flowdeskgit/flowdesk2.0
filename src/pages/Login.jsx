import React, { useEffect, useState } from 'react';
import {
  hasSupabaseConfig,
  profileManager,
  supabase,
  SUPABASE_CONFIG_ERROR_MESSAGE,
} from '@/api/flowdeskClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';

function FlowDeskMark() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a2f4a] to-[#0d1e31] shadow-xl shadow-brand-electric/20">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="#378ADD" />
          <circle cx="20" cy="4" r="2" fill="#5BA3E0" opacity="0.9" />
          <line x1="14.1" y1="9.9" x2="18.4" y2="5.6" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2" fill="#5BA3E0" opacity="0.9" />
          <line x1="14.1" y1="14.1" x2="18.4" y2="18.4" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="4" cy="12" r="2" fill="#5BA3E0" opacity="0.6" />
          <line x1="9" y1="12" x2="6" y2="12" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-xl font-bold tracking-tight text-slate-900">FlowDesk ADV</p>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-electric/70">
          MCR Advocacia
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="pl-10"
            required
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full bg-brand-electric text-white hover:bg-brand-electric/90" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  );
}

function SetupAdminForm() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await profileManager.bootstrapAdmin({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'Erro ao criar conta de administrador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-electric/20 bg-brand-electric/5 p-3">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-brand-electric" />
        <p className="text-xs text-brand-steel">Primeira configuração: esta conta será a administradora do sistema.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Seu nome"
            value={form.full_name}
            onChange={(event) => set('full_name', event.target.value)}
            className="pl-10"
            required
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="email"
            placeholder="admin@mcr.com"
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={(event) => set('password', event.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Confirmar senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="password"
            placeholder="••••••••"
            value={form.confirm}
            onChange={(event) => set('confirm', event.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-electric text-white hover:bg-brand-electric/90"
        disabled={loading || !form.full_name || !form.email || !form.password}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...
          </>
        ) : (
          'Criar conta de administrador'
        )}
      </Button>
    </form>
  );
}

export default function Login() {
  const [hasAdmin, setHasAdmin] = useState(null);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setHasAdmin(true);
      setSetupError(SUPABASE_CONFIG_ERROR_MESSAGE);
      return;
    }

    profileManager
      .hasAdmin()
      .then(setHasAdmin)
      .catch((error) => {
        setSetupError(error.message || 'Não foi possível acessar a função de perfis.');
        setHasAdmin(true);
      });
  }, []);

  const isSetup = hasAdmin === false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <FlowDeskMark />

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-2xl font-semibold text-slate-800">
              {hasAdmin === null ? 'Carregando...' : isSetup ? 'Configurar Sistema' : 'Entrar no Sistema'}
            </CardTitle>
            <CardDescription className="text-center text-slate-500">
              Sistema de gestão da MCR Advocacia
            </CardDescription>
          </CardHeader>

          <CardContent>
            {hasAdmin === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : setupError ? (
              <Alert variant="destructive">
                <AlertDescription className="space-y-2">
                  <p>{setupError}</p>
                  <p className="text-xs">
                    Variáveis necessárias: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_URL,
                    SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.
                  </p>
                </AlertDescription>
              </Alert>
            ) : isSetup ? (
              <SetupAdminForm />
            ) : (
              <LoginForm />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          {isSetup
            ? 'Configure a primeira conta administrativa para começar.'
            : 'Não tem acesso? Contate o administrador do sistema.'}
        </p>
      </div>
    </div>
  );
}
