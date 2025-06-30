import { useState, useEffect, useCallback } from 'react';

export interface OrgaoContato {
  id: string;
  orgaoId: string;
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  // principal?: boolean; // Campo não está na tabela orgao_contatos
  createdAt?: string; // A API retorna strings formatadas
  updatedAt?: string;
}

// Payload para criar um contato (sem id, createdAt, updatedAt)
// orgaoId será pego do contexto do hook ou passado explicitamente se necessário
export interface OrgaoContatoPayload {
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  // principal?: boolean;
}


export function useOrgaoContatos(orgaoId?: string) {
  const [contatos, setContatos] = useState<OrgaoContato[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A API já formata para camelCase, então não precisamos de um formatador aqui.
  // Se a API retornasse snake_case, um formatador seria necessário.

  const fetchContatos = useCallback(async (currentOrgaoId?: string) => {
    const idToFetch = currentOrgaoId || orgaoId;
    if (!idToFetch) {
      setContatos([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/orgaos/${idToFetch}/contatos`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar contatos do órgão' }));
        throw new Error(errorData.error || 'Erro ao buscar contatos do órgão');
      }
      const data: OrgaoContato[] = await response.json();
      setContatos(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar contatos do órgão:', err);
      setContatos([]);
    } finally {
      setIsLoading(false);
    }
  }, [orgaoId]);

  const createContato = useCallback(async (contatoData: OrgaoContatoPayload) => {
    if (!orgaoId) {
        throw new Error("ID do Órgão é obrigatório para criar um contato.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/orgaos/${orgaoId}/contatos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contatoData), // API espera camelCase
      });
      if (!response.ok) {
        let errorMsg = 'Erro ao criar contato';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          try {
            const text = await response.text();
            if (text) errorMsg = text;
          } catch {}
        }
        throw new Error(errorMsg);
      }
      const novoContato: OrgaoContato = await response.json(); // API retorna camelCase
      setContatos((prev) => [...prev, novoContato].sort((a,b) => a.nome.localeCompare(b.nome)));
      return novoContato;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao criar contato:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [orgaoId]);

  const updateContato = useCallback(async (contatoId: string, contatoData: Partial<OrgaoContatoPayload>) => {
    if (!orgaoId) {
        throw new Error("ID do Órgão é obrigatório para atualizar um contato.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/orgaos/${orgaoId}/contatos/${contatoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contatoData), // API espera camelCase
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar contato' }));
        throw new Error(errorData.error || 'Erro ao atualizar contato');
      }
      const contatoAtualizado: OrgaoContato = await response.json(); // API retorna camelCase
      setContatos((prev) =>
        prev.map((c) => (c.id === contatoId ? contatoAtualizado : c)).sort((a,b) => a.nome.localeCompare(b.nome))
      );
      return contatoAtualizado;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar contato:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [orgaoId]);

  const deleteContato = useCallback(async (contatoId: string) => {
    if (!orgaoId) {
        throw new Error("ID do Órgão é obrigatório para excluir um contato.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/licitacoes/orgaos/${orgaoId}/contatos/${contatoId}`, {
        method: 'DELETE',
      });
      if (!response.ok) { // Status 204 No Content também é ok
        if (response.status === 204) {
             setContatos((prev) => prev.filter((c) => c.id !== contatoId));
             return; // Retorna void para DELETE bem-sucedido
        }
        const errorData = await response.json().catch(() => ({ error: 'Erro ao excluir contato' }));
        throw new Error(errorData.error || 'Erro ao excluir contato');
      }
      setContatos((prev) => prev.filter((c) => c.id !== contatoId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao excluir contato:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [orgaoId]);

  useEffect(() => {
    if (orgaoId) {
      fetchContatos(orgaoId);
    } else {
      setContatos([]); // Limpa contatos se orgaoId for removido/nulo
    }
  }, [orgaoId, fetchContatos]);

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
