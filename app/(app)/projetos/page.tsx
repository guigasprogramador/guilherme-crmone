"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Filter, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ProjetosPage() {
  const [activeView, setActiveView] = useState("lista")
  const [activeFilters, setActiveFilters] = useState(0)

  // Estatísticas - valores fixos
  const projetosEmExecucao = 38
  const progressoMedio = 86
  const tempoMedioEntrega = 120
  const projetosExecutados = 260
  const projetosAtrasados = 3
  const percentualAtrasados = 10

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Projetos</h1>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{projetosEmExecucao}</div>
            <div className="text-sm text-muted-foreground">Projetos em execução</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{progressoMedio}%</div>
            <div className="text-sm text-muted-foreground">Progresso médio</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{tempoMedioEntrega}</div>
            <div className="text-sm text-muted-foreground">Tempo médio de entrega</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{projetosExecutados}</div>
            <div className="text-sm text-muted-foreground">Projetos executados</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">
              {projetosAtrasados} <span className="text-base text-muted-foreground">({percentualAtrasados}%)</span>
            </div>
            <div className="text-sm text-muted-foreground">Projetos atrasados</div>
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
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div className="bg-white rounded-md border shadow-sm p-8">
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <p className="text-muted-foreground mb-2">Nenhum projeto encontrado</p>
            <p className="text-sm text-muted-foreground">
              Crie um novo projeto ou ajuste os filtros para visualizar projetos existentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

