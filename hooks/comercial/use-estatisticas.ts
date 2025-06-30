import { useState, useEffect, useCallback } from 'react';

interface EstatisticasComercial {
  periodo: string;
  totalOportunidades: number;
  leadsEmAberto: number;
  estatisticasPorStatus: {
    novo_lead: number;
    agendamento_reuniao: number;
    levantamento_oportunidades: number;
    proposta_enviada: number;
    negociacao: number;
    fechado_ganho: number;
    fechado_perdido: number;
  };
  valorTotalGanhas: number;
  valorTotalNegociacao: number;
  oportunidadesPorResponsavel: Record<string, number>;
  oportunidadesPorCliente: Record<string, number>;
  taxaConversao: string;
}

export function useEstatisticas() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasComercial | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstatisticas = useCallback(async (periodo?: 'semana' | 'mes' | 'trimestre' | 'ano') => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = '/api/comercial/estatisticas';
      
      if (periodo) {
        url += `?periodo=${periodo}`;
      }
      
      console.log('Buscando estatísticas de:', url);
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0',
          'X-Timestamp': new Date().getTime().toString()
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }
      
      const data = await response.json();
      console.log('Dados de estatísticas recebidos:', data);
      setEstatisticas(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar estatísticas:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forceUpdateEstatisticas = useCallback((novasEstatisticas: EstatisticasComercial) => {
    console.log('Forçando atualização de estatísticas com:', novasEstatisticas);
    setEstatisticas(novasEstatisticas);
  }, []);

  useEffect(() => {
    fetchEstatisticas();
  }, [fetchEstatisticas]);

  return {
    estatisticas,
    isLoading,
    error,
    fetchEstatisticas,
    setEstatisticas: forceUpdateEstatisticas,
  };
}
