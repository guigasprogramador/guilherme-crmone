import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, User } from "lucide-react"

const atividades = [
  {
    id: 1,
    titulo: "Reunião com Prefeitura de São Paulo",
    data: "15/07/2023",
    hora: "14:30",
    responsavel: "Ana Silva",
    tipo: "reuniao",
  },
  {
    id: 2,
    titulo: "Envio de proposta - Secretaria de Educação",
    data: "16/07/2023",
    hora: "10:00",
    responsavel: "Carlos Oliveira",
    tipo: "proposta",
  },
  {
    id: 3,
    titulo: "Prazo final - Pregão Eletrônico 123/2023",
    data: "18/07/2023",
    hora: "18:00",
    responsavel: "Pedro Santos",
    tipo: "prazo",
  },
  {
    id: 4,
    titulo: "Apresentação de produto - Hospital Municipal",
    data: "20/07/2023",
    hora: "09:30",
    responsavel: "Ana Silva",
    tipo: "apresentacao",
  },
]

export function ProximasAtividades() {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Próximas Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {atividades.map((atividade) => (
            <div key={atividade.id} className="flex items-start gap-4 p-3 border rounded-md hover:bg-gray-50">
              <div className={`p-2 rounded-full ${getAtividadeColor(atividade.tipo)}`}>
                {getAtividadeIcon(atividade.tipo)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{atividade.titulo}</h4>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{atividade.data}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{atividade.hora}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{atividade.responsavel}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getAtividadeColor(tipo: string): string {
  switch (tipo) {
    case "reuniao":
      return "bg-blue-100 text-blue-700"
    case "proposta":
      return "bg-green-100 text-green-700"
    case "prazo":
      return "bg-red-100 text-red-700"
    case "apresentacao":
      return "bg-purple-100 text-purple-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function getAtividadeIcon(tipo: string) {
  switch (tipo) {
    case "reuniao":
      return <User className="h-4 w-4" />
    case "proposta":
      return <Calendar className="h-4 w-4" />
    case "prazo":
      return <Clock className="h-4 w-4" />
    case "apresentacao":
      return <User className="h-4 w-4" />
    default:
      return <Calendar className="h-4 w-4" />
  }
}

