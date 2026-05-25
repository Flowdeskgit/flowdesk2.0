import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

function extrairVariaveis(texto) {
  const matches = texto?.match(/\{\{[^}]+\}\}/g) || [];
  return [...new Set(matches)];
}

export default function GerarPDFDialog({ open, onClose, modelo, user, onDocumentoGerado }) {
  const [clienteId, setClienteId] = useState('');
  const [valores, setValores] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => flowdesk.entities.Cliente.list('nome', 200),
    enabled: open,
  });

  const clienteSelecionado = clientes.find(c => c.id === clienteId);
  const variaveis = extrairVariaveis(modelo?.conteudo_template);

  useEffect(() => {
    if (!open) { setClienteId(''); setValores({}); }
  }, [open]);

  useEffect(() => {
    if (clienteSelecionado) {
      const autoFill = {};
      variaveis.forEach(v => {
        const key = v.replace(/[{}]/g, '');
        if (key === 'nome_cliente') autoFill[v] = clienteSelecionado.nome || '';
        else if (key === 'cpf_cliente') autoFill[v] = clienteSelecionado.cpf || '';
        else if (key === 'data_nascimento') autoFill[v] = clienteSelecionado.data_nascimento || '';
        else if (key === 'data_hoje') autoFill[v] = format(new Date(), 'dd/MM/yyyy');
      });
      setValores(autoFill);
    }
  }, [clienteId]);

  const gerarPDF = async () => {
    setSaving(true);
    let conteudo = modelo.conteudo_template;
    variaveis.forEach(v => { conteudo = conteudo.replaceAll(v, valores[v] || ''); });

    // Gerar PDF
    const doc = new jsPDF();
    const linhas = doc.splitTextToSize(conteudo, 180);
    let y = 20;
    linhas.forEach(linha => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(linha, 15, y);
      y += 7;
    });

    const titulo = `${modelo.nome}${clienteSelecionado ? ' - ' + clienteSelecionado.nome : ''} - ${format(new Date(), 'dd-MM-yyyy')}`;
    doc.save(`${titulo}.pdf`);

    // Salvar registro
    const docGerado = await flowdesk.entities.DocumentoGerado.create({
      modelo_id: modelo.id,
      nome_modelo: modelo.nome,
      titulo,
      cliente_id: clienteId || null,
      cliente_nome: clienteSelecionado?.nome || null,
      dados_preenchidos: JSON.stringify(valores),
      status: 'finalizado',
      gerado_por: user?.email,
    });

    // Enviar por e-mail se cliente tem e-mail
    const emailCliente = clienteSelecionado?.email;
    if (emailCliente) {
      try {
        await flowdesk.integrations.Core.SendEmail({
          to: emailCliente,
          subject: `Documento: ${titulo}`,
          body: `Prezado(a) ${clienteSelecionado.nome},

Segue em anexo o documento "${titulo}" gerado pelo escritório MCR Advocacia.

Caso tenha dúvidas, entre em contato conosco.

Atenciosamente,
Equipe MCR Advocacia`,
        });
        toast.success(`E-mail enviado para ${emailCliente}`);
      } catch (e) {
        toast.error('Documento gerado, mas falha ao enviar e-mail.');
      }
    }

    setSaving(false);
    onDocumentoGerado?.();
    onClose();
  };

  if (!modelo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar PDF — {modelo.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Cliente (opcional)</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {variaveis.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Preencha as variáveis:</p>
              {variaveis.map(v => (
                <div key={v}>
                  <Label className="text-xs">{v}</Label>
                  <Input
                    value={valores[v] || ''}
                    onChange={e => setValores(prev => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Valor para ${v}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={gerarPDF} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
            <FileDown className="mr-2 h-4 w-4" />{saving ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}