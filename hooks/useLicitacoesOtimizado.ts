import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth'; // ADDED
import { Licitacao, LicitacaoStatus, OrgaoDetalhado, ResponsavelDetalhado, DocumentoDetalhado } from '@/types/licitacoes';

// Re-export types for external use
export type { Licitacao, OrgaoDetalhado, LicitacaoStatus };

export interface LicitacaoFiltros {
  termo?: string;
  status?: string;
  orgao?: string;
  responsavel?: string;
  modalidade?: string;
  dataInicio?: Date | string;
  dataFim?: Date | string;
  valorMinimo?: number;
  valorMaximo?: number;
}

interface Estatisticas {
  total: number;
  ativas: number;
  vencidas: number;
  valorTotal: number;
  pregoesProximos: number;
  taxaSucesso: number;
}

// Cache para armazenar resultados de requisiu00e7u00f5es anteriores
interface CacheItem {
  data: any;
  timestamp: number;
  queryKey: string;
}

// Cache global para ser compartilhado entre todas as instu00e2ncias do hook
const requestCache: Record<string, CacheItem> = {};

// Tempo de expirau00e7u00e3o do cache em milissegundos (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export function useLicitacoesOtimizado() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [filteredLicitacoes, setFilteredLicitacoes] = useState<Licitacao[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    total: 0,
    ativas: 0,
    vencidas: 0,
    valorTotal: 0,
    pregoesProximos: 0,
    taxaSucesso: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); // ADDED

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const generateCacheKey = (filtros?: LicitacaoFiltros): string => {
    if (!filtros) return 'all_licitacoes'; // Changed for clarity
    const parts = [];
    if (filtros.termo) parts.push(`termo=${filtros.termo}`);
    if (filtros.status) parts.push(`status=${filtros.status}`);
    // ... (rest of filter key generation)
    return parts.length ? parts.join('&') : 'all_licitacoes';
  };

  const isCacheValid = (cacheItem: CacheItem): boolean => {
    return Date.now() - cacheItem.timestamp < CACHE_EXPIRATION;
  };

  const carregarLicitacoes = useCallback(async (filtros?: LicitacaoFiltros): Promise<Licitacao[]> => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    return new Promise<Licitacao[]>((resolve) => {
      debounceTimeout.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        const { refreshToken, logout } = auth;

        const makeRequest = async () => {
          const params = new URLSearchParams();
          if (filtros) {
            if (filtros.termo) params.append('termo', filtros.termo);
            if (filtros.status) params.append('status', filtros.status);
            if (filtros.orgao) params.append('orgao', filtros.orgao);
            if (filtros.responsavel) params.append('responsavel', filtros.responsavel);
            if (filtros.modalidade) params.append('modalidade', filtros.modalidade);
            if (filtros.dataInicio) params.append('dataInicio', typeof filtros.dataInicio === 'string' ? filtros.dataInicio : format(filtros.dataInicio, 'yyyy-MM-dd'));
            if (filtros.dataFim) params.append('dataFim', typeof filtros.dataFim === 'string' ? filtros.dataFim : format(filtros.dataFim, 'yyyy-MM-dd'));
            if (filtros.valorMinimo) params.append('valorMin', filtros.valorMinimo.toString());
            if (filtros.valorMaximo) params.append('valorMax', filtros.valorMaximo.toString());
          }
          const response = await fetch(`/api/licitacoes?${params.toString()}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Content-Type': 'application/json' },
          });
          if (!response.ok) {
            if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
            throw new Error(`API Error: ${response.status} ${await response.text().catch(()=>response.statusText)}`);
          }
          return response.json();
        };

        const cacheKey = generateCacheKey(filtros);
        if (requestCache[cacheKey] && isCacheValid(requestCache[cacheKey])) {
            console.log("Usando dados em cache para licitacoes:", cacheKey);
            const cachedData = requestCache[cacheKey].data;
            setLicitacoes(cachedData);
            setFilteredLicitacoes(cachedData);
            setIsLoading(false);
            return resolve(cachedData);
        }

        try {
          const data = await makeRequest();
          if (!Array.isArray(data)) {
            console.error('Dados de licitações recebidos não são um array:', data);
            setLicitacoes([]); setFilteredLicitacoes([]); resolve([]);
          } else {
            requestCache[cacheKey] = { data, timestamp: Date.now(), queryKey: cacheKey };
            setLicitacoes(data); setFilteredLicitacoes(data); resolve(data);
          }
        } catch (err: any) {
          if (err && err.status === 401) {
            console.log("useLicitacoesOtimizado: 401 detected, attempting refresh for carregarLicitacoes");
            try {
              await refreshToken();
              const data = await makeRequest(); // Retry
              if (!Array.isArray(data)) {  setLicitacoes([]); setFilteredLicitacoes([]); resolve([]); }
              else { requestCache[cacheKey] = { data, timestamp: Date.now(), queryKey: cacheKey }; setLicitacoes(data); setFilteredLicitacoes(data); resolve(data); }
            } catch (refreshError: any) {
              console.error("useLicitacoesOtimizado: Token refresh failed for carregarLicitacoes", refreshError);
              logout(); setError("Sessão expirada. Por favor, faça login novamente."); resolve([]);
            }
          } else {
            console.error('Erro ao buscar licitações:', err);
            setError(err.message || "Erro desconhecido ao buscar licitações."); resolve([]);
          }
        } finally {
          setIsLoading(false);
        }
      }, 300);
    });
  }, [auth]);

  const carregarEstatisticas = useCallback(async () => {
    // setIsLoading(true); // Consider separate loading for stats if needed
    setError(null);
    const { refreshToken, logout } = auth;
    const cacheKey = 'estatisticas_licitacoes'; // More specific key

    const makeRequest = async () => {
        const response = await fetch('/api/licitacoes?estatisticas=true', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
            throw new Error(`API Error: ${response.status} ${await response.text().catch(()=>response.statusText)}`);
        }
        return response.json();
    };

    if (requestCache[cacheKey] && isCacheValid(requestCache[cacheKey])) {
        console.log("Usando estatisticas em cache");
        const cachedData = requestCache[cacheKey].data;
        setEstatisticas(cachedData);
        return cachedData;
    }

    try {
        const data = await makeRequest();
        requestCache[cacheKey] = { data, timestamp: Date.now(), queryKey: cacheKey };
        setEstatisticas(data);
        return data;
    } catch (err: any) {
        if (err && err.status === 401) {
            console.log("useLicitacoesOtimizado: 401 detected, attempting refresh for carregarEstatisticas");
            try {
                await refreshToken();
                const data = await makeRequest(); // Retry
                requestCache[cacheKey] = { data, timestamp: Date.now(), queryKey: cacheKey };
                setEstatisticas(data);
                return data;
            } catch (refreshError: any) {
                console.error("useLicitacoesOtimizado: Token refresh failed for carregarEstatisticas", refreshError);
                logout(); setError("Sessão expirada."); return null;
            }
        } else {
            console.error('Erro ao processar estatísticas:', err);
            setError(err.message || "Erro desconhecido ao carregar estatísticas."); return null;
        }
    } finally {
        // setIsLoading(false);
    }
  }, [auth]);

  const carregarDadosIniciais = useCallback(async () => {
    setIsLoading(true); // Single loading state for initial combined fetch
    setError(null);
    try {
      await Promise.all([
        carregarLicitacoes(),
        carregarEstatisticas()
      ]);
    } catch (error) {
      // Errors are handled within individual functions, this catch is for Promise.all rejection
      console.error('Erro geral ao carregar dados iniciais:', error);
      // setError might have been set by individual functions already
    } finally {
      setIsLoading(false);
    }
  }, [carregarLicitacoes, carregarEstatisticas]);

  const adicionarLicitacao = useCallback(async (novaLicitacao: Partial<Licitacao>) => {
    setIsLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async (payload: Partial<Licitacao>) => {
      const response = await fetch('/api/licitacoes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.error || `Erro ao adicionar licitação: ${response.status}`);
      }
      return response.json();
    };

    try {
      const licitacaoAdicionada = await makeRequest(novaLicitacao);
      Object.keys(requestCache).forEach(key => delete requestCache[key]);
      await carregarDadosIniciais(); // Reload all data
      return licitacaoAdicionada;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useLicitacoesOtimizado: 401 detected, attempting refresh for adicionarLicitacao");
        try {
          await refreshToken();
          const licitacaoAdicionada = await makeRequest(novaLicitacao); // Retry
          Object.keys(requestCache).forEach(key => delete requestCache[key]);
          await carregarDadosIniciais();
          return licitacaoAdicionada;
        } catch (refreshError: any) {
          console.error("useLicitacoesOtimizado: Token refresh failed for adicionarLicitacao", refreshError);
          logout(); setError("Sessão expirada."); throw refreshError;
        }
      } else {
        console.error('Erro ao adicionar licitação:', err);
        setError(err.message || "Erro desconhecido."); throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [auth, carregarDadosIniciais]);

  const atualizarLicitacao = useCallback(async (id: string, dadosAtualizados: Partial<Licitacao>) => {
    setIsLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async (payload: Partial<Licitacao>) => {
        const response = await fetch(`/api/licitacoes/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
            const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
            throw new Error(errorData.error || `Erro ao atualizar licitação: ${response.status}`);
        }
        return response.json();
    };

    try {
        const licitacaoAtualizada = await makeRequest(dadosAtualizados);
        Object.keys(requestCache).forEach(key => delete requestCache[key]);
        await carregarDadosIniciais();
        return licitacaoAtualizada;
    } catch (err: any) {
        if (err && err.status === 401) {
            console.log("useLicitacoesOtimizado: 401 detected, attempting refresh for atualizarLicitacao");
            try {
                await refreshToken();
                const licitacaoAtualizada = await makeRequest(dadosAtualizados); // Retry
                Object.keys(requestCache).forEach(key => delete requestCache[key]);
                await carregarDadosIniciais();
                return licitacaoAtualizada;
            } catch (refreshError: any) {
                console.error("useLicitacoesOtimizado: Token refresh failed for atualizarLicitacao", refreshError);
                logout(); setError("Sessão expirada."); throw refreshError;
            }
        } else {
            console.error('Erro ao atualizar licitação:', err);
            setError(err.message || "Erro desconhecido."); throw err;
        }
    } finally {
        setIsLoading(false);
    }
  }, [auth, carregarDadosIniciais]);

  const excluirLicitacao = useCallback(async (id: string) => {
    setIsLoading(true);
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
        try { return await response.json(); } catch (e) { return { success: true }; }
    };

    try {
        await makeRequest();
        Object.keys(requestCache).forEach(key => delete requestCache[key]);
        await carregarDadosIniciais();
        return true;
    } catch (err: any) {
        if (err && err.status === 401) {
            console.log("useLicitacoesOtimizado: 401 detected, attempting refresh for excluirLicitacao");
            try {
                await refreshToken();
                await makeRequest(); // Retry
                Object.keys(requestCache).forEach(key => delete requestCache[key]);
                await carregarDadosIniciais();
                return true;
            } catch (refreshError: any) {
                console.error("useLicitacoesOtimizado: Token refresh failed for excluirLicitacao", refreshError);
                logout(); setError("Sessão expirada."); throw refreshError;
            }
        } else {
            console.error('Erro ao excluir licitação:', err);
            setError(err.message || "Erro desconhecido."); throw err;
        }
    } finally {
        setIsLoading(false);
    }
  }, [auth, carregarDadosIniciais]);

  const atualizarStatusLicitacao = useCallback(async (id: string, status: string): Promise<Licitacao | null> => {
    setIsLoading(true); // Pode ser um isLoadingStatusUpdate específico
    setError(null);
    const { refreshToken, logout } = auth;

    // Buscar a licitação atual
    let licitacaoAtual = licitacoes.find(l => l.id === id);
    if (!licitacaoAtual) {
      // Buscar da API se não estiver no estado local
      try {
        const response = await fetch(`/api/licitacoes/${id}`, { credentials: 'include' });
        if (response.ok) {
          licitacaoAtual = await response.json();
        } else {
          throw new Error('Licitação não encontrada na API para atualizar status');
        }
      } catch (e) {
        throw new Error('Licitação não encontrada para atualizar status');
      }
    }
    // Montar o payload completo com todos os campos obrigatórios
    const payloadCompleto = { ...licitacaoAtual, status };

    const makeRequest = async (payload: typeof payloadCompleto) => {
      const response = await fetch(`/api/licitacoes/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 401) throw { status: 401, data: await response.json().catch(() => ({error: `Unauthorized: ${response.statusText}`})) };
        let errorMsg = `Erro ao atualizar status da licitação: ${response.status} ${response.statusText}`;
        let errorData: any = {};
        try {
          errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg += ` - ${errorData.error}`;
          } else if (typeof errorData === 'string') {
            errorMsg += ` - ${errorData}`;
          }
        } catch (e) {
          errorMsg += ' (resposta não era JSON)';
        }
        console.error('[atualizarStatusLicitacao] PATCH /api/licitacoes/' + id + ' falhou:', errorMsg, errorData);
        throw new Error(errorMsg);
      }
      return response.json();
    };

    try {
      const data = await makeRequest({ status });
      // Atualizar o estado local otimisticamente ou com os dados retornados
      setLicitacoes((prev) => prev.map(l => l.id === id ? data : l));
      setFilteredLicitacoes((prev) => prev.map(l => l.id === id ? data : l)); // Também o filtrado
      if (typeof carregarEstatisticas === 'function') { // Assegurar que carregarEstatisticas existe
          await carregarEstatisticas(); // Recarregar estatísticas
      }
      return data;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useLicitacoesOtimizado: 401 detected, attempting refresh for atualizarStatusLicitacao");
        try {
          await refreshToken();
          const data = await makeRequest({ status }); // Retry
          setLicitacoes((prev) => prev.map(l => l.id === id ? data : l));
          setFilteredLicitacoes((prev) => prev.map(l => l.id === id ? data : l));
           if (typeof carregarEstatisticas === 'function') {
              await carregarEstatisticas();
          }
          return data;
        } catch (refreshError: any) {
          console.error("useLicitacoesOtimizado: Token refresh failed for atualizarStatusLicitacao", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao atualizar status da licitação:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [auth, carregarEstatisticas]);

  return {
    licitacoes,
    filteredLicitacoes,
    setFilteredLicitacoes,
    estatisticas,
    isLoading,
    error,
    carregarLicitacoes,
    carregarEstatisticas,
    carregarDadosIniciais,
    adicionarLicitacao,
    atualizarLicitacao,
    excluirLicitacao,
    atualizarStatusLicitacao
  };
}
