import { useState, useEffect, useCallback } from 'react';
import { Contato } from '@/types/comercial'; // Certifique-se que Contato em types/comercial.ts tem todos os campos necessários (id, clienteId, nome, cargo, email, telefone, principal)

export function useContatos(clienteId?: string) {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContatos = useCallback(async (currentClienteId?: string) => {
    const idToFetch = currentClienteId || clienteId;
    if (!idToFetch) {
      setContatos([]); // Limpa contatos se não houver clienteId
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contatos?cliente_id=${idToFetch}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar contatos' }));
        throw new Error(errorData.error || 'Erro ao buscar contatos');
      }
      const data = await response.json();
      setContatos(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar contatos';
      setError(errorMessage);
      console.error('Erro ao buscar contatos:', err);
      setContatos([]); // Limpa contatos em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, [clienteId]);

  const createContato = useCallback(async (contatoData: Omit<Contato, 'id' | 'createdAt' | 'updatedAt' | 'clienteId'> & { clienteId: string }) => {
    setIsLoading(true); // Pode ser um isLoadingCreate específico
    setError(null);
    try {
      const response = await fetch('/api/contatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contatoData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar contato' }));
        throw new Error(errorData.error || 'Erro ao criar contato');
      }
      const novoContato = await response.json();
      setContatos((prev) => [novoContato, ...prev].sort((a, b) => a.nome.localeCompare(b.nome))); // Adiciona e ordena
      return novoContato;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar contato';
      setError(errorMessage);
      console.error('Erro ao criar contato:', err);
      throw err; // Relança para o componente tratar (ex: toast)
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateContato = useCallback(async (id: string, contatoData: Partial<Omit<Contato, 'id' | 'clienteId' | 'createdAt' | 'updatedAt'>>) => {
    setIsLoading(true); // Pode ser um isLoadingUpdate específico
    setError(null);
    try {
      const response = await fetch(`/api/contatos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contatoData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar contato' }));
        throw new Error(errorData.error || 'Erro ao atualizar contato');
      }
      const contatoAtualizado = await response.json();
      setContatos((prev) =>
        prev.map((c) => (c.id === id ? contatoAtualizado : c)).sort((a, b) => a.nome.localeCompare(b.nome))
      );
      return contatoAtualizado;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar contato';
      setError(errorMessage);
      console.error('Erro ao atualizar contato:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteContato = useCallback(async (id: string) => {
    setIsLoading(true); // Pode ser um isLoadingDelete específico
    setError(null);
    try {
      const response = await fetch(`/api/contatos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao excluir contato' }));
        throw new Error(errorData.error || 'Erro ao excluir contato');
      }
      setContatos((prev) => prev.filter((c) => c.id !== id));
      // Não precisa retornar nada específico, ou pode retornar true/response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao excluir contato';
      setError(errorMessage);
      console.error('Erro ao excluir contato:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clienteId) {
      fetchContatos(clienteId);
    } else {
      setContatos([]); // Limpa contatos se clienteId for removido/nulo
    }
  }, [clienteId, fetchContatos]);

  return {
    contatos,
    isLoading,
    error,
    fetchContatos,
    createContato,
    updateContato,
    deleteContato,
  };
}
