import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Oportunidade } from "./kanban-board"

interface OportunidadesRecentesProps {
  oportunidades: Oportunidade[]
}

export function OportunidadesRecentes({ oportunidades }: OportunidadesRecentesProps) {
  // Pegar as 5 oportunidades mais recentes (simulando)
  const oportunidadesRecentes = oportunidades.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oportunidades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {oportunidadesRecentes.map((oportunidade) => (
            <div
              key={oportunidade.id}
              className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
            >
              <div>
                <h4 className="font-medium">{oportunidade.titulo}</h4>
                <p className="text-sm text-gray-500">{oportunidade.cliente}</p>
              </div>
              <div className="flex flex-col items-end">
                <Badge className={getStatusBadgeClass(oportunidade.status)}>
                  {getStatusLabel(oportunidade.status)}
                </Badge>
                <span className="text-sm font-medium mt-1">{oportunidade.valor}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusBadgeClass(status: string): string {
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

function getStatusLabel(status: string): string {
  switch (status) {
    case "novo_lead":
      return "Novo Lead"
    case "agendamento_reuniao":
      return "Agendamento"
    case "levantamento_oportunidades":
      return "Levantamento"
    case "proposta_enviada":
      return "Proposta"
    case "negociacao":
      return "Negociação"
    case "fechado_ganho":
      return "Ganho"
    case "fechado_perdido":
      return "Perdido"
    default:
      return status
  }
}

