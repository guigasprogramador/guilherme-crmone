"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Plus, CalendarIcon, Save, Clock } from "lucide-react"

interface NovoProjetoProps {
  onProjetoAdded?: (projeto: any) => void
}

export function NovoProjeto({ onProjetoAdded }: NovoProjetoProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("cliente")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para os campos do formulário
  const [formData, setFormData] = useState({
    // Dados do cliente
    nomeCliente: "",
    cnpj: "",
    contatoNome: "",
    contatoTelefone: "",
    contatoEmail: "",

    // Dados do projeto
    titulo: "",
    descricao: "",
    escopo: "",
    orcamento: "",
    status: "em_planejamento",
  })

  // Estados para datas
  const [dataInicio, setDataInicio] = useState<Date | undefined>()
  const [dataFim, setDataFim] = useState<Date | undefined>()

  // Estado para responsáveis
  const [responsaveis, setResponsaveis] = useState([
    { id: "resp1", nome: "Ana Silva", selecionado: false },
    { id: "resp2", nome: "Carlos Oliveira", selecionado: false },
    { id: "resp3", nome: "Pedro Santos", selecionado: false },
    { id: "resp4", nome: "Maria Souza", selecionado: false },
  ])

  // Funções de manipulação de formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleResponsavelChange = (id: string, checked: boolean) => {
    setResponsaveis(responsaveis.map((resp) => (resp.id === id ? { ...resp, selecionado: checked } : resp)))
  }

  const handleNextTab = () => {
    if (activeTab === "cliente") {
      setActiveTab("projeto")
    } else if (activeTab === "projeto") {
      setActiveTab("cronograma")
    }
  }

  const handlePrevTab = () => {
    if (activeTab === "projeto") {
      setActiveTab("cliente")
    } else if (activeTab === "cronograma") {
      setActiveTab("projeto")
    }
  }

  const handleSubmit = () => {
    setIsSubmitting(true)

    // Criar objeto de projeto
    const novoProjeto = {
      id: `proj-${Date.now()}`,
      titulo: formData.titulo || `Projeto para ${formData.nomeCliente}`,
      cliente: formData.nomeCliente,
      orcamento: formData.orcamento ? `R$ ${formData.orcamento}` : "A definir",
      dataInicio: dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Não definido",
      dataFim: dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Não definido",
      status: formData.status,
      progresso: 0,
      // Dados adicionais
      descricao: formData.descricao,
      escopo: formData.escopo,
      cnpj: formData.cnpj,
      contatoNome: formData.contatoNome,
      contatoTelefone: formData.contatoTelefone,
      contatoEmail: formData.contatoEmail,
      responsaveis: responsaveis.filter((r) => r.selecionado).map((r) => r.nome),
    }

    // Simular envio para API
    setTimeout(() => {
      setIsSubmitting(false)

      // Notificar componente pai
      if (onProjetoAdded) {
        onProjetoAdded(novoProjeto)
      }

      // Resetar formulário
      setFormData({
        nomeCliente: "",
        cnpj: "",
        contatoNome: "",
        contatoTelefone: "",
        contatoEmail: "",
        titulo: "",
        descricao: "",
        escopo: "",
        orcamento: "",
        status: "em_planejamento",
      })
      setDataInicio(undefined)
      setDataFim(undefined)
      setResponsaveis(responsaveis.map((resp) => ({ ...resp, selecionado: false })))
      setActiveTab("cliente")

      // Fechar o diálogo
      setOpen(false)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#1B3A53] hover:bg-[#2c5a80]">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Projeto</DialogTitle>
          <DialogDescription>Preencha os dados para cadastrar um novo projeto.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="cliente">Dados do Cliente</TabsTrigger>
            <TabsTrigger value="projeto">Projeto</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          </TabsList>

          {/* Aba de Dados do Cliente */}
          <TabsContent value="cliente" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeCliente">
                  Nome/Razão Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nomeCliente"
                  name="nomeCliente"
                  placeholder="Nome do cliente"
                  value={formData.nomeCliente}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">
                  CNPJ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contatoNome">
                  Contato (Nome) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contatoNome"
                  name="contatoNome"
                  placeholder="Nome do contato"
                  value={formData.contatoNome}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contatoTelefone">
                  Contato (Telefone) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contatoTelefone"
                  name="contatoTelefone"
                  placeholder="(00) 00000-0000"
                  value={formData.contatoTelefone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contatoEmail">
                  Contato (E-mail) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contatoEmail"
                  name="contatoEmail"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.contatoEmail}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleNextTab} className="bg-[#1B3A53] hover:bg-[#2c5a80]">
                Próximo
              </Button>
            </div>
          </TabsContent>

          {/* Aba de Projeto */}
          <TabsContent value="projeto" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">
                Título do Projeto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titulo"
                name="titulo"
                placeholder="Ex: Implementação de Sistema ERP"
                value={formData.titulo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Projeto</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Descreva os detalhes do projeto"
                className="min-h-[100px]"
                value={formData.descricao}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="escopo">Escopo do Projeto</Label>
              <Textarea
                id="escopo"
                name="escopo"
                placeholder="Defina o escopo do projeto"
                className="min-h-[100px]"
                value={formData.escopo}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orcamento">Orçamento (R$)</Label>
                <Input
                  id="orcamento"
                  name="orcamento"
                  placeholder="Ex: 250000,00"
                  value={formData.orcamento}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status Inicial</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_planejamento">Em Planejamento</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="em_pausa">Em Pausa</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handlePrevTab}>
                Voltar
              </Button>
              <Button onClick={handleNextTab} className="bg-[#1B3A53] hover:bg-[#2c5a80]">
                Próximo
              </Button>
            </div>
          </TabsContent>

          {/* Aba de Cronograma */}
          <TabsContent value="cronograma" className="space-y-4">
            <div className="border rounded-md p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Cronograma do Projeto</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data de Término Prevista</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Usuários Responsáveis <span className="text-red-500">*</span>
              </Label>
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

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handlePrevTab}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#1B3A53] hover:bg-[#2c5a80]">
                {isSubmitting ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Projeto
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-sm text-muted-foreground mt-4">
          <span className="text-red-500">*</span> Campos obrigatórios
        </div>
      </DialogContent>
    </Dialog>
  )
}

