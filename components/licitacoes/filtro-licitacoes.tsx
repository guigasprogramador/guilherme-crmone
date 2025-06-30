"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface FiltroLicitacoesProps {
  statusFilter: string
  responsavelFilter: string
  searchTerm: string
  onStatusChange: (value: string) => void
  onResponsavelChange: (value: string) => void
  onSearchChange: (value: string) => void
  activeFilters: number
}

export function FiltroLicitacoes({
  statusFilter,
  responsavelFilter,
  searchTerm,
  onStatusChange,
  onResponsavelChange,
  onSearchChange,
  activeFilters,
}: FiltroLicitacoesProps) {
  const [open, setOpen] = useState(false)

  const clearFilters = () => {
    onStatusChange("todos")
    onResponsavelChange("todos")
    onSearchChange("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFilters > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white">
              {activeFilters}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Buscar licitações..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="novo_lead">Novo Lead</SelectItem>
                <SelectItem value="agendamento_reuniao">Agendamento de Reunião</SelectItem>
                <SelectItem value="levantamento_oportunidades">Levantamento de Oportunidades</SelectItem>
                <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="fechado_ganho">Fechado (Ganho)</SelectItem>
                <SelectItem value="fechado_perdido">Fechado (Perdido)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável</Label>
            <Select value={responsavelFilter} onValueChange={onResponsavelChange}>
              <SelectTrigger id="responsavel">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                <SelectItem value="Ana Silva">Ana Silva</SelectItem>
                <SelectItem value="Carlos Oliveira">Carlos Oliveira</SelectItem>
                <SelectItem value="Pedro Santos">Pedro Santos</SelectItem>
                <SelectItem value="Maria Souza">Maria Souza</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={() => setOpen(false)}>
            Aplicar Filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

