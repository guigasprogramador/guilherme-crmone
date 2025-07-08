"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Filter, Eye, Edit, Trash2 as TrashIcon, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePropostas, Proposta } from "@/hooks/propostas/usePropostas"
import { FormProposta } from "@/components/propostas/form-proposta"
import { DetalhesProposta } from "@/components/propostas/detalhes-proposta"
import { ListaPropostas } from "@/components/propostas/lista-propostas"
import { FiltroPropostas, PropostaFiltros } from "@/components/propostas/filtro-propostas"
import { toast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Importar hooks para popular selects
import { useClientes } from "@/hooks/comercial/use-clientes"
import { useLicitacoesOtimizado } from "@/hooks/useLicitacoesOtimizado"
import { useOportunidades } from "@/hooks/comercial/use-oportunidades"
import { useResponsaveis } from "@/hooks/comercial/use-responsaveis"

export default function PropostasPage() {
  const [activeView, setActiveView] = useState("lista")

  const {
    propostas,
    isLoading: isLoadingPropostas,
    error: errorPropostas,
    fetchPropostas,
    cancelProposta,
  } = usePropostas();

  // Hooks para dados dos selects/filtros
  const { clientes, isLoading: isLoadingClientes, fetchClientes: refetchClientes } = useClientes();
  const { licitacoes, isLoading: isLoadingLicitacoes, carregarLicitacoes, orgaos } = useLicitacoesOtimizado();
  const { oportunidades, isLoading: isLoadingOportunidades, fetchOportunidades: refetchOportunidades } = useOportunidades();
  const { responsaveis, isLoading: isLoadingResponsaveis, fetchResponsaveis: refetchResponsaveis } = useResponsaveis();

  const [showFormPropostaModal, setShowFormPropostaModal] = useState(false);
  const [propostaParaEditar, setPropostaParaEditar] = useState<Proposta | null>(null);

  const [showDetalhesPropostaModal, setShowDetalhesPropostaModal] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState<Proposta | null>(null);

  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [propostaParaCancelarId, setPropostaParaCancelarId] = useState<string | null>(null);

  // Carregar dados iniciais para propostas e para os selects dos filtros/formulários
  useEffect(() => {
    fetchPropostas();
    // Os hooks de clientes, licitações, etc., geralmente buscam dados na montagem.
    // Se precisar de um refresh explícito ou se eles não buscarem na montagem:
    // refetchClientes();
    // carregarLicitacoes(); // Este do useLicitacoesOtimizado pode precisar ser chamado sem args para pegar todos
    // refetchOportunidades();
    // refetchResponsaveis();
  }, [fetchPropostas]); // Adicionar outros fetchers se eles não buscarem na montagem

  const handleFilterChange = useCallback((filtros: PropostaFiltros) => {
    fetchPropostas(filtros as Record<string,string>);
  }, [fetchPropostas]);

  const handleNovaProposta = () => {
    setPropostaParaEditar(null);
    setShowFormPropostaModal(true);
  };

  const handleEditarProposta = (proposta: Proposta) => {
    setPropostaParaEditar(proposta);
    setShowFormPropostaModal(true);
  };

  const handleVisualizarProposta = (proposta: Proposta) => {
    setPropostaSelecionada(proposta);
    setShowDetalhesPropostaModal(true);
  };

  const handleCancelarPropostaClick = (id: string) => {
    setPropostaParaCancelarId(id);
    setShowConfirmCancelModal(true);
  };

  const handleConfirmCancelarProposta = async () => {
    if (propostaParaCancelarId) {
      try {
        await cancelProposta(propostaParaCancelarId, "Cancelada pelo usuário");
        toast({ title: "Sucesso", description: "Proposta cancelada." });
        fetchPropostas();
      } catch (e: any) {
        toast({ title: "Erro", description: e.message || "Falha ao cancelar proposta.", variant: "destructive" });
      } finally {
        setShowConfirmCancelModal(false);
        setPropostaParaCancelarId(null);
      }
    }
  };

  const propostasEmAberto = propostas.filter(p => p.status_proposta !== 'ACEITA' && p.status_proposta !== 'RECUSADA' && p.status_proposta !== 'CANCELADA').length;
  const taxaAprovacao = propostas.length > 0 && propostas.filter(p => ['ACEITA', 'RECUSADA'].includes(p.status_proposta)).length > 0
    ? Math.round((propostas.filter(p => p.status_proposta === 'ACEITA').length / propostas.filter(p => ['ACEITA', 'RECUSADA'].includes(p.status_proposta)).length) * 100)
    : 0;
  const totalEmPropostas = propostas
    .filter(p => p.status_proposta !== 'RECUSADA' && p.status_proposta !== 'CANCELADA')
    .reduce((sum, p) => sum + (Number(p.valor_total_proposta) || 0), 0);

  const tempoMedioResposta = 10;
  const expiramEm15Dias = propostas.filter(p => {
    if (!p.data_validade) return false;
    try {
        const dataValidade = typeof p.data_validade === 'string' ? parseISO(p.data_validade) : p.data_validade;
        if (!isValid(dataValidade)) return false;
        const diffTime = Math.abs(dataValidade.getTime() - new Date().getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 15 && dataValidade >= new Date() && p.status_proposta !== 'ACEITA' && p.status_proposta !== 'RECUSADA' && p.status_proposta !== 'CANCELADA';
    } catch (e) { return false; }
  }).length;

  const isLoadingDadosSelect = isLoadingClientes || isLoadingLicitacoes || isLoadingOportunidades || isLoadingResponsaveis;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Propostas</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{propostasEmAberto}</div><div className="text-sm text-muted-foreground">Propostas em aberto</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{taxaAprovacao}%</div><div className="text-sm text-muted-foreground">Taxa de aprovação</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{totalEmPropostas.toLocaleString("pt-BR", {style: "currency", currency: "BRL"})}</div><div className="text-sm text-muted-foreground">R$ total em propostas</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{tempoMedioResposta}d</div><div className="text-sm text-muted-foreground">Tempo médio de resposta</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{expiramEm15Dias}</div><div className="text-sm text-muted-foreground">Expiram em 15 dias</div></CardContent></Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-muted p-1 rounded-md">
            <Button variant={activeView === "lista" ? "default" : "ghost"} onClick={() => setActiveView("lista")} className="rounded-sm">Lista</Button>
            <Button variant={activeView === "kanban" ? "default" : "ghost"} onClick={() => setActiveView("kanban")} className="rounded-sm">Quadro Kanban</Button>
          </div>
          <div className="flex items-center gap-2">
            <FiltroPropostas
              onFilterChange={handleFilterChange}
              clientes={clientes.map(c => ({id: c.id, nome: c.nome}))}
              // A API de LicitacoesOtimizado retorna orgaos como parte do objeto licitacao,
              // ou uma lista separada de orgaos precisa ser buscada se `useLicitacoesOtimizado` não a expõe diretamente.
              // Assumindo que `orgaos` é uma lista de OrgaoType[] do hook useLicitacoesOtimizado.
              orgaos={orgaos.map(o => ({id: o.id, nome: o.nome}))}
              oportunidades={oportunidades.map(op => ({id: op.id, titulo: op.titulo}))}
              licitacoes={licitacoes.map(l => ({id: l.id, titulo: l.titulo}))}
              responsaveis={responsaveis.map(r => ({id: r.id, name: r.nome}))}
            />
            <Button className="bg-[#1B3A53] hover:bg-[#2c5a80]" onClick={handleNovaProposta} disabled={isLoadingDadosSelect}>
                {isLoadingDadosSelect ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Plus className="w-4 h-4 mr-2" />}
                Nova Proposta
            </Button>
          </div>
        </div>

        {isLoadingPropostas && <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p className="mt-2 text-muted-foreground">Carregando propostas...</p></div>}
        {errorPropostas && <p className="text-red-500 text-center p-8">Erro ao carregar propostas: {errorPropostas}</p>}

        {!isLoadingPropostas && !errorPropostas && activeView === 'lista' && (
          <ListaPropostas
            propostas={propostas}
            onViewProposta={handleVisualizarProposta}
            onEditProposta={handleEditarProposta}
            onCancelProposta={handleCancelarPropostaClick}
          />
        )}
        {!isLoadingPropostas && !errorPropostas && activeView === 'kanban' && (
            <div className="p-8 text-center border rounded-md bg-white shadow-sm"><p className="text-muted-foreground">Visualização Kanban a ser implementada.</p></div>
        )}
      </div>

      {showFormPropostaModal && (
        <FormProposta
          open={showFormPropostaModal}
          onOpenChange={setShowFormPropostaModal}
          propostaParaEditar={propostaParaEditar}
          onPropostaSaved={() => {
            fetchPropostas();
            setShowFormPropostaModal(false);
            setPropostaParaEditar(null);
          }}
          clientes={clientes.map(c => ({id: c.id, nome: c.nome}))}
          // A API de LicitacoesOtimizado retorna orgaos como parte do objeto licitacao,
          // ou uma lista separada de orgaos precisa ser buscada.
          // Assumindo que `orgaos` é uma lista de OrgaoType[] do hook useLicitacoesOtimizado.
          orgaos={orgaos.map(o => ({id: o.id, nome: o.nome}))}
          oportunidades={oportunidades.map(op => ({id: op.id, titulo: op.titulo}))}
          licitacoes={licitacoes.map(l => ({id: l.id, titulo: l.titulo}))}
          responsaveis={responsaveis.map(r => ({id: r.id, name: r.nome}))}
        />
      )}

      {showDetalhesPropostaModal && propostaSelecionada && (
        <DetalhesProposta
          proposta={propostaSelecionada}
          open={showDetalhesPropostaModal}
          onOpenChange={setShowDetalhesPropostaModal}
          onAlteraStatus={async (propostaId, novoStatus, motivo) => {
            try {
                await updateStatusProposta(propostaId, novoStatus, motivo); // updateStatusProposta já está no hook
                fetchPropostas(); // Recarregar para refletir na lista
            } catch (e: any) {
                toast({ title: "Erro", description: e.message || "Falha ao alterar status.", variant: "destructive"});
            }
          }}
          onEdit={() => {
            setShowDetalhesPropostaModal(false);
            handleEditarProposta(propostaSelecionada);
          }}
        />
      )}

      <AlertDialog open={showConfirmCancelModal} onOpenChange={setShowConfirmCancelModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta proposta? (O status será alterado para CANCELADA).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancelarProposta} className="bg-destructive hover:bg-destructive/80">Sim, Cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
