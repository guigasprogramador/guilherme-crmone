import { useState, useEffect, useCallback } from 'react';
import { Cliente } from '@/types/comercial';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async (filtros?: { termo?: string; segmento?: string; ativo?: boolean }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir URL com parâmetros de filtro
      let url = '/api/comercial/clientes';
      
      if (filtros) {
        const params = new URLSearchParams();
        
        if (filtros.termo) params.append('termo', filtros.termo);
        if (filtros.segmento && filtros.segmento !== 'todos') params.append('segmento', filtros.segmento);
        if (filtros.ativo !== undefined) params.append('ativo', filtros.ativo.toString());
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar clientes');
      }
      
      const data = await response.json();
      setClientes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCliente = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/clientes/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar cliente');
      }
      
      return await response.json();
    } catch (err) {
      console.error('Erro ao buscar cliente:', err);
      throw err;
    }
  }, []);

  const createCliente = useCallback(async (cliente: Partial<Cliente>) => {
    try {
      const response = await fetch('/api/comercial/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cliente),
      });
      
      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Erro no servidor: Resposta inesperada');
      }
      
      // Obter o corpo da resposta para acessar mensagens de erro específicas
      const data = await response.json();
      
      if (!response.ok) {
        // Capturar a mensagem de erro específica da API
        throw new Error(data.error || 'Erro ao criar cliente');
      }
      
      setClientes((prev) => [...prev, data]);
      
      return data;
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      throw err;
    }
  }, []);

  const updateCliente = useCallback(async (id: string, data: Partial<Cliente>) => {
    try {
      const response = await fetch(`/api/comercial/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar cliente');
      }
      
      const clienteAtualizado = await response.json();
      
      setClientes((prev) =>
        prev.map((cliente) => (cliente.id === id ? clienteAtualizado : cliente))
      );
      
      return clienteAtualizado;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw err;
    }
  }, []);

  const deleteCliente = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/clientes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao desativar cliente');
      }
      
      // Atualizar o cliente para inativo na lista local
      setClientes((prev) =>
        prev.map((cliente) => (cliente.id === id ? { ...cliente, ativo: false } : cliente))
      );
      
      return true;
    } catch (err) {
      console.error('Erro ao desativar cliente:', err);
      throw err;
    }
  }, []);

  // Carregar clientes ao montar o componente
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return {
    clientes,
    isLoading,
    error,
    fetchClientes,
    getCliente,
    createCliente,
    updateCliente,
    deleteCliente,
    setClientes
  };
}
