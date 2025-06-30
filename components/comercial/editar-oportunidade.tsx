"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Oportunidade, OportunidadeStatus } from "@/types/comercial"
import { toast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface ClienteParaSelect {
  id: string;
  nome: string;
}

interface ResponsavelParaSelect {
  id: string;
  nome: string;
}

interface EditarOportunidadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidade: Oportunidade
  onOportunidadeUpdated: (id: string, data: Partial<Oportunidade>) => Promise<void>
  clientes?: ClienteParaSelect[]
  responsaveis?: ResponsavelParaSelect[]
}

export function EditarOportunidade({ 
  open, 
  onOpenChange, 
  oportunidade,
  onOportunidadeUpdated,
  clientes = [], // Default to empty array if not provided
  responsaveis = [] // Default to empty array if not provided
}: EditarOportunidadeProps) {
  const [formData, setFormData] = useState<Partial<Oportunidade & { clienteId?: string; responsavelId?: string }>>({
    titulo: "",
    clienteId: undefined,
    valor: "",
    responsavelId: undefined,
    prazo: "",
    status: "novo_lead" as OportunidadeStatus,
    descricao: "",
    tipo: "produto",
    tipoFaturamento: "direto"
  })
  
  const [prazoDate, setPrazoDate] = useState<Date | undefined>(undefined)
  
  // Carregar dados da oportunidade quando o componente for montado
  useEffect(() => {
    if (oportunidade) {
      setFormData({
        titulo: oportunidade.titulo,
        clienteId: oportunidade.clienteId || undefined,
        valor: oportunidade.valor,
        responsavelId: oportunidade.responsavelId || undefined,
        prazo: oportunidade.prazo,
        status: oportunidade.status as OportunidadeStatus,
        descricao: oportunidade.descricao || "",
        tipo: oportunidade.tipo || "produto",
        // Ajuste para tipoFaturamento: se tipo não for produto, deve ser undefined
        tipoFaturamento: oportunidade.tipo === "produto"
          ? (oportunidade.tipoFaturamento || "direto")
          : undefined
      })
      
      // Converter string de prazo para objeto Date
      try {
        if (oportunidade.prazo) {
          const [dia, mes, ano] = oportunidade.prazo.split('/').map(Number)
          const date = new Date(ano, mes - 1, dia)
          if (!isNaN(date.getTime())) {
            setPrazoDate(date)
          }
        }
      } catch (error) {
        console.error("Erro ao converter data:", error)
      }
    }
  }, [oportunidade])
  
  // Atualizar o prazo quando a data for selecionada
  useEffect(() => {
    if (prazoDate) {
      setFormData(prev => ({
        ...prev,
        prazo: format(prazoDate, "dd/MM/yyyy")
      }))
    }
  }, [prazoDate])
  
  const handleChange = (field: keyof Oportunidade, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleSubmit = async () => {
    try {
      // Validação básica
      if (!formData.titulo || !formData.clienteId) {
        toast({
          title: "Erro",
          description: "Título e Cliente são obrigatórios",
          variant: "destructive"
        })
        return
      }
      
      // Validação específica para tipo produto
      if (formData.tipo === "produto" && !formData.tipoFaturamento) {
        toast({
          title: "Erro",
          description: "Para produtos, o tipo de faturamento é obrigatório",
          variant: "destructive"
        })
        return
      }
      
      // Preparar payload, removendo cliente e responsavel (nomes) se não forem mais usados pela API
      const { cliente, responsavel, ...payloadToSend } = formData;

      await onOportunidadeUpdated(oportunidade.id, payloadToSend as Partial<Oportunidade>)
      
      // Fechar o modal após salvar
      onOpenChange(false)
      
      // Notificar o usuário
      toast({
        title: "Oportunidade atualizada",
        description: "A oportunidade foi atualizada com sucesso."
      })
    } catch (error) {
      console.error("Erro ao atualizar oportunidade:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar a oportunidade. Tente novamente.",
        variant: "destructive"
      })
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Editar Oportunidade</DialogTitle>
          <DialogDescription>
            Edite os detalhes da oportunidade. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título *
            </Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              placeholder="Ex: Sistema de Gestão para Prefeitura"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clienteId">
                Cliente *
              </Label>
              <Select
                value={formData.clienteId || ""}
                onValueChange={(value) => handleChange("clienteId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="responsavelId">
                Responsável
              </Label>
              <Select
                value={formData.responsavelId || ""}
                onValueChange={(value) => handleChange("responsavelId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((responsavel) => (
                    <SelectItem key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">
                Valor
              </Label>
              <Input
                id="valor"
                value={formData.valor}
                onChange={(e) => handleChange("valor", e.target.value)}
                placeholder="Ex: R$ 50.000,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prazo">
                Prazo
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="prazo"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !prazoDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {prazoDate ? format(prazoDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={prazoDate}
                    onSelect={setPrazoDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo_lead">Novo Lead</SelectItem>
                  <SelectItem value="agendamento_reuniao">Agendamento de Reunião</SelectItem>
                  <SelectItem value="levantamento_oportunidades">Levantamento</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechado_ganho">Fechado (Ganho)</SelectItem>
                  <SelectItem value="fechado_perdido">Fechado (Perdido)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo
              </Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => {
                  handleChange("tipo", value)
                  if (value !== "produto") {
                    handleChange("tipoFaturamento", undefined)
                  } else if (!formData.tipoFaturamento) {
                    handleChange("tipoFaturamento", "direto")
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {formData.tipo === "produto" && (
            <div className="space-y-2">
              <Label htmlFor="tipoFaturamento">
                Tipo de Faturamento
              </Label>
              <Select
                value={formData.tipoFaturamento}
                onValueChange={(value) => handleChange("tipoFaturamento", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de faturamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direto">Direto</SelectItem>
                  <SelectItem value="distribuidor">Distribuidor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              placeholder="Descreva os detalhes da oportunidade"
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
