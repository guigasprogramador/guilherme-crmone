"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Tipos para props de select (simplificado)
interface SelectOption { id: string; nome?: string; name?: string; titulo?: string; }

export interface PropostaFiltros {
  termo?: string;
  status_proposta?: string;
  cliente_id?: string;
  orgao_id?: string;
  oportunidade_id?: string;
  licitacao_id?: string;
  responsavel_id?: string;
  data_emissao_inicio?: string; // YYYY-MM-DD
  data_emissao_fim?: string;    // YYYY-MM-DD
  data_validade_inicio?: string;
  data_validade_fim?: string;
}

interface FiltroPropostasProps {
  onFilterChange: (filtros: PropostaFiltros) => void;
  clientes: SelectOption[];
  orgaos: SelectOption[];
  oportunidades: SelectOption[];
  licitacoes: SelectOption[];
  responsaveis: SelectOption[];
  // Adicionar statusOptions se necessário, ou definir localmente
}

const statusPropostaOptions = [
  { value: "EM_ELABORACAO", label: "Em Elaboração" },
  { value: "ENVIADA_PARA_APROVACAO_INTERNA", label: "Aprovação Interna" },
  { value: "AGUARDANDO_AJUSTES", label: "Aguardando Ajustes" },
  { value: "PRONTA_PARA_ENVIO", label: "Pronta para Envio" },
  { value: "ENVIADA_AO_CLIENTE", label: "Enviada ao Cliente" },
  { value: "EM_NEGOCIACAO", label: "Em Negociação" },
  { value: "ACEITA", label: "Aceita" },
  { value: "RECUSADA", label: "Recusada" },
  { value: "CANCELADA", label: "Cancelada" },
];


export function FiltroPropostas({
  onFilterChange,
  clientes,
  orgaos,
  oportunidades,
  licitacoes,
  responsaveis,
}: FiltroPropostasProps) {
  const initialFiltros: PropostaFiltros = {
    termo: "",
    status_proposta: "todos",
    cliente_id: "todos",
    orgao_id: "todos",
    oportunidade_id: "todos",
    licitacao_id: "todos",
    responsavel_id: "todos",
    data_emissao_inicio: "",
    data_emissao_fim: "",
    data_validade_inicio: "",
    data_validade_fim: "",
  };
  const [filtros, setFiltros] = useState<PropostaFiltros>(initialFiltros);

  const handleInputChange = (field: keyof PropostaFiltros, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value === "todos" ? undefined : value }));
  };

  const handleDateChange = (field: keyof PropostaFiltros, date?: Date) => {
    setFiltros(prev => ({ ...prev, [field]: date ? format(date, "yyyy-MM-dd") : undefined }));
  };

  const aplicarFiltros = () => {
    // Remover chaves com valor 'todos' ou undefined antes de enviar
    const filtrosAtivos: PropostaFiltros = {};
    for (const key in filtros) {
      if (filtros[key as keyof PropostaFiltros] !== "todos" && filtros[key as keyof PropostaFiltros] !== "" && filtros[key as keyof PropostaFiltros] !== undefined) {
        filtrosAtivos[key as keyof PropostaFiltros] = filtros[key as keyof PropostaFiltros];
      }
    }
    onFilterChange(filtrosAtivos);
  };

  const limparFiltros = () => {
    setFiltros(initialFiltros);
    onFilterChange({}); // Envia objeto vazio para limpar filtros
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {/* Contagem de filtros ativos pode ser adicionada aqui */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-4" align="end">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Filtrar Propostas</h4>
          <div className="grid gap-2">
            <Label htmlFor="filtro-termo">Termo de Busca</Label>
            <Input id="filtro-termo" placeholder="Título, número, cliente..." value={filtros.termo || ""} onChange={e => handleInputChange("termo", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filtro-status">Status</Label>
            <Select value={filtros.status_proposta || "todos"} onValueChange={val => handleInputChange("status_proposta", val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {statusPropostaOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="filtro-cliente">Cliente</Label>
                <Select value={filtros.cliente_id || "todos"} onValueChange={val => handleInputChange("cliente_id", val)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="todos">Todos</SelectItem>{clientes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome || c.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filtro-orgao">Órgão</Label>
                <Select value={filtros.orgao_id || "todos"} onValueChange={val => handleInputChange("orgao_id", val)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="todos">Todos</SelectItem>{orgaos.map(o=><SelectItem key={o.id} value={o.id}>{o.nome || o.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filtro-oportunidade">Oportunidade</Label>
              <Select value={filtros.oportunidade_id || "todos"} onValueChange={val => handleInputChange("oportunidade_id", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todos">Todas</SelectItem>{oportunidades.map(op => <SelectItem key={op.id} value={op.id}>{op.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filtro-licitacao">Licitação</Label>
              <Select value={filtros.licitacao_id || "todos"} onValueChange={val => handleInputChange("licitacao_id", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todos">Todas</SelectItem>{licitacoes.map(l => <SelectItem key={l.id} value={l.id}>{l.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="filtro-responsavel">Responsável</Label>
            <Select value={filtros.responsavel_id || "todos"} onValueChange={val => handleInputChange("responsavel_id", val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{responsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filtro-data_emissao_inicio">Emissão (De)</Label>
              <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filtros.data_emissao_inicio && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filtros.data_emissao_inicio ? format(parseISO(filtros.data_emissao_inicio), "PPP", { locale: ptBR }) : <span>Data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filtros.data_emissao_inicio ? parseISO(filtros.data_emissao_inicio) : undefined} onSelect={date => handleDateChange("data_emissao_inicio", date)} /></PopoverContent></Popover>
            </div>
            <div>
              <Label htmlFor="filtro-data_emissao_fim">Emissão (Até)</Label>
              <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filtros.data_emissao_fim && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filtros.data_emissao_fim ? format(parseISO(filtros.data_emissao_fim), "PPP", { locale: ptBR }) : <span>Data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filtros.data_emissao_fim ? parseISO(filtros.data_emissao_fim) : undefined} onSelect={date => handleDateChange("data_emissao_fim", date)} /></PopoverContent></Popover>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" size="sm" onClick={limparFiltros}><XCircle className="mr-1 h-4 w-4"/>Limpar</Button>
            <Button size="sm" onClick={aplicarFiltros}>Aplicar Filtros</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
