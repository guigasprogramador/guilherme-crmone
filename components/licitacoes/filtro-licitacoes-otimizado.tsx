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
import { Slider } from "@/components/ui/slider"

interface FiltroLicitacoesProps {
  onFilterChange: (filters: LicitacaoFiltros) => void
  orgaos?: string[]
  responsaveis?: string[]
  modalidades?: string[]
}

export interface LicitacaoFiltros {
  termo?: string
  status?: string
  orgao?: string
  responsavel?: string
  modalidade?: string
  dataInicio?: Date | undefined
  dataFim?: Date | undefined
  valorMinimo?: number | undefined
  valorMaximo?: number | undefined
}

export function FiltroLicitacoesOtimizado({ onFilterChange, orgaos: propOrgaos, responsaveis: propResponsaveis, modalidades: propModalidades }: FiltroLicitacoesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filtros, setFiltros] = useState<LicitacaoFiltros>({
    termo: "",
    status: "todos",
    orgao: "todos",
    responsavel: "todos",
    modalidade: "todos",
    dataInicio: undefined,
    dataFim: undefined,
    valorMinimo: undefined,
    valorMaximo: undefined
  })

  // Estados para armazenar dados de API caso as props não sejam fornecidas
  const [orgaos, setOrgaos] = useState<string[]>(propOrgaos || [])
  const [responsaveis, setResponsaveis] = useState<string[]>(propResponsaveis || [])
  const [modalidades, setModalidades] = useState<string[]>(propModalidades || [])
  const [carregandoDados, setCarregandoDados] = useState(false)

  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [valorRange, setValorRange] = useState<[number, number]>([0, 2000000])

  // Status de licitações
  const statusOptions = [
    { value: "todos", label: "Todos os status" },
    { value: "analise_interna", label: "Em análise interna" },
    { value: "aguardando_pregao", label: "Aguardando pregão" },
    { value: "envio_documentos", label: "Envio de documentos" },
    { value: "assinaturas", label: "Assinaturas" },
    { value: "vencida", label: "Vencida" },
    { value: "nao_vencida", label: "Não vencida" }
  ]

  // Carregar dados da API se as props não forem fornecidas
  useEffect(() => {
    const carregarDados = async () => {
      // Só busca dados da API se as props não forem fornecidas
      if (!propOrgaos || !propResponsaveis || !propModalidades) {
        try {
          setCarregandoDados(true)
          
          // Buscar todas as licitações para extrair informações únicas
          const response = await fetch('/api/licitacoes')
          if (response.ok) {
            const licitacoes = await response.json()
            
            // Extrair valores únicos
            if (!propOrgaos) {
              const orgaosUnicos = Array.from(new Set(licitacoes.map((l: any) => l.orgao)))
              setOrgaos(orgaosUnicos)
            }
            
            if (!propResponsaveis) {
              const responsaveisUnicos = Array.from(new Set(licitacoes.map((l: any) => l.responsavel)))
              setResponsaveis(responsaveisUnicos)
            }
            
            if (!propModalidades) {
              const modalidadesUnicas = Array.from(new Set(licitacoes.map((l: any) => l.modalidade)))
              setModalidades(modalidadesUnicas)
            }
          }
        } catch (error) {
          console.error('Erro ao carregar dados para filtros:', error)
        } finally {
          setCarregandoDados(false)
        }
      }
    }
    
    carregarDados()
  }, [propOrgaos, propResponsaveis, propModalidades])

  // Atualiza o contador de filtros ativos
  useEffect(() => {
    let count = 0
    if (filtros.termo) count++
    if (filtros.status !== "todos") count++
    if (filtros.orgao !== "todos") count++
    if (filtros.responsavel !== "todos") count++
    if (filtros.modalidade !== "todos") count++
    if (filtros.dataInicio) count++
    if (filtros.dataFim) count++
    if (filtros.valorMinimo !== undefined) count++
    if (filtros.valorMaximo !== undefined) count++
    
    setActiveFiltersCount(count)
  }, [filtros])

  // Atualiza os filtros e notifica o componente pai
  const handleFilterChange = (field: keyof LicitacaoFiltros, value: any) => {
    const novosFiltros = { ...filtros, [field]: value }
    setFiltros(novosFiltros)
  }

  // Atualiza o range de valores
  const handleValorRangeChange = (values: number[]) => {
    setValorRange([values[0], values[1]])
    handleFilterChange("valorMinimo", values[0] > 0 ? values[0] : undefined)
    handleFilterChange("valorMaximo", values[1] < 2000000 ? values[1] : undefined)
  }

  // Aplica os filtros
  const aplicarFiltros = () => {
    onFilterChange(filtros)
    setIsOpen(false)
  }

  // Limpa todos os filtros
  const limparFiltros = () => {
    const filtrosLimpos: LicitacaoFiltros = {
      termo: "",
      status: "todos",
      orgao: "todos",
      responsavel: "todos",
      modalidade: "todos",
      dataInicio: undefined,
      dataFim: undefined,
      valorMinimo: undefined,
      valorMaximo: undefined
    }
    setFiltros(filtrosLimpos)
    setValorRange([0, 2000000])
    onFilterChange(filtrosLimpos)
  }

  // Formata o valor para exibição
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    })
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
          <SheetTitle>Filtros de Licitações</SheetTitle>
          <SheetDescription>
            Utilize os filtros abaixo para refinar sua busca de licitações.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Busca por termo */}
          <div className="space-y-2">
            <Label htmlFor="termo">Busca por termo</Label>
            <Input
              id="termo"
              placeholder="Buscar por título ou órgão"
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

          {/* Órgão */}
          <div className="space-y-2">
            <Label htmlFor="orgao">Órgão</Label>
            <Select
              value={filtros.orgao}
              onValueChange={(value) => handleFilterChange("orgao", value)}
            >
              <SelectTrigger id="orgao">
                <SelectValue placeholder="Selecione um órgão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os órgãos</SelectItem>
                {orgaos.map((orgao) => (
                  <SelectItem key={orgao} value={orgao}>
                    {orgao}
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
                {responsaveis.map((responsavel) => (
                  <SelectItem key={responsavel} value={responsavel}>
                    {responsavel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modalidade */}
          <div className="space-y-2">
            <Label htmlFor="modalidade">Modalidade</Label>
            <Select
              value={filtros.modalidade}
              onValueChange={(value) => handleFilterChange("modalidade", value)}
            >
              <SelectTrigger id="modalidade">
                <SelectValue placeholder="Selecione uma modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as modalidades</SelectItem>
                {modalidades.map((modalidade) => (
                  <SelectItem key={modalidade} value={modalidade}>
                    {modalidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor Estimado */}
          <div className="space-y-4">
            <Label>Valor Estimado</Label>
            <div className="px-2">
              <Slider
                defaultValue={[0, 2000000]}
                value={valorRange}
                min={0}
                max={2000000}
                step={50000}
                onValueChange={handleValorRangeChange}
                className="my-6"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(valorRange[0])}</span>
                <span>{formatCurrency(valorRange[1])}</span>
              </div>
            </div>
          </div>

          {/* Data de Abertura - Início */}
          <div className="space-y-2">
            <Label>Data de Abertura - Início</Label>
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

          {/* Data de Abertura - Fim */}
          <div className="space-y-2">
            <Label>Data de Abertura - Fim</Label>
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
            <Button onClick={aplicarFiltros}>Aplicar filtros</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
