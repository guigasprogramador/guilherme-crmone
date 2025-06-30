-- Função para atualizar o timestamp de data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION crmonefactory.atualizar_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente a data_atualizacao em licitacoes
DROP TRIGGER IF EXISTS atualizar_licitacao_data_atualizacao ON crmonefactory.licitacoes;
CREATE TRIGGER atualizar_licitacao_data_atualizacao
BEFORE UPDATE ON crmonefactory.licitacoes
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.atualizar_data_atualizacao();

-- Trigger para atualizar automaticamente a data_atualizacao em orgaos
DROP TRIGGER IF EXISTS atualizar_orgao_data_atualizacao ON crmonefactory.orgaos;
CREATE TRIGGER atualizar_orgao_data_atualizacao
BEFORE UPDATE ON crmonefactory.orgaos
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.atualizar_data_atualizacao();

-- Trigger para atualizar automaticamente a data_atualizacao em orgao_contatos
DROP TRIGGER IF EXISTS atualizar_orgao_contato_data_atualizacao ON crmonefactory.orgao_contatos;
CREATE TRIGGER atualizar_orgao_contato_data_atualizacao
BEFORE UPDATE ON crmonefactory.orgao_contatos
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.atualizar_data_atualizacao();

-- Trigger para atualizar automaticamente a data_atualizacao em documentos
DROP TRIGGER IF EXISTS atualizar_documento_data_atualizacao ON crmonefactory.documentos;
CREATE TRIGGER atualizar_documento_data_atualizacao
BEFORE UPDATE ON crmonefactory.documentos
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.atualizar_data_atualizacao();

-- Função para registrar alterações no histórico
CREATE OR REPLACE FUNCTION crmonefactory.registrar_historico_licitacao()
RETURNS TRIGGER AS $$
DECLARE
  usuario_id UUID;
  acao TEXT;
  descricao TEXT;
BEGIN
  -- Obter o ID do usuário atual (se disponível no contexto de segurança do Supabase)
  usuario_id := auth.uid();
  
  -- Definir a ação com base no tipo de operação
  IF TG_OP = 'INSERT' THEN
    acao := 'criacao';
    descricao := 'Licitação criada';
    
    -- Inserir no histórico
    INSERT INTO crmonefactory.licitacao_historico (
      licitacao_id, usuario_id, acao, descricao, dados_antigos, dados_novos
    ) VALUES (
      NEW.id, usuario_id, acao, descricao, NULL, to_jsonb(NEW)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar se o status mudou
    IF OLD.status <> NEW.status THEN
      acao := 'mudanca_status';
      descricao := 'Status alterado de ' || OLD.status || ' para ' || NEW.status;
    ELSE
      acao := 'alteracao';
      descricao := 'Licitação atualizada';
    END IF;
    
    -- Inserir no histórico
    INSERT INTO crmonefactory.licitacao_historico (
      licitacao_id, usuario_id, acao, descricao, dados_antigos, dados_novos
    ) VALUES (
      NEW.id, usuario_id, acao, descricao, to_jsonb(OLD), to_jsonb(NEW)
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    acao := 'exclusao';
    descricao := 'Licitação excluída';
    
    -- Inserir no histórico - note que para DELETE precisamos usar OLD
    INSERT INTO crmonefactory.licitacao_historico (
      licitacao_id, usuario_id, acao, descricao, dados_antigos, dados_novos
    ) VALUES (
      OLD.id, usuario_id, acao, descricao, to_jsonb(OLD), NULL
    );
  END IF;
  
  -- Para INSERT e UPDATE retornamos NEW, para DELETE retornamos OLD
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers para o histórico de licitações
DROP TRIGGER IF EXISTS registrar_criacao_licitacao ON crmonefactory.licitacoes;
CREATE TRIGGER registrar_criacao_licitacao
AFTER INSERT ON crmonefactory.licitacoes
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.registrar_historico_licitacao();

DROP TRIGGER IF EXISTS registrar_atualizacao_licitacao ON crmonefactory.licitacoes;
CREATE TRIGGER registrar_atualizacao_licitacao
AFTER UPDATE ON crmonefactory.licitacoes
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.registrar_historico_licitacao();

-- Função para validar status de licitação
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

-- Trigger para validar status de licitação
DROP TRIGGER IF EXISTS validar_status_licitacao ON crmonefactory.licitacoes;
CREATE TRIGGER validar_status_licitacao
BEFORE INSERT OR UPDATE OF status ON crmonefactory.licitacoes
FOR EACH ROW
EXECUTE PROCEDURE crmonefactory.validar_status_licitacao();
