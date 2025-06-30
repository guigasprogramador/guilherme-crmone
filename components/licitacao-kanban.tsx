"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { LicitacaoKanbanColumn } from "./licitacao-kanban-column"

interface Licitacao {
  id: string
  nome: string
  orgao: string
  orgaoId: string
  valor: string
  prazo: string
  prazoStatus: "danger" | "warning" | "success"
  status:
    | "analise_interna"
    | "aguardando_pregao"
    | "vencida"
    | "nao_vencida"
    | "envio_documentos"
    | "assinaturas"
    | "concluida"
  documentos: number
  responsaveis: number
  dataJulgamento: string
}

interface LicitacaoKanbanProps {
  licitacoes: Licitacao[]
  onUpdateStatus: (id: string, status: Licitacao["status"]) => void
}

export function LicitacaoKanban({ licitacoes, onUpdateStatus }: LicitacaoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const columns = {
    analise_interna: {
      id: "analise_interna",
      title: "Análise Interna",
      items: licitacoes.filter((l) => l.status === "analise_interna"),
    },
    aguardando_pregao: {
      id: "aguardando_pregao",
      title: "Aguardando Pregão",
      items: licitacoes.filter((l) => l.status === "aguardando_pregao"),
    },
    vencida: {
      id: "vencida",
      title: "Vencida",
      items: licitacoes.filter((l) => l.status === "vencida"),
    },
    nao_vencida: {
      id: "nao_vencida",
      title: "Não Vencida",
      items: licitacoes.filter((l) => l.status === "nao_vencida"),
    },
    envio_documentos: {
      id: "envio_documentos",
      title: "Envio de Documentos",
      items: licitacoes.filter((l) => l.status === "envio_documentos"),
    },
    assinaturas: {
      id: "assinaturas",
      title: "Assinaturas",
      items: licitacoes.filter((l) => l.status === "assinaturas"),
    },
    concluida: {
      id: "concluida",
      title: "Concluída",
      items: licitacoes.filter((l) => l.status === "concluida"),
    },
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeItemId = active.id as string
      const overColumnId = over.id as string

      // Verificar se o destino é uma coluna válida
      if (overColumnId in columns) {
        // Chamar a função para atualizar o status
        onUpdateStatus(activeItemId, overColumnId as Licitacao["status"])
      }
    }

    setActiveId(null)
  }

  const activeItem = activeId ? licitacoes.find((l) => l.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex overflow-x-auto pb-4 gap-4 min-h-[70vh]">
        {Object.values(columns).map((column) => (
          <LicitacaoKanbanColumn key={column.id} id={column.id} title={column.title} items={column.items} />
        ))}
      </div>

      <DragOverlay>
        {activeId && activeItem ? (
          <div className="bg-background border rounded-md p-3 shadow-md w-full max-w-[250px]">
            <h3 className="font-medium">{activeItem.nome}</h3>
            <p className="text-sm text-muted-foreground">{activeItem.orgao}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

