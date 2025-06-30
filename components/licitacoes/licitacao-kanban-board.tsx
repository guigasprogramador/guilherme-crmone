"use client"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Licitacao } from "@/types/licitacoes"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Toggle } from "@/components/ui/toggle"
import { FormularioSimplificadoLicitacao } from "./formulario-simplificado-licitacao"
import { PlusCircle, FileText, FileTextIcon } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

interface LicitacaoKanbanBoardProps {
  licitacoes: Licitacao[]
  onUpdateStatus: (id: string, newStatus: string) => void
  onLicitacaoClick?: (licitacao: Licitacao) => void
}

// Definição das colunas do Kanban
const columns = [
  { id: "analise_interna", title: "Análise Interna" },
  { id: "analise_edital", title: "Análise de Edital" },
  { id: "aguardando_pregao", title: "Aguardando Pregão" },
  { id: "em_andamento", title: "Em Andamento" },
  { id: "envio_documentos", title: "Envio de Documentos" },
  { id: "assinaturas", title: "Assinaturas" },
  { id: "vencida", title: "Vencida" },
  { id: "nao_vencida", title: "Não Vencida" }
]

export function LicitacaoKanbanBoard({ licitacoes, onUpdateStatus, onLicitacaoClick }: LicitacaoKanbanBoardProps) {
  const [showSimplifiedForm, setShowSimplifiedForm] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")
  
  // Montar o componente apenas no lado do cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Função para obter licitações por status
  const getLicitacoesByStatus = (status: string) => {
    return licitacoes.filter((lic) => lic.status === status)
  }

  // Função para lidar com o fim do arrasto
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    // Se não houver destino ou o destino for o mesmo que a origem, não fazer nada
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Atualizar o status da licitação
    onUpdateStatus(draggableId, destination.droppableId)
  }

  // Função para obter a classe CSS para o badge de status
  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      "analise_interna": "bg-purple-100 text-purple-800",
      "analise_edital": "bg-indigo-100 text-indigo-800",
      "aguardando_pregao": "bg-yellow-100 text-yellow-800",
      "em_andamento": "bg-blue-100 text-blue-800",
      "envio_documentos": "bg-amber-100 text-amber-800",
      "assinaturas": "bg-blue-100 text-blue-800",
      "vencida": "bg-green-100 text-green-800",
      "nao_vencida": "bg-red-100 text-red-800"
    }
    return statusColors[status] || "bg-gray-100 text-gray-800"
  }

  // Função para formatar valor
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return 'R$ 0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold">Licitações</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Toggle
              pressed={showSimplifiedForm}
              onPressedChange={setShowSimplifiedForm}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {showSimplifiedForm ? (
                <div className="flex items-center gap-2">
                  <FileTextIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Simplificado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Completo</span>
                </div>
              )}
            </Toggle>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex overflow-x-auto pb-3 gap-2 md:gap-4 snap-x snap-mandatory touch-pan-x scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent min-h-[340px]">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-shrink-0 ${getColumnWidth()} bg-gray-50 rounded-md p-1 sm:p-2 snap-center transition-colors duration-200 ${
                    snapshot.isDraggingOver ? "bg-blue-50 border-2 border-blue-200" : ""
                  }`}
                >
                  <h3 className="text-sm font-medium mb-2 px-2 py-1 truncate" title={column.title}>
                    {column.title}
                    <span className="ml-2 text-xs bg-white px-1.5 py-0.5 rounded-full">
                      {getLicitacoesByStatus(column.id).length}
                    </span>
                  </h3>
                  <div className="min-h-[calc(100vh-250px)] max-h-[calc(100vh-200px)] overflow-y-auto rounded-md pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                    {getLicitacoesByStatus(column.id).map((licitacao, index) => (
                      <Draggable key={licitacao.id} draggableId={licitacao.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 mb-2 rounded-md border shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all duration-200 touch-manipulation break-words min-w-[220px] max-w-[320px] w-full flex flex-col ${snapshot.isDragging ? 'bg-blue-100 shadow-lg border-blue-300 scale-[1.02] z-10' : 'bg-white'}`}

                            onClick={() => onLicitacaoClick && onLicitacaoClick(licitacao)}
                          >
                            <h4 className="font-medium text-sm mb-1 break-words line-clamp-2" title={licitacao.titulo}>
                              {licitacao.titulo}
                            </h4>
                            <p className="text-xs text-gray-500 mb-1 truncate" title={typeof licitacao.orgao === 'object' && licitacao.orgao ? String(licitacao.orgao.nome) : String(licitacao.orgao)}>
                              {typeof licitacao.orgao === 'object' && licitacao.orgao ? String(licitacao.orgao.nome) : String(licitacao.orgao)}
                            </p>
                            <div className="flex justify-between items-center flex-wrap gap-1">
                              <span className="text-xs font-semibold">{formatCurrency(licitacao.valorEstimado || (licitacao as any).valor_estimado)}</span>
                              <span className="text-xs text-blue-500">{licitacao.dataAbertura}</span>
                            </div>
                            {licitacao.documentos && (
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>Docs: {licitacao.documentos.length}</span>
                                <span className="truncate max-w-[50%]" title={licitacao.responsavel}>Resp: {licitacao.responsavel}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {getLicitacoesByStatus(column.id).length === 0 && (
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
    </div>
  )
}
