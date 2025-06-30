"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Filter, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function PropostasPage() {
  const [activeView, setActiveView] = useState("lista")
  const [activeFilters, setActiveFilters] = useState(0)

  // Estatísticas - valores fixos
  const propostasEmAberto = 38
  const taxaAprovacao = 86
  const totalEmPropostas = 12000.0
  const tempoMedioResposta = 12
  const expiramEm15Dias = 3

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Propostas</h1>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{propostasEmAberto}</div>
            <div className="text-sm text-muted-foreground">Propostas em aberto</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{taxaAprovacao}%</div>
            <div className="text-sm text-muted-foreground">Taxa de aprovação</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">
              {totalEmPropostas.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-sm text-muted-foreground">R$ total em propostas</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{tempoMedioResposta}</div>
            <div className="text-sm text-muted-foreground">Tempo médio de resposta</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{expiramEm15Dias}</div>
            <div className="text-sm text-muted-foreground">Expiram em 15 dias</div>
          </CardContent>
        </Card>
      </div>

      {/* Abas e Filtros - Simplificado sem usar o componente Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-muted p-1 rounded-md">
            <Button
              variant={activeView === "lista" ? "default" : "ghost"}
              onClick={() => setActiveView("lista")}
              className="rounded-sm"
            >
              Lista
            </Button>
            <Button
              variant={activeView === "kanban" ? "default" : "ghost"}
              onClick={() => setActiveView("kanban")}
              className="rounded-sm"
            >
              Quadro Kanban
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {activeFilters > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white">
                  {activeFilters}
                </Badge>
              )}
            </Button>
            <Button variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
            <Button className="bg-[#1B3A53] hover:bg-[#2c5a80]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Proposta
            </Button>
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div className="bg-white rounded-md border shadow-sm p-8">
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <p className="text-muted-foreground mb-2">Nenhuma proposta encontrada</p>
            <p className="text-sm text-muted-foreground">
              Crie uma nova proposta ou ajuste os filtros para visualizar propostas existentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

