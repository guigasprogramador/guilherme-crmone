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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      {/* Formulário e seletor de documentos aqui */}
    </form>
  );
}