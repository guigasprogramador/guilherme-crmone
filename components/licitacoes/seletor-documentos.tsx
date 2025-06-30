"use client"

import { useState, useEffect } from "react"
import { Check, FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" 
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useDocuments, DocumentType } from "@/hooks/useDocuments"

interface SeletorDocumentosProps {
  onDocumentosSelecionados: (documentos: DocumentType[]) => void
  documentosSelecionadosIniciais?: string[] // IDs dos documentos já selecionados
}

export function SeletorDocumentos({ 
  onDocumentosSelecionados, 
  documentosSelecionadosIniciais = [] 
}: SeletorDocumentosProps) {
  const [documentos, setDocumentos] = useState<DocumentType[]>([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([])
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>(documentosSelecionadosIniciais)
  const [termoBusca, setTermoBusca] = useState("")
  const [carregando, setCarregando] = useState(true)

  const { fetchDocuments } = useDocuments()

  // Carregar documentos com a tag "licitacao" ao montar o componente
  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregando(true)
        // Buscar documentos com tag "licitacao"
        const docsCarregados = await fetchDocuments({ categoria: "licitacao" })
        
        if (docsCarregados) {
          setDocumentos(docsCarregados)
          setDocumentosFiltrados(docsCarregados)
        }
      } catch (error) {
        console.error("Erro ao carregar documentos:", error)
      } finally {
        setCarregando(false)
      }
    }

    carregarDocumentos()
  }, [fetchDocuments])

  // Filtrar documentos baseado no termo de busca
  useEffect(() => {
    if (!termoBusca.trim()) {
      setDocumentosFiltrados(documentos)
      return
    }

    const termoLowerCase = termoBusca.toLowerCase()
    const filtrados = documentos.filter(doc => 
      doc.nome.toLowerCase().includes(termoLowerCase) || 
      doc.tipo.toLowerCase().includes(termoLowerCase) ||
      (doc.descricao && doc.descricao.toLowerCase().includes(termoLowerCase))
    )
    
    setDocumentosFiltrados(filtrados)
  }, [termoBusca, documentos])

  // Quando a seleção de documentos muda, notificar o componente pai
  useEffect(() => {
    const docsSelecionados = documentos.filter(doc => documentosSelecionados.includes(doc.id))
    onDocumentosSelecionados(docsSelecionados)
  }, [documentosSelecionados, documentos])

  // Alternar seleção de documento
  const toggleDocumento = (id: string) => {
    setDocumentosSelecionados(prev => {
      if (prev.includes(id)) {
        return prev.filter(docId => docId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // Formatar tamanho do arquivo
  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar documentos..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="border rounded-md">
        <div className="px-4 py-2 bg-muted text-sm font-medium flex justify-between items-center">
          <span>Documentos com tag "licitação"</span>
          <Badge variant="outline" className="ml-2">
            {documentosSelecionados.length} selecionados
          </Badge>
        </div>

        {carregando ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando documentos...</p>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum documento encontrado com a tag "licitação".</p>
          </div>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="divide-y">
              {documentosFiltrados.map((doc) => (
                <div 
                  key={doc.id} 
                  className={`p-3 flex items-start hover:bg-muted/50 cursor-pointer ${
                    documentosSelecionados.includes(doc.id) ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => toggleDocumento(doc.id)}
                >
                  <Checkbox 
                    checked={documentosSelecionados.includes(doc.id)}
                    onCheckedChange={() => toggleDocumento(doc.id)}
                    className="mr-3 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                      <p className="font-medium text-sm truncate">{doc.nome}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <span className="inline-block">{doc.tipo}</span>
                      <span>•</span>
                      <span className="inline-block">{formatarTamanho(doc.tamanho || 0)}</span>
                      {doc.categorias && doc.categorias.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex flex-wrap gap-1">
                            {doc.categorias.map((cat, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {doc.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {doc.descricao}
                      </p>
                    )}
                  </div>
                  {documentosSelecionados.includes(doc.id) && (
                    <Check className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
