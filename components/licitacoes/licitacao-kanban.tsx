"use client"

import type React from "react"
import { useState } from "react"

interface Licitacao {
  id: string
  nome: string
  orgao: string
  valor: string
  prazo: string
  prazoStatus: "danger" | "warning" | "success"
  status: string
  dataJulgamento: string
  responsavel?: string
}

interface LicitacaoKanbanProps {
  licitacoes: Licitacao[]
  onUpdateStatus?: (id: string, newStatus: string) => void
}

const columns = [
  { id: "novo_lead", title: "Novo Lead" },
  { id: "agendamento_reuniao", title: "Agendamento de Reunião" },
  { id: "levantamento_oportunidades", title: "Levantamento de Oportunidades" },
  { id: "proposta_enviada", title: "Proposta Enviada" },
  { id: "negociacao", title: "Negociação" },
  { id: "fechado_ganho", title: "Fechado (Ganho)" },
  { id: "fechado_perdido", title: "Fechado (Perdido)" },
]

export function LicitacaoKanban({ licitacoes, onUpdateStatus }: LicitacaoKanbanProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

  const getLicitacoesByStatus = (status: string) => {
    return licitacoes.filter((licitacao) => licitacao.status === status)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id)
    setDraggedItemId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (id && onUpdateStatus) {
      // Add a small delay to prevent React reconciliation issues
      setTimeout(() => {
        onUpdateStatus(id, status)
        setDraggedItemId(null)
      }, 0)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.id} className="min-w-[250px]">
          <div className="bg-gray-50 rounded-md p-2">
            <h3 className="text-sm font-medium mb-2 px-2 py-1">{column.title}</h3>
            <div
              key={`column-${column.id}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`rounded-md min-h-[400px] bg-white p-2 transition-colors border-2 border-dashed ${
                draggedItemId ? "border-blue-200" : "border-gray-200"
              }`}
            >
              {getLicitacoesByStatus(column.id).map((licitacao) => (
                <div
                  key={licitacao.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, licitacao.id)}
                  className={`p-3 mb-2 rounded-md bg-white border shadow-sm cursor-grab ${
                    draggedItemId === licitacao.id ? "opacity-50" : ""
                  }`}
                >
                  <h4 className="font-medium text-sm mb-1 truncate">{licitacao.nome}</h4>
                  <p className="text-xs text-gray-500 mb-1 truncate">{licitacao.orgao}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold">{licitacao.valor}</span>
                    <span
                      className={
                        licitacao.prazoStatus === "danger"
                          ? "text-red-500"
                          : licitacao.prazoStatus === "warning"
                            ? "text-amber-500"
                            : "text-green-500"
                      }
                    >
                      {licitacao.prazo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

