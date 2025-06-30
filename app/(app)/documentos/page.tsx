"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import AppLayout from "@/app/(app)/layout";
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Download, FileText, Trash2, Calendar, FileIcon } from "lucide-react"
import { NovoDocumento } from "@/components/documentos/novo-documento"
import { VisualizadorDocumento } from "@/components/documentos/visualizador-documento"
import { FiltroDocumentos, DocumentoFiltros } from "@/components/documentos/filtro-documentos"
import { useDocuments, DocumentType } from "@/hooks/useDocuments"
import { useLicitacoes, Licitacao } from "@/hooks/useLicitacoes"
import { format, addDays, isAfter, isBefore } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"

// Interface atualizada para usar os tipos da API
interface Documento {
  id: string;
  nome: string;
  tipo: string;
  formato: string;
  tags: string[];        // Substituindo categorias por tags para manter consistência
  licitacao?: string;
  licitacaoId?: string;
  dataUpload?: string;
  uploadPor?: string;
  resumo?: string;
  url?: string;
  arquivo_path?: string;
  tamanho?: string | number;
  dataValidade?: string;
  descricao?: string;
}





export default function DocumentosPage() {
  const [filteredDocumentos, setFilteredDocumentos] = useState<Documento[]>([])
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const { toast } = useToast()
  
  // Hooks para carregar documentos da API
  const {
    documents,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument
  } = useDocuments()

  // Hook para carregar licitações
  const { 
    licitacoes,
    loading: loadingLicitacoes,
    fetchLicitacoes
  } = useLicitacoes()

  // Efeito para carregar documentos ao montar o componente
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])
  
  // Efeito para carregar licitações ao montar o componente
  useEffect(() => {
    fetchLicitacoes()
  }, [fetchLicitacoes])

  // Efeito para atualizar documentos filtrados quando a lista de documentos mudar
  useEffect(() => {
    if (documents && documents.length > 0) {
      const formattedDocs = documents.map(formatarDocumentoParaUI)
      setFilteredDocumentos(formattedDocs)
    } else {
      setFilteredDocumentos([])
    }
  }, [documents])

  // Função para formatar documento da API para o formato da UI
  const formatarDocumentoParaUI = (doc: DocumentType): Documento => {
    // Formatar data ISO para data legível
    let dataFormatada = ""
    if (doc.dataCriacao) {
      try {
        dataFormatada = format(new Date(doc.dataCriacao), "dd/MM/yyyy", { locale: ptBR })
      } catch (e) {
        console.error("Erro ao formatar data:", e)
        dataFormatada = doc.dataCriacao.toString()
      }
    }

    // Formatar tamanho do arquivo
    const tamanhoFormatado = doc.tamanho ? formatFileSize(doc.tamanho) : ""

    return {
      id: doc.id,
      nome: doc.nome || "",
      tipo: doc.tipo || "",
      formato: doc.formato || "",
      tags: doc.tags || [],
      licitacao: doc.licitacaoTitulo || (doc.licitacaoId ? `Licitação ${doc.licitacaoId}` : ""),
      licitacaoId: doc.licitacaoId || "",
      dataUpload: dataFormatada,
      uploadPor: doc.criadoPorNome || doc.criadoPor || "",
      resumo: doc.descricao || "",
      url: doc.urlDocumento || "",
      arquivo_path: doc.arquivoPath || "",
      tamanho: tamanhoFormatado,
      dataValidade: doc.dataValidade,
      descricao: doc.descricao || "",
    }
  }

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Função para filtrar documentos
  const filtrarDocumentos = (filtros: DocumentoFiltros) => {
    let docsAtivos = [...documents.map(formatarDocumentoParaUI)]
    
    if (filtros.termo) {
      const termo = filtros.termo.toLowerCase();
      docsAtivos = docsAtivos.filter(doc => 
        doc.nome.toLowerCase().includes(termo) || 
        (doc.resumo && doc.resumo.toLowerCase().includes(termo)) ||
        (doc.descricao && doc.descricao.toLowerCase().includes(termo))
      );
    }
    
    if (filtros.tipo && filtros.tipo !== 'todos') {
      docsAtivos = docsAtivos.filter(doc => doc.tipo === filtros.tipo);
    }
    
    if (filtros.tags && filtros.tags.length > 0) {
      docsAtivos = docsAtivos.filter(doc => 
        (filtros.tags && filtros.tags.every(cat => doc.tags.includes(cat)))
      );
    }
    
    if (filtros.licitacao && filtros.licitacao !== 'todos') {
      docsAtivos = docsAtivos.filter(doc => doc.licitacaoId === filtros.licitacao);
    }
    
    if (filtros.formato && filtros.formato.trim() !== "" && filtros.formato !== 'todos') {
      docsAtivos = docsAtivos.filter(doc => {
        const formato = doc.formato?.toLowerCase() || '';
        return formato === filtros.formato?.toLowerCase();
      });
    }
    
    setFilteredDocumentos(docsAtivos);
  }

  // Função para abrir o visualizador de documento
  const handleViewDocument = (documento: Documento) => {
    // Sempre usar o visualizador em modal
    setSelectedDocumento(documento);
    setIsViewerOpen(true);
  }

  // Função para tratar o novo documento adicionado
  const handleDocumentoAdded = async (novoDocumento: any, arquivo?: File) => {
    try {
      const docData = {
        nome: novoDocumento.nome,
        tipo: novoDocumento.tipo,
        tags: novoDocumento.tags || [], // Usa tags diretamente ou array vazio como fallback
        descricao: novoDocumento.descricao,
        licitacaoId: novoDocumento.licitacaoId,
        numeroDocumento: novoDocumento.numeroDocumento,
        dataValidade: novoDocumento.dataValidade,
        arquivo: arquivo
      };

      console.log("Enviando documento com tags:", docData.tags);
      
      // Enviar documento para a API
      const resultado = await uploadDocument(docData)
      
      if (resultado) {
        toast({
          title: "Documento adicionado",
          description: "O documento foi adicionado com sucesso!"
        })
        
        // Recarregar a lista de documentos
        fetchDocuments()
      }
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar documento",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  // Função para lidar com a exclusão do documento
  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (window.confirm("Tem certeza que deseja excluir este documento?")) {
      try {
        const resultado = await deleteDocument(id)
        
        if (resultado) {
          toast({
            title: "Documento excluído",
            description: "O documento foi excluído com sucesso!"
          })
          
          // Recarregar a lista de documentos
          fetchDocuments()
        }
      } catch (error: any) {
        toast({
          title: "Erro ao excluir documento",
          description: error.message,
          variant: "destructive"
        })
      }
    }
  }

  // Função para corrigir URLs do Cloudinary
  const getCorrectUrl = (originalUrl: string): string => {
    if (!originalUrl) return originalUrl;
    
    let correctedUrl = originalUrl;
    
    // Remover extensões duplicadas (ex: .pdf.raw, .doc.raw, etc.)
    const duplicatedExtensions = ['.pdf.raw', '.doc.raw', '.docx.raw', '.xls.raw', '.xlsx.raw', '.ppt.raw', '.pptx.raw'];
    duplicatedExtensions.forEach(ext => {
      if (correctedUrl.endsWith(ext)) {
        correctedUrl = correctedUrl.replace(ext, ext.split('.')[1]); // Remove a parte .raw
      }
    });
    
    // Padrão mais genérico: se termina com .{ext}.raw, remover o .raw
    const genericPattern = /\.(\w+)\.raw$/;
    if (genericPattern.test(correctedUrl)) {
      correctedUrl = correctedUrl.replace(genericPattern, '.$1');
    }
    
    // Se a URL do Cloudinary está usando /image/upload/, converter para /raw/upload/ para PDFs
    if (correctedUrl.includes('cloudinary.com') && correctedUrl.includes('/image/upload/')) {
      correctedUrl = correctedUrl.replace('/image/upload/', '/raw/upload/');
    }
    
    return correctedUrl;
  }

  // Função para fazer download do arquivo
  const handleDownload = (documento: Documento, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (documento.url) { // Check if the Cloudinary URL exists
      const correctedUrl = getCorrectUrl(documento.url);
      console.log('Download - URL original:', documento.url);
      console.log('Download - URL corrigida:', correctedUrl);
      window.open(correctedUrl, '_blank');
    } else {
      toast({
        title: "Erro ao baixar documento",
        description: "URL do documento não encontrada.",
        variant: "destructive"
      })
    }
  }

  // Calcular estatísticas para os cards no topo
  const totalDocumentos = filteredDocumentos.length;
  
  // Calcular documentos que vencem em 30 dias
  const calcularDocumentosVencendo = () => {
    const hoje = new Date();
    const em30Dias = addDays(hoje, 30);
    
    return filteredDocumentos.filter(doc => {
      if (!doc.dataValidade) return false;
      
      try {
        const dataValidade = doc.dataValidade.split('/').reverse().join('-');
        const dataValidadeObj = new Date(dataValidade);
        
        // Documentos que vencem nos próximos 30 dias (depois de hoje e antes de 30 dias a partir de hoje)
        return isAfter(dataValidadeObj, hoje) && isBefore(dataValidadeObj, em30Dias);
      } catch (e) {
        return false;
      }
    }).length;
  };
  
  const documentosVencendo = calcularDocumentosVencendo();

  // Extrair listas de valores únicos para os filtros de forma mais simples
  const tiposUnicos = filteredDocumentos
    .map(doc => doc.tipo)
    .filter((value, index, self) => value && self.indexOf(value) === index);
  
  // Formatar corretamente as licitações e categorias conforme esperado pelos componentes
  const licitacoesUnicas = filteredDocumentos
    .filter(doc => doc.licitacaoId && doc.licitacao)
    .map(doc => ({ id: doc.licitacaoId || '', nome: doc.licitacao || 'Sem nome' }))
    .filter((value, index, self) => 
      index === self.findIndex(t => t.id === value.id)
    );
  
  const categoriasUnicas = Array.from(new Set(
    filteredDocumentos.flatMap(doc => doc.tags || [])
  )).map(categoria => ({
    id: categoria.toLowerCase().replace(/\s+/g, '_'),
    nome: categoria
  }));

  return (
    <div className="container mx-auto py-6 px-4 bg-gray-50">
      <h1 className="text-2xl font-semibold mb-5">Documentos</h1>
      
      {/* Cards de estatísticas */}
      <div className="flex flex-wrap gap-4 mb-5">
        <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm min-w-[125px]">
          <h2 className="text-3xl font-bold">{totalDocumentos}</h2>
          <p className="text-sm text-gray-500">Documentos</p>
        </div>
        
        <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm min-w-[125px]">
          <h2 className="text-3xl font-bold">{documentosVencendo}</h2>
          <p className="text-sm text-gray-500">Vencem em 30dias</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Lista de Documentos</h2>
            <div className="flex items-center gap-2">
              <div className="inline">
                <FiltroDocumentos 
                  onFilterChange={filtrarDocumentos}
                  tiposDocumentos={tiposUnicos}
                  categorias={categoriasUnicas}
                  licitacoes={licitacoesUnicas}
                />
              </div>
              
              <div className="inline">
                <NovoDocumento onDocumentoAdded={handleDocumentoAdded} />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Gerenciamento de todos os documentos cadastrados.</p>

          {/* Lista de documentos */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-primary rounded-full" 
                     aria-label="loading"></div>
                <p className="mt-2">Carregando documentos...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-sm">
                    <th className="text-left p-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left p-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left p-3 font-medium text-gray-600">Categoria</th>
                    <th className="text-left p-3 font-medium text-gray-600">Licitação</th>
                    <th className="text-left p-3 font-medium text-gray-600">Data de Upload</th>
                    <th className="text-left p-3 font-medium text-gray-600">Tamanho</th>
                    <th className="text-left p-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocumentos.length > 0 ? (
                    filteredDocumentos.map((documento) => (
                      <tr
                        key={documento.id}
                        className="border-b hover:bg-gray-50 text-sm"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-blue-500">
                            <FileIcon className="h-4 w-4 text-blue-500" />
                            <a 
                              href="#" 
                              className="text-blue-500 hover:underline"
                              onClick={(e) => {
                                e.preventDefault()
                                handleViewDocument(documento)
                              }}
                            >
                              {documento.nome}
                            </a>
                          </div>
                        </td>
                        <td className="p-3">{documento.tipo}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {documento.tags?.map((categoria: string, index: number) => (
                              <Badge
                                key={`${documento.id}-${index}`}
                                variant="outline"
                                className="text-xs py-1 px-2 font-normal rounded-full"
                              >
                                {categoria}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">{documento.licitacao}</td>
                        <td className="p-3">{documento.dataUpload}</td>
                        <td className="p-3">{documento.tamanho}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleViewDocument(documento)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={(e) => handleDownload(documento, e)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-red-500 hover:text-red-700" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(documento.id, e);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Nenhum documento encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Visualizador de documento */}
      <VisualizadorDocumento documento={selectedDocumento} open={isViewerOpen} onOpenChange={setIsViewerOpen} />
    </div>
  )
}
