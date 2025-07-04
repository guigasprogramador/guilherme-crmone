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

interface FormularioSimplificadoOportunidadeProps {
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  titulo: string
  cliente: string
  responsavel: string
  documentos: File[]
}

export function FormularioSimplificadoOportunidade({ onClose, onSuccess }: FormularioSimplificadoOportunidadeProps) {
  const [formData, setFormData] = useState<FormData>({
    titulo: "",
    cliente: "",
    responsavel: "",
    documentos: []
  })
  const [documentosRepositorio, setDocumentosRepositorio] = useState<DocumentType[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [documentos, setDocumentos] = useState<DocumentType[]>([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([])
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [carregandoDocs, setCarregandoDocs] = useState(true)
  
  const { fetchDocuments } = useDocuments()

  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregandoDocs(true)
        const docsComercial = await fetchDocuments({ tagNome: 'comercial' });
        
        if (docsComercial) {
          setDocumentos(docsComercial);
          setDocumentosFiltrados(docsComercial);
        }
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
      } finally {
        setCarregandoDocs(false);
      }
    };

    carregarDocumentos();
  }, [fetchDocuments])

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

  useEffect(() => {
    const docsSelecionados = documentos.filter(doc => documentosSelecionados.includes(doc.id))
    setDocumentosRepositorio(docsSelecionados)
  }, [documentosSelecionados, documentos])

  const toggleDocumento = (id: string) => {
    setDocumentosSelecionados(prev => {
      if (prev.includes(id)) {
        return prev.filter(docId => docId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const getAuthToken = () => {
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

    let oportunidadeId = "";

    try {
      const oportunidadePayload = {
        titulo: formData.titulo,
        cliente: formData.cliente,
        responsavel: formData.responsavel,
        status: "novo_lead",
        documentos_vinculados: documentosRepositorio.map(doc => doc.id),
      };

      console.log("Criando oportunidade com payload:", oportunidadePayload);
      const oportunidadeResponse = await fetch('/api/comercial/oportunidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(oportunidadePayload),
      });

      if (!oportunidadeResponse.ok) {
        const errorData = await oportunidadeResponse.json().catch(() => ({ message: 'Erro ao criar oportunidade.' }));
        throw new Error(errorData.error || errorData.message || `HTTP error ${oportunidadeResponse.status}`);
      }

      const createdOportunidade = await oportunidadeResponse.json();
      oportunidadeId = createdOportunidade.id;

      if (!oportunidadeId) {
        throw new Error("ID da oportunidade não foi retornado após a criação.");
      }
      console.log("Oportunidade criada com ID:", oportunidadeId);

      if (formData.documentos.length > 0) {
        console.log(`Iniciando upload de ${formData.documentos.length} documentos...`);
        for (const file of formData.documentos) {
          const docFormData = new FormData();
          docFormData.append('file', file);
          docFormData.append('oportunidadeId', oportunidadeId);
          docFormData.append('nome', file.name);
          docFormData.append('tipo', 'Anexo Simplificado');

          const uploadResponse = await fetch('/api/documentos/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: docFormData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({ message: 'Erro no upload.' }));
            console.error(`Falha no upload do arquivo ${file.name}:`, errorData.message || `HTTP error ${uploadResponse.status}`);
          }
        }
      }

      toast({
        title: "Sucesso!",
        description: "Oportunidade e documentos foram criados com sucesso.",
      });
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Erro ao criar oportunidade:", error);
      toast({
        title: "Erro ao Criar Oportunidade",
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFormData(prev => ({
        ...prev,
        documentos: [...prev.documentos, ...newFiles]
      }))
    }
  }

  const handleEscolherArquivos = () => {
    fileInputRef.current?.click()
  }

  const handleRemoverArquivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.filter((_, i) => i !== index)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="titulo">Título da Oportunidade</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="cliente">Cliente</Label>
        <Input
          id="cliente"
          value={formData.cliente}
          onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
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

      {/* Documentos do Repositório com tag "comercial" */}
      <div className="mt-4">
        <Label className="text-base font-medium mb-2">Documentos com tag "comercial"</Label>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {doc.nome}
                          </span>
                        </div>
                        {documentosSelecionados.includes(doc.id) && (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {doc.tipo}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatarTamanho(doc.tamanho || 0)}
                        </span>
                      </div>
                      {doc.descricao && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {doc.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Upload de novos documentos */}
      <div className="mt-4">
        <Label className="text-base font-medium mb-2">Anexar novos documentos</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEscolherArquivos}
                className="text-sm"
              >
                Escolher arquivos
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PDF, DOC, DOCX, XLS, XLSX até 10MB
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {formData.documentos.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Arquivos selecionados:</Label>
              {formData.documentos.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatarTamanho(file.size)})</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoverArquivo(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Oportunidade"}
        </Button>
      </div>
    </form>
  );
}