"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Eye, 
  Calendar,
  User,
  Tag,
  FileIcon,
  Loader2,
  AlertCircle,
  Search,
  Filter
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Documento {
  id: string
  nome: string
  tipo: string
  categoria?: string
  descricao?: string
  numeroDocumento?: string
  dataValidade?: string
  urlDocumento?: string
  arquivoPath?: string
  formato?: string
  tamanho?: number | string
  status: string
  dataCriacao: string
  dataAtualizacao: string
  criadoPorNome?: string
  tags: string[]
}

interface VisualizadorDocumentosProps {
  entityId: string
  entityType: 'oportunidade' | 'licitacao'
  title?: string
  showFilters?: boolean
  allowUpload?: boolean
  onDocumentUpload?: () => void
}

// Função para formatar tamanho do arquivo
function formatarTamanho(tamanho: number | string | undefined): string {
  if (!tamanho) return 'N/A'
  
  const bytes = typeof tamanho === 'string' ? parseInt(tamanho) : tamanho
  if (isNaN(bytes) || bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Função para obter ícone do tipo de arquivo
function getFileIcon(formato: string | undefined) {
  if (!formato) return <FileIcon className="h-5 w-5" />
  
  const ext = formato.toLowerCase()
  switch (ext) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'doc':
    case 'docx':
      return <FileText className="h-5 w-5 text-blue-500" />
    case 'xls':
    case 'xlsx':
      return <FileText className="h-5 w-5 text-green-500" />
    case 'ppt':
    case 'pptx':
      return <FileText className="h-5 w-5 text-orange-500" />
    default:
      return <FileIcon className="h-5 w-5 text-gray-500" />
  }
}

export function VisualizadorDocumentos({ 
  entityId, 
  entityType, 
  title = "Documentos",
  showFilters = true,
  allowUpload = false,
  onDocumentUpload
}: VisualizadorDocumentosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("todos")
  const [filterStatus, setFilterStatus] = useState<string>("todos")

  // Carregar documentos
  const fetchDocumentos = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const endpoint = entityType === 'oportunidade' 
        ? `/api/comercial/oportunidades/${entityId}/documentos`
        : `/api/licitacoes/${entityId}/documentos`
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar documentos: ${response.statusText}`)
      }
      
      const data = await response.json()
      setDocumentos(data)
    } catch (err) {
      console.error('Erro ao buscar documentos:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setDocumentos([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (entityId) {
      fetchDocumentos()
    }
  }, [entityId, entityType])

  // Filtrar documentos
  const documentosFiltrados = documentos.filter(doc => {
    const matchesSearch = doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === "todos" || doc.tipo === filterType
    const matchesStatus = filterStatus === "todos" || doc.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  // Obter tipos únicos para filtro
  const tiposUnicos = Array.from(new Set(documentos.map(doc => doc.tipo))).filter(Boolean)

  const handleDownload = async (documento: Documento) => {
    if (!documento.urlDocumento) {
      console.warn('URL do documento não disponível')
      return
    }
    
    try {
      // Abrir em nova aba para download
      window.open(documento.urlDocumento, '_blank')
    } catch (error) {
      console.error('Erro ao fazer download:', error)
    }
  }

  const handlePreview = (documento: Documento) => {
    setSelectedDocument(documento)
    setShowPreview(true)
  }

  const handleExternalLink = (documento: Documento) => {
    if (documento.urlDocumento) {
      window.open(documento.urlDocumento, '_blank')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
              <Badge variant="secondary">{documentos.length}</Badge>
            </CardTitle>
            {allowUpload && (
              <Button size="sm" onClick={onDocumentUpload}>
                <FileIcon className="h-4 w-4 mr-2" />
                Upload
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposUnicos.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Carregando documentos...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center py-8 text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          )}

          {/* Lista de documentos */}
          {!isLoading && !error && (
            <>
              {documentosFiltrados.length > 0 ? (
                <div className="space-y-3">
                  {documentosFiltrados.map((documento) => (
                    <div
                      key={documento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getFileIcon(documento.formato)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {documento.nome}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <FileIcon className="h-3 w-3" />
                              {documento.tipo}
                            </span>
                            {documento.formato && (
                              <span>{documento.formato.toUpperCase()}</span>
                            )}
                            <span>{formatarTamanho(documento.tamanho)}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {documento.dataCriacao}
                            </span>
                            {documento.criadoPorNome && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {documento.criadoPorNome}
                              </span>
                            )}
                          </div>
                          {documento.descricao && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {documento.descricao}
                            </p>
                          )}
                          {documento.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {documento.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={documento.status === 'ativo' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {documento.status}
                        </Badge>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePreview(documento)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(documento)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleExternalLink(documento)}
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== "todos" || filterStatus !== "todos"
                      ? "Nenhum documento encontrado com os filtros aplicados."
                      : "Nenhum documento associado."}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && getFileIcon(selectedDocument.formato)}
              {selectedDocument?.nome}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              {/* Informações do documento */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Tipo:</strong> {selectedDocument.tipo}
                </div>
                <div>
                  <strong>Formato:</strong> {selectedDocument.formato?.toUpperCase()}
                </div>
                <div>
                  <strong>Tamanho:</strong> {formatarTamanho(selectedDocument.tamanho)}
                </div>
                <div>
                  <strong>Status:</strong> {selectedDocument.status}
                </div>
                <div>
                  <strong>Criado em:</strong> {selectedDocument.dataCriacao}
                </div>
                <div>
                  <strong>Criado por:</strong> {selectedDocument.criadoPorNome || 'N/A'}
                </div>
              </div>
              
              {selectedDocument.descricao && (
                <div>
                  <strong>Descrição:</strong>
                  <p className="mt-1 text-sm text-gray-600">{selectedDocument.descricao}</p>
                </div>
              )}
              
              {selectedDocument.tags.length > 0 && (
                <div>
                  <strong>Tags:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDocument.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* Preview do documento */}
              <div className="h-96 border rounded-lg overflow-hidden">
                {selectedDocument.urlDocumento ? (
                  selectedDocument.formato?.toLowerCase() === 'pdf' ? (
                    <iframe
                      src={selectedDocument.urlDocumento}
                      className="w-full h-full"
                      title={selectedDocument.nome}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50">
                      <div className="text-center">
                        <FileIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-4">
                          Preview não disponível para este tipo de arquivo
                        </p>
                        <Button onClick={() => handleDownload(selectedDocument)}>
                          <Download className="h-4 w-4 mr-2" />
                          Fazer Download
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <p className="text-gray-600">Documento não disponível</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

