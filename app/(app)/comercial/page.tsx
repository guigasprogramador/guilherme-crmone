"use client"

import { useState, useEffect, useMemo, useCallback } from "react" // Adicionado useCallback
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MoreHorizontal, Edit, Trash, Mail, Phone, Calendar, CheckCircle, XCircle, AlertTriangle, FileText, Download, Share2, Users as UsersIcon, PlusCircle as PlusCircleIcon, Loader2 } from "lucide-react" // Adicionado UsersIcon, PlusCircleIcon, Loader2
import { DetalhesOportunidade } from "@/components/detalhes-oportunidade"
import { DetalhesCliente } from "@/components/detalhes-cliente"
import { FiltroOportunidadesOtimizado, OportunidadeFiltros } from "@/components/comercial/filtro-oportunidades-otimizado"
import { NovaOportunidade } from "@/components/nova-oportunidade"
import { KanbanBoard } from "@/components/comercial/kanban-board"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";

import { toast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from 'uuid';
// import { format } from 'date-fns'; // Removido se não usado diretamente aqui

import { useOportunidades, useClientes, useResponsaveis } from "@/hooks/comercial"
import { Oportunidade, Cliente as ClienteTipo, Responsavel, OportunidadeStatus } from "@/types/comercial" // Adicionado Responsavel
import { AgendarReuniao } from "@/components/comercial/agendar-reuniao"
import { EditarOportunidade } from "@/components/comercial/editar-oportunidade"
import { ListaClientes } from "@/components/comercial/lista-clientes"
import { EditarCliente } from "@/components/comercial/editar-cliente"
import { FormResponsavelModal } from "@/components/comercial/form-responsavel-modal" // Importar o novo modal

import { useEstatisticas } from "@/hooks/comercial";
import { NovoCliente } from "@/components/comercial/novo-cliente";
import { Badge } from "@/components/ui/badge";

export default function ComercialPage() {
  const { estatisticas, fetchEstatisticas, setEstatisticas } = useEstatisticas();
  const {
    oportunidades,
    isLoading: isLoadingOportunidades,
    error: errorOportunidades,
    fetchOportunidades,
    getOportunidade,
    createOportunidade,
    updateOportunidade,
    updateOportunidadeStatus,
    deleteOportunidade,
  } = useOportunidades();

  const {
    clientes,
    isLoading: isLoadingClientes,
    error: errorClientes,
    // getCliente, // Removido se não usado diretamente
    createCliente,
    fetchClientes,
    updateCliente, // Adicionado do hook
    deleteCliente // Adicionado do hook
  } = useClientes();

  const {
    responsaveis,
    isLoading: isLoadingResponsaveis,
    error: errorResponsaveis,
    fetchResponsaveis,
    // createResponsavel, // Será usado pelo FormResponsavelModal
    // updateResponsavel, // Será usado pelo FormResponsavelModal
    deleteResponsavel,
  } = useResponsaveis();

  const [filteredOportunidades, setFilteredOportunidades] = useState<Oportunidade[]>([])
  const [activeTab, setActiveTab] = useState("lista")
  const [selectedOportunidade, setSelectedOportunidade] = useState<Oportunidade | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<ClienteTipo | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [clienteDetailsOpen, setClienteDetailsOpen] = useState(false)
  // const [activeFilters, setActiveFilters] = useState(0) // Removido se não usado
  const [showNovaOportunidade, setShowNovaOportunidade] = useState(false)
  // const [showEditarOportunidade, setShowEditarOportunidade] = useState(false) // Controlado por tempOportunidade e showEditarModal
  const [showConfirmDeleteOportunidade, setShowConfirmDeleteOportunidade] = useState(false)
  const [oportunidadeToDeleteId, setOportunidadeToDeleteId] = useState<string | null>(null)
  
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [showEditarOportunidadeModal, setShowEditarOportunidadeModal] = useState(false)
  const [oportunidadeParaAcao, setOportunidadeParaAcao] = useState<Oportunidade | null>(null)

  // const [clientesList, setClientesList] = useState<ClienteTipo[]>([]) // Usar 'clientes' do hook
  const [clienteParaEditar, setClienteParaEditar] = useState<ClienteTipo | null>(null);
  const [showEditarClienteModal, setShowEditarClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [clienteParaExcluirId, setClienteParaExcluirId] = useState<string | null>(null);
  const [showConfirmDeleteCliente, setShowConfirmDeleteCliente] = useState(false);


  // Estados para Responsáveis
  const [showResponsavelModal, setShowResponsavelModal] = useState(false);
  const [responsavelParaEditar, setResponsavelParaEditar] = useState<Responsavel | null>(null);
  const [responsavelParaExcluirId, setResponsavelParaExcluirId] = useState<string | null>(null);
  const [showConfirmDeleteResponsavel, setShowConfirmDeleteResponsavel] = useState(false);


  useEffect(() => {
    setFilteredOportunidades(oportunidades);
  }, [oportunidades]);

  useEffect(() => {
    const carregarDados = async () => {
      // setLoading(true); // O hook useLicitacoesOtimizado tem seu próprio isLoading
      try {
        await Promise.all([
          fetchOportunidades(),
          fetchClientes(),
          fetchEstatisticas(),
          fetchResponsaveis() // Carregar responsáveis
        ]);
      } catch (error) {
        toast({ title: "Erro ao carregar dados", description: "Tente novamente.", variant: "destructive" });
      } finally {
        // setLoading(false);
      }
    };
    carregarDados();
  }, [fetchOportunidades, fetchClientes, fetchEstatisticas, fetchResponsaveis]); // Adicionado fetchResponsaveis


  const handleFilterChange = (filtros: OportunidadeFiltros) => {
    // Corrige tipos: converte valorMinimo/valorMaximo para número se necessário
    const filtrosCorrigidos = {
      ...filtros,
      valorMinimo: filtros.valorMinimo ? Number(filtros.valorMinimo) : undefined,
      valorMaximo: filtros.valorMaximo ? Number(filtros.valorMaximo) : undefined,
    };
    fetchOportunidades(filtrosCorrigidos);
    // Contagem de filtros ativos pode ser feita aqui se necessário
  };

  const handleOportunidadeAdded = async (oportunidadeData: any) => {
    // A oportunidade já foi criada pelo componente NovaOportunidade
    // Recarregamos a lista para mostrar a nova oportunidade
    await fetchOportunidades();
    
    // Atualizar estatísticas após criação
    await fetchEstatisticas();
    
    // Fechamos o modal após atualizar a lista
    setShowNovaOportunidade(false);
    toast({ title: "Oportunidade criada", description: "A oportunidade foi criada com sucesso." });
  };

  const handleClienteAdded = async (clienteData: Partial<ClienteTipo>) => {
    try {
      await createCliente(clienteData); // Hook já atualiza a lista
      setShowNovoClienteModal(false);
      toast({ title: "Cliente criado", description: "O cliente foi criado com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar cliente.", variant: "destructive" });
    }
  };

  const handleOportunidadeUpdated = async (id: string, data: Partial<Oportunidade>) => {
    try {
      const updated = await updateOportunidade(id, data); // Hook já atualiza a lista
      
      // Atualizar estatísticas após atualização
      await fetchEstatisticas();
      
      setSelectedOportunidade(updated); // Atualiza o selecionado para refletir na UI de detalhes
      setShowEditarOportunidadeModal(false);
      toast({ title: "Oportunidade atualizada", description: "A oportunidade foi atualizada com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar oportunidade.", variant: "destructive" });
    }
  };

  const handleClienteUpdated = async (id: string, data: Partial<ClienteTipo>) => {
    try {
        await updateCliente(id, data); // Hook já atualiza a lista
        setShowEditarClienteModal(false);
        setClienteParaEditar(null);
        toast({ title: "Cliente atualizado", description: "Cliente atualizado com sucesso." });
    } catch (error) {
        toast({ title: "Erro ao atualizar cliente", description: `${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    }
  };


  const handleDeleteOportunidadeClick = (oportunidadeId: string) => {
    setOportunidadeToDeleteId(oportunidadeId);
    setShowConfirmDeleteOportunidade(true);
  };

  const confirmDeleteOportunidade = async () => {
    if (!oportunidadeToDeleteId) return;
    try {
      await deleteOportunidade(oportunidadeToDeleteId); // Hook já atualiza a lista
      
      // Atualizar estatísticas após exclusão
      await fetchEstatisticas();
      
      if (selectedOportunidade?.id === oportunidadeToDeleteId) {
        setSelectedOportunidade(null);
        setDetailsOpen(false);
      }
      toast({ title: "Oportunidade excluída", description: "A oportunidade foi excluída com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir oportunidade.", variant: "destructive" });
    } finally {
      setShowConfirmDeleteOportunidade(false);
      setOportunidadeToDeleteId(null);
    }
  };

  const handleDeleteClienteClick = async (clienteId: string) => {
    setClienteParaExcluirId(clienteId);
    setShowConfirmDeleteCliente(true);
  };

  const confirmDeleteCliente = async () => {
      if (!clienteParaExcluirId) return;
      try {
          await deleteCliente(clienteParaExcluirId); // Hook já atualiza a lista
          if (selectedCliente?.id === clienteParaExcluirId) {
              setSelectedCliente(null);
              setClienteDetailsOpen(false);
          }
          toast({ title: "Cliente excluído", description: "Cliente excluído com sucesso." });
      } catch (error) {
          toast({ title: "Erro ao excluir cliente", description: `${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
      } finally {
          setShowConfirmDeleteCliente(false);
          setClienteParaExcluirId(null);
      }
  };

  const handleUpdateOportunidadeStatus = async (id: string, newStatus: OportunidadeStatus) => {
    try {
      await updateOportunidadeStatus(id, newStatus); // Hook já atualiza a lista
      
      // Atualizar estatísticas após mudança de status
      await fetchEstatisticas();
      
      if (selectedOportunidade?.id === id) {
        setSelectedOportunidade(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast({ title: "Status atualizado", description: "Status da oportunidade atualizado." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar status.", variant: "destructive" });
    }
  };

  const handleOportunidadeClick = async (oportunidadeId: string) => {
    setClienteDetailsOpen(false); // Garante que o modal de cliente feche
    const oportunidade = await getOportunidade(oportunidadeId); // Busca a versão mais recente
    if (oportunidade) {
      setSelectedOportunidade(oportunidade);
      setDetailsOpen(true);
    } else {
      toast({ title: "Erro", description: "Oportunidade não encontrada.", variant: "destructive" });
    }
  };

  const handleClienteListClick = async (clienteId: string) => {
    setDetailsOpen(false); // Garante que o modal de oportunidade feche
    const cliente = clientes.find(c => c.id === clienteId); // Busca na lista atual
    if (cliente) {
      setSelectedCliente(cliente);
      setClienteDetailsOpen(true);
    } else {
      toast({ title: "Erro", description: "Cliente não encontrado.", variant: "destructive" });
    }
  };

  // Funções para Responsáveis
  const handleOpenNovoResponsavelModal = () => {
    setResponsavelParaEditar(null);
    setShowResponsavelModal(true);
  };

  const handleOpenEditarResponsavelModal = (responsavel: Responsavel) => {
    setResponsavelParaEditar(responsavel);
    setShowResponsavelModal(true);
  };

  const handleResponsavelSalvo = () => {
    fetchResponsaveis(); // Recarrega a lista de responsáveis
  };

  const handleDeleteResponsavelClick = (responsavelId: string) => {
    setResponsavelParaExcluirId(responsavelId);
    setShowConfirmDeleteResponsavel(true);
  };

  const confirmDeleteResponsavel = async () => {
    if (!responsavelParaExcluirId) return;
    try {
      await deleteResponsavel(responsavelParaExcluirId); // Hook já atualiza a lista
      toast({ title: "Status do Responsável Alterado", description: "O status do responsável foi alterado." });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao alterar status do responsável.", variant: "destructive" });
    } finally {
      setShowConfirmDeleteResponsavel(false);
      setResponsavelParaExcluirId(null);
    }
  };

  const formatarValorMonetario = (valor?: number | string | null): string => {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    let numValor = typeof valor === 'string' ? parseFloat(valor.replace(/\./g, '').replace(',', '.')) : valor;
    if (isNaN(numValor)) return 'N/A';
    return `R$ ${numValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatarValorCompacto = (valor?: number | string | null): string => {
    if (valor === null || valor === undefined) return 'R$ 0';
    let numValor = typeof valor === 'string' ? parseFloat(valor.replace(/\./g, '').replace(',', '.')) : valor;
    if (isNaN(numValor)) return 'N/A';
    if (numValor >= 1000000) return `R$ ${(numValor / 1000000).toFixed(1)}M`;
    if (numValor >= 1000) return `R$ ${(numValor / 1000).toFixed(0)}K`;
    return `R$ ${numValor.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`;
  };

  // Funções de ação para DropdownMenu (oportunidade)
  const handleEditOportunidade = (oportunidade: Oportunidade) => {
    setOportunidadeParaAcao(oportunidade);
    setShowEditarOportunidadeModal(true);
  };
  const handleActionAgendarReuniao = (oportunidade: Oportunidade) => {
    setOportunidadeParaAcao(oportunidade);
    setShowMeetingModal(true);
  };
   const handleActionExcluirOportunidade = (oportunidadeId: string) => {
    handleDeleteOportunidadeClick(oportunidadeId);
  };

  const refetchSelectedOportunidade = useCallback(async () => {
    if (selectedOportunidade?.id) {
      const updatedOpp = await getOportunidade(selectedOportunidade.id);
      if (updatedOpp) {
        setSelectedOportunidade(updatedOpp);
      } else { // Se não encontrar mais (ex: foi arquivada/deletada por outro user), fecha o modal
        setDetailsOpen(false);
        setSelectedOportunidade(null);
      }
    }
  }, [selectedOportunidade, getOportunidade]);


  return (
    <div className="p-2 sm:p-4 md:p-6 overflow-x-auto max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Comercial</h1>
      {/* ... (Cards de estatísticas) ... */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-8">
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{(estatisticas?.totalOportunidades !== undefined && estatisticas?.totalOportunidades !== null) ? estatisticas.totalOportunidades : oportunidades.filter(op => op.status !== 'fechado_ganho' && op.status !== 'fechado_perdido').length || 0}</div><div className="text-sm text-muted-foreground">Leads em aberto</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{estatisticas?.estatisticasPorStatus?.fechado_ganho || 0}</div><div className="text-sm text-muted-foreground">Propostas aceitas</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{formatarValorCompacto(estatisticas?.valorTotalNegociacao) || 'R$ 0'}</div><div className="text-sm text-muted-foreground">Total em negociação</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{estatisticas?.taxaConversao ? `${estatisticas.taxaConversao}%` : '0%'}</div><div className="text-sm text-muted-foreground">Taxa de conversão</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{clientes.filter(c => c.ativo).length}</div><div className="text-sm text-muted-foreground">Clientes Ativos</div></CardContent></Card>
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 z-20 bg-[#f5f5f5] pt-2 pb-2 sm:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 sm:mb-4 border-b border-gray-200">
            <TabsList className="flex flex-wrap gap-1">
              <TabsTrigger value="lista" className="text-xs sm:text-sm px-2 sm:px-3 py-1">Oportunidades</TabsTrigger>
              <TabsTrigger value="kanban" className="text-xs sm:text-sm px-2 sm:px-3 py-1">Kanban</TabsTrigger>
              <TabsTrigger value="clientes" className="text-xs sm:text-sm px-2 sm:px-3 py-1">Clientes</TabsTrigger>
              <TabsTrigger value="responsaveis" className="text-xs sm:text-sm px-2 sm:px-3 py-1">Responsáveis</TabsTrigger> {/* Nova Aba */}
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              <FiltroOportunidadesOtimizado onFilterChange={handleFilterChange} clientes={clientes.map(c => c.nome)} responsaveis={responsaveis.map(r => r.nome)} />
              <Button size="sm" className="min-w-[120px]" onClick={() => setShowNovoClienteModal(true)}><PlusCircleIcon className="w-4 h-4 mr-2"/>Novo Cliente</Button>
              <Button size="sm" className="min-w-[140px]" onClick={() => setShowNovaOportunidade(true)}><PlusCircleIcon className="w-4 h-4 mr-2"/>Nova Oportunidade</Button>
            </div>
          </div>

          <TabsContent value="lista">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr className="border-b">
          <th className="p-3 text-left font-medium">Título</th>
          <th className="p-3 text-left font-medium hidden md:table-cell">Cliente</th>
          <th className="p-3 text-left font-medium hidden sm:table-cell">Status</th>
          <th className="p-3 text-left font-medium hidden sm:table-cell">Valor</th>
          <th className="p-3 text-right font-medium">Ações</th>
        </tr>
      </thead>
      <tbody>
        {isLoadingOportunidades ? (
          <tr><td colSpan={5} className="p-6 text-center"><Loader2 className="inline-block mr-2 animate-spin"/>Carregando...</td></tr>
        ) : errorOportunidades ? (
          <tr><td colSpan={5} className="p-6 text-center text-red-500">{errorOportunidades}</td></tr>
        ) : filteredOportunidades.length === 0 ? (
          <tr><td colSpan={5} className="p-6 sm:p-8 text-center text-muted-foreground">Nenhuma oportunidade encontrada.</td></tr>
        ) : (
          filteredOportunidades.map((op) => (
            <tr key={op.id} className="border-b hover:bg-muted/20 transition-colors duration-150">
              <td className="p-2 sm:p-3 md:p-4 cursor-pointer max-w-[120px] truncate" title={op.titulo} onClick={() => handleOportunidadeClick(op.id)}>{op.titulo}</td>
              <td className="p-2 sm:p-3 md:p-4 hidden md:table-cell max-w-[90px] truncate" title={op.cliente}>{op.cliente || '-'}</td>
              <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell"><StatusBadge status={op.status} /></td>
              <td className="p-2 sm:p-3 md:p-4 hidden sm:table-cell">{formatarValorMonetario(op.valor || op.valorNegociado || 0)}</td>
              <td className="p-2 sm:p-3 md:p-4 text-right flex flex-row gap-1 sm:gap-2 items-center justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditOportunidade(op)}><Edit className="h-4 w-4"/></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleActionExcluirOportunidade(op.id)}><Trash className="h-4 w-4 text-destructive"/></Button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</TabsContent>
<TabsContent value="kanban">
  <KanbanBoard
    oportunidades={filteredOportunidades}
    onOportunidadeClick={handleOportunidadeClick}
    onEditOportunidade={handleEditOportunidade}
    onDeleteOportunidade={handleActionExcluirOportunidade}
    onUpdateStatus={(id, newStatus) => { handleUpdateOportunidadeStatus(id, newStatus as any); }}
    isLoading={isLoadingOportunidades}
  />
</TabsContent>
          <TabsContent value="clientes">
            <ListaClientes 
              clientes={clientes} 
              error={errorClientes} 
              onClienteClick={handleClienteListClick} 
              onEditCliente={setClienteParaEditar} 
              onClienteDelete={handleDeleteClienteClick}
              onClienteAdded={handleClienteAdded}
              onClienteEditar={(cliente) => {
                setClienteParaEditar(cliente);
                setShowEditarClienteModal(true);
              }}
            />
          </TabsContent>

          {/* Conteúdo da Aba Responsáveis */}
          <TabsContent value="responsaveis" className="mt-2 sm:mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 sm:mb-4">
                <h2 className="text-lg font-semibold">Gestão de Responsáveis</h2>
                <Button size="sm" onClick={handleOpenNovoResponsavelModal}><PlusCircleIcon className="w-4 h-4 mr-2"/>Novo Responsável</Button>
            </div>
            {isLoadingResponsaveis && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin"/> Carregando...</div>}
            {errorResponsaveis && <p className="text-red-500 text-sm">Erro ao carregar responsáveis: {errorResponsaveis}</p>}
            {!isLoadingResponsaveis && !errorResponsaveis && (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b">
                                        <th className="p-3 text-left font-medium">Nome</th>
                                        <th className="p-3 text-left font-medium hidden md:table-cell">Email</th>
                                        <th className="p-3 text-left font-medium hidden sm:table-cell">Cargo</th>
                                        <th className="p-3 text-left font-medium hidden md:table-cell">Departamento</th>
                                        <th className="p-3 text-left font-medium hidden sm:table-cell">Telefone</th>
                                        <th className="p-3 text-center font-medium">Status</th>
                                        <th className="p-3 text-right font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responsaveis.map(resp => (
                                        <tr key={resp.id} className="border-b hover:bg-muted/20 transition-colors duration-150">
                                            <td className="p-2 sm:p-3 max-w-[120px] truncate" title={resp.nome}>{resp.nome}</td>
                                            <td className="p-2 sm:p-3 hidden md:table-cell max-w-[100px] truncate" title={resp.email}>{resp.email}</td>
                                            <td className="p-2 sm:p-3 hidden sm:table-cell max-w-[80px] truncate" title={resp.cargo}>{resp.cargo || '-'}</td>
                                            <td className="p-2 sm:p-3 hidden md:table-cell max-w-[80px] truncate" title={resp.departamento}>{resp.departamento || '-'}</td>
                                            <td className="p-2 sm:p-3 hidden sm:table-cell max-w-[80px] truncate" title={resp.contatoTelefone}>{resp.contatoTelefone || '-'}</td>
                                            <td className="p-2 sm:p-3 text-center"><Badge variant={resp.ativo ? "default" : "outline"} className={resp.ativo ? "bg-green-500 hover:bg-green-600" : ""}>{resp.ativo ? "Ativo" : "Inativo"}</Badge></td>
                                            <td className="p-3 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditarResponsavelModal(resp)}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteResponsavelClick(resp.id)}><Trash className="h-4 w-4 text-destructive"/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                         {responsaveis.length === 0 && <p className="p-4 text-center text-muted-foreground">Nenhum responsável cadastrado.</p>}
                    </CardContent>
                </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais */}
      {selectedOportunidade && detailsOpen && (
        <DetalhesOportunidade
          key={`opp-detail-${selectedOportunidade.id}`}
          oportunidade={selectedOportunidade}
          open={detailsOpen}
          onOpenChange={(openState) => { setDetailsOpen(openState); if (!openState) setSelectedOportunidade(null); }}
          onClienteClick={(clienteNome, clienteId) => { setDetailsOpen(false); setTimeout(() => { handleClienteListClick(clienteId || clienteNome); }, 300); }}
          onOportunidadeNeedsRefresh={refetchSelectedOportunidade}
        />
      )}
      {selectedCliente && clienteDetailsOpen && (
        <DetalhesCliente
          cliente={selectedCliente}
          open={clienteDetailsOpen}
          onOpenChange={(openState) => { setClienteDetailsOpen(openState); if(!openState) setSelectedCliente(null);}}
          onClienteUpdate={(updatedClienteData) => handleClienteUpdated(selectedCliente.id, updatedClienteData as Partial<ClienteTipo>)}
          onClienteDelete={() => handleDeleteClienteClick(selectedCliente.id)}
          onOportunidadeClick={(op) => handleOportunidadeClick(op.id)}
        />
      )}
      <NovaOportunidade open={showNovaOportunidade} setOpen={setShowNovaOportunidade} onOportunidadeAdded={handleOportunidadeAdded} />
      <NovoCliente open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal} onClienteAdded={handleClienteAdded} />

      {oportunidadeParaAcao && showEditarOportunidadeModal && (
        <EditarOportunidade
          open={showEditarOportunidadeModal}
          onOpenChange={setShowEditarOportunidadeModal}
          oportunidade={oportunidadeParaAcao}
          onOportunidadeUpdated={handleOportunidadeUpdated}
          clientes={clientes.map(c => ({id: c.id, nome: c.nome}))} // Passar clientes no formato esperado
          responsaveis={responsaveis.map(r => ({id: r.id, nome: r.nome}))} // Passar responsáveis no formato esperado
        />
      )}
      {oportunidadeParaAcao && showMeetingModal && (
        <AgendarReuniao
          open={showMeetingModal}
          onOpenChange={setShowMeetingModal}
          oportunidadeId={oportunidadeParaAcao.id}
          clienteId={oportunidadeParaAcao.clienteId}
          clienteNome={oportunidadeParaAcao.cliente}
          onReuniaoAgendada={() => fetchOportunidades()} // Recarrega oportunidades após agendar
        />
      )}

      <FormResponsavelModal
        open={showResponsavelModal}
        onOpenChange={setShowResponsavelModal}
        responsavelParaEditar={responsavelParaEditar}
        onResponsavelSalvo={handleResponsavelSalvo}
      />

      <AlertDialog open={showConfirmDeleteOportunidade} onOpenChange={setShowConfirmDeleteOportunidade}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta oportunidade?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteOportunidade} className="bg-destructive hover:bg-destructive/80">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDeleteCliente} onOpenChange={setShowConfirmDeleteCliente}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este cliente?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteCliente} className="bg-destructive hover:bg-destructive/80">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDeleteResponsavel} onOpenChange={setShowConfirmDeleteResponsavel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja ativar/desativar este responsável?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteResponsavel}>Confirmar</AlertDialogAction> {/* O deleteResponsavel faz soft delete (ativa/desativa) */}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modais de Email e Ligação (placeholders) */}
      {/* ... */}

    </div>
  )
}

function StatusBadge({ status }: { status?: OportunidadeStatus | string }) { // status opcional
  const currentStatus = status || "desconhecido";
  const statusConfig: Record<string, { label: string; class: string }> = {
    novo_lead: { label: "Novo Lead", class: "bg-blue-100 text-blue-800" },
    agendamento_reuniao: { label: "Agend. Reunião", class: "bg-purple-100 text-purple-800" },
    levantamento_oportunidades: { label: "Levantamento", class: "bg-indigo-100 text-indigo-800" },
    proposta_enviada: { label: "Proposta Enviada", class: "bg-yellow-100 text-yellow-800" },
    negociacao: { label: "Negociação", class: "bg-orange-100 text-orange-800" },
    fechado_ganho: { label: "Ganho", class: "bg-green-100 text-green-800" },
    fechado_perdido: { label: "Perdido", class: "bg-red-100 text-red-800" },
    desconhecido: { label: "Desconhecido", class: "bg-gray-100 text-gray-800"}
  };
  const config = statusConfig[currentStatus] || { label: currentStatus, class: "bg-gray-100 text-gray-800" };
  return <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.class}`}>{config.label}</Badge>;
}
