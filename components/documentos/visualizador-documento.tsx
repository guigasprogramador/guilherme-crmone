"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Download, Calendar, User, Tag, Building, FileType, ExternalLink } from "lucide-react"
import { PDFViewer } from "./pdf-viewer"

interface Documento {
  id: string;
  nome: string;
  tipo: string;
  formato: string;
  tags: string[];
  licitacao?: string;
  licitacaoId?: string;
  dataUpload?: string;
  tamanho?: string | number;
  uploadPor?: string;
  resumo?: string;
  url?: string;
  arquivo_path?: string;
}

interface VisualizadorDocumentoProps {
  documento: Documento | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisualizadorDocumento({ documento, open, onOpenChange }: VisualizadorDocumentoProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset loading state when a new document is opened
    if (open) {
      setIsLoading(true)
    }
  }, [open, documento])

  if (!documento) return null

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

  // Determinar a URL de visualização com base no tipo de arquivo
  const getPreviewUrl = () => {
    // Debug: log das propriedades do documento
    console.log('Documento completo:', documento);
    console.log('documento.url:', documento.url);
    console.log('documento.arquivo_path:', documento.arquivo_path);
    
    // Se temos uma URL direta para o documento, usá-la
    if (documento.url) {
      const correctedUrl = getCorrectUrl(documento.url);
      console.log('Usando documento.url original:', documento.url);
      console.log('Usando documento.url corrigida:', correctedUrl);
      return correctedUrl;
    }
    // Se documento.url não existir, não há URL de visualização disponível.
    // A lógica de construir a URL a partir de arquivo_path foi removida,
    // pois arquivo_path agora é o public_id do Cloudinary e a URL completa deve vir do backend.
    console.log('Nenhuma URL disponível para o documento');
    return null;
  }

  const previewUrl = getPreviewUrl();
  console.log('URL final para PDFViewer:', previewUrl);

  // Função para obter a classe CSS para o badge de categoria


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-[80vw] max-h-[95vh] p-5" aria-describedby="document-viewer-description">
        <div className="overflow-auto h-full">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              <span className="truncate">{documento.nome}</span>
            </DialogTitle>
            <div id="document-viewer-description" className="sr-only">
              Visualizador de documento {documento.nome} do tipo {documento.tipo}
            </div>
          </DialogHeader>

          <div className="mt-4">
            <Tabs defaultValue="preview">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Visualização</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4">
                <div className="h-[75vh]">
                  {previewUrl ? (
                    <PDFViewer url={previewUrl} fileName={documento.nome} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full border rounded-md">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Visualização não disponível</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Não é possível visualizar este documento diretamente.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(document.location.href, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir no navegador
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar documento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <FileType className="h-4 w-4 mr-2 text-muted-foreground" />
                          Formato
                        </p>
                        <p>{documento.formato?.toUpperCase()}</p>
                      </div>
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
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {documento.tags?.map(categoria => (
                            <Badge key={categoria} variant="outline">
                              {categoria}
                            </Badge>
                          ))}
                        </div>
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
                        <p>{documento.uploadPor}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Tamanho</p>
                        <p>{documento.tamanho}</p>
                      </div>
                    </div>

                    {documento.resumo && (
                      <div className="mt-4">
                        <p className="text-sm font-medium">Resumo</p>
                        <p className="text-sm mt-1">{documento.resumo}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
