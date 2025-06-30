import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Interfaces para documentos (Atualizadas para MySQL API)
export interface DocumentType {
  id: string;
  nome: string;
  tipo: string;
  tags?: string[];
  descricao?: string;
  licitacaoId?: string;
  licitacaoTitulo?: string;
  numeroDocumento?: string;
  dataValidade?: string; // Format DD/MM/YYYY from API if transformed by backend, or ISO
  urlDocumento?: string | null;
  arquivoPath?: string | null; // Cloudinary public_id
  arquivo?: File;
  formato?: string;
  tamanho?: number;
  status: string;
  criadoPor?: string; // User ID
  criadoPorNome?: string; // User Name
  dataCriacao: string; // ISO String
  dataAtualizacao: string; // ISO String
}

export interface DocumentFilter {
  licitacaoId?: string;
  tipo?: string;
  tagNome?: string;
  status?: string;
}

export interface DocumentFormData {
  nome: string;
  tipo: string;
  tags?: string[];
  descricao?: string;
  licitacaoId?: string;
  numeroDocumento?: string;
  dataValidade?: string; // Expected as YYYY-MM-DD or string parsable by new Date()
  arquivo?: File;
  status?: string;
  // criadoPor is handled by backend via JWT
  // urlDocumento is handled by backend
}

// Hook para gerenciar operações de documentos
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); // Call useAuth at the top level

  const fetchDocuments = useCallback(async (filters?: DocumentFilter) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async () => {
      let url = '/api/documentos/doc';
      const params = new URLSearchParams();
      if (filters) {
        if (filters.licitacaoId) params.append('licitacaoId', filters.licitacaoId);
        if (filters.tipo) params.append('tipo', filters.tipo);
        if (filters.tagNome) {
          params.append('tagNome', filters.tagNome);
        }
        if (filters.status) {
          params.append('status', filters.status);
        } else {
          params.append('status', 'ativo'); // Default to active documents
        }
      } else {
        params.append('status', 'ativo'); // Default to active documents
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, data: await response.json().catch(() => ({ error: `Unauthorized: ${response.statusText}` })) };
        }
        throw new Error(`API Error: ${response.status} ${await response.text().catch(() => response.statusText)}`);
      }
      return response.json();
    };

    try {
      const data = await makeRequest();
      setDocuments(data.documentos || []);
      return data.documentos || [];
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useDocuments: 401 detected, attempting refresh for fetchDocuments");
        try {
          await refreshToken();
          console.log("useDocuments: Token refreshed, retrying fetchDocuments");
          const data = await makeRequest(); // Retry
          setDocuments(data.documentos || []);
          return data.documentos || [];
        } catch (refreshError: any) {
          console.error("useDocuments: Token refresh failed for fetchDocuments", refreshError);
          logout(); // Consider if logout should be conditional based on refreshError type
          setError("Sessão expirada. Por favor, faça login novamente.");
          return [];
        }
      } else {
        console.error('Erro ao buscar documentos:', err);
        setError(err.message || "Erro desconhecido ao buscar documentos.");
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const fetchDocumentById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async () => {
      const response = await fetch(`/api/documentos/doc/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, data: await response.json().catch(() => ({ error: `Unauthorized: ${response.statusText}` })) };
        }
        throw new Error(`API Error: ${response.status} ${await response.text().catch(() => response.statusText)}`);
      }
      return response.json();
    };

    try {
      const data = await makeRequest();
      return data.documento;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useDocuments: 401 detected, attempting refresh for fetchDocumentById");
        try {
          await refreshToken();
          console.log("useDocuments: Token refreshed, retrying fetchDocumentById");
          const data = await makeRequest(); // Retry
          return data.documento;
        } catch (refreshError: any) {
          console.error("useDocuments: Token refresh failed for fetchDocumentById", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao buscar documento por ID:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const createDocument = useCallback(async (documentData: Omit<DocumentFormData, 'arquivo'>) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const payload = {
      nome: documentData.nome, tipo: documentData.tipo, licitacaoId: documentData.licitacaoId,
      descricao: documentData.descricao, numeroDocumento: documentData.numeroDocumento,
      dataValidade: documentData.dataValidade, tags: documentData.tags || [],
      status: documentData.status || 'ativo',
    };

    const makeRequest = async (currentPayload: typeof payload) => {
      const response = await fetch('/api/documentos/doc', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPayload),
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, data: await response.json().catch(() => ({ error: `Unauthorized: ${response.statusText}` })) };
        }
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        const errorMessage = typeof errorData === 'object' && errorData !== null && 'error' in errorData 
          ? (errorData as { error: string }).error 
          : `Erro ao criar documento: ${response.status}`;
        throw new Error(errorMessage);
      }
      return response.json();
    };

    try {
      const data = await makeRequest(payload);
      if (data.documento) {
        setDocuments(prevDocs => [data.documento, ...prevDocs]);
        return data.documento;
      }
      return null;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useDocuments: 401 detected, attempting refresh for createDocument");
        try {
          await refreshToken();
          console.log("useDocuments: Token refreshed, retrying createDocument");
          const data = await makeRequest(payload); // Retry
          if (data.documento) {
            setDocuments(prevDocs => [data.documento, ...prevDocs]);
            return data.documento;
          }
          return null;
        } catch (refreshError: any) {
          console.error("useDocuments: Token refresh failed for createDocument", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao criar documento:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const uploadDocument = useCallback(async (documentData: DocumentFormData) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    if (!documentData.arquivo) {
      const { arquivo, ...metadataOnly } = documentData;
      return createDocument(metadataOnly); // createDocument has its own refresh logic
    }

    const makeUploadRequest = async () => {
      const formDataPayload = new FormData();
      formDataPayload.append('file', documentData.arquivo as File);
      formDataPayload.append('nome', documentData.nome);
      formDataPayload.append('tipo', documentData.tipo);
      if (documentData.tags && documentData.tags.length > 0) formDataPayload.append('tags', documentData.tags.join(','));
      if (documentData.descricao) formDataPayload.append('descricao', documentData.descricao);
      if (documentData.licitacaoId) formDataPayload.append('licitacaoId', documentData.licitacaoId);
      if (documentData.numeroDocumento) formDataPayload.append('numeroDocumento', documentData.numeroDocumento);
      if (documentData.dataValidade) formDataPayload.append('dataValidade', documentData.dataValidade);
      if (documentData.status) formDataPayload.append('status', documentData.status);

      const response = await fetch('/api/documentos/doc/upload', {
        method: 'POST',
        credentials: 'include',
        body: formDataPayload,
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, data: await response.json().catch(() => ({ error: `Unauthorized: ${response.statusText}` })) };
        }
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }
      return response.json();
    };

    try {
      const data = await makeUploadRequest();
      if (data.documento) {
        setDocuments(prevDocs => [...prevDocs, data.documento]);
      }
      return data;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useDocuments: 401 detected, attempting refresh for uploadDocument");
        try {
          await refreshToken();
          console.log("useDocuments: Token refreshed, retrying uploadDocument");
          const data = await makeUploadRequest(); // Retry
          if (data.documento) {
            setDocuments(prevDocs => [...prevDocs, data.documento]);
          }
          return data;
        } catch (refreshError: any) {
          console.error("useDocuments: Token refresh failed for uploadDocument", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao fazer upload do documento:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth, createDocument]);

  const deleteDocument = useCallback(async (id: string, fisicamente: boolean = false) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    const makeRequest = async () => {
      const url = `/api/documentos/doc?id=${id}&fisicamente=${fisicamente}`;
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, data: await response.json().catch(() => ({ error: `Unauthorized: ${response.statusText}` })) };
        }
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        const errorMessage = typeof errorData === 'object' && errorData !== null && 'error' in errorData 
          ? (errorData as { error: string }).error 
          : `Erro ao excluir documento: ${response.status}`;
        throw new Error(errorMessage);
      }
      return response.json();
    };

    try {
      const data = await makeRequest();
      if (data.success) {
        if (fisicamente) {
          setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
        } else {
          setDocuments(prevDocs =>
            prevDocs.map(doc => (doc.id === id ? { ...doc, status: 'excluido' } : doc))
          );
        }
      }
      return data.success;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useDocuments: 401 detected, attempting refresh for deleteDocument");
        try {
          await refreshToken();
          console.log("useDocuments: Token refreshed, retrying deleteDocument");
          const data = await makeRequest(); // Retry
           if (data.success) {
            if (fisicamente) {
              setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
            } else {
              setDocuments(prevDocs =>
                prevDocs.map(doc => (doc.id === id ? { ...doc, status: 'excluido' } : doc))
              );
            }
          }
          return data.success;
        } catch (refreshError: any) {
          console.error("useDocuments: Token refresh failed for deleteDocument", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return false;
        }
      } else {
        console.error('Erro ao excluir documento:', err);
        setError(err.message || "Erro desconhecido.");
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const updateDocument = useCallback(async (id: string, updateData: Partial<DocumentFormData>) => {
    setLoading(true);
    setError(null);
    const { refreshToken, logout } = auth;

    if (updateData.arquivo) {
      try {
        const currentDoc = await fetchDocumentById(id); // Has its own refresh logic
        if (!currentDoc) {
            setError('Documento original não encontrado para atualização com arquivo.');
            setLoading(false);
            return null;
        }

        const uploadPayload: DocumentFormData = {
            nome: updateData.nome || currentDoc.nome,
            tipo: updateData.tipo || currentDoc.tipo,
            tags: updateData.tags || currentDoc.tags,
            descricao: updateData.descricao || currentDoc.descricao,
            licitacaoId: updateData.licitacaoId || currentDoc.licitacaoId,
            numeroDocumento: updateData.numeroDocumento || currentDoc.numeroDocumento,
            dataValidade: updateData.dataValidade || currentDoc.dataValidade, // Ensure format consistency
            arquivo: updateData.arquivo,
            status: updateData.status || currentDoc.status,
        };

        const uploadResult = await uploadDocument(uploadPayload); // Has its own refresh logic
        if (!uploadResult || !uploadResult.documento) {
          throw new Error('Erro ao fazer upload do arquivo atualizado durante a atualização do documento.');
        }
        
        // Assuming upload replaces the document or the backend handles old file cleanup if new ID is generated
        // For simplicity, we'll update the local state with the result from upload.
        // If the backend guarantees the same ID, this map is fine. If ID changes, more complex state update needed.
        setDocuments(prevDocs => prevDocs.map(doc => doc.id === id ? uploadResult.documento : doc));
        return uploadResult.documento;

      } catch(err:any) {
        console.error('Erro ao atualizar documento com arquivo:', err);
        setError(err.message || "Erro desconhecido ao atualizar documento com arquivo.");
        // No explicit logout/refresh here as called functions handle it
        return null;
      } finally {
        setLoading(false);
      }
    }

    // Metadata only update
    const metadataToUpdate: Partial<DocumentType> = { ...updateData };
    delete metadataToUpdate.arquivo; // Ensure 'arquivo' field is not in metadata-only update payload
    if (updateData.tags) metadataToUpdate.tags = Array.isArray(updateData.tags) ? updateData.tags : [];


    const makeMetadataUpdateRequest = async (payload: Partial<DocumentType>) => {
      const apiUrl = `/api/documentos/doc/${id}`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401, data: await response.json().catch(() => ({ error: `Unauthorized: ${response.statusText}` })) };
        }
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.status} ${response.statusText}` }));
        const errorMessage = typeof errorData === 'object' && errorData !== null && 'error' in errorData 
          ? (errorData as { error: string }).error 
          : `Erro ao atualizar metadados: ${response.status}`;
        throw new Error(errorMessage);
      }
      return response.json();
    };

    try {
      const data = await makeMetadataUpdateRequest(metadataToUpdate);
      if (data.documento) {
        setDocuments(prevDocs => prevDocs.map(doc => doc.id === id ? data.documento : doc));
        return data.documento;
      }
      return null;
    } catch (err: any) {
      if (err && err.status === 401) {
        console.log("useDocuments: 401 detected, attempting refresh for updateDocument (metadata)");
        try {
          await refreshToken();
          console.log("useDocuments: Token refreshed, retrying updateDocument (metadata)");
          const data = await makeMetadataUpdateRequest(metadataToUpdate); // Retry
          if (data.documento) {
            setDocuments(prevDocs => prevDocs.map(doc => doc.id === id ? data.documento : doc));
            return data.documento;
          }
          return null;
        } catch (refreshError: any) {
          console.error("useDocuments: Token refresh failed for updateDocument (metadata)", refreshError);
          logout();
          setError("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
      } else {
        console.error('Erro ao atualizar metadados do documento:', err);
        setError(err.message || "Erro desconhecido.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [auth, fetchDocumentById, uploadDocument, createDocument]);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    fetchDocumentById,
    createDocument,
    uploadDocument,
    updateDocument,
    deleteDocument
  };
}
