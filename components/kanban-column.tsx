"use client"

import { useDroppable } from "@dnd-kit/core"
import { KanbanItem } from "./kanban-item"

interface Oportunidade {
  id: string
  titulo: string
  cliente: string
  valor: string
  responsavel: string
  prazo: string
  status: string
}

interface KanbanColumnProps {
  id: string
  title: string
  items: Oportunidade[]
}

export function KanbanColumn({ id, title, items }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const columnColors = {
    novo_lead: "bg-blue-50 border-blue-200",
    agendamento_reuniao: "bg-indigo-50 border-indigo-200",
    levantamento_oportunidades: "bg-purple-50 border-purple-200",
    proposta_enviada: "bg-amber-50 border-amber-200",
    negociacao: "bg-orange-50 border-orange-200",
    fechado_ganho: "bg-green-50 border-green-200",
    fechado_perdido: "bg-red-50 border-red-200",
  }

  const columnColor = columnColors[id as keyof typeof columnColors] || "bg-gray-50 border-gray-200"

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-[calc(70vh-2rem)] border rounded-md min-w-[240px] flex-shrink-0 ${columnColor} ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="p-3 font-medium border-b bg-muted/20">
        <div className="flex justify-between items-center">
          <span>{title}</span>
          <span className="text-xs font-normal bg-background px-2 py-1 rounded-full">{items.length}</span>
        </div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto space-y-2">
        {items.map((item) => (
          <KanbanItem key={item.id} id={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Arraste itens para cá
          </div>
        )}
      </div>
    </div>
  )
}

