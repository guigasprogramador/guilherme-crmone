"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Proposta } from "@/hooks/propostas/usePropostas";
import { Eye, Edit, Trash2 as TrashIcon, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

interface ListaPropostasProps {
  propostas: Proposta[];
  onViewProposta: (proposta: Proposta) => void;
  onEditProposta: (proposta: Proposta) => void;
  onCancelProposta: (propostaId: string) => void; // Para soft delete (mudar status para CANCELADA)
}

// Cores e labels para status (pode ser movido para um util)
const statusConfig: Record<string, { label: string; className: string }> = {
  EM_ELABORACAO: { label: "Em Elaboração", className: "bg-blue-100 text-blue-700 border-blue-300" },
  ENVIADA_PARA_APROVACAO_INTERNA: { label: "Aprovação Interna", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  AGUARDANDO_AJUSTES: { label: "Aguardando Ajustes", className: "bg-orange-100 text-orange-700 border-orange-300" },
  PRONTA_PARA_ENVIO: { label: "Pronta para Envio", className: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  ENVIADA_AO_CLIENTE: { label: "Enviada ao Cliente", className: "bg-purple-100 text-purple-700 border-purple-300" },
  EM_NEGOCIACAO: { label: "Em Negociação", className: "bg-teal-100 text-teal-700 border-teal-300" },
  ACEITA: { label: "Aceita", className: "bg-green-100 text-green-700 border-green-300" },
  RECUSADA: { label: "Recusada", className: "bg-red-100 text-red-700 border-red-300" },
  CANCELADA: { label: "Cancelada", className: "bg-gray-200 text-gray-700 border-gray-400" },
  DEFAULT: { label: "Desconhecido", className: "bg-gray-100 text-gray-700 border-gray-300"}
};

export function ListaPropostas({
  propostas,
  onViewProposta,
  onEditProposta,
  onCancelProposta,
}: ListaPropostasProps) {

  const getStatusDisplay = (statusKey: string) => {
    return statusConfig[statusKey] || statusConfig.DEFAULT;
  };

  if (propostas.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md bg-white shadow-sm">
        <p className="text-muted-foreground mb-2">Nenhuma proposta encontrada</p>
        <p className="text-sm text-muted-foreground">
          Crie uma nova proposta ou ajuste os filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Número</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente/Órgão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-center w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {propostas.map((proposta) => {
            const statusDisplay = getStatusDisplay(proposta.status_proposta);
            return (
              <TableRow key={proposta.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{proposta.numero_proposta}</TableCell>
                <TableCell>{proposta.titulo}</TableCell>
                <TableCell>{proposta.cliente_nome || proposta.orgao_nome || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusDisplay.className}>
                    {statusDisplay.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(proposta.valor_total_proposta || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: proposta.moeda || "BRL",
                  })}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewProposta(proposta)}>
                        <Eye className="mr-2 h-4 w-4" /> Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditProposta(proposta)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      {proposta.status_proposta !== 'CANCELADA' && proposta.status_proposta !== 'ACEITA' && (
                        <DropdownMenuItem
                          onClick={() => onCancelProposta(proposta.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <TrashIcon className="mr-2 h-4 w-4" /> Cancelar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
