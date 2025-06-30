"use client"

import { useDraggable } from "@dnd-kit/core"
import { FileText, Users, Calendar } from "lucide-react"

interface Licitacao {
  id: string
  nome: string
  orgao: string
  orgaoId: string
  valor: string
  prazo: string
  prazoStatus: "danger" | "warning" | "success"
  status: string
  documentos: number
  responsaveis: number
  dataJulgamento: string
}

interface LicitacaoKanbanItemProps {
  id: string
  item: Licitacao
}

export function LicitacaoKanbanItem({ id, item }: LicitacaoKanbanItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const prazoColors = {
    danger: "text-red-500",
    warning: "text-amber-500",
    success: "text-green-500",
  }

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
      <h3 className="font-medium">{item.nome}</h3>
      <p className="text-sm text-muted-foreground">{item.orgao}</p>
      <div className="mt-2 flex justify-between items-center text-xs">
        <span>{item.valor}</span>
        <span className={prazoColors[item.prazoStatus]}>{item.prazo}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center text-xs text-muted-foreground">
          <FileText className="h-3 w-3 mr-1" />
          <span>{item.documentos}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Users className="h-3 w-3 mr-1" />
          <span>{item.responsaveis}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center text-xs text-muted-foreground">
        <Calendar className="h-3 w-3 mr-1" />
        <span>Julgamento: {item.dataJulgamento}</span>
      </div>
    </div>
  )
}

