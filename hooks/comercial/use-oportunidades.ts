import { useState, useEffect, useCallback, useRef } from 'react';
import { Oportunidade, OportunidadeFiltros, OportunidadeStatus } from '@/types/comercial';

// Cache para armazenar resultados de requisiu00e7u00f5es anteriores
interface CacheItem {
  data: Oportunidade[];
  timestamp: number;
  queryKey: string;
}

// Cache global para ser compartilhado entre todas as instu00e2ncias do hook
const requestCache: Record<string, CacheItem> = {};

// Tempo de expiração do cache em milissegundos (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export function useOportunidades() {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referência para o timeout de debounce
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Função para gerar uma chave de cache baseada nos filtros
  const generateCacheKey = (filtros?: OportunidadeFiltros): string => {
    if (!filtros) return 'all';
    
    const parts = [];
    if (filtros.termo) parts.push(`termo=${filtros.termo}`);
    if (filtros.status && filtros.status !== 'todos') parts.push(`status=${filtros.status}`);
    if (filtros.cliente && filtros.cliente !== 'todos') parts.push(`cliente=${filtros.cliente}`);
    if (filtros.responsavel && filtros.responsavel !== 'todos') parts.push(`responsavel=${filtros.responsavel}`);
    if (filtros.dataInicio) parts.push(`dataInicio=${filtros.dataInicio.toISOString().split('T')[0]}`);
    if (filtros.dataFim) parts.push(`dataFim=${filtros.dataFim.toISOString().split('T')[0]}`);
    
    return parts.length ? parts.join('&') : 'all';
  };

  // Função para verificar se o cache é válido
  const isCacheValid = (cacheItem: CacheItem): boolean => {
    return Date.now() - cacheItem.timestamp < CACHE_EXPIRATION;
  };

  const fetchOportunidades = useCallback(async (filtros?: OportunidadeFiltros) => {
    // Cancelar qualquer debounce anterior
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Aplicar debounce para evitar múltiplas requisições em sequência
    return new Promise<Oportunidade[]>((resolve) => {
      debounceTimeout.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          // Gerar chave de cache
          const cacheKey = generateCacheKey(filtros);
          
          // Verificar se temos um cache válido
          if (requestCache[cacheKey] && isCacheValid(requestCache[cacheKey])) {
            console.log("Usando dados em cache para:", cacheKey);
            setOportunidades(requestCache[cacheKey].data);
            setIsLoading(false);
            return resolve(requestCache[cacheKey].data);
          }
          
          // Construir URL com parâmetros de filtro
          let url = '/api/comercial/oportunidades';
          
          if (filtros) {
            const params = new URLSearchParams();
            
            if (filtros.termo) params.append('termo', filtros.termo);
            if (filtros.status && filtros.status !== 'todos') params.append('status', filtros.status);
            if (filtros.cliente && filtros.cliente !== 'todos') params.append('cliente', filtros.cliente);
            if (filtros.responsavel && filtros.responsavel !== 'todos') params.append('responsavel', filtros.responsavel);
            if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio.toISOString().split('T')[0]);
            if (filtros.dataFim) params.append('dataFim', filtros.dataFim.toISOString().split('T')[0]);
            
            if (params.toString()) {
              url += `?${params.toString()}`;
            }
          }
          
          console.log("Buscando oportunidades com URL:", url);
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error('Erro ao buscar oportunidades');
          }
          
          const data = await response.json();
          
          // Armazenar no cache
          requestCache[cacheKey] = {
            data,
            timestamp: Date.now(),
            queryKey: cacheKey
          };
          
          setOportunidades(data);
          resolve(data);
          return data;
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
          console.error('Erro ao buscar oportunidades:', err);
          resolve([]);
          return [];
        } finally {
          setIsLoading(false);
        }
      }, 300); // 300ms de debounce
    });
  }, []);

  const getOportunidade = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/oportunidades/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Erro ao buscar oportunidade: ${response.status} ${response.statusText}${errorData ? ' - ' + JSON.stringify(errorData) : ''}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('Erro ao buscar oportunidade:', err);
      throw err;
    }
  }, []);

  const createOportunidade = useCallback(async (oportunidade: Partial<Oportunidade>) => {
    try {
      const response = await fetch('/api/comercial/oportunidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(oportunidade),
      });
      
      // Verificar primeiro se a resposta está ok antes de tentar parsear o JSON
      if (!response.ok) {
        let errorMessage = `Erro ao criar oportunidade: ${response.status} ${response.statusText}`;
        
        try {
          // Tentar obter a mensagem de erro como JSON, se possível
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // Se não conseguir parsear como JSON, usar a mensagem de erro genérica
          console.error('Erro ao parsear resposta de erro:', parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Se chegou aqui, a resposta está ok, agora podemos parsear com segurança
      const data = await response.json();
      setOportunidades((prev) => [...prev, data]);
      
      // Limpar todo o cache para garantir que futuras buscas sejam atualizadas
      Object.keys(requestCache).forEach(key => {
        delete requestCache[key];
      });
      
      return data;
    } catch (err) {
      console.error('Erro ao criar oportunidade:', err);
      throw err;
    }
  }, []);

  const updateOportunidade = useCallback(async (id: string, data: Partial<Oportunidade>) => {
    try {
      const response = await fetch(`/api/comercial/oportunidades/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Obter a resposta JSON para acessar mensagens de erro específicas
      const respData = await response.json();
      
      if (!response.ok) {
        // Capturar a mensagem de erro específica da API
        throw new Error(respData.error || 'Erro ao atualizar oportunidade');
      }
      
      setOportunidades((prev) =>
        prev.map((opp) => (opp.id === id ? respData : opp))
      );
      
      // Limpar todo o cache para garantir que futuras buscas sejam atualizadas
      Object.keys(requestCache).forEach(key => {
        delete requestCache[key];
      });
      
      return respData;
    } catch (err) {
      console.error('Erro ao atualizar oportunidade:', err);
      throw err;
    }
  }, []);

  const updateOportunidadeStatus = useCallback(async (id: string, status: OportunidadeStatus) => {
    try {
      console.log(`Tentando atualizar oportunidade ${id} para status ${status}`);
      
      // Otimistic update local para feedback imediato
      setOportunidades((prev) =>
        prev.map((opp) => (opp.id === id ? { ...opp, status } : opp))
      );

      // Chamada para a API refatorada (que usa MySQL)
      const response = await fetch(`/api/comercial/oportunidades/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Reverter a atualização otimista em caso de erro na API
        setOportunidades((prev) =>
          prev.map((opp) => (opp.id === id ? { ...opp, status: opp.status } : opp)) // Reverte para o status original
        );
        throw new Error(data.error || 'Erro ao atualizar status da oportunidade');
      }

      console.log('Atualização de status via API (MySQL backend) bem-sucedida:', data);
      
      // Limpar todo o cache para garantir que futuras buscas sejam atualizadas
      Object.keys(requestCache).forEach(key => {
        delete requestCache[key];
      });
      
      return data;
    } catch (err) {
      console.error('Erro ao atualizar status da oportunidade:', err);
      // Considerar reverter o estado aqui também se a chamada fetch falhar completamente
      throw err;
    }
  }, []);

  const deleteOportunidade = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comercial/oportunidades/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // Tentar obter uma mensagem de erro detalhada se disponível
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao excluir oportunidade');
        } catch (jsonError) {
          // Se não conseguir obter o JSON, usar o status HTTP
          throw new Error(`Erro ao excluir oportunidade: ${response.status} ${response.statusText}`);
        }
      }
      
      // Atualizar o estado local removendo a oportunidade
      setOportunidades((prev) => prev.filter((opp) => opp.id !== id));
      
      // Limpar todo o cache para garantir que futuras buscas sejam atualizadas
      Object.keys(requestCache).forEach(key => {
        delete requestCache[key];
      });
      
      return true;
    } catch (err) {
      console.error('Erro ao excluir oportunidade:', err);
      throw err;
    }
  }, []);

  // Carregar oportunidades ao montar o componente
  useEffect(() => {
    fetchOportunidades();
  }, [fetchOportunidades]);

  return {
    oportunidades,
    isLoading,
    error,
    fetchOportunidades,
    getOportunidade,
    createOportunidade,
    updateOportunidade,
    updateOportunidadeStatus,
    deleteOportunidade,
  };
}
