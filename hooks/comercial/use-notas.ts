import { useState, useEffect, useCallback } from 'react';
import type { Nota } from '@/types/comercial'; // Usando o tipo de @/types/comercial

export function useNotas(oportunidadeIdInitial?: string) { // Renomeado para clareza
  const [notas, setNotas] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Adicionar estado para o ID da oportunidade se ele puder mudar após a inicialização
  const [currentOportunidadeId, setCurrentOportunidadeId] = useState<string | undefined>(oportunidadeIdInitial);

  const fetchNotas = useCallback(async (oppId?: string) => {
    const idToFetch = oppId || currentOportunidadeId;
    if (!idToFetch) {
      setNotas([]); // Limpa notas se não houver ID
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/notas?oportunidadeId=${idToFetch}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar notas' }));
        throw new Error(errorData.error || 'Erro ao buscar notas');
      }
      const data: Nota[] = await response.json();
      // Ordenar por data de criação (mais recentes primeiro)
      setNotas(data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar notas';
      setError(errorMessage);
      console.error('Erro ao buscar notas:', err);
      setNotas([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentOportunidadeId]);

  // Usado para criar uma nova nota. O tipo Nota em @/types/comercial deve ser compatível.
  const createNota = useCallback(async (notaData: Omit<Nota, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/comercial/notas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notaData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar nota' }));
        throw new Error(errorData.error || 'Erro ao criar nota');
      }
      
      const novaNota = await response.json();
      setNotas((prev) => [novaNota, ...prev].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      return novaNota;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar nota';
      setError(errorMessage);
      console.error('Erro ao criar nota:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateNota = useCallback(async (notaId: string, dadosUpdate: Partial<Pick<Nota, 'texto' | 'data' | 'tipo'>>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/notas/${notaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Erro ao atualizar nota ${notaId}` }));
        throw new Error(errorData.error || `Erro ao atualizar nota ${notaId}`);
      }
      const notaAtualizada: Nota = await response.json();
      setNotas((prevNotas) =>
        prevNotas.map((n) => (n.id === notaId ? notaAtualizada : n))
                 .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      );
      return notaAtualizada;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Erro desconhecido ao atualizar nota ${notaId}`;
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteNota = useCallback(async (notaId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/notas/${notaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Erro ao excluir nota ${notaId}` }));
        throw new Error(errorData.error || `Erro ao excluir nota ${notaId}`);
      }
      setNotas((prevNotas) => prevNotas.filter((n) => n.id !== notaId));
      return await response.json(); // Retorna a mensagem de sucesso da API
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Erro desconhecido ao excluir nota ${notaId}`;
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efeito para buscar notas quando o ID da oportunidade mudar
  useEffect(() => {
    if (currentOportunidadeId) {
      fetchNotas(currentOportunidadeId);
    } else {
      setNotas([]); // Limpa as notas se não houver ID
    }
  }, [currentOportunidadeId, fetchNotas]);

  // Função para permitir que o componente consumidor atualize o ID da oportunidade
  const setOportunidadeId = useCallback((id: string | undefined) => {
    setCurrentOportunidadeId(id);
  }, []);


  return {
    notas,
    isLoading,
    error,
    fetchNotas,
    createNota,
    updateNota, // Expor nova função
    deleteNota, // Expor nova função
    setOportunidadeId, // Expor para permitir mudança dinâmica do ID
  };
}
