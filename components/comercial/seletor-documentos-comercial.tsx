"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentType, useDocuments } from "@/hooks/useDocuments"
import { Search } from "lucide-react"

interface SeletorDocumentosComercialProps {
  onDocumentosSelecionados: (documentos: DocumentType[]) => void
}

export function SeletorDocumentosComercial({ onDocumentosSelecionados }: SeletorDocumentosComercialProps) {
  const [documentos, setDocumentos] = useState<DocumentType[]>([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([])
  const [documentosSelecionados, setDocumentosSelecionados] = useState<DocumentType[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [carregando, setCarregando] = useState(false)
  const { fetchDocuments } = useDocuments()

  // Carregar documentos com a tag "comercial" ao montar o componente
  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregando(true)
        // Buscar documentos com a tag "comercial"
        const docsComercialApi = await fetchDocuments({ tagNome: 'comercial' });
        
        if (docsComercialApi) {
          // A API já retorna os documentos filtrados pela tag "comercial"
          setDocumentos(docsComercialApi);
          setDocumentosFiltrados(docsComercialApi);
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
  }, [fetchDocuments]);

  // Filtrar documentos baseado no termo de busca
  useEffect(() => {
    if (!termoBusca.trim()) {
      setDocumentosFiltrados(documentos)
      return
    }

    const termoLowerCase = termoBusca.toLowerCase()
    const filtrados = documentos.filter(
      (doc) =>
        doc.nome.toLowerCase().includes(termoLowerCase) ||
        doc.tipo.toLowerCase().includes(termoLowerCase) ||
        (doc.descricao && doc.descricao.toLowerCase().includes(termoLowerCase))
    )

    setDocumentosFiltrados(filtrados)
  }, [termoBusca, documentos])

  // Alterar seleção de documentos
  const handleSelecaoDocumento = (documento: DocumentType, selecionado: boolean) => {
    let novosSelecionados = [...documentosSelecionados]

    if (selecionado) {
      novosSelecionados.push(documento)
    } else {
      novosSelecionados = novosSelecionados.filter((doc) => doc.id !== documento.id)
    }

    setDocumentosSelecionados(novosSelecionados)
    onDocumentosSelecionados(novosSelecionados)
  }

  // Verificar se um documento está selecionado
  const estaDocumentoSelecionado = (id: string) => {
    return documentosSelecionados.some((doc) => doc.id === id)
  }

  return (
    <Card className="border rounded-md shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Documentos com tag "comercial"</span>
          <span className="text-sm text-muted-foreground font-normal">
            {documentosSelecionados.length} selecionados
          </span>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="pl-8"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-60 pr-4">
          {carregando ? (
            <div className="text-center py-4 text-muted-foreground">Carregando documentos...</div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {termoBusca ? "Nenhum documento encontrado para a busca." : "Nenhum documento disponível."}
            </div>
          ) : (
            <div className="space-y-2">
              {documentosFiltrados.map((documento) => (
                <div
                  key={documento.id}
                  className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleSelecaoDocumento(documento, !estaDocumentoSelecionado(documento.id))}
                >
                  <Checkbox
                    checked={estaDocumentoSelecionado(documento.id)}
                    onCheckedChange={(checked) =>
                      handleSelecaoDocumento(documento, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label className="font-medium cursor-pointer">{documento.nome}</Label>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {documento.tipo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {documento.tamanho
                          ? `${(documento.tamanho / 1024).toFixed(1)} KB`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
