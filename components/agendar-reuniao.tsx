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
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Save, Mail, Users } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

interface AgendarReuniaoProps {
  oportunidadeId?: string
  clienteNome?: string
  trigger?: React.ReactNode
  onReuniaoAgendada?: () => void
}

export function AgendarReuniao({ oportunidadeId, clienteNome, trigger, onReuniaoAgendada }: AgendarReuniaoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    titulo: clienteNome ? `Reunião com ${clienteNome}` : "Nova Reunião",
    descricao: "",
    local: "",
  })
  const [dataReuniao, setDataReuniao] = useState<Date>()
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFim, setHoraFim] = useState("")
  const [notificar, setNotificar] = useState(true)
  const [participantes, setParticipantes] = useState([
    { id: "part1", nome: "Ana Silva", email: "ana.silva@exemplo.com", selecionado: false },
    { id: "part2", nome: "Carlos Oliveira", email: "carlos.oliveira@exemplo.com", selecionado: false },
    { id: "part3", nome: "Pedro Santos", email: "pedro.santos@exemplo.com", selecionado: false },
    { id: "part4", nome: "Maria Souza", email: "maria.souza@exemplo.com", selecionado: false },
  ])
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Limpar erro quando o campo é preenchido
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleParticipanteChange = (id: string, checked: boolean) => {
    setParticipantes(participantes.map((part) => (part.id === id ? { ...part, selecionado: checked } : part)))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar campos obrigatórios
    if (!formData.titulo.trim()) newErrors.titulo = "Título é obrigatório"
    if (!dataReuniao) newErrors.dataReuniao = "Data da reunião é obrigatória"
    if (!horaInicio) newErrors.horaInicio = "Hora de início é obrigatória"
    if (!horaFim) newErrors.horaFim = "Hora de término é obrigatória"

    // Validar se pelo menos um participante foi selecionado
    if (!participantes.some((p) => p.selecionado)) {
      newErrors.participantes = "Selecione pelo menos um participante"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    // Simulando envio para API
    setTimeout(() => {
      setIsSubmitting(false)

      // Notificar componente pai
      if (onReuniaoAgendada) {
        onReuniaoAgendada()
      }

      // Resetar formulário
      setFormData({
        titulo: clienteNome ? `Reunião com ${clienteNome}` : "Nova Reunião",
        descricao: "",
        local: "",
      })
      setDataReuniao(undefined)
      setHoraInicio("")
      setHoraFim("")
      setParticipantes(participantes.map((part) => ({ ...part, selecionado: false })))

      // Fechar o diálogo após o envio
      setOpen(false)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Agendar Reunião
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
          <DialogDescription>Preencha os dados para agendar uma reunião e enviar convites.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título da Reunião <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex: Apresentação de Proposta"
              value={formData.titulo}
              onChange={handleInputChange}
              className={errors.titulo ? "border-red-500" : ""}
            />
            {errors.titulo && <p className="text-xs text-red-500">{errors.titulo}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataReuniao">
              Data da Reunião <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataReuniao && "text-muted-foreground",
                    errors.dataReuniao && "border-red-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataReuniao ? format(dataReuniao, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dataReuniao} onSelect={setDataReuniao} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.dataReuniao && <p className="text-xs text-red-500">{errors.dataReuniao}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horaInicio">
                Hora de Início <span className="text-red-500">*</span>
              </Label>
              <Input
                id="horaInicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={errors.horaInicio ? "border-red-500" : ""}
              />
              {errors.horaInicio && <p className="text-xs text-red-500">{errors.horaInicio}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaFim">
                Hora de Término <span className="text-red-500">*</span>
              </Label>
              <Input
                id="horaFim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className={errors.horaFim ? "border-red-500" : ""}
              />
              {errors.horaFim && <p className="text-xs text-red-500">{errors.horaFim}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              name="local"
              placeholder="Ex: Sala de Reuniões ou Link da Videoconferência"
              value={formData.local}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Descreva o objetivo da reunião"
              className="min-h-[100px]"
              value={formData.descricao}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Participantes <span className="text-red-500">*</span>
            </Label>
            <div className="border rounded-md p-3">
              {participantes.map((part) => (
                <div key={part.id} className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={part.id}
                    checked={part.selecionado}
                    onCheckedChange={(checked) => handleParticipanteChange(part.id, checked as boolean)}
                  />
                  <Label htmlFor={part.id} className="font-normal">
                    {part.nome} <span className="text-xs text-muted-foreground">({part.email})</span>
                  </Label>
                </div>
              ))}
            </div>
            {errors.participantes && <p className="text-xs text-red-500">{errors.participantes}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notificar"
                checked={notificar}
                onCheckedChange={(checked) => setNotificar(checked as boolean)}
              />
              <Label htmlFor="notificar" className="font-normal">
                Enviar notificações por e-mail
              </Label>
            </div>
          </div>

          <div className="bg-muted/20 p-3 rounded-md">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              <span>Convites serão enviados para todos os participantes</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>A reunião será adicionada ao calendário do Outlook</span>
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
                Agendar Reunião
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

