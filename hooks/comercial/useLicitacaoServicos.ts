import { useState, useEffect, useCallback } from 'react';

// Interface para LicitacaoServico (camelCase)
export interface LicitacaoServico {
  id: string;
  licitacaoId: string;
  nome: string;
  descricao?: string | null;
  valor?: number | null; // API retorna como string, converter para number
  unidade?: string | null;
  quantidade?: number | null; // API retorna como string, converter para number
  createdAt?: string; // Ou Date, dependendo da formatação final
  updatedAt?: string; // Ou Date
}

// Helper para formatar dados da API (snake_case para camelCase e conversões)
function formatApiServicoToFrontend(apiItem: any): LicitacaoServico {
  return {
    id: apiItem.id,
    licitacaoId: apiItem.licitacao_id,
    nome: apiItem.nome,
    descricao: apiItem.descricao,
    valor: apiItem.valor !== null && apiItem.valor !== undefined ? parseFloat(apiItem.valor) : null,
    unidade: apiItem.unidade,
    quantidade: apiItem.quantidade !== null && apiItem.quantidade !== undefined ? parseInt(apiItem.quantidade, 10) : null,
    createdAt: apiItem.created_at,
    updatedAt: apiItem.updated_at,
  };
}

export function useLicitacaoServicos(licitacaoId?: string) {
  const [servicos, setServicos] = useState<LicitacaoServico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServicos = useCallback(async (currentLicitacaoId?: string) => {
    const idToFetch = currentLicitacaoId || licitacaoId;
    if (!idToFetch) {
      setServicos([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/${idToFetch}/servicos`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar serviços da licitação' }));
        throw new Error(errorData.error || 'Erro ao buscar serviços da licitação');
      }
      const data = await response.json();
      setServicos(Array.isArray(data) ? data.map(formatApiServicoToFrontend) : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar serviços da licitação:', err);
      setServicos([]);
    } finally {
      setIsLoading(false);
    }
  }, [licitacaoId]);

  const createServico = useCallback(async (servicoData: Omit<LicitacaoServico, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!servicoData.licitacaoId) {
        throw new Error("ID da Licitação é obrigatório para criar um serviço.");
    }
    setIsLoading(true);
    setError(null);
    try {
      // Frontend envia camelCase, API pode esperar snake_case ou camelCase (API atual parece aceitar camelCase para body)
      // A API de POST /api/licitacoes/[id]/servicos espera 'nome', 'descricao', 'valor', 'unidade', 'quantidade'
      const payload = {
          nome: servicoData.nome,
          descricao: servicoData.descricao,
          valor: servicoData.valor,
          unidade: servicoData.unidade,
          quantidade: servicoData.quantidade,
      };
      const response = await fetch(`/api/licitacoes/${servicoData.licitacaoId}/servicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar serviço' }));
        throw new Error(errorData.error || 'Erro ao criar serviço');
      }
      const novoServicoApi = await response.json();
      const novoServicoFrontend = formatApiServicoToFrontend(novoServicoApi);
      setServicos((prev) => [...prev, novoServicoFrontend].sort((a,b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()));
      return novoServicoFrontend;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao criar serviço:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateServico = useCallback(async (servicoId: string, licitacaoIdContext: string, servicoData: Partial<Omit<LicitacaoServico, 'id' | 'licitacaoId' | 'createdAt' | 'updatedAt'>>) => {
    if (!licitacaoIdContext) {
        throw new Error("Contexto de ID da Licitação é obrigatório para atualizar um serviço.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const payload = { ...servicoData }; // API aceita campos em camelCase
      const response = await fetch(`/api/licitacoes/${licitacaoIdContext}/servicos/${servicoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar serviço' }));
        throw new Error(errorData.error || 'Erro ao atualizar serviço');
      }
      const servicoAtualizadoApi = await response.json();
      const servicoAtualizadoFrontend = formatApiServicoToFrontend(servicoAtualizadoApi);
      setServicos((prev) =>
        prev.map((s) => (s.id === servicoId ? servicoAtualizadoFrontend : s)).sort((a,b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
      );
      return servicoAtualizadoFrontend;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar serviço:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteServico = useCallback(async (servicoId: string, licitacaoIdContext: string) => {
    if (!licitacaoIdContext) {
        throw new Error("Contexto de ID da Licitação é obrigatório para excluir um serviço.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/${licitacaoIdContext}/servicos/${servicoId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao excluir serviço' }));
        throw new Error(errorData.error || 'Erro ao excluir serviço');
      }
      setServicos((prev) => prev.filter((s) => s.id !== servicoId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao excluir serviço:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (licitacaoId) {
      fetchServicos(licitacaoId);
    } else {
      setServicos([]);
    }
  }, [licitacaoId, fetchServicos]);

  return {
    servicos,
    isLoading,
    error,
    fetchServicos,
    createServico,
    updateServico,
    deleteServico,
  };
}
