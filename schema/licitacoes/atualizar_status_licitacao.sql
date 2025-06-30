-- Script para atualizar a função de validação de status de licitação

-- Atualizar a função para incluir os novos status
CREATE OR REPLACE FUNCTION crmonefactory.validar_status_licitacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o status fornecido é válido
  IF NEW.status NOT IN (
    'analise_interna', 'analise_edital', 'aguardando_pregao', 'em_andamento', 'envio_documentos', 
    'assinaturas', 'vencida', 'nao_vencida', 'concluida', 'arquivada'
  ) THEN
    RAISE EXCEPTION 'Status de licitação inválido: %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger para usar a função atualizada
DROP TRIGGER IF EXISTS validar_status_licitacao ON crmonefactory.licitacoes;
CREATE TRIGGER validar_status_licitacao
BEFORE INSERT OR UPDATE OF status ON crmonefactory.licitacoes
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.validar_status_licitacao();