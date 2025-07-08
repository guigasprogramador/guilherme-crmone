// hooks/projetos/useProjetoTarefas.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Tipos (idealmente de @/types/projetos.ts ou @/types/index.ts)
export interface ProjetoTarefa {
  id: string;
  projeto_id: string;
  titulo_tarefa: string;
  descricao_tarefa?: string | null;
  status_tarefa: string;
  responsavel_tarefa_id?: string | null;
  responsavel_tarefa_nome?: string | null; // Do JOIN
  data_inicio_prevista_tarefa?: string | null;
  data_fim_prevista_tarefa?: string | null;
  data_conclusao_tarefa?: string | null;
  horas_estimadas?: number | null;
  horas_realizadas?: number | null;
  prioridade?: number | null;
  depende_de_tarefa_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TarefaPayload { // Para criação
  titulo_tarefa: string;
  descricao_tarefa?: string | null;
  status_tarefa?: string;
  responsavel_tarefa_id?: string | null;
  data_inicio_prevista_tarefa?: string | null;
  data_fim_prevista_tarefa?: string | null;
  horas_estimadas?: number | null;
  prioridade?: number | null;
  depende_de_tarefa_id?: string | null;
}

export interface TarefaUpdatePayload { // Para PUT (completo) ou PATCH (parcial)
  titulo_tarefa?: string;
  descricao_tarefa?: string | null;
  status_tarefa?: string;
  responsavel_tarefa_id?: string | null;
  data_inicio_prevista_tarefa?: string | null;
  data_fim_prevista_tarefa?: string | null;
  data_conclusao_tarefa?: string | null;
  horas_estimadas?: number | null;
  horas_realizadas?: number | null;
  prioridade?: number | null;
  depende_de_tarefa_id?: string | null;
}

interface UseProjetoTarefasProps {
  onLoadingChange?: (isLoading: boolean) => void;
  onProgressoProjetoPodeTerMudado?: () => void;
}


export function useProjetoTarefas(projetoIdInitial?: string, props?: UseProjetoTarefasProps) {
  const [tarefas, setTarefas] = useState<ProjetoTarefa[]>([]);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProjetoId, setCurrentProjetoId] = useState<string | undefined>(projetoIdInitial);
  const auth = useAuth();

  const setIsLoading = useCallback((loading: boolean) => {
    setIsLoadingState(loading);
    if (props?.onLoadingChange) {
      props.onLoadingChange(loading);
    }
  }, [props]);

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    const { refreshToken, logout, getAccessToken } = auth;
    let token = getAccessToken();

    const doRequest = async (currentToken: string | null) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (currentToken) {
        (headers as any)['Authorization'] = `Bearer ${currentToken}`;
      }

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

    try {
      return await doRequest(token);
    } catch (err: any) {
      if (err && err.status === 401 && token) {
        console.log("useProjetoTarefas: 401 detected, attempting token refresh.");
        try {
          const newToken = await refreshToken();
          if (!newToken) {
             logout();
             setError("Sessão expirada. Por favor, faça login novamente.");
             throw new Error("Failed to refresh token, user logged out.");
          }
          return await doRequest(newToken);
        } catch (refreshError: any) {
          console.error("useProjetoTarefas: Token refresh failed.", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          throw refreshError;
        }
      } else {
        throw err;
      }
    }
  }, [auth]);

  const fetchTarefas = useCallback(async (pId?: string, filters?: Record<string, string>) => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) {
      setTarefas([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filters);
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/tarefas?${params.toString()}`);
      const data = await response.json();
      setTarefas(Array.isArray(data) ? data : []);
    } catch (err: any) {
       if (err.message !== "Failed to refresh token, user logged out.") {
         setError(err.message || 'Falha ao buscar tarefas.');
      }
      console.error('Falha ao buscar tarefas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentProjetoId, makeAuthenticatedRequest, setIsLoading]);

  const getTarefaById = useCallback(async (tarefaId: string, pId?: string): Promise<ProjetoTarefa | null> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) {
      setError("ID do projeto não fornecido.");
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/tarefas/${tarefaId}`);
      return await response.json();
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || `Falha ao buscar tarefa ${tarefaId}.`);
      }
      console.error(`Falha ao buscar tarefa ${tarefaId}:`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentProjetoId, makeAuthenticatedRequest, setIsLoading]);

  const createTarefa = useCallback(async (tarefaData: TarefaPayload, pId?: string): Promise<ProjetoTarefa | null> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) {
      throw new Error("ID do projeto é obrigatório para criar tarefa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/tarefas`, {
        method: 'POST',
        body: JSON.stringify(tarefaData),
      });
      const novaTarefa = await response.json();
      setTarefas(prev => [...prev, novaTarefa].sort((a,b) => (a.prioridade || 3) - (b.prioridade || 3) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      if(props?.onProgressoProjetoPodeTerMudado) props.onProgressoProjetoPodeTerMudado();
      return novaTarefa;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
         setError(err.message || 'Falha ao criar tarefa.');
      }
      console.error('Falha ao criar tarefa:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentProjetoId, makeAuthenticatedRequest, setIsLoading, props]);

  const updateTarefa = useCallback(async (tarefaId: string, tarefaData: TarefaUpdatePayload, pId?: string): Promise<ProjetoTarefa | null> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) {
      throw new Error("ID do projeto é obrigatório para atualizar tarefa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/tarefas/${tarefaId}`, {
        method: 'PUT',
        body: JSON.stringify(tarefaData),
      });
      const tarefaAtualizada = await response.json();
      setTarefas(prev => prev.map(t => t.id === tarefaId ? tarefaAtualizada : t)
                               .sort((a,b) => (a.prioridade || 3) - (b.prioridade || 3) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      if(props?.onProgressoProjetoPodeTerMudado) props.onProgressoProjetoPodeTerMudado();
      return tarefaAtualizada;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || `Falha ao atualizar tarefa ${tarefaId}.`);
      }
      console.error(`Falha ao atualizar tarefa ${tarefaId}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentProjetoId, makeAuthenticatedRequest, setIsLoading, props]);

  const patchTarefa = useCallback(async (tarefaId: string, tarefaData: Partial<TarefaUpdatePayload>, pId?: string): Promise<ProjetoTarefa | null> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) {
      throw new Error("ID do projeto é obrigatório para atualizar tarefa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/tarefas/${tarefaId}`, {
        method: 'PATCH',
        body: JSON.stringify(tarefaData),
      });
      const tarefaAtualizada = await response.json();
      setTarefas(prev => prev.map(t => t.id === tarefaId ? tarefaAtualizada : t)
                               .sort((a,b) => (a.prioridade || 3) - (b.prioridade || 3) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      if(props?.onProgressoProjetoPodeTerMudado) props.onProgressoProjetoPodeTerMudado();
      return tarefaAtualizada;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || `Falha ao atualizar parcialmente tarefa ${tarefaId}.`);
      }
      console.error(`Falha ao atualizar parcialmente tarefa ${tarefaId}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentProjetoId, makeAuthenticatedRequest, setIsLoading, props]);

  const deleteTarefa = useCallback(async (tarefaId: string, pId?: string): Promise<boolean> => {
    const idToFetch = pId || currentProjetoId;
    if (!idToFetch) {
      throw new Error("ID do projeto é obrigatório para excluir tarefa.");
    }
    setIsLoading(true);
    setError(null);
    try {
      await makeAuthenticatedRequest(`/api/projetos/${idToFetch}/tarefas/${tarefaId}`, {
        method: 'DELETE',
      });
      setTarefas(prev => prev.filter(t => t.id !== tarefaId));
      if(props?.onProgressoProjetoPodeTerMudado) props.onProgressoProjetoPodeTerMudado();
      return true;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
         setError(err.message || `Falha ao excluir tarefa ${tarefaId}.`);
      }
      console.error(`Falha ao excluir tarefa ${tarefaId}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentProjetoId, makeAuthenticatedRequest, setIsLoading, props]);

  useEffect(() => {
    if (currentProjetoId) {
      fetchTarefas(currentProjetoId);
    } else {
      setTarefas([]);
    }
  }, [currentProjetoId, fetchTarefas]);

  const setProjetoIdContext = useCallback((id: string | undefined) => {
    setCurrentProjetoId(id);
  }, []);


  return {
    tarefas,
    isLoading: isLoadingState, // Expor o estado de loading renomeado
    error,
    fetchTarefas,
    getTarefaById,
    createTarefa,
    updateTarefa,
    patchTarefa,
    deleteTarefa,
    setProjetoIdContext,
  };
}
