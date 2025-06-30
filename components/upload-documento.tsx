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
import { FilePlus, Upload } from "lucide-react"

export function UploadDocumento() {
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [categoria, setCategoria] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleUpload = () => {
    setIsUploading(true)
    // Simulando upload
    setTimeout(() => {
      setIsUploading(false)
      setFileName("")
      setCategoria("")
      // Fechar o diálogo após o upload
    }, 2000)
  }
  const uploadDocumento = async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "crm-teste");

    const res = await fetch("https://api.cloudinary.com/v1_1/dss74q6ld/raw/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Erro ao fazer upload");

    const data = await res.json();
    return data.secure_url; // URL pública do PDF
  } catch (err) {
    console.error("Erro ao fazer upload do documento:", err);
    return null;
  }
};


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <FilePlus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>Faça o upload de um novo documento para o sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              Arquivo
            </Label>
            <div className="col-span-3">
              <Input id="file" type="file" onChange={handleFileChange} className="cursor-pointer" />
              {fileName && <p className="text-sm text-muted-foreground mt-1">{fileName}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipo" className="text-right">
              Tipo
            </Label>
            <Select>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edital">Edital</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="certidao">Certidão</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="planilha">Planilha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="categoria" className="text-right">
              Categoria
            </Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="projetos">Projetos</SelectItem>
                <SelectItem value="contabeis">Contábeis</SelectItem>
                <SelectItem value="societarios">Societários</SelectItem>
                <SelectItem value="juridicos">Jurídicos</SelectItem>
                <SelectItem value="atestado_capacidade">Atestado de Capacidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="licitacao" className="text-right">
              Licitação
            </Label>
            <Select>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a licitação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pregao123">Pregão Eletrônico 123/2023</SelectItem>
                <SelectItem value="concorrencia45">Concorrência 45/2023</SelectItem>
                <SelectItem value="tomada78">Tomada de Preços 78/2023</SelectItem>
                <SelectItem value="pregao56">Pregão Presencial 56/2023</SelectItem>
                <SelectItem value="concorrencia92">Concorrência 92/2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
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

