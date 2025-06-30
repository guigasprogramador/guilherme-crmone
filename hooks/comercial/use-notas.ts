import { useState, useEffect, useCallback } from 'react';
export type { Nota } from '@/types/comercial';

export function useNotas(oportunidadeId?: string) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotas = useCallback(async (oppId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir URL com parâmetros de filtro
      let url = '/api/comercial/notas';
      
      if (oppId || oportunidadeId) {
        url += `?oportunidadeId=${oppId || oportunidadeId}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar notas');
      }
      
      const data = await response.json();
      setNotas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar notas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [oportunidadeId]);

  const createNota = useCallback(async (nota: { oportunidadeId: string; autor: string; autorId?: string; texto: string }) => {
    try {
      const response = await fetch('/api/comercial/notas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nota),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar nota');
      }
      
      const novaNota = await response.json();
      setNotas((prev) => [novaNota, ...prev]);
      
      return novaNota;
    } catch (err) {
      console.error('Erro ao criar nota:', err);
      throw err;
    }
  }, []);

  // Carregar notas ao montar o componente ou quando o ID da oportunidade mudar
  useEffect(() => {
    if (oportunidadeId) {
      fetchNotas();
    }
  }, [oportunidadeId, fetchNotas]);

  return {
    notas,
    isLoading,
    error,
    fetchNotas,
    createNota,
  };
}
