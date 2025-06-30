"use client"

import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd"
import { StatusBadge } from "@/components/status-badge"

interface Oportunidade {
  id: string
  titulo: string
  cliente: string
  valor: string
  responsavel: string
  prazo: string
  status: string
  descricao?: string
}

interface ComercialKanbanProps {
  oportunidades: Oportunidade[]
  onUpdateStatus: (id: string, newStatus: string) => void
  onOportunidadeClick: (oportunidade: Oportunidade) => void
}

export function ComercialKanban({ 
  oportunidades, 
  onUpdateStatus,
  onOportunidadeClick 
}: ComercialKanbanProps) {
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      novo_lead: "Novo Lead",
      agendamento_reuniao: "Agendamento de Reunião",
      levantamento_oportunidades: "Levantamento",
      proposta_enviada: "Proposta Enviada", 
      negociacao: "Negociação",
      fechado_ganho: "Fechado (Ganho)",
      fechado_perdido: "Fechado (Perdido)"
    }
    return statusLabels[status] || status
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    
    const sourceStatus = result.source.droppableId
    const destinationStatus = result.destination.droppableId
    const oportunidadeId = result.draggableId

    if (sourceStatus === destinationStatus) return

    onUpdateStatus(oportunidadeId, destinationStatus)
  }

  return (
    <div className="bg-white rounded-md border shadow-sm p-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
          {[
            "novo_lead",
            "agendamento_reuniao",
            "levantamento_oportunidades",
            "proposta_enviada",
            "negociacao", 
            "fechado_ganho",
            "fechado_perdido"
          ].map((status) => (
            <div key={status} className="min-w-[250px]">
              <div className="bg-gray-50 rounded-md p-2">
                <h3 className="text-sm font-medium mb-2 px-2 py-1">
                  {getStatusLabel(status)}
                </h3>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-md min-h-[400px] bg-white p-2 transition-colors border-2 border-dashed ${
                        snapshot.isDraggingOver ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {oportunidades
                        .filter((op) => op.status === status)
                        .map((oportunidade, index) => (
                          <Draggable
                            key={oportunidade.id}
                            draggableId={oportunidade.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 mb-2 rounded-md bg-white border shadow-sm cursor-pointer 
                                  ${snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'hover:border-blue-300'}`}
                                onClick={() => onOportunidadeClick(oportunidade)}
                              >
                                <h4 className="font-medium text-sm mb-1 truncate">
                                  {oportunidade.titulo}
                                </h4>
                                <p className="text-xs text-gray-500 mb-1 truncate">
                                  {oportunidade.cliente}
                                </p>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-semibold">
                                    {oportunidade.valor}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {oportunidade.prazo}
                                  </span>
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
    </div>
  )
}