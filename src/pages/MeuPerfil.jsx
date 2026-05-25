import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { User, Mail, Phone, Building2, Lock, Eye, EyeOff, CheckCircle2, Save, Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MeuPerfil() {
  const queryClient = useQueryClient();
  const [showSenha, setShowSenha] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    telefone: '',
    cargo: '',
    senha_fj: '',
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => flowdesk.auth.me(),
  });

  const { data: pessoaData } = useQuery({
    queryKey: ['pessoa-perfil', user?.email],
    queryFn: () => flowdesk.entities.Pessoa.filter({ email: user.email }),
    enabled: !!user?.email,
  });

  const pessoa = pessoaData?.[0];

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        telefone: pessoa?.telefone || '',
        cargo: pessoa?.cargo || '',
        senha_fj: '',
      });
    }
  }, [user, pessoa]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande. Máximo 5MB.'); return; }
    setUploadingPhoto(true);
    const { file_url } = await flowdesk.integrations.Core.UploadFile({ file });
    await flowdesk.auth.updateMe({ foto_perfil: file_url });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = async () => {
    await flowdesk.auth.updateMe({ foto_perfil: '' });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Validate email
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('E-mail inválido.');
      }

      const updates = { last_updated: new Date().toISOString() };
      if (data.senha_fj) updates.senha_fj = data.senha_fj;

      await flowdesk.auth.updateMe(updates);

      // Update Pessoa record if exists
      if (pessoa?.id) {
        await flowdesk.entities.Pessoa.update(pessoa.id, {
          telefone: data.telefone,
          cargo: data.cargo,
          email: data.email,
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['pessoa-perfil'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setFormData((prev) => ({ ...prev, senha_fj: '' }));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            {user?.foto_perfil ? (
              <img src={user.foto_perfil} alt={user.full_name} className="h-20 w-20 rounded-2xl object-cover border-2 border-rose-200 shadow-lg" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-brand-electric flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-brand-electric/25">
                {(user?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingPhoto ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
            </button>
            {user?.foto_perfil && (
              <button onClick={handleRemovePhoto} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpg,image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Passe o mouse sobre a foto para alterar</p>
            {user?.role && (
              <Badge className="mt-1 bg-brand-electric/10 text-brand-steel border border-brand-electric/20 font-medium">
                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
              </Badge>
            )}
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Perfil atualizado com sucesso!</span>
          </div>
        )}

        <Card className="border shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4" /> Nome completo
                </Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4" /> E-mail
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4" /> Telefone
                </Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4" /> Cargo / Setor
                </Label>
                <Select
                  value={formData.cargo}
                  onValueChange={(value) => setFormData({ ...formData, cargo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Advogado">Advogado</SelectItem>
                    <SelectItem value="Assistente">Assistente</SelectItem>
                    <SelectItem value="Gestor">Gestor</SelectItem>
                    <SelectItem value="Assistente Jurídico">Assistente Jurídico</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Estagiário">Estagiário</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Lock className="h-4 w-4" /> Senha de acesso ao FJ
                  </Label>
                  <div className="relative">
                    <Input
                      type={showSenha ? 'text' : 'password'}
                      value={formData.senha_fj}
                      onChange={(e) => setFormData({ ...formData, senha_fj: e.target.value })}
                      placeholder="Deixe em branco para manter a atual"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSenha(!showSenha)}
                    >
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
                </div>
              </div>

              {user?.last_updated && !isNaN(new Date(user.last_updated).getTime()) && (
                <p className="text-xs text-muted-foreground/60">
                  Última atualização: {format(new Date(user.last_updated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>

              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="bg-brand-electric hover:bg-brand-steel text-white"
                  disabled={updateMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}