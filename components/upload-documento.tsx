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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FilePlus, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface UploadDocumentoProps {
  onDocumentoAdded?: (documento: any) => void
}

export function UploadDocumento({ onDocumentoAdded }: UploadDocumentoProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    categoria: "",
    licitacao: "",
    descricao: ""
  })
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setArquivoSelecionado(file)
      if (!formData.nome) {
        setFormData(prev => ({ ...prev, nome: file.name }))
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleUpload = async () => {
    if (!arquivoSelecionado || !formData.nome || !formData.tipo) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione um arquivo e preencha os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)

    try {
      const formDataPayload = new FormData()
      formDataPayload.append('file', arquivoSelecionado)
      formDataPayload.append('nome', formData.nome)
      formDataPayload.append('tipo', formData.tipo)
      if (formData.categoria) formDataPayload.append('categoria', formData.categoria)
      if (formData.licitacao) formDataPayload.append('licitacaoId', formData.licitacao)
      if (formData.descricao) formDataPayload.append('descricao', formData.descricao)

      const response = await fetch('/api/documentos/doc/upload', {
        method: 'POST',
        credentials: 'include',
        body: formDataPayload,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      
      toast({
        title: "Upload realizado",
        description: "Documento enviado com sucesso!"
      })

      // Resetar formulário
      setFormData({
        nome: "",
        tipo: "",
        categoria: "",
        licitacao: "",
        descricao: ""
      })
      setArquivoSelecionado(null)
      setOpen(false)

      // Notificar componente pai
      if (onDocumentoAdded) {
        onDocumentoAdded(data.documento)
      }

    } catch (error: any) {
      console.error('Erro no upload:', error)
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar documento",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FilePlus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>Faça o upload de um novo documento para o sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file">
              Arquivo *
            </Label>
            <Input 
              id="file" 
              type="file" 
              onChange={handleFileChange} 
              className="cursor-pointer"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" 
            />
            {arquivoSelecionado && (
              <p className="text-sm text-muted-foreground">
                {arquivoSelecionado.name} ({(arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="nome">
              Nome do Documento *
            </Label>
            <Input
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="Nome do documento"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="tipo">
              Tipo *
            </Label>
            <Select value={formData.tipo} onValueChange={(value) => handleSelectChange('tipo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edital">Edital</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="certidao">Certidão</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="planilha">Planilha</SelectItem>
                <SelectItem value="ata">Ata</SelectItem>
                <SelectItem value="termo_referencia">Termo de Referência</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="categoria">
              Categoria
            </Label>
            <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="projetos">Projetos</SelectItem>
                <SelectItem value="contabeis">Contábeis</SelectItem>
                <SelectItem value="societarios">Societários</SelectItem>
                <SelectItem value="juridicos">Jurídicos</SelectItem>
                <SelectItem value="tecnicos">Técnicos</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="descricao">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              placeholder="Descrição do documento (opcional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

