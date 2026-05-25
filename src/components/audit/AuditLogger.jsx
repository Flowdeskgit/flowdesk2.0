import { flowdesk } from '@/api/flowdeskClient';

/**
 * Sistema de log de auditoria automático
 * Registra todas as ações críticas do sistema
 */
export const AuditLogger = {
  async log(params) {
    try {
      const user = await flowdesk.auth.me().catch(() => null);
      
      const auditData = {
        usuario_id: user?.id || 'sistema',
        modulo: params.modulo,
        tipo_acao: params.tipo_acao,
        registro_id: params.registro_id,
        registro_nome: params.registro_nome,
        campo_alterado: params.campo_alterado || null,
        valor_anterior: params.valor_anterior || null,
        valor_novo: params.valor_novo || null,
        observacao_sistema: params.observacao_sistema || this.gerarObservacao(params),
        ip_origem: null // Seria obtido do backend em produção
      };

      await flowdesk.entities.Auditoria.create(auditData);
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
      // Não propagar o erro para não interromper a operação principal
    }
  },

  gerarObservacao(params) {
    const acoes = {
      'Criação': `${params.modulo} "${params.registro_nome}" criado(a)`,
      'Edição': `${params.modulo} "${params.registro_nome}" editado(a)${params.campo_alterado ? ` - Campo: ${params.campo_alterado}` : ''}`,
      'Exclusão': `${params.modulo} "${params.registro_nome}" excluído(a)`,
      'Conclusão': `${params.modulo} "${params.registro_nome}" concluído(a)`,
      'Reabertura': `${params.modulo} "${params.registro_nome}" reaberto(a)`,
      'Delegação': `${params.modulo} "${params.registro_nome}" delegado(a)`,
      'Transferência': `${params.modulo} "${params.registro_nome}" transferido(a)`,
      'Mudança de Status': `${params.modulo} "${params.registro_nome}" - Status alterado`,
      'Anexo Adicionado': `Anexo adicionado em ${params.modulo} "${params.registro_nome}"`,
      'Anexo Removido': `Anexo removido de ${params.modulo} "${params.registro_nome}"`
    };

    return acoes[params.tipo_acao] || `${params.tipo_acao} realizada em ${params.modulo}`;
  }
};

export default AuditLogger;