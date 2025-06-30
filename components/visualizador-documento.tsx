"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Calendar, User, Tag, Building, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PDFViewer } from "@/components/documentos/pdf-viewer"

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
  conteudo?: string;
  categoria?: string;
  categoriaId?: string;
}

interface VisualizadorDocumentoProps {
  documento: Documento
  trigger?: React.ReactNode
}

// Função para corrigir URLs do Cloudinary
function getCorrectUrl(url: string): string {
  if (!url) return url;
  
  // Remove extensões duplicadas como .pdf.raw
  let correctedUrl = url.replace(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)\.raw$/i, '.$1');
  
  // Para URLs do Cloudinary, converter /image/upload/ para /raw/upload/ para PDFs
  if (correctedUrl.includes('cloudinary.com') && correctedUrl.includes('/image/upload/')) {
    if (correctedUrl.toLowerCase().includes('.pdf')) {
      correctedUrl = correctedUrl.replace('/image/upload/', '/raw/upload/');
    }
  }
  
  return correctedUrl;
}

export function VisualizadorDocumento({ documento, trigger }: VisualizadorDocumentoProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [highlightedContent, setHighlightedContent] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("preview")

  const handleSearch = () => {
    if (!searchTerm || !documento.conteudo) {
      setHighlightedContent(null)
      return
    }

    // Simples implementação para destacar o termo de busca
    const regex = new RegExp(`(${searchTerm})`, "gi")
    const highlighted = documento.conteudo.replace(regex, '<span class="bg-yellow-200 text-black">$1</span>')

    setHighlightedContent(highlighted)
  }

  // Determinar a URL de visualização com base no tipo de arquivo
  const getPreviewUrl = () => {
    const documentUrl = documento.url || documento.arquivo_path
    
    if (!documentUrl) {
      return null
    }
    
    // Corrigir URL do Cloudinary se necessário (trocar /image/upload/ por /raw/upload/ para PDFs)
    let correctedUrl = documentUrl
    if (documentUrl.includes('cloudinary.com') && documentUrl.includes('/image/upload/') && 
        (documento.nome.toLowerCase().endsWith('.pdf') || documento.formato?.toLowerCase() === 'pdf')) {
      correctedUrl = documentUrl.replace('/image/upload/', '/raw/upload/')
    }
    
    if (documento.nome.toLowerCase().endsWith(".pdf") || documento.formato?.toLowerCase() === 'pdf') {
      // Para PDFs, usar diretamente a URL do Cloudinary
      return correctedUrl
    } else if (
      documento.nome.toLowerCase().endsWith(".docx") ||
      documento.nome.toLowerCase().endsWith(".doc") ||
      documento.nome.toLowerCase().endsWith(".xlsx") ||
      documento.nome.toLowerCase().endsWith(".xls")
    ) {
      // Para documentos Office, usar o visualizador online da Microsoft
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(correctedUrl)}`
    }
    
    // Para outros tipos de arquivo, retornar a URL direta
    return correctedUrl
  }

  const previewUrl = getPreviewUrl()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] w-[calc(100vw-2rem)] md:w-auto">
        <div className="overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              <span className="truncate">{documento.nome}</span>
            </DialogTitle>
            <DialogDescription className="truncate">Visualização do documento e suas informações</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Visualização</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4">
              {activeTab === "preview" && (
                <div className="border rounded-md h-[400px] md:h-[500px] flex flex-col">
                  {previewUrl ? (
                    (documento.nome.toLowerCase().endsWith('.pdf') || documento.formato?.toLowerCase() === 'pdf') ? (
                      <PDFViewer url={previewUrl} fileName={documento.nome} />
                    ) : (
                      <iframe src={previewUrl} className="w-full h-full border-0 rounded-md" title={documento.nome} />
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted/20 p-4">
                      <div className="text-center">
                        <FileText className="h-12 md:h-16 w-12 md:w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Visualização não disponível para este tipo de arquivo</p>
                        <Button variant="outline" className="mt-4" onClick={() => {
                          const downloadUrl = documento.url || documento.arquivo_path
                          if (downloadUrl) {
                            const correctedUrl = getCorrectUrl(downloadUrl)
                            console.log('Visualizador - URL original:', downloadUrl);
                            console.log('Visualizador - URL corrigida:', correctedUrl);
                            window.open(correctedUrl, '_blank')
                          }
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar para visualizar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "details" && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          Tipo de Documento
                        </p>
                        <p>{documento.tipo}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                          Categoria
                        </p>
                        <Badge variant="outline" className={getCategoryBadgeClass(documento.categoriaId)}>
                          {documento.categoria}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                          Licitação
                        </p>
                        <p className="truncate">{documento.licitacao}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          Data de Upload
                        </p>
                        <p>{documento.dataUpload}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          Enviado por
                        </p>
                        <p>Ana Silva</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Tamanho</p>
                        <p>{documento.tamanho}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "content" && (
                <>
                  <div className="mb-4 flex flex-col md:flex-row gap-2">
                    <Input
                      placeholder="Buscar no conteúdo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleSearch}>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="border rounded-md p-4 h-[200px] md:h-[300px] overflow-y-auto">
                        {documento.conteudo ? (
                          highlightedContent ? (
                            <div dangerouslySetInnerHTML={{ __html: highlightedContent }} />
                          ) : (
                            <p>{documento.conteudo}</p>
                          )
                        ) : (
                          <p className="text-muted-foreground text-center">
                            Nenhum conteúdo disponível para este documento.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full md:w-auto">
              Fechar
            </Button>
            <Button className="w-full md:w-auto" onClick={() => {
              const downloadUrl = documento.url || documento.arquivo_path
              if (downloadUrl) {
                const correctedUrl = getCorrectUrl(downloadUrl)
                console.log('Visualizador Footer - URL original:', downloadUrl);
                console.log('Visualizador Footer - URL corrigida:', correctedUrl);
                window.open(correctedUrl, '_blank')
              }
            }}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Documento
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Função para obter a classe CSS para o badge de categoria
function getCategoryBadgeClass(categoriaId: string) {
  switch (categoriaId) {
    case "projetos":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "contabeis":
      return "bg-green-100 text-green-800 border-green-300"
    case "societarios":
      return "bg-purple-100 text-purple-800 border-purple-300"
    case "juridicos":
      return "bg-amber-100 text-amber-800 border-amber-300"
    case "atestado_capacidade":
      return "bg-indigo-100 text-indigo-800 border-indigo-300"
    default:
      return ""
  }
}

