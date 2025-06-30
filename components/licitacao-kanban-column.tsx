"use client"

import { useDroppable } from "@dnd-kit/core"
import { LicitacaoKanbanItem } from "./licitacao-kanban-item"

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

interface LicitacaoKanbanColumnProps {
  id: string
  title: string
  items: Licitacao[]
}

export function LicitacaoKanbanColumn({ id, title, items }: LicitacaoKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const columnColors = {
    analise_interna: "bg-blue-50 border-blue-200",
    aguardando_pregao: "bg-purple-50 border-purple-200",
    vencida: "bg-green-50 border-green-200",
    nao_vencida: "bg-red-50 border-red-200",
    envio_documentos: "bg-yellow-50 border-yellow-200",
    assinaturas: "bg-orange-50 border-orange-200",
    concluida: "bg-emerald-50 border-emerald-200",
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
          <LicitacaoKanbanItem key={item.id} id={item.id} item={item} />
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

