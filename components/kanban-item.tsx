"use client"

import { useDraggable } from "@dnd-kit/core"
import { Calendar, DollarSign, Users } from "lucide-react"

interface Oportunidade {
  id: string
  titulo: string
  cliente: string
  valor: string
  responsavel: string
  prazo: string
  status: string
}

interface KanbanItemProps {
  id: string
  item: Oportunidade
}

export function KanbanItem({ id, item }: KanbanItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`border bg-background rounded-md p-3 shadow-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <h3 className="font-medium">{item.titulo}</h3>
      <p className="text-sm text-muted-foreground">{item.cliente}</p>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center">
          <DollarSign className="h-3 w-3 mr-1" />
          <span>{item.valor}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          <span>{item.prazo}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center text-xs text-muted-foreground">
        <Users className="h-3 w-3 mr-1" />
        <span>{item.responsavel}</span>
      </div>
    </div>
  )
}

