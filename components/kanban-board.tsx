// Simplify the KanbanBoard component to avoid reconciliation issues

"use client"

import type React from "react"

import { useState } from "react"

interface Oportunidade {
  id: string
  titulo: string
  cliente: string
  valor: string
  responsavel: string
  prazo: string
  status: string
}

interface KanbanBoardProps {
  oportunidades: Oportunidade[]
  onUpdateStatus: (id: string, newStatus: string) => void
  onOportunidadeClick: (oportunidadeId: string) => Promise<void>
  onEditOportunidade: (oportunidade: Oportunidade) => void
  onDeleteOportunidade: (oportunidadeId: string) => void
  isLoading: boolean
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

export function KanbanBoard({ oportunidades, onUpdateStatus }: KanbanBoardProps) {
  // Simplified state management
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

  // Filter opportunities by status
  const getItemsByStatus = (status: string) => {
    return oportunidades.filter((item) => item.status === status)
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id)
    setDraggedItemId(id)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (id) {
      onUpdateStatus(id, status)
    }
    setDraggedItemId(null)
  }

  return (
    <div className="flex overflow-x-auto gap-4 pb-4">
      {columns.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-64">
          <div className="bg-gray-50 rounded-md p-2 h-full">
            <h3 className="text-sm font-medium mb-2 px-2">{column.title}</h3>
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="min-h-[200px] bg-white p-2 rounded-md border-2 border-dashed border-gray-200"
            >
              {getItemsByStatus(column.id).map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  className={`p-3 mb-2 rounded-md bg-white border shadow-sm cursor-move ${
                    draggedItemId === item.id ? "opacity-50" : ""
                  }`}
                >
                  <h4 className="font-medium text-sm mb-1">{item.titulo}</h4>
                  <p className="text-xs text-gray-500 mb-1">{item.cliente}</p>
                  <div className="flex justify-between text-xs">
                    <span>{item.valor}</span>
                    <span className="text-gray-500">{item.prazo}</span>
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

