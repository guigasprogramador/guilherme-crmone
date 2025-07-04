"use client"

import type { Oportunidade } from "./kanban-board"
import { DollarSign, Users, Calendar, TrendingUp, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useIsMobile } from "@/components/ui/use-mobile"

// Função auxiliar para converter valores monetários
function parseValorMonetario(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  if (!valor || typeof valor !== 'string') return 0;
  
  // Remove espaços e converte para string
  const valorLimpo = valor.toString().trim();
  
  // Remove símbolos de moeda e espaços
  let valorSemSimbolo = valorLimpo.replace(/[R$\s]/g, '');
  
  // Se não há vírgula nem ponto, é um número inteiro
  if (!valorSemSimbolo.includes(',') && !valorSemSimbolo.includes('.')) {
    const num = parseInt(valorSemSimbolo) || 0;
    return num;
  }
  
  // Se há vírgula, assumimos formato brasileiro (vírgula = decimal)
  if (valorSemSimbolo.includes(',')) {
    // Remove pontos (separadores de milhares) e substitui vírgula por ponto
    valorSemSimbolo = valorSemSimbolo.replace(/\./g, '').replace(',', '.');
  }
  // Se há apenas ponto, pode ser separador decimal ou de milhares
  else if (valorSemSimbolo.includes('.')) {
    // Se há mais de um ponto, o último é decimal
    const pontos = valorSemSimbolo.split('.');
    if (pontos.length > 2) {
      // Múltiplos pontos: os primeiros são separadores de milhares
      const parteInteira = pontos.slice(0, -1).join('');
      const parteDecimal = pontos[pontos.length - 1];
      valorSemSimbolo = parteInteira + '.' + parteDecimal;
    }
    // Se há apenas um ponto e a parte depois tem 3 dígitos, é separador de milhares
    else if (pontos[1] && pontos[1].length === 3 && /^\d+$/.test(pontos[1])) {
      valorSemSimbolo = valorSemSimbolo.replace('.', '');
    }
    // Caso contrário, é separador decimal
  }
  
  const resultado = parseFloat(valorSemSimbolo) || 0;
  return resultado;
}

interface StatsCardsProps {
  oportunidades: Oportunidade[]
}

export function StatsCards({ oportunidades }: StatsCardsProps) {
  const isMobile = useIsMobile()
  
  // Calcular estatísticas
  const leadsEmAberto = oportunidades.filter((o) => o.status === "novo_lead").length
  const oportunidadesGanhas = oportunidades.filter((o) => o.status === "fechado_ganho").length

  const totalEmNegociacao = oportunidades
    .filter((o) => !["fechado_ganho", "fechado_perdido"].includes(o.status))
    .reduce((acc, o) => {
      const valorNumerico = parseValorMonetario(o.valor)
      return acc + valorNumerico
    }, 0)

  const taxaConversao = oportunidades.length > 0 ? Math.round((oportunidadesGanhas / oportunidades.length) * 100) : 0

  const clientesAtivos = [...new Set(oportunidades.map((o) => o.cliente))].length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Users className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <div className="text-3xl font-bold">{leadsEmAberto}</div>
            <div className="text-sm text-gray-500">Leads em aberto</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <Award className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <div className="text-3xl font-bold">{oportunidadesGanhas}</div>
            <div className="text-sm text-gray-500">Oportunidades ganhas</div>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
          <div className="bg-yellow-100 p-2 sm:p-3 rounded-full flex-shrink-0">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
               {new Intl.NumberFormat("pt-BR", {
                 style: "currency",
                 currency: "BRL",
                 minimumFractionDigits: 0,
                 maximumFractionDigits: 0,
                 notation: isMobile ? "compact" : "standard",
               }).format(totalEmNegociacao)}
             </div>
            <div className="text-xs sm:text-sm text-gray-500 truncate">Total em negociação</div>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
          <div className="bg-purple-100 p-2 sm:p-3 rounded-full flex-shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{taxaConversao}%</div>
            <div className="text-xs sm:text-sm text-gray-500 truncate">Taxa de conversão</div>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
          <div className="bg-indigo-100 p-2 sm:p-3 rounded-full flex-shrink-0">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{clientesAtivos}</div>
            <div className="text-xs sm:text-sm text-gray-500 truncate">Clientes ativos</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

