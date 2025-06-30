"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Building, MapPin, Hash, Phone, Mail, User, Users, Pencil, Save, Trash2, Plus, X, Calendar, DollarSign, Maximize2, Minimize2, Eye, Loader2 } from "lucide-react" // Added Loader2
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox" // Added Checkbox
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { useOportunidades } from "@/hooks/comercial/use-oportunidades"
import { Oportunidade, Cliente, ClienteDetalhado, Contato } from "@/types/comercial"
import { useContatos } from "@/hooks/comercial/use-contatos" // Import useContatos

interface DetalhesClienteProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClienteUpdate?: (cliente: Cliente) => void
  onClienteDelete?: (cliente: Cliente) => void
  onOportunidadeClick?: (oportunidade: Oportunidade) => void
}

// Mock data for tipos de cliente
const tiposCliente = ["Órgão Público", "Empresa Privada", "Autarquia", "Fundação", "Outro"]

// Mock data for estados brasileiros
const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", 
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

// Função para obter o label do status da oportunidade
const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    novo_lead: "Novo Lead",
    agendamento_reuniao: "Agendamento de Reunião",
    levantamento_oportunidades: "Levantamento de Oportunidades",
    proposta_enviada: "Proposta Enviada",
    negociacao: "Negociação",
    fechado_ganho: "Fechado (Ganho)",
    fechado_perdido: "Fechado (Perdido)",
  }

  return statusLabels[status] || status
}

// Status colors
const statusColors: Record<string, string> = {
  novo_lead: "bg-blue-100 text-blue-800 border-blue-300",
  agendamento_reuniao: "bg-indigo-100 text-indigo-800 border-indigo-300",
  levantamento_oportunidades: "bg-purple-100 text-purple-800 border-purple-300",
  proposta_enviada: "bg-amber-100 text-amber-800 border-amber-300",
  negociacao: "bg-orange-100 text-orange-800 border-orange-300",
  fechado_ganho: "bg-green-100 text-green-800 border-green-300",
  fechado_perdido: "bg-red-100 text-red-800 border-red-300",
}

export function DetalhesCliente({ cliente, open, onOpenChange, onClienteUpdate, onClienteDelete, onOportunidadeClick }: DetalhesClienteProps) {
  const [activeTab, setActiveTab] = useState("resumo")
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editedCliente, setEditedCliente] = useState<ClienteDetalhado | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [clienteDetalhes, setClienteDetalhes] = useState<ClienteDetalhado | null>(null)
  const [novoContato, setNovoContato] = useState<Partial<Contato>>({ nome: '', cargo: '', email: '', telefone: '', principal: false })
  const [adicionandoContato, setAdicionandoContato] = useState(false)
  const [isSubmittingContato, setIsSubmittingContato] = useState(false)
  const [editandoContato, setEditandoContato] = useState<Contato | null>(null);
  const [showEditarContatoModal, setShowEditarContatoModal] = useState(false);
  const [isSubmittingEditContato, setIsSubmittingEditContato] = useState(false);
  const [contatoParaExcluirId, setContatoParaExcluirId] = useState<string | null>(null);
  const [showConfirmDeleteContatoModal, setShowConfirmDeleteContatoModal] = useState(false);

  const { oportunidades, isLoading: isLoadingOportunidades } = useOportunidades() // Renomeado isLoading para evitar conflito

  const {
    contatos,
    isLoading: isLoadingContatos,
    error: errorContatos,
    fetchContatos,
    createContato,
    updateContato,
    deleteContato
  } = useContatos(clienteDetalhes?.id);

  // Carregar detalhes do cliente quando for aberto
  useEffect(() => {
    if (open && cliente) {
      const detalhes: ClienteDetalhado = {
        id: cliente.id || "",
        nome: cliente.nome,
        cnpj: cliente.cnpj || "",
        endereco: cliente.endereco || "",
        segmento: cliente.segmento || "",
        // Campos de contato principal são removidos daqui, serão gerenciados pelo hook useContatos
        contatoNome: "", // Será preenchido pelo contato principal do hook se necessário
        contatoEmail: "",
        contatoTelefone: "",
        dataCadastro: cliente.dataCadastro || new Date().toISOString(),
        ativo: cliente.ativo !== undefined ? cliente.ativo : true,
        tipo: (cliente as any).tipo || "Empresa Privada",
        cidade: (cliente as any).cidade || "",
        estado: (cliente as any).estado || "",
        contatos: [], // Será populado pelo hook useContatos
        responsavelInterno: (cliente as any).responsavelInterno || "",
        descricao: (cliente as any).descricao || "",
        observacoes: (cliente as any).observacoes || "",
        faturamento: (cliente as any).faturamento || "",
        oportunidades: [] // Será populado abaixo
      };
      setClienteDetalhes(detalhes);
      setEditedCliente(detalhes); // Inicializa editedCliente também
    }
  }, [open, cliente]);

  // Atualizar oportunidades do cliente
  useEffect(() => {
    if (clienteDetalhes && cliente) {
      setClienteDetalhes(prev => ({
        ...prev!,
        oportunidades: oportunidades.filter(op => 
          op.cliente === cliente.nome || op.clienteId === cliente.id
        )
      }));
      setEditedCliente(prev => ({
        ...prev!,
        oportunidades: oportunidades.filter(op =>
          op.cliente === cliente.nome || op.clienteId === cliente.id
        )
      }));
    }
  }, [cliente, clienteDetalhes?.id, oportunidades]); // Dependência em clienteDetalhes.id para re-filtrar se o ID mudar

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  // Formatar data completa com horário
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }

  // Editar cliente
  const handleEditClick = () => {
    setIsEditing(true)
  }

  // Salvar alterações
  const handleSaveClick = () => {
    if (!editedCliente) return

    // Simulação de update
    setClienteDetalhes(editedCliente)
    setIsEditing(false)

    // Notificar componente pai
    if (onClienteUpdate && editedCliente) {
      onClienteUpdate(editedCliente)
    }

    toast({
      title: "Cliente atualizado",
      description: "Os dados do cliente foram atualizados com sucesso.",
    })
  }

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditedCliente(clienteDetalhes)
    setIsEditing(false)
  }

  // Confirmação para excluir cliente
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  // Confirmar exclusão
  const handleConfirmDelete = () => {
    if (clienteDetalhes && onClienteDelete) {
      onClienteDelete(clienteDetalhes)
    }
    setShowDeleteConfirm(false)
    onOpenChange(false)
    
    // Toast é exibido pelo componente pai que implementa a exclusão
  }

  // Adicionar contato
  const handleAddContato = async () => {
    if (!clienteDetalhes?.id || !novoContato.nome || !novoContato.email) {
      toast({ title: "Erro", description: "Nome e Email do contato são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmittingContato(true);
    try {
      await createContato({
        clienteId: clienteDetalhes.id,
        nome: novoContato.nome,
        cargo: novoContato.cargo || '',
        email: novoContato.email,
        telefone: novoContato.telefone || '',
        principal: novoContato.principal || false,
      });
      toast({ title: "Sucesso", description: "Contato adicionado." });
      setNovoContato({ nome: '', cargo: '', email: '', telefone: '', principal: false });
      setAdicionandoContato(false);
      // fetchContatos(clienteDetalhes.id); // O hook deve atualizar a lista, mas pode forçar se necessário
    } catch (error) {
      console.error("Erro ao adicionar contato:", error);
      toast({ title: "Erro", description: `Não foi possível adicionar o contato: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingContato(false);
    }
  };

  // Remover contato
  const handleRemoveContatoClick = (id: string) => {
    setContatoParaExcluirId(id);
    setShowConfirmDeleteContatoModal(true);
  };

  const handleConfirmDeleteContato = async () => {
    if (!contatoParaExcluirId) return;
    try {
      await deleteContato(contatoParaExcluirId);
      toast({ title: "Sucesso", description: "Contato excluído." });
      setContatoParaExcluirId(null);
      setShowConfirmDeleteContatoModal(false);
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
      toast({ title: "Erro", description: `Não foi possível excluir o contato: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    }
  };

  // Editar contato
  const handleEditContatoClick = (contato: Contato) => {
    setEditandoContato(contato);
    setShowEditarContatoModal(true);
  };

  const handleUpdateContato = async (dadosAtualizados: Partial<Contato>) => {
    if (!editandoContato || !editandoContato.id) return;
    setIsSubmittingEditContato(true);
    try {
      // Garante que `principal` seja booleano
      const payload = {
        ...dadosAtualizados,
        principal: !!dadosAtualizados.principal,
      };
      await updateContato(editandoContato.id, payload);
      toast({ title: "Sucesso", description: "Contato atualizado." });
      setShowEditarContatoModal(false);
      setEditandoContato(null);
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      toast({ title: "Erro", description: `Não foi possível atualizar o contato: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingEditContato(false);
    }
  };

  // Toggle para expandir/retrair o painel
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={true}>
        <SheetContent 
          side="right" 
          className={`p-0 ${isExpanded ? 'w-full md:max-w-4xl' : 'w-full md:max-w-2xl'}`}
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                <span>{clienteDetalhes?.nome || "Detalhes do Cliente"}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleExpanded}>
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </SheetTitle>
          </SheetHeader>

          {clienteDetalhes ? (
            <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 mx-6 mt-4 sticky top-0 z-10 bg-white">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="informacoes">Informações</TabsTrigger>
                  <TabsTrigger value="contatos">Contatos</TabsTrigger>
                  <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
                </TabsList>
  
                {/* Aba de Resumo */}
                <TabsContent value="resumo" className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Dados Gerais</h3>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <Building className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <Input
                                  className="text-sm font-medium"
                                  value={editedCliente?.nome || ''}
                                  onChange={e => setEditedCliente(editedCliente && { ...editedCliente, nome: e.target.value })}
                                  placeholder="Nome do Cliente"
                                />
                                <Select
                                  value={editedCliente?.tipo || ''}
                                  onValueChange={value => setEditedCliente(editedCliente && { ...editedCliente, tipo: value })}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Tipo de Cliente" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tiposCliente.map(tipo => (
                                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <Hash className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <Input
                                className="text-sm"
                                value={editedCliente?.cnpj || ''}
                                onChange={e => setEditedCliente(editedCliente && { ...editedCliente, cnpj: e.target.value })}
                                placeholder="CNPJ"
                              />
                            </div>
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <Input
                                  className="text-sm"
                                  value={editedCliente?.endereco || ''}
                                  onChange={e => setEditedCliente(editedCliente && { ...editedCliente, endereco: e.target.value })}
                                  placeholder="Endereço"
                                />
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    className="text-xs"
                                    value={editedCliente?.cidade || ''}
                                    onChange={e => setEditedCliente(editedCliente && { ...editedCliente, cidade: e.target.value })}
                                    placeholder="Cidade"
                                  />
                                  <Select
                                    value={editedCliente?.estado || ''}
                                    onValueChange={value => setEditedCliente(editedCliente && { ...editedCliente, estado: value })}
                                  >
                                    <SelectTrigger className="text-xs w-20">
                                      <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {estados.map(uf => (
                                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <DollarSign className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <Input
                                className="text-sm"
                                value={editedCliente?.segmento || ''}
                                onChange={e => setEditedCliente(editedCliente && { ...editedCliente, segmento: e.target.value })}
                                placeholder="Segmento"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <Building className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{clienteDetalhes.nome}</p>
                                <p className="text-xs text-muted-foreground">{clienteDetalhes.tipo}</p>
                              </div>
                            </div>
                            {clienteDetalhes.cnpj && (
                              <div className="flex items-start">
                                <Hash className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">{clienteDetalhes.cnpj}</p>
                                  <p className="text-xs text-muted-foreground">CNPJ</p>
                                </div>
                              </div>
                            )}
                            {clienteDetalhes.endereco && (
                              <div className="flex items-start">
                                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">{clienteDetalhes.endereco}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {[clienteDetalhes.cidade, clienteDetalhes.estado].filter(Boolean).join(' - ')}
                                  </p>
                                </div>
                              </div>
                            )}
                            {clienteDetalhes.segmento && (
                              <div className="flex items-start">
                                <DollarSign className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">{clienteDetalhes.segmento}</p>
                                  <p className="text-xs text-muted-foreground">Segmento</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Contatos Principais</h3>
                        {isLoadingContatos ? <p className="text-sm text-muted-foreground">Carregando contatos...</p> :
                         contatos && contatos.filter(c => c.principal).length > 0 ? (
                          <div className="space-y-3">
                            {contatos.filter(c => c.principal).slice(0, 2).map((contato) => (
                              <div key={contato.id} className="flex items-start">
                                <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{contato.nome}</p>
                                  <p className="text-xs text-muted-foreground">{contato.cargo}</p>
                                  <div className="flex items-center mt-1 space-x-2">
                                    {contato.email && (
                                      <div className="flex items-center text-xs">
                                        <Mail className="h-3 w-3 mr-1" />
                                        <span>{contato.email}</span>
                                      </div>
                                    )}
                                    {contato.telefone && (
                                      <div className="flex items-center text-xs">
                                        <Phone className="h-3 w-3 mr-1" />
                                        <span>{contato.telefone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {contatos.filter(c => c.principal).length > 2 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs mt-1"
                                onClick={() => setActiveTab("contatos")}
                              >
                                Ver todos os contatos
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Oportunidades Recentes</h3>
                        {clienteDetalhes.oportunidades && clienteDetalhes.oportunidades.length > 0 ? (
                          <div className="space-y-3">
                            {clienteDetalhes.oportunidades.slice(0, 3).map((oportunidade) => (
                              <div 
                                key={oportunidade.id} 
                                className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                                onClick={() => onOportunidadeClick && onOportunidadeClick(oportunidade)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-medium">{oportunidade.titulo}</p>
                                    <p className="text-xs text-muted-foreground">{oportunidade.responsavel}</p>
                                    <div className="flex items-center mt-1">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${statusColors[oportunidade.status] || 'bg-gray-100'}`}
                                      >
                                        {getStatusLabel(oportunidade.status)}
                                      </Badge>
                                      <span className="text-xs ml-2">{oportunidade.valor}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-right">
                                    <div>Prazo: {oportunidade.prazo}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {clienteDetalhes.oportunidades.length > 3 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs mt-1"
                                onClick={() => setActiveTab("oportunidades")}
                              >
                                Ver todas as oportunidades
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhuma oportunidade cadastrada</p>
                        )}
                      </CardContent>
                    </Card>

                    {clienteDetalhes.descricao && (
                      <Card className="md:col-span-2">
                        <CardContent className="p-4">
                          <h3 className="text-base font-semibold mb-2">Descrição</h3>
                          <p className="text-sm whitespace-pre-line">{clienteDetalhes.descricao}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-6 flex justify-end space-x-2">
                      <Button variant="success" onClick={handleSaveClick}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleEditClick}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar Cliente
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteClick}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Cliente
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Aba de Informações */}
                <TabsContent value="informacoes" className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Dados Gerais</h3>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Building className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{clienteDetalhes.nome}</p>
                              <p className="text-xs text-muted-foreground">{clienteDetalhes.tipo}</p>
                            </div>
                          </div>
                          
                          {clienteDetalhes.cnpj && (
                            <div className="flex items-start">
                              <Hash className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="text-sm">{clienteDetalhes.cnpj}</p>
                                <p className="text-xs text-muted-foreground">CNPJ</p>
                              </div>
                            </div>
                          )}
                          
                          {clienteDetalhes.endereco && (
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="text-sm">{clienteDetalhes.endereco}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[clienteDetalhes.cidade, clienteDetalhes.estado].filter(Boolean).join(' - ')}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {clienteDetalhes.segmento && (
                            <div className="flex items-start">
                              <DollarSign className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="text-sm">{clienteDetalhes.segmento}</p>
                                <p className="text-xs text-muted-foreground">Segmento</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Responsável Interno</h3>
                        <p className="text-sm">{clienteDetalhes.responsavelInterno}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Observações</h3>
                        <p className="text-sm whitespace-pre-line">{clienteDetalhes.observacoes}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3">Faturamento</h3>
                        <p className="text-sm">{clienteDetalhes.faturamento}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Aba de Contatos */}
                <TabsContent value="contatos" className="px-6 py-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Lista de Contatos</h3>
                    <Button size="sm" onClick={() => setAdicionandoContato(true)} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </div>

                  {adicionandoContato && (
                    <Card className="p-4">
                      <h4 className="text-md font-medium mb-2">Novo Contato</h4>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <Label htmlFor="novo-contato-nome">Nome*</Label>
                          <Input id="novo-contato-nome" value={novoContato.nome || ''} onChange={e => setNovoContato(prev => ({ ...prev, nome: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="novo-contato-cargo">Cargo</Label>
                          <Input id="novo-contato-cargo" value={novoContato.cargo || ''} onChange={e => setNovoContato(prev => ({ ...prev, cargo: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="novo-contato-email">Email*</Label>
                          <Input type="email" id="novo-contato-email" value={novoContato.email || ''} onChange={e => setNovoContato(prev => ({ ...prev, email: e.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="novo-contato-telefone">Telefone</Label>
                          <Input id="novo-contato-telefone" value={novoContato.telefone || ''} onChange={e => setNovoContato(prev => ({ ...prev, telefone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="novo-contato-principal"
                          checked={novoContato.principal}
                          onCheckedChange={checked => setNovoContato(prev => ({ ...prev, principal: !!checked }))} />
                        <Label htmlFor="novo-contato-principal" className="font-normal">Contato Principal</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => { setAdicionandoContato(false); setNovoContato({ nome: '', cargo: '', email: '', telefone: '', principal: false }); }}>Cancelar</Button>
                        <Button size="sm" onClick={handleAddContato} disabled={isSubmittingContato}>
                          {isSubmittingContato ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                          Salvar Contato
                        </Button>
                      </div>
                    </Card>
                  )}

                  {isLoadingContatos && (
                     <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="ml-2 text-muted-foreground">Carregando contatos...</p>
                    </div>
                  )}
                  {errorContatos && <p className="text-red-500 text-sm">Erro ao carregar contatos: {errorContatos}</p>}

                  {!isLoadingContatos && !errorContatos && contatos.length > 0 ? (
                    <div className="space-y-3">
                      {contatos.map((contato) => (
                        <Card key={contato.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-base font-medium">{contato.nome} {contato.principal && <Badge variant="outline" className="ml-2 border-green-500 text-green-700">Principal</Badge>}</h4>
                                <p className="text-xs text-muted-foreground">{contato.cargo}</p>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditContatoClick(contato)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveContatoClick(contato.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center text-xs space-x-4 mt-2">
                              {contato.email && (
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <a href={`mailto:${contato.email}`} className="hover:underline">{contato.email}</a>
                                </div>
                              )}
                              {contato.telefone && (
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span>{contato.telefone}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    !isLoadingContatos && !errorContatos && <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato cadastrado para este cliente.</p>
                  )}
                </TabsContent>

                {/* Aba de Oportunidades */}
                <TabsContent value="oportunidades" className="px-6 py-4">
                  {clienteDetalhes.oportunidades && clienteDetalhes.oportunidades.length > 0 ? (
                    <div className="space-y-3">
                      {clienteDetalhes.oportunidades.map((oportunidade) => (
                        <Card 
                          key={oportunidade.id} 
                          className="hover:border-primary cursor-pointer transition-colors"
                          onClick={() => onOportunidadeClick && onOportunidadeClick(oportunidade)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-base font-medium">{oportunidade.titulo}</h4>
                                <p className="text-xs text-muted-foreground">{oportunidade.responsavel}</p>
                                <div className="flex items-center mt-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${statusColors[oportunidade.status] || 'bg-gray-100'}`}
                                  >
                                    {getStatusLabel(oportunidade.status)}
                                  </Badge>
                                  <span className="text-xs ml-2">{oportunidade.valor}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="text-xs text-right">Prazo: {oportunidade.prazo}</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 text-blue-600 p-0 h-auto flex items-center hover:text-blue-800 hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Evitar que o clique propague para o Card
                                    onOportunidadeClick && onOportunidadeClick(oportunidade);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Visualizar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma oportunidade cadastrada</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
              <p className="text-muted-foreground">Carregando detalhes do cliente...</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              <span className="font-semibold"> {clienteDetalhes?.nome}</span> e todos os
              seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação de exclusão de CONTATO */}
      <AlertDialog open={showConfirmDeleteContatoModal} onOpenChange={setShowConfirmDeleteContatoModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContatoParaExcluirId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteContato}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Contato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal/Dialog para Editar Contato */}
      {showEditarContatoModal && editandoContato && (
        <Dialog open={showEditarContatoModal} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditandoContato(null);
          }
          setShowEditarContatoModal(isOpen);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Contato</DialogTitle>
              <DialogDescription>Modifique os dados do contato abaixo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contato-nome" className="text-right">Nome*</Label>
                <Input id="edit-contato-nome" value={editandoContato.nome || ''} onChange={e => setEditandoContato(prev => prev ? { ...prev, nome: e.target.value } : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contato-cargo" className="text-right">Cargo</Label>
                <Input id="edit-contato-cargo" value={editandoContato.cargo || ''} onChange={e => setEditandoContato(prev => prev ? { ...prev, cargo: e.target.value } : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contato-email" className="text-right">Email*</Label>
                <Input type="email" id="edit-contato-email" value={editandoContato.email || ''} onChange={e => setEditandoContato(prev => prev ? { ...prev, email: e.target.value } : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contato-telefone" className="text-right">Telefone</Label>
                <Input id="edit-contato-telefone" value={editandoContato.telefone || ''} onChange={e => setEditandoContato(prev => prev ? { ...prev, telefone: e.target.value } : null)} className="col-span-3" />
              </div>
              <div className="flex items-center space-x-2 col-start-2 col-span-3">
                <Checkbox
                  id="edit-contato-principal"
                  checked={editandoContato.principal}
                  onCheckedChange={checked => setEditandoContato(prev => prev ? { ...prev, principal: !!checked } : null)} />
                <Label htmlFor="edit-contato-principal" className="font-normal">Contato Principal</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEditarContatoModal(false); setEditandoContato(null); }}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (editandoContato) {
                    const { id, clienteId, createdAt, updatedAt, ...dadosParaAtualizar } = editandoContato;
                    handleUpdateContato(dadosParaAtualizar);
                  }
                }}
                disabled={isSubmittingEditContato}
              >
                {isSubmittingEditContato ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
