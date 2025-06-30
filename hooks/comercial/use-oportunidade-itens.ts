import { useState, useEffect, useCallback } from 'react';

// Defina uma interface para OportunidadeItem (camelCase, correspondendo à resposta da API)
export interface OportunidadeItem {
  id: string;
  oportunidadeId: string;
  itemNome: string;
  descricao?: string | null;
  quantidade: number;
  unidade?: string | null;
  valorUnitario: number;
  valorTotal: number;
  ordem?: number | null;
  createdAt?: string; // Ou Date
  updatedAt?: string; // Ou Date
}

export function useOportunidadeItens(oportunidadeId?: string) {
  const [itens, setItens] = useState<OportunidadeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItens = useCallback(async (currentOportunidadeId?: string) => {
    const idToFetch = currentOportunidadeId || oportunidadeId;
    if (!idToFetch) {
      setItens([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/oportunidades/${idToFetch}/itens`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar itens da oportunidade' }));
        throw new Error(errorData.error || 'Erro ao buscar itens da oportunidade');
      }
      const data = await response.json();
      setItens(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar itens da oportunidade:', err);
      setItens([]);
    } finally {
      setIsLoading(false);
    }
  }, [oportunidadeId]);

  const createItem = useCallback(async (itemData: Omit<OportunidadeItem, 'id' | 'valorTotal' | 'createdAt' | 'updatedAt'>) => {
    if (!itemData.oportunidadeId) {
        throw new Error("ID da Oportunidade é obrigatório para criar um item.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/oportunidades/${itemData.oportunidadeId}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar item' }));
        throw new Error(errorData.error || 'Erro ao criar item');
      }
      const novoItem = await response.json();
      setItens((prev) => [...prev, novoItem].sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0) || new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()));
      // É importante que a API retorne o valorTotal da oportunidade atualizado ou o frontend o busque separadamente
      return novoItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao criar item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (itemId: string, itemData: Partial<Omit<OportunidadeItem, 'id' | 'oportunidadeId' | 'valorTotal' | 'createdAt' | 'updatedAt'>>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/oportunidade-itens/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar item' }));
        throw new Error(errorData.error || 'Erro ao atualizar item');
      }
      const itemAtualizado = await response.json();
      setItens((prev) =>
        prev.map((item) => (item.id === itemId ? itemAtualizado : item)).sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0) || new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
      );
      return itemAtualizado;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comercial/oportunidade-itens/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao excluir item' }));
        throw new Error(errorData.error || 'Erro ao excluir item');
      }
      setItens((prev) => prev.filter((item) => item.id !== itemId));
      // A API retorna { message: '...' } em caso de sucesso no delete, não o item excluído.
      // É importante que a API retorne o valorTotal da oportunidade atualizado ou o frontend o busque separadamente
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao excluir item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (oportunidadeId) {
      fetchItens(oportunidadeId);
    } else {
      setItens([]);
    }
  }, [oportunidadeId, fetchItens]);

  return {
    itens,
    isLoading,
    error,
    fetchItens,
    createItem,
    updateItem,
    deleteItem,
  };
}
