// hooks/propostas/usePropostas.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Assumindo que useAuth está disponível e configurado

// Tipos (devem ser importados de @/types/propostas ou similar quando definidos)
// Por enquanto, definições simplificadas baseadas nas APIs
export interface PropostaItem {
  id: string;
  proposta_id: string;
  ordem?: number;
  tipo_item: string;
  descricao_item: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: number;
  subtotal_item: number;
  observacoes_item?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PropostaDocumento { // Simplificado
  id: string;
  nome: string;
  tipo: string;
  url_documento?: string;
}

export interface Proposta {
  id: string;
  titulo: string;
  numero_proposta: string;
  versao: number;
  status_proposta: string;
  data_emissao: string;
  data_validade?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  orgao_id?: string | null;
  orgao_nome?: string | null;
  oportunidade_id?: string | null;
  oportunidade_titulo?: string | null;
  licitacao_id?: string | null;
  licitacao_titulo?: string | null;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  moeda: string;
  valor_total_itens: number;
  percentual_desconto: number;
  valor_desconto: number;
  valor_subtotal_pos_desconto: number;
  valor_impostos: number;
  valor_total_proposta: number;
  condicoes_pagamento?: string | null;
  prazo_entrega_execucao?: string | null;
  observacoes_internas?: string | null;
  escopo_geral?: string | null;
  data_envio_cliente?: string | null;
  data_aprovacao_rejeicao?: string | null;
  motivo_recusa_cancelamento?: string | null;
  link_compartilhamento_externo?: string | null;
  created_at: string;
  updated_at: string;
  itens?: PropostaItem[];      // Array de itens da proposta
  documentos?: PropostaDocumento[]; // Array de documentos associados
}

// Tipos para payloads, baseados nas APIs
interface PropostaItemPayloadApi { // Para criação/atualização de itens
  id?: string;
  ordem?: number;
  tipo_item: string;
  descricao_item: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: number;
  observacoes_item?: string;
}
interface PropostaPayloadApi { // Para criar/atualizar proposta
  titulo: string;
  status_proposta?: string;
  data_emissao?: string;
  data_validade?: string | null;
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  licitacao_id?: string | null;
  responsavel_id?: string | null;
  moeda?: string;
  percentual_desconto?: number;
  valor_impostos?: number;
  condicoes_pagamento?: string | null;
  prazo_entrega_execucao?: string | null;
  observacoes_internas?: string | null;
  escopo_geral?: string | null;
  itens: PropostaItemPayloadApi[];
}


export function usePropostas() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
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
        'Authorization': `Bearer ${currentToken}`,
      };
      const res = await fetch(url, { ...options, headers, credentials: 'include' });
      if (res.status === 401) {
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
      if (err && err.status === 401) {
        console.log("usePropostas: 401 detected, attempting token refresh.");
        try {
          const newToken = await refreshToken();
          if (!newToken) throw new Error("Failed to refresh token.");
          return await doRequest(newToken);
        } catch (refreshError: any) {
          console.error("usePropostas: Token refresh failed.", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          throw refreshError;
        }
      } else {
        throw err;
      }
    }
  }, [auth]);


  const fetchPropostas = useCallback(async (filters?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filters);
      const response = await makeAuthenticatedRequest(`/api/propostas?${params.toString()}`);
      const data = await response.json();
      setPropostas(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar propostas.');
      console.error('Falha ao buscar propostas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const getPropostaById = useCallback(async (id: string): Promise<Proposta | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/propostas/${id}`);
      return await response.json();
    } catch (err: any) {
      setError(err.message || `Falha ao buscar proposta ${id}.`);
      console.error(`Falha ao buscar proposta ${id}:`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const createProposta = useCallback(async (propostaData: PropostaPayloadApi): Promise<Proposta | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest('/api/propostas', {
        method: 'POST',
        body: JSON.stringify(propostaData),
      });
      const novaProposta = await response.json();
      setPropostas(prev => [novaProposta, ...prev].sort((a,b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()));
      return novaProposta;
    } catch (err: any) {
      setError(err.message || 'Falha ao criar proposta.');
      console.error('Falha ao criar proposta:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const updateProposta = useCallback(async (id: string, propostaData: PropostaUpdatePayload): Promise<Proposta | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`/api/propostas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(propostaData),
      });
      const propostaAtualizada = await response.json();
      setPropostas(prev => prev.map(p => p.id === id ? propostaAtualizada : p)
                               .sort((a,b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()));
      return propostaAtualizada;
    } catch (err: any) {
      setError(err.message || `Falha ao atualizar proposta ${id}.`);
      console.error(`Falha ao atualizar proposta ${id}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const updateStatusProposta = useCallback(async (id: string, status_proposta: string, motivo_recusa_cancelamento?: string): Promise<Proposta | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: {status_proposta: string; motivo_recusa_cancelamento?: string} = { status_proposta };
      if (motivo_recusa_cancelamento && (status_proposta === 'RECUSADA' || status_proposta === 'CANCELADA')) {
        payload.motivo_recusa_cancelamento = motivo_recusa_cancelamento;
      }
      const response = await makeAuthenticatedRequest(`/api/propostas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const propostaAtualizada = await response.json();
      setPropostas(prev => prev.map(p => p.id === id ? propostaAtualizada : p)
                               .sort((a,b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()));
      return propostaAtualizada;
    } catch (err: any) {
      setError(err.message || `Falha ao atualizar status da proposta ${id}.`);
      console.error(`Falha ao atualizar status da proposta ${id}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  const cancelProposta = useCallback(async (id: string, motivo_cancelamento?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: {status_proposta: string; motivo_recusa_cancelamento?: string} = {
        status_proposta: 'CANCELADA'
      };
      if (motivo_cancelamento) {
        payload.motivo_recusa_cancelamento = motivo_cancelamento;
      }

      const response = await makeAuthenticatedRequest(`/api/propostas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const propostaAtualizada = await response.json();
      setPropostas(prev => prev.map(p => p.id === id ? propostaAtualizada : p)
                               .sort((a,b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()));
      return true;
    } catch (err: any) {
      setError(err.message || `Falha ao cancelar proposta ${id}.`);
      console.error(`Falha ao cancelar proposta ${id}:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  return {
    propostas,
    isLoading,
    error,
    fetchPropostas,
    getPropostaById,
    createProposta,
    updateProposta,
    updateStatusProposta,
    cancelProposta,
  };
}
