"use client"

import { useState, useEffect } from "react"
import { Check, FileText, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDocuments, DocumentType } from "@/hooks/useDocuments"

interface SeletorRepositorioSimplificadoProps {
  onDocumentosSelecionados: (documentos: DocumentType[]) => void
}

export function SeletorRepositorioSimplificado({ 
  onDocumentosSelecionados 
}: SeletorRepositorioSimplificadoProps) {
  const [documentos, setDocumentos] = useState<DocumentType[]>([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([])
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState(false)

  const { fetchDocuments } = useDocuments()

  // Carregar documentos com a tag "licitacao" ao montar o componente
  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregando(true)
        // Buscar todos os documentos
        const todosDocumentos = await fetchDocuments()
        
        if (todosDocumentos) {
          // Filtrar documentos que contêm a tag "licitacao" (podendo ter outras também)
          const docsLicitacao = todosDocumentos.filter(doc => {
            // Verificar se categorias é um array
            if (Array.isArray(doc.categorias)) {
              return doc.categorias.includes('licitacao');
            }
            
            // Verificar no campo categoria (string separada por vírgulas)
            if (typeof doc.categoria === 'string') {
              const categorias = doc.categoria.split(',').map(c => c.trim());
              return categorias.includes('licitacao');
            }
            
            return false;
          });
          
          setDocumentos(docsLicitacao);
          setDocumentosFiltrados(docsLicitacao);
        }
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
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
  }, [documentosSelecionados, documentos, onDocumentosSelecionados])

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
    <div className="w-full space-y-2">

      <div className="overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" />
            <Input
              type="text"
              placeholder="Buscar documentos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Badge variant="outline" className="bg-white ml-2">
            {documentosSelecionados.length} selecionados
          </Badge>
        </div>

        <div className="border rounded-md overflow-hidden">
          {carregando ? (
            <div className="p-4 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando documentos...</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Nenhum documento encontrado.</p>
            </div>
          ) : (
            <ScrollArea className={expandido ? "h-[300px]" : "h-[200px]" }>
              <div className="divide-y">
                {documentosFiltrados.map((doc) => (
                  <div 
                    key={doc.id} 
                    className={`p-2 flex items-start hover:bg-gray-50 cursor-pointer ${
                      documentosSelecionados.includes(doc.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleDocumento(doc.id)}
                  >
                    <Checkbox 
                      checked={documentosSelecionados.includes(doc.id)}
                      onCheckedChange={() => toggleDocumento(doc.id)}
                      className="mr-2 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-blue-500 mr-1.5 flex-shrink-0" />
                        <p className="font-medium text-sm truncate">{doc.nome}</p>
                      </div>
                      <div className="flex flex-wrap items-center text-xs text-gray-500 mt-0.5">
                        <span className="mr-1">{doc.tipo}</span>
                        {doc.tamanho ? (
                          <>
                            <span className="mx-1 hidden sm:inline">•</span>
                            <span>{formatarTamanho(doc.tamanho)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {documentosSelecionados.includes(doc.id) && (
                      <Check className="w-4 h-4 text-green-500 ml-1 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {documentosFiltrados.length > 5 && (
            <div className="p-1 text-center border-t">
              <button 
                type="button"
                onClick={() => setExpandido(!expandido)} 
                className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                {expandido ? "Ver menos" : "Ver mais"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
