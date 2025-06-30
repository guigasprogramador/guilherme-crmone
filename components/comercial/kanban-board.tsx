"use client"
import { useEffect, useState, useMemo, memo } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useVirtualizer } from '@tanstack/react-virtual'
import { Oportunidade } from "@/types/comercial"

interface KanbanBoardProps {
  oportunidades: Oportunidade[];
  onUpdateStatus: (id: string, newStatus: string) => void;
  onOportunidadeClick: (oportunidadeId: string) => Promise<void>;
  onEditOportunidade: (oportunidade: Oportunidade) => void;
  onDeleteOportunidade: (oportunidadeId: string) => void;
  isLoading: boolean;
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

// Componente de item de oportunidade memoizado para evitar re-renders desnecessários
const OportunidadeItem = memo(({ oportunidade, index, onClienteClick }: { 
  oportunidade: Oportunidade, 
  index: number, 
  onClienteClick?: (clienteId: string) => void 
}) => {
  return (
    <Draggable key={oportunidade.id} draggableId={oportunidade.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 mb-2 bg-white rounded-md shadow-sm border border-gray-100 ${snapshot.isDragging ? "opacity-75" : ""} break-words min-w-[220px] max-w-[320px] w-full flex flex-col`}
        >
          <div className="text-sm font-medium mb-1">{oportunidade.titulo}</div>
          <div
            className="text-xs text-blue-600 hover:underline cursor-pointer mb-1"
            onClick={() => onClienteClick && onClienteClick(oportunidade.cliente)}
          >
            {oportunidade.cliente}
          </div>
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">{oportunidade.responsavel}</div>
            <div className="text-xs font-medium">{oportunidade.valor}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{oportunidade.prazo}</div>
        </div>
      )}
    </Draggable>
  );
});

OportunidadeItem.displayName = 'OportunidadeItem';

export function KanbanBoard({ oportunidades, onUpdateStatus, onOportunidadeClick, onEditOportunidade, onDeleteOportunidade, isLoading }: KanbanBoardProps) {
  const [isMounted, setIsMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")
  
  // Montar o componente apenas no lado do cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Função para obter oportunidades por status (memoizada para evitar recalcular a cada renderização)
  const getOportunidadesByStatus = useMemo(() => {
    // Criar um objeto com as oportunidades agrupadas por status para acesso rápido
    const oportunidadesPorStatus: Record<string, Oportunidade[]> = {};
    
    // Pré-processar todas as oportunidades e agrupar por status
    columns.forEach(column => {
      oportunidadesPorStatus[column.id] = [];
    });
    
    // Preencher os grupos com as oportunidades correspondentes
    oportunidades.forEach(op => {
      if (oportunidadesPorStatus[op.status]) {
        oportunidadesPorStatus[op.status].push(op);
      }
    });
    
    // Retornar uma função que busca as oportunidades pelo status
    return (status: string) => {
      return oportunidadesPorStatus[status] || [];
    };
  }, [oportunidades])

  // Função para lidar com o fim do arrasto
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    // Se não houver destino ou o destino for o mesmo que a origem, não fazer nada
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Atualizar o status da oportunidade
    onUpdateStatus(draggableId, destination.droppableId)
  }

  // Função para obter a classe CSS para o badge de status
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "novo_lead":
        return "bg-blue-100 text-blue-800"
      case "agendamento_reuniao":
        return "bg-purple-100 text-purple-800"
      case "levantamento_oportunidades":
        return "bg-indigo-100 text-indigo-800"
      case "proposta_enviada":
        return "bg-yellow-100 text-yellow-800"
      case "negociacao":
        return "bg-orange-100 text-orange-800"
      case "fechado_ganho":
        return "bg-green-100 text-green-800"
      case "fechado_perdido":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  
  // Determinar a largura da coluna com base no tamanho da tela
  const getColumnWidth = () => {
    if (isMobile) return "w-[85vw] min-w-[250px]"
    if (isTablet) return "w-[45vw] min-w-[250px]"
    return "w-[280px] min-w-[250px]"
  }

  // Se não estiver montado, retornar um placeholder para evitar problemas de hidratação
  if (!isMounted) {
    return <div className="h-[calc(100vh-250px)] bg-gray-100 rounded-md animate-pulse"></div>
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex overflow-x-auto pb-6 gap-3 md:gap-4 snap-x snap-mandatory touch-pan-x scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {columns.map((column) => (
          <Droppable key={column.id} droppableId={column.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-shrink-0 ${getColumnWidth()} bg-gray-50 rounded-md p-2 snap-center transition-colors duration-200 ${
                  snapshot.isDraggingOver ? "bg-blue-50 border-2 border-blue-200" : ""
                }`}
              >
                <h3 className="text-sm font-medium mb-2 px-2 py-1 truncate" title={column.title}>
                  {column.title}
                  <span className="ml-2 text-xs bg-white px-1.5 py-0.5 rounded-full">
                    {getOportunidadesByStatus(column.id).length}
                  </span>
                </h3>
                <div className="min-h-[calc(100vh-250px)] max-h-[calc(100vh-200px)] overflow-y-auto rounded-md pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                  {/* Usar useMemo para evitar recalcular a lista de oportunidades a cada renderização */}
                  {useMemo(() => {
                    const oportunidadesDoStatus = getOportunidadesByStatus(column.id);
                    return oportunidadesDoStatus.map((oportunidade, index) => (
                      <Draggable key={oportunidade.id} draggableId={oportunidade.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 mb-2 rounded-md ${
                              snapshot.isDragging ? "bg-blue-100 shadow-lg border-blue-300 scale-[1.02] z-10" : "bg-white"
                            } border shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all duration-200 touch-manipulation`}
                          >
                            <h4 className="font-medium text-sm mb-1 break-words line-clamp-2" title={oportunidade.titulo}>
                              {oportunidade.titulo}
                            </h4>
                            <p className="text-xs text-gray-500 mb-1 truncate" title={oportunidade.cliente}>
                              {oportunidade.cliente}
                            </p>
                            <div className="flex justify-between items-center flex-wrap gap-1">
                              <span className="text-xs font-semibold">{oportunidade.valor}</span>
                              <span className="text-xs text-gray-500">{oportunidade.prazo}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span
                                className="text-xs text-gray-500 truncate max-w-[60%]"
                                title={oportunidade.responsavel}
                              >
                                {oportunidade.responsavel}
                              </span>
                              <Badge className={`text-xs ${getStatusBadgeClass(oportunidade.status)}`}>
                                {getStatusLabel(oportunidade.status)}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ));
                  }, [getOportunidadesByStatus(column.id).length, column.id])}
                  {provided.placeholder}
                  {getOportunidadesByStatus(column.id).length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-md h-24 flex items-center justify-center">
                      Arraste itens para cá
                    </div>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}

// Função para obter o rótulo do status
function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    novo_lead: "Novo Lead",
    agendamento_reuniao: "Agendamento",
    levantamento_oportunidades: "Levantamento",
    proposta_enviada: "Proposta",
    negociacao: "Negociação",
    fechado_ganho: "Ganho",
    fechado_perdido: "Perdido",
  }
  return statusLabels[status] || status
}

