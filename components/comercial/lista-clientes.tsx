"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Edit, Trash, Eye, Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Cliente } from "@/types/comercial"
import { NovoCliente } from "@/components/comercial/novo-cliente"

interface ListaClientesProps {
  clientes: Cliente[];
  onClienteClick: (clienteId: string) => void;
  onClienteAdded: (cliente: Partial<Cliente>) => Promise<void>;
  onClienteEditar: (cliente: Cliente) => void;
  onClienteDelete: (clienteId: string) => Promise<void>;
  error?: string | null;
  onEditCliente?: React.Dispatch<React.SetStateAction<Cliente | null>>;
}

export function ListaClientes({ 
  clientes, 
  onClienteClick, 
  onClienteAdded,
  onClienteEditar,
  onClienteDelete,
  onEditCliente
}: ListaClientesProps) {
  const [termo, setTermo] = useState("")
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | null>(true)

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(cliente => {
    // Filtro por termo
    const matchesTermo = 
      termo === "" || 
      cliente.nome.toLowerCase().includes(termo.toLowerCase()) ||
      cliente.cnpj.includes(termo) ||
      (cliente.contatoNome && cliente.contatoNome.toLowerCase().includes(termo.toLowerCase())) ||
      (cliente.contatoEmail && cliente.contatoEmail.toLowerCase().includes(termo.toLowerCase()))

    // Filtro por status (ativo/inativo)
    const matchesAtivo = filtroAtivo === null || cliente.ativo === filtroAtivo

    return matchesTermo && matchesAtivo
  })

  // Ordenar clientes por nome
  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => a.nome.localeCompare(b.nome))

  // Função para formatar CNPJ
  const formatarCNPJ = (cnpj: string) => {
    if (!cnpj) return ""
    
    // Remover caracteres não-numéricos
    const apenasNumeros = cnpj.replace(/\D/g, "")
    
    // Aplicar formatação XX.XXX.XXX/XXXX-XX
    if (apenasNumeros.length === 14) {
      return apenasNumeros.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      )
    }
    
    return cnpj
  }

  // Handler para adição de cliente
  const handleClienteAdded = async (cliente: Partial<Cliente>) => {
    await onClienteAdded(cliente)
    setShowNovoCliente(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Clientes</CardTitle>
          </div>
          <CardDescription>
            Gerencie todos os clientes da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Pesquisar por nome, CNPJ ou contato..."
                  className="pl-8"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Status: {filtroAtivo === null ? "Todos" : filtroAtivo ? "Ativos" : "Inativos"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFiltroAtivo(null)}>
                    Todos
                    {filtroAtivo === null && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFiltroAtivo(true)}>
                    Ativos
                    {filtroAtivo === true && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFiltroAtivo(false)}>
                    Inativos
                    {filtroAtivo === false && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesOrdenados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesOrdenados.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-medium text-left"
                            onClick={() => onClienteClick(cliente.id)}
                          >
                            {cliente.nome}
                          </Button>
                        </TableCell>
                        <TableCell>{formatarCNPJ(cliente.cnpj)}</TableCell>
                        <TableCell>
                          {cliente.contatoNome && (
                            <div className="flex flex-col">
                              <span>{cliente.contatoNome}</span>
                              {cliente.contatoEmail && (
                                <span className="text-xs text-gray-500">{cliente.contatoEmail}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{cliente.segmento}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={cliente.ativo ? "default" : "secondary"}
                            className={cliente.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {cliente.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Abrir menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onClienteClick(cliente.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                if (onEditCliente) {
                                  onEditCliente(cliente);
                                } else {
                                  onClienteEditar(cliente);
                                }
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onClienteDelete(cliente.id)}
                                className="text-red-600"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-3">
          <div className="text-xs text-gray-500">
            Exibindo {clientesOrdenados.length} de {clientes.length} clientes
          </div>
        </CardFooter>
      </Card>

      {/* Modal para adicionar novo cliente */}
      <NovoCliente 
        open={showNovoCliente} 
        onOpenChange={setShowNovoCliente} 
        onClienteAdded={handleClienteAdded}
      />
    </div>
  )
}
