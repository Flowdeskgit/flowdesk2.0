import React, { useState, useEffect, useMemo } from 'react';
import { flowdesk } from '@/api/flowdeskClient';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';

function normalizeText(v) {
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export default function UsarModeloDialog({ open, onClose, modelo, user, onDocumentoGerado }) {
  const [step, setStep] = useState(1); // 1: selecionar cliente, 2: preencher dados, 3: concluído
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedProcesso, setSelectedProcesso] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [tituloDoc, setTituloDoc] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [docGerado, setDocGerado] = useState(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-usar-modelo'],
    queryFn: () => flowdesk.entities.Cliente.list('-created_date', 500),
    enabled: open,
  });

  const { data: processos = [] } = useQuery({
    queryKey: ['processos-usar-modelo'],
    queryFn: () => flowdesk.entities.Processo.list('-created_date', 500),
    enabled: open,
  });

  useEffect(() => {
    if (open && modelo) {
      setStep(1);
      setClienteSearch('');
      setSelectedCliente(null);
      setSelectedProcesso(null);
      setObservacoes('');
      setTituloDoc(modelo.nome || '');
      setDocGerado(null);
    }
  }, [open, modelo]);

  const sugestoes = useMemo(() => {
    const q = normalizeText(clienteSearch);
    if (!q) return clientes.slice(0, 8);
    return clientes.filter((c) =>
      [c.nome_completo, c.cpf, c.telefone, c.email].some((f) => normalizeText(f).includes(q))
    ).slice(0, 8);
  }, [clientes, clienteSearch]);

  const processosCliente = useMemo(() => {
    if (!selectedCliente) return [];
    return processos.filter((p) => p.cliente_id === selectedCliente.id);
  }, [processos, selectedCliente]);

  const selectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setClienteSearch(cliente.nome_completo || '');
    setShowSuggestions(false);
    setTituloDoc(`${modelo?.nome || 'Documento'} - ${cliente.nome_completo}`);
  };

  const handleGerar = async () => {
    if (!tituloDoc.trim()) { alert('Informe o título do documento.'); return; }

    setSalvando(true);

    const dadosPreenchidos = {
      cliente: selectedCliente ? {
        nome: selectedCliente.nome_completo,
        cpf: selectedCliente.cpf,
        rg: selectedCliente.rg,
        telefone: selectedCliente.telefone,
        email: selectedCliente.email,
        endereco: selectedCliente.endereco_completo,
        cidade: selectedCliente.cidade,
        estado: selectedCliente.estado,
        data_nascimento: selectedCliente.data_nascimento,
        profissao: selectedCliente.profissao,
      } : null,
      processo: selectedProcesso ? {
        numero: selectedProcesso.numero_processo,
        tipo: selectedProcesso.tipo_processo,
      } : null,
      observacoes,
      gerado_em: new Date().toISOString(),
    };

    const registro = await flowdesk.entities.DocumentoGerado.create({
      modelo_id: modelo.id,
      nome_modelo: modelo.nome,
      titulo: tituloDoc,
      cliente_id: selectedCliente?.id || '',
      cliente_nome: selectedCliente?.nome_completo || '',
      processo_id: selectedProcesso?.id || '',
      arquivo_url: modelo.arquivo_url,
      nome_arquivo: modelo.nome_arquivo || modelo.nome,
      dados_preenchidos: JSON.stringify(dadosPreenchidos),
      observacoes,
      status: 'finalizado',
      gerado_por: user?.email || 'sistema',
    });

    // Incrementar contador de usos
    await flowdesk.entities.ModeloDocumento.update(modelo.id, {
      total_usos: (modelo.total_usos || 0) + 1,
    });

    setDocGerado(registro);
    setStep(3);
    setSalvando(false);
    onDocumentoGerado?.();
  };

  if (!modelo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-rose-600" />
            Usar Modelo: {modelo.nome}
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= s ? 'text-rose-600' : 'text-slate-400'}`}>
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > s ? '✓' : s}
                </div>
                {s === 1 ? 'Selecionar Cliente' : s === 2 ? 'Confirmar e Gerar' : 'Concluído'}
              </div>
              {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-green-400' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Selecionar cliente */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700 mb-1">Modelo selecionado</p>
              <p className="text-xs text-slate-500">{modelo.nome} — {modelo.categoria}</p>
              <p className="text-xs text-slate-400 mt-1">⚠️ O arquivo original nunca será alterado. Você usará uma cópia de referência.</p>
            </div>

            <div className="space-y-2">
              <Label>Vincular a um cliente (opcional)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={clienteSearch}
                  onChange={(e) => { setClienteSearch(e.target.value); setSelectedCliente(null); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Buscar por nome, CPF ou telefone..."
                  className="pl-9"
                />
                {showSuggestions && sugestoes.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
                    {sugestoes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCliente(c)}
                        className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                      >
                        <span className="font-medium text-sm text-slate-800">{c.nome_completo}</span>
                        <span className="text-xs text-slate-500">{[c.cpf, c.telefone].filter(Boolean).join(' • ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCliente && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm text-green-800">{selectedCliente.nome_completo}</span>
                  </div>
                  <p className="text-xs text-green-700">{[selectedCliente.cpf, selectedCliente.telefone, selectedCliente.cidade].filter(Boolean).join(' • ')}</p>
                </div>
              )}
            </div>

            {selectedCliente && processosCliente.length > 0 && (
              <div className="space-y-1">
                <Label>Vincular a um processo (opcional)</Label>
                <Select value={selectedProcesso?.id || ''} onValueChange={(v) => setSelectedProcesso(processosCliente.find((p) => p.id === v) || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um processo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {processosCliente.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.numero_processo} — {p.tipo_processo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmar e gerar */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Título do documento *</Label>
              <Input
                value={tituloDoc}
                onChange={(e) => setTituloDoc(e.target.value)}
                placeholder="Ex: Petição Inicial - João da Silva"
              />
            </div>

            {selectedCliente && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Dados do cliente que serão vinculados</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span><strong>Nome:</strong> {selectedCliente.nome_completo}</span>
                  <span><strong>CPF:</strong> {selectedCliente.cpf || '—'}</span>
                  <span><strong>RG:</strong> {selectedCliente.rg || '—'}</span>
                  <span><strong>Tel:</strong> {selectedCliente.telefone || '—'}</span>
                  <span><strong>Email:</strong> {selectedCliente.email || '—'}</span>
                  <span><strong>Cidade:</strong> {[selectedCliente.cidade, selectedCliente.estado].filter(Boolean).join('/') || '—'}</span>
                  {selectedCliente.endereco_completo && (
                    <span className="col-span-2"><strong>Endereço:</strong> {selectedCliente.endereco_completo}</span>
                  )}
                </div>
              </div>
            )}

            {selectedProcesso && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-700">Processo vinculado</p>
                <p className="text-sm text-blue-800">{selectedProcesso.numero_processo} — {selectedProcesso.tipo_processo}</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Observações / Trechos complementares</Label>
              <Textarea
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione informações complementares para este documento específico..."
              />
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              <strong>Atenção:</strong> O modelo original permanecerá intacto na biblioteca. O registro deste documento será salvo com os dados vinculados ao cliente e processo selecionados.
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleGerar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {salvando ? 'Gerando...' : 'Gerar Documento'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Concluído */}
        {step === 3 && docGerado && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Documento gerado com sucesso!</h3>
              <p className="text-sm text-slate-500 mt-1">{docGerado.titulo}</p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2">
              <p className="text-xs text-slate-500">O registro foi salvo no histórico de documentos gerados.</p>
              {docGerado.cliente_nome && (
                <p className="text-xs text-slate-600"><strong>Cliente:</strong> {docGerado.cliente_nome}</p>
              )}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <a href={modelo.arquivo_url} target="_blank" rel="noopener noreferrer">
                <Button className="bg-rose-600 hover:bg-rose-700 text-white">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Modelo Original
                </Button>
              </a>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}