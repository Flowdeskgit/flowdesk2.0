import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail, User, ShieldCheck } from 'lucide-react';

// ─── Login Form ─────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      // AuthContext onAuthStateChange handles the rest
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
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="email" type="email" placeholder="seu@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            className="pl-10" required autoFocus
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="password" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            className="pl-10" required
          />
        </div>
      </div>
      <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
      </Button>
    </form>
  );
}

// ─── First Admin Setup Form ──────────────────────────────────────────────────
function SetupAdminForm() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      // 1. Create the auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });
      if (signUpError) throw signUpError;
      const userId = signUpData.user?.id;
      if (!userId) throw new Error('Não foi possível criar o usuário. Tente novamente.');

      // 2. Insert admin profile (the INSERT policy allows id = auth.uid())
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: 'admin',
        allowed_tabs: [],
      });
      if (profileError) throw profileError;

      // 3. Sign in immediately
      await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setError(err.message || 'Erro ao criar conta de administrador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200 mb-2">
        <ShieldCheck className="h-4 w-4 text-rose-600 flex-shrink-0" />
        <p className="text-xs text-rose-700">Primeira configuração — você será o administrador do sistema.</p>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="space-y-2">
        <Label>Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Seu nome" value={form.full_name} onChange={e => set('full_name', e.target.value)}
            className="pl-10" required autoFocus />
        </div>
      </div>
      <div className="space-y-2">
        <Label>E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input type="email" placeholder="admin@mcr.com" value={form.email} onChange={e => set('email', e.target.value)}
            className="pl-10" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => set('password', e.target.value)}
            className="pl-10" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Confirmar senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input type="password" placeholder="••••••••" value={form.confirm} onChange={e => set('confirm', e.target.value)}
            className="pl-10" required />
        </div>
      </div>

      <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white"
        disabled={loading || !form.full_name || !form.email || !form.password}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : 'Criar conta de administrador'}
      </Button>
    </form>
  );
}

// ─── Main Login Page ─────────────────────────────────────────────────────────
export default function Login() {
  const [hasAdmin, setHasAdmin] = useState(null); // null = loading

  useEffect(() => {
    supabase.rpc('has_admin_profile')
      .then(({ data }) => setHasAdmin(data === true))
      .catch(() => setHasAdmin(true)); // On error, assume admin exists (fail safe)
  }, []);

  const isSetup = hasAdmin === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e55f5aacb579357377cf5/0a9116bf7_LOGOFUNDOBRANCO1.jpg"
            alt="MCRA Logo" className="h-20 object-contain"
          />
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-semibold text-slate-800 text-center">
              {hasAdmin === null ? 'Carregando...' : isSetup ? 'Configurar Sistema' : 'Entrar no Sistema'}
            </CardTitle>
            <CardDescription className="text-center text-slate-500">
              MCR Advocacia — Sistema de Gestão
            </CardDescription>
          </CardHeader>

          <CardContent>
            {hasAdmin === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : isSetup ? (
              <SetupAdminForm />
            ) : (
              <LoginForm />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          {isSetup
            ? 'Configure sua conta de administrador para começar.'
            : 'Não tem acesso? Contate o administrador do sistema.'}
        </p>
      </div>
    </div>
  );
}
