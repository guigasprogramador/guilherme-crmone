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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Save, LinkIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

export function NovaLicitacao() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    orgao: "",
    descricao: "",
    numeroEdital: "",
    modalidade: "",
    valorEstimado: "",
    valorProposta: "",
    margemLucro: "",
    contatoNome: "",
    contatoTelefone: "",
    contatoEmail: "",
    urlLicitacao: "",
  })
  const [dataPublicacao, setDataPublicacao] = useState<Date>()
  const [prazoEnvio, setPrazoEnvio] = useState<Date>()
  const [dataJulgamento, setDataJulgamento] = useState<Date>()
  const [documentosNecessarios, setDocumentosNecessarios] = useState([
    { id: "doc1", nome: "Certidão Negativa de Débitos", selecionado: false },
    { id: "doc2", nome: "Atestado de Capacidade Técnica", selecionado: false },
    { id: "doc3", nome: "Contrato Social", selecionado: false },
    { id: "doc4", nome: "Balanço Patrimonial", selecionado: false },
    { id: "doc5", nome: "Certidão FGTS", selecionado: false },
  ])
  const [responsaveis, setResponsaveis] = useState([
    { id: "resp1", nome: "Ana Silva", selecionado: false },
    { id: "resp2", nome: "Carlos Oliveira", selecionado: false },
    { id: "resp3", nome: "Pedro Santos", selecionado: false },
    { id: "resp4", nome: "Maria Souza", selecionado: false },
  ])
  const [open, setOpen] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDocumentoChange = (id: string, checked: boolean) => {
    setDocumentosNecessarios(
      documentosNecessarios.map((doc) => (doc.id === id ? { ...doc, selecionado: checked } : doc)),
    )
  }

  const handleResponsavelChange = (id: string, checked: boolean) => {
    setResponsaveis(responsaveis.map((resp) => (resp.id === id ? { ...resp, selecionado: checked } : resp)))
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    // Simulando envio para API
    setTimeout(() => {
      setIsSubmitting(false)
      // Resetar formulário
      setFormData({
        nome: "",
        orgao: "",
        descricao: "",
        numeroEdital: "",
        modalidade: "",
        valorEstimado: "",
        valorProposta: "",
        margemLucro: "",
        contatoNome: "",
        contatoTelefone: "",
        contatoEmail: "",
        urlLicitacao: "",
      })
      setDataPublicacao(undefined)
      setPrazoEnvio(undefined)
      setDataJulgamento(undefined)
      setDocumentosNecessarios(documentosNecessarios.map((doc) => ({ ...doc, selecionado: false })))
      setResponsaveis(responsaveis.map((resp) => ({ ...resp, selecionado: false })))
      // Fechar o diálogo após o envio
      setOpen(false)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Licitação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Licitação</DialogTitle>
          <DialogDescription>Preencha os dados para cadastrar uma nova licitação no sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Licitação *</Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Nome da licitação"
                value={formData.nome}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgao">Órgão Responsável *</Label>
              <Input
                id="orgao"
                name="orgao"
                placeholder="Nome do órgão"
                value={formData.orgao}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição da Licitação</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Descreva o objeto da licitação"
              className="min-h-[80px]"
              value={formData.descricao}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroEdital">Número do Edital</Label>
              <Input
                id="numeroEdital"
                name="numeroEdital"
                placeholder="Ex: 123/2023"
                value={formData.numeroEdital}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade</Label>
              <Select value={formData.modalidade} onValueChange={(value) => handleSelectChange("modalidade", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pregao_eletronico">Pregão Eletrônico</SelectItem>
                  <SelectItem value="pregao_presencial">Pregão Presencial</SelectItem>
                  <SelectItem value="concorrencia">Concorrência</SelectItem>
                  <SelectItem value="tomada_precos">Tomada de Preços</SelectItem>
                  <SelectItem value="convite">Convite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataPublicacao">Data de Publicação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataPublicacao && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataPublicacao ? format(dataPublicacao, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dataPublicacao} onSelect={setDataPublicacao} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazoEnvio">Prazo para Envio *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !prazoEnvio && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {prazoEnvio ? format(prazoEnvio, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={prazoEnvio} onSelect={setPrazoEnvio} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataJulgamento">Data do Julgamento/Pregão *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataJulgamento && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataJulgamento ? format(dataJulgamento, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dataJulgamento} onSelect={setDataJulgamento} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Documentação Necessária</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
              {documentosNecessarios.map((doc) => (
                <div key={doc.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={doc.id}
                    checked={doc.selecionado}
                    onCheckedChange={(checked) => handleDocumentoChange(doc.id, checked as boolean)}
                  />
                  <Label htmlFor={doc.id} className="font-normal">
                    {doc.nome}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorEstimado">Estimativa de Custo (R$)</Label>
              <Input
                id="valorEstimado"
                name="valorEstimado"
                placeholder="Ex: 250000,00"
                value={formData.valorEstimado}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorProposta">Valor da Proposta (R$)</Label>
              <Input
                id="valorProposta"
                name="valorProposta"
                placeholder="Ex: 230000,00"
                value={formData.valorProposta}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margemLucro">Margem de Lucro (%)</Label>
              <Input
                id="margemLucro"
                name="margemLucro"
                placeholder="Ex: 15"
                value={formData.margemLucro}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contatoNome">Contato (Nome)</Label>
              <Input
                id="contatoNome"
                name="contatoNome"
                placeholder="Nome do contato"
                value={formData.contatoNome}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contatoTelefone">Contato (Telefone)</Label>
              <Input
                id="contatoTelefone"
                name="contatoTelefone"
                placeholder="(00) 00000-0000"
                value={formData.contatoTelefone}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contatoEmail">Contato (E-mail)</Label>
              <Input
                id="contatoEmail"
                name="contatoEmail"
                placeholder="email@exemplo.com"
                value={formData.contatoEmail}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urlLicitacao">URL da Licitação</Label>
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                id="urlLicitacao"
                name="urlLicitacao"
                placeholder="https://..."
                value={formData.urlLicitacao}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anexar Documentos</Label>
            <div className="border rounded-md p-3">
              <Input type="file" multiple className="cursor-pointer" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Usuários Responsáveis</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
              {responsaveis.map((resp) => (
                <div key={resp.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={resp.id}
                    checked={resp.selecionado}
                    onCheckedChange={(checked) => handleResponsavelChange(resp.id, checked as boolean)}
                  />
                  <Label htmlFor={resp.id} className="font-normal">
                    {resp.nome}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="criarEvento" />
              <Label htmlFor="criarEvento" className="font-normal">
                Criar evento no calendário e enviar convites
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Licitação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

