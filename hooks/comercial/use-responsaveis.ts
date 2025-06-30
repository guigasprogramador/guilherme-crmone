import { useState, useEffect, useCallback } from 'react';
import { Responsavel } from '@/types/comercial';

export function useResponsaveis() {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResponsaveis = useCallback(async (filtros?: { termo?: string; departamento?: string; ativo?: boolean }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir URL com parâmetros de filtro
      let url = '/api/comercial/responsaveis';
      
      if (filtros) {
        const params = new URLSearchParams();
        
        if (filtros.termo) params.append('termo', filtros.termo);
        if (filtros.departamento && filtros.departamento !== 'todos') params.append('departamento', filtros.departamento);
        if (filtros.ativo !== undefined) params.append('ativo', filtros.ativo.toString());
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar responsáveis');
      }
      
      const data = await response.json();
      setResponsaveis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar responsáveis:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getResponsavel = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/responsaveis/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar responsável');
      }
      
      return await response.json();
    } catch (err) {
      console.error('Erro ao buscar responsável:', err);
      throw err;
    }
  }, []);

  const createResponsavel = useCallback(async (responsavel: Partial<Responsavel>) => {
    try {
      const response = await fetch('/api/comercial/responsaveis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responsavel),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar responsável');
      }
      
      const novoResponsavel = await response.json();
      setResponsaveis((prev) => [...prev, novoResponsavel]);
      
      return novoResponsavel;
    } catch (err) {
      console.error('Erro ao criar responsável:', err);
      throw err;
    }
  }, []);

  const updateResponsavel = useCallback(async (id: string, data: Partial<Responsavel>) => {
    try {
      const response = await fetch(`/api/comercial/responsaveis/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar responsável');
      }
      
      const responsavelAtualizado = await response.json();
      
      setResponsaveis((prev) =>
        prev.map((resp) => (resp.id === id ? responsavelAtualizado : resp))
      );
      
      return responsavelAtualizado;
    } catch (err) {
      console.error('Erro ao atualizar responsável:', err);
      throw err;
    }
  }, []);

  const deleteResponsavel = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/responsaveis/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao desativar responsável');
      }
      
      // Atualizar o responsável para inativo na lista local
      setResponsaveis((prev) =>
        prev.map((resp) => (resp.id === id ? { ...resp, ativo: false } : resp))
      );
      
      return true;
    } catch (err) {
      console.error('Erro ao desativar responsável:', err);
      throw err;
    }
  }, []);

  // Carregar responsáveis ao montar o componente
  useEffect(() => {
    fetchResponsaveis();
  }, [fetchResponsaveis]);

  return {
    responsaveis,
    isLoading,
    error,
    fetchResponsaveis,
    getResponsavel,
    createResponsavel,
    updateResponsavel,
    deleteResponsavel,
  };
}
