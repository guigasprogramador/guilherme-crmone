// hooks/projetos/useProjetos.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Tipos (idealmente de @/types/projetos.ts)
export interface Projeto {
  id: string;
  nome_projeto: string;
  codigo_projeto?: string;
  descricao?: string | null;
  status_projeto: string;
  data_inicio_prevista?: string | null;
  data_fim_prevista?: string | null;
  data_inicio_real?: string | null;
  data_fim_real?: string | null;
  orcamento_horas?: number | null;
  orcamento_custo?: number | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  orgao_id?: string | null;
  orgao_nome?: string | null;
  oportunidade_id?: string | null;
  oportunidade_titulo?: string | null;
  proposta_id?: string | null;
  proposta_numero?: string | null;
  licitacao_id?: string | null;
  licitacao_titulo?: string | null;
  gerente_projeto_id: string;
  gerente_projeto_nome?: string | null;
  percentual_concluido?: number;
  created_at: string;
  updated_at: string;
  // Futuramente: tarefas, equipe, documentos
}

export interface ProjetoPayload { // Para criação
  nome_projeto: string;
  descricao?: string;
  status_projeto?: string;
  data_inicio_prevista?: string | null;
  data_fim_prevista?: string | null;
  orcamento_horas?: number | null;
  orcamento_custo?: number | null;
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  proposta_id?: string | null;
  licitacao_id?: string | null;
  gerente_projeto_id: string;
  percentual_concluido?: number;
}

export interface ProjetoUpdatePayload { // Para atualização (PUT ou PATCH)
  nome_projeto?: string;
  descricao?: string;
  status_projeto?: string;
  data_inicio_prevista?: string | null;
  data_fim_prevista?: string | null;
  data_inicio_real?: string | null;
  data_fim_real?: string | null;
  orcamento_horas?: number | null;
  orcamento_custo?: number | null;
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  proposta_id?: string | null;
  licitacao_id?: string | null;
  gerente_projeto_id?: string;
  percentual_concluido?: number;
}


export function useProjetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    const { refreshToken, logout, getAccessToken } = auth;
    let token = getAccessToken();

    const doRequest = async (currentToken: string | null) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (currentToken) { // Adicionar token apenas se existir
        (headers as any)['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch(url, { ...options, headers, credentials: 'include' }); // credentials pode não ser necessário com Bearer token

      if (res.status === 401 && currentToken) { // Apenas tentar refresh se havia um token
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
      if (err && err.status === 401 && token) { // Apenas tentar refresh se havia um token inicial
        console.log("useProjetos: 401 detected, attempting token refresh.");
        try {
          const newToken = await refreshToken(); // refreshToken deve retornar o novo token ou lançar erro
          if (!newToken) { // Se refreshToken não retornar novo token (ex: refresh token inválido)
             logout();
             setError("Sessão expirada. Por favor, faça login novamente.");
             throw new Error("Failed to refresh token, user logged out.");
          }
          return await doRequest(newToken);
        } catch (refreshError: any) {
          console.error("useProjetos: Token refresh failed.", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          throw refreshError;
        }
      } else {
        throw err;
      }
    }
  }, [auth]);

  const fetchProjetos = useCallback(async (filters?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filters);
      const response = await makeAuthenticatedRequest(`/api/projetos?${params.toString()}`);
      const data = await response.json();
      setProjetos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") { // Evitar duplicar mensagem de erro de sessão
         setError(err.message || 'Falha ao buscar projetos.');
      }
      console.error('Falha ao buscar projetos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const getProjetoById = useCallback(async (id: string): Promise<Projeto | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${id}`);
      return await response.json();
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || `Falha ao buscar projeto ${id}.`);
      }
      console.error(`Falha ao buscar projeto ${id}:`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const createProjeto = useCallback(async (projetoData: ProjetoPayload): Promise<Projeto | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest('/api/projetos', {
        method: 'POST',
        body: JSON.stringify(projetoData),
      });
      const novoProjeto = await response.json();
      setProjetos(prev => [novoProjeto, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      return novoProjeto;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || 'Falha ao criar projeto.');
      }
      console.error('Falha ao criar projeto:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const updateProjeto = useCallback(async (id: string, projetoData: ProjetoUpdatePayload): Promise<Projeto | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/projetos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(projetoData),
      });
      const projetoAtualizado = await response.json();
      setProjetos(prev => prev.map(p => p.id === id ? projetoAtualizado : p)
                               .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      return projetoAtualizado;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || `Falha ao atualizar projeto ${id}.`);
      }
      console.error(`Falha ao atualizar projeto ${id}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const updateStatusProjeto = useCallback(async (id: string, status_projeto: string, outrosCampos?: Partial<ProjetoUpdatePayload>): Promise<Projeto | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = { ...outrosCampos, status_projeto };
      const response = await makeAuthenticatedRequest(`/api/projetos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const projetoAtualizado = await response.json();
      setProjetos(prev => prev.map(p => p.id === id ? projetoAtualizado : p)
                               .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      return projetoAtualizado;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
         setError(err.message || `Falha ao atualizar status do projeto ${id}.`);
      }
      console.error(`Falha ao atualizar status do projeto ${id}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const cancelarProjeto = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await makeAuthenticatedRequest(`/api/projetos/${id}`, {
        method: 'DELETE',
      });
      setProjetos(prev => prev.map(p => p.id === id ? { ...p, status_projeto: 'CANCELADO', updated_at: new Date().toISOString() } : p)
                               .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      return true;
    } catch (err: any) {
      if (err.message !== "Failed to refresh token, user logged out.") {
        setError(err.message || `Falha ao cancelar projeto ${id}.`);
      }
      console.error(`Falha ao cancelar projeto ${id}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  return {
    projetos,
    isLoading,
    error,
    fetchProjetos,
    getProjetoById,
    createProjeto,
    updateProjeto,
    updateStatusProjeto,
    cancelarProjeto,
  };
}
