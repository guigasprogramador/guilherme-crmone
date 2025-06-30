import { useState, useEffect, useCallback } from 'react';

// Interface para LicitacaoEtapa (camelCase, correspondendo à resposta da API formatada)
export interface LicitacaoEtapa {
  id: string;
  licitacaoId: string;
  nome: string;
  descricao?: string | null;
  dataLimite?: string | null; // Formatado DD/MM/YYYY
  status: string;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  observacoes?: string | null;
  dataCriacao?: string; // Formatado DD/MM/YYYY
  dataConclusao?: string | null; // Formatado DD/MM/YYYY
}

// Interface para o payload de criação/atualização (pode esperar datas como string ISO ou YYYY-MM-DD)
// A API já está preparada para receber DD/MM/YYYY e converter internamente para o formato do DB.
export interface LicitacaoEtapaPayload {
  nome: string;
  status: string;
  descricao?: string | null;
  dataLimite?: string | null; // ex: "DD/MM/YYYY"
  responsavelId?: string | null;
  observacoes?: string | null;
  dataConclusao?: string | null; // ex: "DD/MM/YYYY"
}

export function useLicitacaoEtapas(licitacaoId?: string) {
  const [etapas, setEtapas] = useState<LicitacaoEtapa[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEtapas = useCallback(async (currentLicitacaoId?: string) => {
    const idToFetch = currentLicitacaoId || licitacaoId;
    if (!idToFetch) {
      setEtapas([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/${idToFetch}/etapas`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar etapas' }));
        throw new Error(errorData.error || 'Erro ao buscar etapas');
      }
      const data = await response.json();
      setEtapas(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar etapas:', err);
      setEtapas([]);
    } finally {
      setIsLoading(false);
    }
  }, [licitacaoId]);

  const createEtapa = useCallback(async (etapaData: LicitacaoEtapaPayload) => {
    if (!licitacaoId) {
        throw new Error("ID da Licitação é obrigatório para criar uma etapa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/${licitacaoId}/etapas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(etapaData), // API espera camelCase e datas DD/MM/YYYY
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar etapa' }));
        throw new Error(errorData.error || 'Erro ao criar etapa');
      }
      const novaEtapa = await response.json(); // API retorna dados formatados (camelCase, datas DD/MM/YYYY)
      setEtapas((prev) => [...prev, novaEtapa].sort((a,b) => {
        const dateA = a.dataLimite ? new Date(a.dataLimite.split('/').reverse().join('-')).getTime() : 0;
        const dateB = b.dataLimite ? new Date(b.dataLimite.split('/').reverse().join('-')).getTime() : 0;
        const dateCriacaoA = a.dataCriacao ? new Date(a.dataCriacao.split('/').reverse().join('-')).getTime() : 0;
        const dateCriacaoB = b.dataCriacao ? new Date(b.dataCriacao.split('/').reverse().join('-')).getTime() : 0;
        return (dateA || dateCriacaoA) - (dateB || dateCriacaoB);
      }));
      return novaEtapa;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao criar etapa:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [licitacaoId]);

  const updateEtapa = useCallback(async (etapaId: string, etapaData: Partial<LicitacaoEtapaPayload>) => {
    if (!licitacaoId) {
        throw new Error("ID da Licitação é obrigatório para atualizar uma etapa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/${licitacaoId}/etapas/${etapaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(etapaData), // API espera camelCase e datas DD/MM/YYYY
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar etapa' }));
        throw new Error(errorData.error || 'Erro ao atualizar etapa');
      }
      const etapaAtualizada = await response.json(); // API retorna dados formatados
      setEtapas((prev) =>
        prev.map((e) => (e.id === etapaId ? etapaAtualizada : e)).sort((a,b) => {
          const dateA = a.dataLimite ? new Date(a.dataLimite.split('/').reverse().join('-')).getTime() : 0;
          const dateB = b.dataLimite ? new Date(b.dataLimite.split('/').reverse().join('-')).getTime() : 0;
          const dateCriacaoA = a.dataCriacao ? new Date(a.dataCriacao.split('/').reverse().join('-')).getTime() : 0;
          const dateCriacaoB = b.dataCriacao ? new Date(b.dataCriacao.split('/').reverse().join('-')).getTime() : 0;
          return (dateA || dateCriacaoA) - (dateB || dateCriacaoB);
        })
      );
      return etapaAtualizada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar etapa:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [licitacaoId]);

  const deleteEtapa = useCallback(async (etapaId: string) => {
    if (!licitacaoId) {
        throw new Error("ID da Licitação é obrigatório para excluir uma etapa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/${licitacaoId}/etapas/${etapaId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao excluir etapa' }));
        throw new Error(errorData.error || 'Erro ao excluir etapa');
      }
      setEtapas((prev) => prev.filter((e) => e.id !== etapaId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao excluir etapa:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [licitacaoId]);

  useEffect(() => {
    if (licitacaoId) {
      fetchEtapas(licitacaoId);
    } else {
      setEtapas([]);
    }
  }, [licitacaoId, fetchEtapas]);

  return {
    etapas,
    isLoading,
    error,
    fetchEtapas,
    createEtapa,
    updateEtapa,
    deleteEtapa,
  };
}
