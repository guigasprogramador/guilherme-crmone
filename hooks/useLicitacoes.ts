import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // ADDED

// Interface para Documento (simplificada para o contexto da licitação)
export interface DocumentoSimplificado {
  id: string;
  nome: string;
  tipo?: string;
  url?: string;
  arquivo?: string;
  tags?: string[];
  dataCriacao?: string;
  dataAtualizacao?: string;
}

// Interface para Responsavel (simplificada)
export interface ResponsavelInfo {
  id: string; // user_id
  nome: string;
  papel?: string;
}

// Interface Licitacao atualizada para refletir a estrutura do backend MySQL
export interface Licitacao {
  id: string;
  titulo: string;
  status: string;
  modalidade?: string;
  numeroProcesso?: string;
  dataAbertura?: string;
  dataLimiteProposta?: string;
  dataPublicacao?: string;
  dataJulgamento?: string;
  orgao?: string;
  orgaoId?: string;
  valorEstimado?: string;
  _valorEstimadoNumerico?: number;
  objeto?: string;
  edital?: string;
  numeroEdital?: string;
  responsavel?: string;
  responsavelId?: string;
  responsaveis?: ResponsavelInfo[];
  prazo?: string;
  urlLicitacao?: string;
  urlEdital?: string;
  descricao?: string;
  formaPagamento?: string;
  obsFinanceiras?: string;
  tipo?: string;
  tipoFaturamento?: string;
  margemLucro?: number;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  posicaoKanban?: number;
  dataCriacao?: string;
  dataAtualizacao?: string;
  documentos?: DocumentoSimplificado[];
}


export function useLicitacoes() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); // ADDED

  // Cache local para os dados (simple version)
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  
  const licitacoesEstaticas: Licitacao[] = [ /* ... static data ... */ ];


  const fetchLicitacoes = useCallback(async () => {
    const agora = Date.now();
    const cacheValido = cacheTimestamp && (agora - cacheTimestamp < 5 * 60 * 1000);
    if (cacheValido && licitacoes.length > 0) {
      return licitacoes;
    }
    // No immediate static data set here, will be fallback in error cases

    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async () => {
      const response = await fetch('/api/licitacoes', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        throw new Error(`API Error: ${response.status} ${await response.text().catch(()=>response.statusText)}`);
      }
      return response.json();
    };

    try {
      const data = await makeRequest();
      if (Array.isArray(data)) {
        setLicitacoes(data);
        setCacheTimestamp(Date.now());
        return data;
      } else {
        console.warn('API (fetchLicitacoes) retornou formato inesperado.');
        setLicitacoes(licitacoesEstaticas); // Fallback
        setCacheTimestamp(Date.now());
        return licitacoesEstaticas;
      }
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useLicitacoes: 401 detected, attempting refresh for fetchLicitacoes");
        try {
          await refreshToken();
          console.log("useLicitacoes: Token refreshed, retrying fetchLicitacoes");
          const data = await makeRequest(); // Retry
          if (Array.isArray(data)) {
            setLicitacoes(data);
            setCacheTimestamp(Date.now());
            return data;
          } else {
             setLicitacoes(licitacoesEstaticas); return licitacoesEstaticas;
          }
        } catch (refreshError: any) {
          console.error("useLicitacoes: Token refresh failed for fetchLicitacoes", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          setLicitacoes(licitacoesEstaticas); return licitacoesEstaticas;
        }
      } else {
        console.error('Erro ao buscar licitações:', err);
        setError(err.message || "Erro desconhecido.");
        setLicitacoes(licitacoesEstaticas); return licitacoesEstaticas;
      }
    } finally {
      setLoading(false);
    }
  }, [auth, licitacoes, cacheTimestamp]); // licitacoesEstaticas is stable

  useEffect(() => {
    // Initial load, but fetchLicitacoes itself handles initial static data display if cache is empty
    fetchLicitacoes();
  }, [fetchLicitacoes]);

  const fetchLicitacaoById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async () => {
      const response = await fetch(`/api/licitacoes/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        throw new Error(`API Error: ${response.status} ${await response.text().catch(()=>response.statusText)}`);
      }
      return response.json();
    };

    try {
      const data = await makeRequest();
      return data;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useLicitacoes: 401 detected, attempting refresh for fetchLicitacaoById");
        try {
          await refreshToken();
          console.log("useLicitacoes: Token refreshed, retrying fetchLicitacaoById");
          return await makeRequest(); // Retry
        } catch (refreshError: any) {
          console.error("useLicitacoes: Token refresh failed for fetchLicitacaoById", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao buscar licitação por ID:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const createLicitacao = useCallback(async (licitacaoData: Partial<Licitacao>): Promise<Licitacao | null> => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async (payload: Partial<Licitacao>) => {
      const response = await fetch('/api/licitacoes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.error || `Erro ao criar licitação: ${response.status}`);
      }
      return response.json();
    };

    try {
      const data = await makeRequest(licitacaoData);
      setLicitacoes((prev) => [data, ...prev]);
      setCacheTimestamp(null);
      return data;
    } catch (err: any) {
      if (err && err.status === 401) {
         console.log("useLicitacoes: 401 detected, attempting refresh for createLicitacao");
        try {
          await refreshToken();
          console.log("useLicitacoes: Token refreshed, retrying createLicitacao");
          const data = await makeRequest(licitacaoData); // Retry
          setLicitacoes((prev) => [data, ...prev]);
          setCacheTimestamp(null);
          return data;
        } catch (refreshError: any) {
          console.error("useLicitacoes: Token refresh failed for createLicitacao", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao criar licitação:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const updateLicitacao = useCallback(async (id: string, licitacaoData: Partial<Licitacao>): Promise<Licitacao | null> => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async (payload: Partial<Licitacao>) => {
      const response = await fetch(`/api/licitacoes/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.error || `Erro ao atualizar licitação: ${response.status}`);
      }
      return response.json();
    };

    try {
      const data = await makeRequest(licitacaoData);
      setLicitacoes((prev) => prev.map(l => l.id === id ? data : l));
      setCacheTimestamp(null);
      return data;
    } catch (err: any) {
       if (err && err.status === 401) {
        console.log("useLicitacoes: 401 detected, attempting refresh for updateLicitacao");
        try {
          await refreshToken();
          console.log("useLicitacoes: Token refreshed, retrying updateLicitacao");
          const data = await makeRequest(licitacaoData); // Retry
          setLicitacoes((prev) => prev.map(l => l.id === id ? data : l));
          setCacheTimestamp(null);
          return data;
        } catch (refreshError: any) {
          console.error("useLicitacoes: Token refresh failed for updateLicitacao", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao atualizar licitação:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const deleteLicitacao = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async () => {
      const response = await fetch(`/api/licitacoes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.error || `Erro ao excluir licitação: ${response.status}`);
      }
      try { return await response.json(); } catch(e) { return {success: true}; } // Handle empty response for DELETE
    };

    try {
      await makeRequest();
      setLicitacoes((prev) => prev.filter(l => l.id !== id));
      setCacheTimestamp(null);
      return true;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useLicitacoes: 401 detected, attempting refresh for deleteLicitacao");
        try {
          await refreshToken();
          console.log("useLicitacoes: Token refreshed, retrying deleteLicitacao");
          await makeRequest(); // Retry
          setLicitacoes((prev) => prev.filter(l => l.id !== id));
          setCacheTimestamp(null);
          return true;
        } catch (refreshError: any) {
          console.error("useLicitacoes: Token refresh failed for deleteLicitacao", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return false;
        }
      } else {
        console.error('Erro ao excluir licitação:', err);
        setError(err.message || "Erro desconhecido.");
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  return {
    licitacoes,
    loading,
    error,
    fetchLicitacoes,
    fetchLicitacaoById,
    createLicitacao,
    updateLicitacao,
    deleteLicitacao,
  };
}
