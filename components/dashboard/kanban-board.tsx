"use client"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

const columns = [
  {
    id: "novo_lead",
    title: "Novo Lead",
  },
  {
    id: "agendamento_reuniao",
    title: "Agendamento de Reunião",
  },
  {
    id: "levantamento_oportunidades",
    title: "Levantamento de Oportunidades",
  },
  {
    id: "proposta_enviada",
    title: "Proposta Enviada",
  },
  {
    id: "negociacao",
    title: "Negociação",
  },
  {
    id: "fechado_ganho",
    title: "Fechado (Ganho)",
  },
  {
    id: "fechado_perdido",
    title: "Fechado (Perdido)",
  },
]

export interface Oportunidade {
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
}

export default function KanbanBoard({ oportunidades, onUpdateStatus }: KanbanBoardProps) {
  const getOportunidadesByStatus = (status: string) => {
    return oportunidades.filter((op) => op.status === status)
  }

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) {
      return
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    onUpdateStatus(draggableId, destination.droppableId)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[250px]">
            <div className="bg-gray-50 rounded-md p-2">
              <h3 className="text-sm font-medium mb-2 px-2 py-1">{column.title}</h3>
              <Droppable droppableId={column.id} key={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-md min-h-[200px] ${
                      snapshot.isDraggingOver ? "bg-blue-50" : "bg-white"
                    } p-2 transition-colors`}
                  >
                    {getOportunidadesByStatus(column.id).map((oportunidade, index) => (
                      <Draggable key={oportunidade.id} draggableId={oportunidade.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 mb-2 rounded-md ${
                              snapshot.isDragging ? "bg-blue-100 shadow-lg" : "bg-white border"
                            } shadow-sm cursor-pointer hover:border-blue-300`}
                            onClick={() => {
                              // Implementaremos uma função melhor depois
                              console.log(`Detalhes da oportunidade: ${oportunidade.titulo}`)
                            }}
                          >
                            <h4 className="font-medium text-sm mb-1 truncate">{oportunidade.titulo}</h4>
                            <p className="text-xs text-gray-500 mb-1 truncate">{oportunidade.cliente}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold">{oportunidade.valor}</span>
                              <span className="text-xs text-gray-500">{oportunidade.prazo}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}

