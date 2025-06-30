import { useState, useEffect, useCallback } from 'react';
export type { Reuniao } from '@/types/comercial';

export function useReunioes(oportunidadeId?: string) {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReunioes = useCallback(async (filtros?: { oportunidadeId?: string; data?: string; concluida?: boolean }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir URL com parâmetros de filtro
      let url = '/api/comercial/reunioes';
      
      if (filtros || oportunidadeId) {
        const params = new URLSearchParams();
        
        if (filtros?.oportunidadeId || oportunidadeId) {
          params.append('oportunidadeId', filtros?.oportunidadeId || oportunidadeId || '');
        }
        
        if (filtros?.data) {
          params.append('data', filtros.data);
        }
        
        if (filtros?.concluida !== undefined) {
          params.append('concluida', filtros.concluida.toString());
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar reuniões');
      }
      
      const data = await response.json();
      setReunioes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar reuniões:', err);
    } finally {
      setIsLoading(false);
    }
  }, [oportunidadeId]);

  const getReuniao = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/reunioes/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar reunião');
      }
      
      return await response.json();
    } catch (err) {
      console.error('Erro ao buscar reunião:', err);
      throw err;
    }
  }, []);

  const createReuniao = useCallback(async (reuniao: Partial<Reuniao>) => {
    try {
      const response = await fetch('/api/comercial/reunioes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reuniao),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar reunião');
      }
      
      const novaReuniao = await response.json();
      setReunioes((prev) => [...prev, novaReuniao]);
      
      return novaReuniao;
    } catch (err) {
      console.error('Erro ao criar reunião:', err);
      throw err;
    }
  }, []);

  const updateReuniao = useCallback(async (id: string, data: Partial<Reuniao>) => {
    try {
      const response = await fetch(`/api/comercial/reunioes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar reunião');
      }
      
      const reuniaoAtualizada = await response.json();
      
      setReunioes((prev) =>
        prev.map((reuniao) => (reuniao.id === id ? reuniaoAtualizada : reuniao))
      );
      
      return reuniaoAtualizada;
    } catch (err) {
      console.error('Erro ao atualizar reunião:', err);
      throw err;
    }
  }, []);

  const marcarReuniaoConcluida = useCallback(async (id: string, concluida: boolean, notas?: string) => {
    try {
      const response = await fetch(`/api/comercial/reunioes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ concluida, notas }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao marcar reunião como concluída');
      }
      
      const reuniaoAtualizada = await response.json();
      
      setReunioes((prev) =>
        prev.map((reuniao) => (reuniao.id === id ? reuniaoAtualizada : reuniao))
      );
      
      return reuniaoAtualizada;
    } catch (err) {
      console.error('Erro ao marcar reunião como concluída:', err);
      throw err;
    }
  }, []);

  const deleteReuniao = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/reunioes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir reunião');
      }
      
      setReunioes((prev) => prev.filter((reuniao) => reuniao.id !== id));
      
      return true;
    } catch (err) {
      console.error('Erro ao excluir reunião:', err);
      throw err;
    }
  }, []);

  // Carregar reuniões ao montar o componente ou quando o ID da oportunidade mudar
  useEffect(() => {
    if (oportunidadeId) {
      fetchReunioes();
    }
  }, [oportunidadeId, fetchReunioes]);

  return {
    reunioes,
    isLoading,
    error,
    fetchReunioes,
    getReuniao,
    createReuniao,
    updateReuniao,
    marcarReuniaoConcluida,
    deleteReuniao,
  };
}
