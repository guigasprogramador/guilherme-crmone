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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Plus, CalendarIcon, Save, DollarSign } from "lucide-react"

interface NovaPropostaProps {
  onPropostaAdded?: (proposta: any) => void
}

export function NovaProposta({ onPropostaAdded }: NovaPropostaProps) {
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

    // Dados da proposta
    titulo: "",
    descricao: "",
    valor: "",
    prazoValidade: "",
    condicoesPagamento: "",
    observacoes: "",
  })

  // Estado para data de validade
  const [dataValidade, setDataValidade] = useState<Date | undefined>()

  // Funções de manipulação de formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNextTab = () => {
    if (activeTab === "cliente") {
      setActiveTab("proposta")
    } else if (activeTab === "proposta") {
      setActiveTab("itens")
    }
  }

  const handlePrevTab = () => {
    if (activeTab === "proposta") {
      setActiveTab("cliente")
    } else if (activeTab === "itens") {
      setActiveTab("proposta")
    }
  }

  const handleSubmit = () => {
    setIsSubmitting(true)

    // Criar objeto de proposta
    const novaProposta = {
      id: `prop-${Date.now()}`,
      titulo: formData.titulo || `Proposta para ${formData.nomeCliente}`,
      cliente: formData.nomeCliente,
      valor: formData.valor ? `R$ ${formData.valor}` : "A definir",
      dataValidade: dataValidade
        ? format(dataValidade, "dd/MM/yyyy", { locale: ptBR })
        : formData.prazoValidade || "Não definido",
      status: "em_analise",
      // Dados adicionais
      descricao: formData.descricao,
      cnpj: formData.cnpj,
      contatoNome: formData.contatoNome,
      contatoTelefone: formData.contatoTelefone,
      contatoEmail: formData.contatoEmail,
      condicoesPagamento: formData.condicoesPagamento,
      observacoes: formData.observacoes,
    }

    // Simular envio para API
    setTimeout(() => {
      setIsSubmitting(false)

      // Notificar componente pai
      if (onPropostaAdded) {
        onPropostaAdded(novaProposta)
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
        valor: "",
        prazoValidade: "",
        condicoesPagamento: "",
        observacoes: "",
      })
      setDataValidade(undefined)
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
          Nova Proposta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Proposta</DialogTitle>
          <DialogDescription>Preencha os dados para cadastrar uma nova proposta comercial.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="cliente">Dados do Cliente</TabsTrigger>
            <TabsTrigger value="proposta">Proposta</TabsTrigger>
            <TabsTrigger value="itens">Itens e Valores</TabsTrigger>
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

          {/* Aba de Proposta */}
          <TabsContent value="proposta" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">
                Título da Proposta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titulo"
                name="titulo"
                placeholder="Ex: Proposta Comercial - Sistema de Gestão"
                value={formData.titulo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição da Proposta</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Descreva os detalhes da proposta"
                className="min-h-[100px]"
                value={formData.descricao}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataValidade">Data de Validade</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataValidade && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataValidade ? format(dataValidade, "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dataValidade} onSelect={setDataValidade} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condicoesPagamento">Condições de Pagamento</Label>
                <Select
                  value={formData.condicoesPagamento}
                  onValueChange={(value) => handleSelectChange("condicoesPagamento", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione as condições" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_vista">À Vista</SelectItem>
                    <SelectItem value="30_dias">30 Dias</SelectItem>
                    <SelectItem value="30_60_dias">30/60 Dias</SelectItem>
                    <SelectItem value="30_60_90_dias">30/60/90 Dias</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                name="observacoes"
                placeholder="Observações adicionais sobre a proposta"
                className="min-h-[80px]"
                value={formData.observacoes}
                onChange={handleInputChange}
              />
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

          {/* Aba de Itens e Valores */}
          <TabsContent value="itens" className="space-y-4">
            <div className="border rounded-md p-4 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Itens da Proposta</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="valor">Valor Total da Proposta (R$)</Label>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Item
                  </Button>
                </div>
                <Input
                  id="valor"
                  name="valor"
                  placeholder="Ex: 250000,00"
                  value={formData.valor}
                  onChange={handleInputChange}
                />
              </div>

              <div className="bg-muted/20 p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Adicione itens à proposta para calcular o valor total automaticamente.
                </p>
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
                    Salvar Proposta
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

