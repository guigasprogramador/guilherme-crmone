"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Filter, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface FiltroOportunidadesProps {
  onFilterChange: (filters: OportunidadeFiltros) => void
  clientes: string[]
  responsaveis: string[]
}

export interface OportunidadeFiltros {
  termo: string
  status: string
  cliente: string
  responsavel: string
  dataInicio: Date | undefined
  dataFim: Date | undefined
  valorMinimo: string | undefined
  valorMaximo: string | undefined
}

export function FiltroOportunidadesOtimizado({ onFilterChange, clientes, responsaveis }: FiltroOportunidadesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filtros, setFiltros] = useState<OportunidadeFiltros>({
    termo: "",
    status: "todos",
    cliente: "todos",
    responsavel: "todos",
    dataInicio: undefined,
    dataFim: undefined,
    valorMinimo: undefined,
    valorMaximo: undefined
  })

  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Status de oportunidades
  const statusOptions = [
    { value: "novo_lead", label: "Novo Lead" },
    { value: "agendamento_reuniao", label: "Agendamento de Reunião" },
    { value: "levantamento_oportunidades", label: "Levantamento de Oportunidades" },
    { value: "proposta_enviada", label: "Proposta Enviada" },
    { value: "negociacao", label: "Negociação" },
    { value: "fechado_ganho", label: "Fechado (Ganho)" },
    { value: "fechado_perdido", label: "Fechado (Perdido)" },
  ]

  // Atualiza o contador de filtros ativos
  useEffect(() => {
    let count = 0
    if (filtros.termo) count++
    if (filtros.status !== "todos") count++
    if (filtros.cliente !== "todos") count++
    if (filtros.responsavel !== "todos") count++
    if (filtros.dataInicio) count++
    if (filtros.dataFim) count++
    if (filtros.valorMinimo) count++
    if (filtros.valorMaximo) count++
    
    setActiveFiltersCount(count)
  }, [filtros])

  // Atualiza os filtros e notifica o componente pai
  const handleFilterChange = (field: keyof OportunidadeFiltros, value: any) => {
    const novosFiltros = { ...filtros, [field]: value }
    setFiltros(novosFiltros)
    // Aplicar o filtro automaticamente quando qualquer opção for selecionada
    onFilterChange(novosFiltros)
  }

  // Limpa todos os filtros
  const limparFiltros = () => {
    const filtrosLimpos: OportunidadeFiltros = {
      termo: "",
      status: "todos",
      cliente: "todos",
      responsavel: "todos",
      dataInicio: undefined,
      dataFim: undefined,
      valorMinimo: undefined,
      valorMaximo: undefined
    }
    setFiltros(filtrosLimpos)
    onFilterChange(filtrosLimpos)
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros de Oportunidades</SheetTitle>
          <SheetDescription>
            Utilize os filtros abaixo para refinar sua busca de oportunidades comerciais.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Busca por termo */}
          <div className="space-y-2">
            <Label htmlFor="termo">Busca por termo</Label>
            <Input
              id="termo"
              placeholder="Buscar por título ou cliente"
              value={filtros.termo}
              onChange={(e) => handleFilterChange("termo", e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filtros.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select
              value={filtros.cliente}
              onValueChange={(value) => handleFilterChange("cliente", value)}
            >
              <SelectTrigger id="cliente">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map((cliente, index) => (
                  <SelectItem key={`cliente-${cliente}-${index}`} value={cliente}>
                    {cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável</Label>
            <Select
              value={filtros.responsavel}
              onValueChange={(value) => handleFilterChange("responsavel", value)}
            >
              <SelectTrigger id="responsavel">
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {responsaveis.map((responsavel, index) => (
                  <SelectItem key={`responsavel-${responsavel}-${index}`} value={responsavel}>
                    {responsavel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="valorMinimo">Valor Mínimo</Label>
            <Input
              id="valorMinimo"
              placeholder="Ex: R$ 10.000,00"
              value={filtros.valorMinimo || ""}
              onChange={(e) => handleFilterChange("valorMinimo", e.target.value)}
            />
          </div>

          {/* Valor Máximo */}
          <div className="space-y-2">
            <Label htmlFor="valorMaximo">Valor Máximo</Label>
            <Input
              id="valorMaximo"
              placeholder="Ex: R$ 500.000,00"
              value={filtros.valorMaximo || ""}
              onChange={(e) => handleFilterChange("valorMaximo", e.target.value)}
            />
          </div>

          {/* Data de Prazo - Início */}
          <div className="space-y-2">
            <Label>Data de Prazo - Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filtros.dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.dataInicio ? (
                    format(filtros.dataInicio, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.dataInicio}
                  onSelect={(date) => handleFilterChange("dataInicio", date)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {filtros.dataInicio && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => handleFilterChange("dataInicio", undefined)}
              >
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>

          {/* Data de Prazo - Fim */}
          <div className="space-y-2">
            <Label>Data de Prazo - Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filtros.dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.dataFim ? (
                    format(filtros.dataFim, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.dataFim}
                  onSelect={(date) => handleFilterChange("dataFim", date)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {filtros.dataFim && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => handleFilterChange("dataFim", undefined)}
              >
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-2 sm:justify-between">
          <Button variant="outline" onClick={limparFiltros}>
            Limpar filtros
          </Button>
          <SheetClose asChild>
            <Button onClick={() => setIsOpen(false)}>Fechar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
