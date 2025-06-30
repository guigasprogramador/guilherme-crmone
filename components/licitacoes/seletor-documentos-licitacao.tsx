"use client"

import { useState, useEffect } from "react"
import { Check, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDocuments, DocumentType } from "@/hooks/useDocuments"

interface SeletorDocumentosLicitacaoProps {
  onDocumentosSelecionados: (documentos: DocumentType[]) => void
}

export function SeletorDocumentosLicitacao({ 
  onDocumentosSelecionados 
}: SeletorDocumentosLicitacaoProps) {
  const [documentos, setDocumentos] = useState<DocumentType[]>([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([])
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [carregando, setCarregando] = useState(true)

  const { fetchDocuments } = useDocuments()

  // Carregar documentos com a tag "licitacao" ao montar o componente
  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregando(true)
        // Buscar documentos com a tag "licitacao"
        const docsLicitacaoApi = await fetchDocuments({ tagNome: 'licitacao' });
        
        if (docsLicitacaoApi) {
          // A API já retorna os documentos filtrados pela tag "licitacao"
          setDocumentos(docsLicitacaoApi);
          setDocumentosFiltrados(docsLicitacaoApi);
        } else {
          setDocumentos([]);
          setDocumentosFiltrados([]);
        }
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
        setDocumentos([]); // Ensure states are empty on error
        setDocumentosFiltrados([]);
      } finally {
        setCarregando(false);
      }
    };

    carregarDocumentos();
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
  }, [documentosSelecionados, documentos]) // Removida a dependência onDocumentosSelecionados para evitar loops

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
    <div className="mt-4">
      <div className="border rounded-md shadow-sm">
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center">
            <Input
              type="text"
              placeholder="Buscar documentos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full h-9 max-w-[350px]"
            />
          </div>
          <Badge variant="outline" className="bg-white">
            {documentosSelecionados.length} selecionados
          </Badge>
        </div>
        
        <div className="p-3 bg-gray-50 border-b">
          <div className="text-sm font-medium">Documentos com tag "licitação"</div>
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
                  className={`p-3 flex items-start hover:bg-gray-50 cursor-pointer ${
                    documentosSelecionados.includes(doc.id) ? 'bg-blue-50' : ''
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
                    <div className="mt-1 text-xs text-gray-500">
                      <span>{doc.tipo}</span>
                      <span className="mx-1">•</span>
                      <span>{formatarTamanho(doc.tamanho || 0)}</span>
                      {doc.categorias && doc.categorias.length > 0 && (
                        <span className="text-xs text-gray-500 block mt-1">
                          {doc.categorias.join(', ')}
                        </span>
                      )}
                    </div>
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
