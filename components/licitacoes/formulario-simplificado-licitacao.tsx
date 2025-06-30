"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Upload, FileText, Search, Check } from "lucide-react"
import { DocumentType, useDocuments } from "@/hooks/useDocuments"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface FormularioSimplificadoLicitacaoProps {
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  titulo: string
  orgao: string
  dataAbertura: string
  responsavel: string
  documentos: File[]
}

export function FormularioSimplificadoLicitacao({ onClose, onSuccess }: FormularioSimplificadoLicitacaoProps) {
  const [formData, setFormData] = useState<FormData>({
    titulo: "",
    orgao: "",
    dataAbertura: "",
    responsavel: "",
    documentos: []
  })
  const [documentosRepositorio, setDocumentosRepositorio] = useState<DocumentType[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados para o seletor de documentos
  const [documentos, setDocumentos] = useState<DocumentType[]>([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([])
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [carregandoDocs, setCarregandoDocs] = useState(true)
  
  const { fetchDocuments } = useDocuments()

  // Carregar documentos com a tag "licitacao" ao montar o componente
  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregandoDocs(true)
        // Buscar documentos com a tag "licitacao"
        const docsLicitacao = await fetchDocuments({ tagNome: 'licitacao' });
        
        if (docsLicitacao) {
          setDocumentos(docsLicitacao);
          setDocumentosFiltrados(docsLicitacao);
        }
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
      } finally {
        setCarregandoDocs(false);
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

  // Quando a seleção de documentos muda, atualizar documentosRepositorio
  useEffect(() => {
    const docsSelecionados = documentos.filter(doc => documentosSelecionados.includes(doc.id))
    setDocumentosRepositorio(docsSelecionados)
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

  const getAuthToken = () => {
    // In a real app, this might come from a context or a more robust auth solution
    return localStorage.getItem('accessToken');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = getAuthToken();

    if (!token) {
      toast({
        title: "Erro de Autenticação",
        description: "Você não está autenticado para realizar esta ação.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    let licitacaoId = "";

    try {
      // 1. Criar a licitação primeiro (sem os arquivos novos)
      const licitacaoPayload = {
        titulo: formData.titulo,
        orgao: formData.orgao, // Passando nome diretamente, API precisa lidar com isso
        dataAbertura: formData.dataAbertura,
        responsavel: formData.responsavel, // Passando nome diretamente
        status: "analise_interna", // Default status
        documentos_vinculados: documentosRepositorio.map(doc => doc.id), // IDs de documentos do repositório
        // O campo 'documentos' (para URLs de novos arquivos) será atualizado implicitamente no backend
        // ou por uma chamada PATCH subsequente se necessário, após os uploads.
      };

      console.log("Criando licitação com payload:", licitacaoPayload);
      const licitacaoResponse = await fetch('/api/licitacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(licitacaoPayload),
      });

      if (!licitacaoResponse.ok) {
        const errorData = await licitacaoResponse.json().catch(() => ({ message: 'Erro ao criar licitação.' }));
        throw new Error(errorData.error || errorData.message || `HTTP error ${licitacaoResponse.status}`);
      }

      const createdLicitacao = await licitacaoResponse.json();
      licitacaoId = createdLicitacao.id; // Assumindo que a API retorna o objeto criado com seu ID

      if (!licitacaoId) {
        throw new Error("ID da licitação não foi retornado após a criação.");
      }
      console.log("Licitação criada com ID:", licitacaoId);

      // 2. Upload dos novos documentos, associando-os à licitação criada
      if (formData.documentos.length > 0) {
        console.log(`Iniciando upload de ${formData.documentos.length} documentos...`);
        for (const file of formData.documentos) {
          const docFormData = new FormData();
          docFormData.append('file', file);
          docFormData.append('licitacaoId', licitacaoId);
          docFormData.append('nome', file.name); // Usar nome original do arquivo
          docFormData.append('tipo', 'Anexo Simplificado'); // Tipo genérico para estes arquivos
          // Adicionar 'uploadPor' se a API /api/documentos/upload esperar
          // const decodedToken = JSON.parse(atob(token.split('.')[1]));
          // if (decodedToken && decodedToken.userId) {
          //   docFormData.append('uploadPor', decodedToken.userId);
          // }

          try {
            const docResponse = await fetch('/api/documentos/doc/upload', { // Endpoint de upload de documentos
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                // Content-Type é definido automaticamente pelo browser para FormData
              },
              body: docFormData,
            });

            if (!docResponse.ok) {
              const errorData = await docResponse.json().catch(() => ({ message: `Falha no upload do arquivo ${file.name}` }));
              console.error(`Erro ao fazer upload do documento ${file.name}:`, errorData.error || errorData.message);
              // Continuar tentando outros uploads, mas talvez coletar esses erros
              toast({
                title: `Falha no Upload: ${file.name}`,
                description: errorData.error || errorData.message || "Erro desconhecido.",
                variant: "destructive",
              });
            } else {
              const uploadedDoc = await docResponse.json();
              console.log(`Documento ${file.name} enviado com sucesso:`, uploadedDoc);
            }
          } catch (uploadError: any) {
            console.error(`Erro crítico durante o upload do documento ${file.name}:`, uploadError);
            toast({
              title: `Erro no Upload: ${file.name}`,
              description: uploadError.message || "Erro de rede ou inesperado.",
              variant: "destructive",
            });
          }
        }
      }

      // 3. Finalização
      toast({
        title: "Sucesso!",
        description: "Licitação cadastrada e documentos enviados.",
      });
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Erro geral ao cadastrar licitação:', error);
      toast({
        title: "Erro ao Cadastrar Licitação",
        description: error.message || "Não foi possível completar a operação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const novoArquivos = Array.from(e.target.files)
      setFormData(prev => ({
        ...prev,
        documentos: [...prev.documentos, ...novoArquivos]
      }))
    }
  }

  // Abrir diálogo de seleção de arquivos
  const handleEscolherArquivos = () => {
    fileInputRef.current?.click()
  }

  // Remover arquivo da lista
  const handleRemoverArquivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.filter((_, i) => i !== index)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="titulo">Nome da Licitação</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="orgao">Órgão Responsável</Label>
        <Input
          id="orgao"
          value={formData.orgao}
          onChange={(e) => setFormData(prev => ({ ...prev, orgao: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="dataAbertura">Data da Licitação</Label>
        <Input
          id="dataAbertura"
          type="date"
          value={formData.dataAbertura}
          onChange={(e) => setFormData(prev => ({ ...prev, dataAbertura: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="responsavel">Responsável</Label>
        <Input
          id="responsavel"
          value={formData.responsavel}
          onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
          required
        />
      </div>

      {/* Documentos do Repositório com tag "licitação" */}
      <div className="mt-4">
        <Label className="text-base font-medium mb-2">Documentos com tag "licitação"</Label>
        <div className="border rounded-md overflow-hidden">
          <div className="p-3 flex items-center justify-between">
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
          
          {carregandoDocs ? (
            <div className="p-4 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando documentos...</p>
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Nenhum documento encontrado.</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
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
                      <div className="flex items-center text-xs text-gray-500 mt-0.5">
                        <span>{doc.tipo}</span>
                        {doc.tamanho ? (
                          <>
                            <span className="mx-1">•</span>
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
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <Label className="text-base font-medium">Anexar Documentos</Label>
        <div className="border rounded-md p-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-2" 
              type="button"
              onClick={handleEscolherArquivos}
            >
              Escolher arquivos
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Badge variant="outline" className="bg-white">
              {formData.documentos.length} selecionado(s)
            </Badge>
          </div>
          {formData.documentos.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-2">
              {formData.documentos.map((arquivo, index) => (
                <div key={index} className="flex items-center text-sm p-1 hover:bg-gray-50 rounded-sm">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="truncate max-w-[200px] flex-1">{arquivo.name}</span>
                  <span className="text-xs text-muted-foreground ml-1 mr-2">
                    ({Math.round(arquivo.size / 1024)} KB)
                  </span>
                  <Button
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => handleRemoverArquivo(index)}
                    type="button"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Os documentos serão anexados após criar a licitação
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}