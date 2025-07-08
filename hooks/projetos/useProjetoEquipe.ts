// hooks/projetos/useProjetoEquipe.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface MembroEquipe {
  equipe_rel_id: string;
  projeto_id?: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email?: string;
  avatar_url?: string | null;
  papel_no_projeto: string;
  data_alocacao?: string;
}

export interface AddMembroPayload {
  usuario_id: string;
  papel_no_projeto: string;
}

export interface UpdatePapelPayload {
  papel_no_projeto: string;
}

export function useProjetoEquipe(projetoIdInitial?: string) {
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProjetoId, setCurrentProjetoId] = useState<string | undefined>(projetoIdInitial);
  const auth = useAuth();

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    const { refreshToken, logout, getAccessToken } = auth;
    let token = getAccessToken();
    const doRequest = async (currentToken: string | null) => {
      const headers = { 'Content-Type': 'application/json', ...options.headers, };
      if (currentToken) { (headers as any)['Authorization'] = `Bearer ${currentToken}`; }
      const res = await fetch(url, { ...options, headers, credentials: 'include' });
      if (res.status === 401 && currentToken) {
        throw { status: 401, data: await res.json().catch(() => ({error: `Unauthorized: ${res.statusText}`})) };
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `API Error: ${res.status} ${res.statusText}` }));
        throw new Error(errorData.error || `API Error: ${res.status}`);
      }
      return res;
    };
    try { return await doRequest(token); }
    catch (err: any) {
      if (err && err.status === 401 && token) {
        try {
          const newToken = await refreshToken();
          if (!newToken) { logout(); setError("Sessão expirada."); throw new Error("Failed to refresh token, user logged out.");}
          return await doRequest(newToken);
        } catch (refreshError: any) { logout(); setError("Sessão expirada."); throw refreshError; }
      } else { throw err; }
    }
  }, [auth]);

  const fetchEquipe = useCallback(async (pId?: string) => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) { setEquipe([]); return; }
    setIsLoading(true); setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/equipe`);
      const data = await response.json();
      setEquipe(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") { setError(err.message || 'Falha ao buscar equipe.');}
      console.error('Falha ao buscar equipe:', err); setEquipe([]);
    } finally { setIsLoading(false); }
  }, [currentProjetoId, makeAuthenticatedRequest]);

  const addMembroEquipe = useCallback(async (membroData: AddMembroPayload, pId?: string): Promise<MembroEquipe | null> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) { throw new Error("ID do projeto é obrigatório para adicionar membro."); }
    setIsLoading(true); setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/equipe`, {
        method: 'POST',
        body: JSON.stringify(membroData),
      });
      const novoMembro = await response.json();
      setEquipe(prev => [...prev, novoMembro].sort((a,b) => (a.usuario_nome || "").localeCompare(b.usuario_nome || "")));
      return novoMembro;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") { setError(err.message || 'Falha ao adicionar membro.');}
      console.error('Falha ao adicionar membro:', err); throw err;
    } finally { setIsLoading(false); }
  }, [currentProjetoId, makeAuthenticatedRequest]);

  const updatePapelMembro = useCallback(async (usuarioId: string, payload: UpdatePapelPayload, pId?: string): Promise<MembroEquipe | null> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) { throw new Error("ID do projeto é obrigatório para atualizar papel."); }
    setIsLoading(true); setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/equipe/${usuarioId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const membroAtualizado = await response.json();
      setEquipe(prev => prev.map(m => m.usuario_id === usuarioId ? membroAtualizado : m)
                             .sort((a,b) => (a.usuario_nome || "").localeCompare(b.usuario_nome || "")));
      return membroAtualizado;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") { setError(err.message || `Falha ao atualizar papel do membro ${usuarioId}.`);}
      console.error(`Falha ao atualizar papel do membro ${usuarioId}:`, err); throw err;
    } finally { setIsLoading(false); }
  }, [currentProjetoId, makeAuthenticatedRequest]);

  const removeMembroEquipe = useCallback(async (usuarioId: string, pId?: string): Promise<boolean> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) { throw new Error("ID do projeto é obrigatório para remover membro."); }
    setIsLoading(true); setError(null);
    try {
      await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/equipe/${usuarioId}`, {
        method: 'DELETE',
      });
      setEquipe(prev => prev.filter(m => m.usuario_id !== usuarioId));
      return true;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") { setError(err.message || `Falha ao remover membro ${usuarioId}.`);}
      console.error(`Falha ao remover membro ${usuarioId}:`, err); throw err;
    } finally { setIsLoading(false); }
  }, [currentProjetoId, makeAuthenticatedRequest]);

  useEffect(() => {
    if (currentProjetoId) {
      fetchEquipe(currentProjetoId);
    } else {
      setEquipe([]);
    }
  }, [currentProjetoId, fetchEquipe]);

  const setProjetoIdContext = useCallback((id: string | undefined) => {
    setCurrentProjetoId(id);
  }, []);

  return {
    equipe,
    isLoading,
    error,
    fetchEquipe,
    addMembroEquipe,
    updatePapelMembro,
    removeMembroEquipe,
    setProjetoIdContext,
  };
}
