import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, AlertTriangle, CheckCircle } from "lucide-react"

export function RecentBids() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Licitação</TableHead>
          <TableHead>Órgão</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Documentos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Pregão Eletrônico 123/2023</TableCell>
          <TableCell>Prefeitura de São Paulo</TableCell>
          <TableCell>R$ 250.000,00</TableCell>
          <TableCell className="text-red-500">3 dias</TableCell>
          <TableCell>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          </TableCell>
          <TableCell>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Concorrência 45/2023</TableCell>
          <TableCell>Governo do Estado</TableCell>
          <TableCell>R$ 1.200.000,00</TableCell>
          <TableCell className="text-amber-500">7 dias</TableCell>
          <TableCell>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          </TableCell>
          <TableCell>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Tomada de Preços 78/2023</TableCell>
          <TableCell>Ministério da Educação</TableCell>
          <TableCell>R$ 450.000,00</TableCell>
          <TableCell className="text-red-500">2 dias</TableCell>
          <TableCell>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          </TableCell>
          <TableCell>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

