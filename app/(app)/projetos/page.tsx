"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Filter, Eye, Edit, Trash2 as TrashIcon, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useProjetos, Projeto } from "@/hooks/projetos/useProjetos" // Importar hook e tipo
import { FormProjetos } from "@/components/projetos/form-projeto" // Será criado
// import { DetalhesProjeto } from "@/components/projetos/detalhes-projeto" // Será criado depois
import { toast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { format, parseISO, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"

// Mock de dados para selects, substituir por fetch real de hooks
// Estes seriam passados para FormProjetos e FiltroProjetos
import { useClientes } from "@/hooks/comercial/use-clientes"
import { useLicitacoesOtimizado } from "@/hooks/useLicitacoesOtimizado"
import { useOportunidades } from "@/hooks/comercial/use-oportunidades"
import { usePropostas } from "@/hooks/propostas/usePropostas" // Para associar propostas
import { useResponsaveis } from "@/hooks/comercial/use-responsaveis" // Para gerentes de projeto (users)


export default function ProjetosPage() {
  const [activeView, setActiveView] = useState("lista")
  const [activeFilters, setActiveFilters] = useState(0)

  const {
    projetos,
    isLoading: isLoadingProjetos,
    error: errorProjetos,
    fetchProjetos,
    cancelarProjeto,
  } = useProjetos();

  // Hooks para dados dos selects
  const { clientes, isLoading: isLoadingClientes } = useClientes();
  const { orgaos, isLoading: isLoadingOrgaos } = useLicitacoesOtimizado();
  const { oportunidades, isLoading: isLoadingOportunidades } = useOportunidades();
  const { propostas, isLoading: isLoadingPropostasHook } = usePropostas(); // Usar para buscar propostas
  const { responsaveis: gerentes, isLoading: isLoadingGerentes } = useResponsaveis(); // Usuários como gerentes


  const [showFormProjetoModal, setShowFormProjetoModal] = useState(false);
  const [projetoParaEditar, setProjetoParaEditar] = useState<Projeto | null>(null);

  // const [showDetalhesProjetoModal, setShowDetalhesProjetoModal] = useState(false); // Para depois
  // const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null); // Para depois

  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [projetoParaCancelarId, setProjetoParaCancelarId] = useState<string | null>(null);


  useEffect(() => {
    fetchProjetos();
    // Os outros hooks (clientes, etc.) devem buscar dados na montagem ou serem chamados aqui se necessário
  }, [fetchProjetos]);

  const handleNovaProjeto = () => {
    setProjetoParaEditar(null);
    setShowFormProjetoModal(true);
  };

  const handleEditarProjeto = (projeto: Projeto) => {
    setProjetoParaEditar(projeto);
    setShowFormProjetoModal(true);
  };

  const handleVisualizarProjeto = (projeto: Projeto) => {
    // setProjetoSelecionado(projeto);
    // setShowDetalhesProjetoModal(true);
    toast({ title: "Info", description: `Visualizar projeto ${projeto.nome_projeto} (a ser implementado).`})
  };

  const handleCancelarProjetoClick = (id: string) => {
    setProjetoParaCancelarId(id);
    setShowConfirmCancelModal(true);
  };

  const handleConfirmCancelarProjeto = async () => {
    if (projetoParaCancelarId) {
      try {
        await cancelarProjeto(projetoParaCancelarId);
        toast({ title: "Sucesso", description: "Projeto cancelado." });
        fetchProjetos();
      } catch (e: any) {
        toast({ title: "Erro", description: e.message || "Falha ao cancelar projeto.", variant: "destructive" });
      } finally {
        setShowConfirmCancelModal(false);
        setProjetoParaCancelarId(null);
      }
    }
  };

  const isLoadingDadosSelect = isLoadingClientes || isLoadingOrgaos || isLoadingOportunidades || isLoadingPropostasHook || isLoadingGerentes;

  // Estatísticas (podem vir do backend no futuro)
  const projetosEmExecucao = projetos.filter(p => p.status_projeto === 'EM_ANDAMENTO').length;
  const progressoMedio = projetos.length > 0 ? Math.round(projetos.reduce((sum, p) => sum + (p.percentual_concluido || 0), 0) / projetos.length) : 0;
  // Outras estatísticas podem ser mais complexas e vir do backend

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Projetos</h1>

      {/* Cards de estatísticas - Exemplo */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{projetos.length}</div><div className="text-sm text-muted-foreground">Total de Projetos</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{projetosEmExecucao}</div><div className="text-sm text-muted-foreground">Em Execução</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-3xl font-bold">{progressoMedio}%</div><div className="text-sm text-muted-foreground">Progresso Médio</div></CardContent></Card>
        {/* Adicionar mais cards conforme necessário */}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-muted p-1 rounded-md">
            <Button variant={activeView === "lista" ? "default" : "ghost"} onClick={() => setActiveView("lista")} className="rounded-sm">Lista</Button>
            {/* <Button variant={activeView === "kanban" ? "default" : "ghost"} onClick={() => setActiveView("kanban")} className="rounded-sm">Quadro Kanban</Button> */}
          </div>
          <div className="flex items-center gap-2">
            {/* TODO: Adicionar FiltroProjetos aqui */}
            {/* <Button variant="outline" className="relative"><Filter className="w-4 h-4 mr-2" />Filtros {activeFilters > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white">{activeFilters}</Badge>}</Button> */}
            <Button className="bg-[#1B3A53] hover:bg-[#2c5a80]" onClick={handleNovaProjeto} disabled={isLoadingDadosSelect}>
                {isLoadingDadosSelect ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Plus className="w-4 h-4 mr-2" />}
                Novo Projeto
            </Button>
          </div>
        </div>

        {isLoadingProjetos && <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p className="mt-2 text-muted-foreground">Carregando projetos...</p></div>}
        {errorProjetos && <p className="text-red-500 text-center p-8">Erro ao carregar projetos: {errorProjetos}</p>}

        {!isLoadingProjetos && !errorProjetos && activeView === 'lista' && (
           <div className="bg-white rounded-md border shadow-sm overflow-x-auto">
            {projetos.length === 0 ? (
              <div className="p-8 text-center"><p className="text-muted-foreground mb-2">Nenhum projeto encontrado</p><p className="text-sm text-muted-foreground">Crie um novo projeto.</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left font-medium">Cód.</th>
                    <th className="p-3 text-left font-medium">Nome do Projeto</th>
                    <th className="p-3 text-left font-medium">Cliente/Órgão</th>
                    <th className="p-3 text-left font-medium">Gerente</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Progresso</th>
                    <th className="p-3 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {projetos.map(projeto => (
                    <tr key={projeto.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{projeto.codigo_projeto}</td>
                      <td className="p-3">{projeto.nome_projeto}</td>
                      <td className="p-3">{projeto.cliente_nome || projeto.orgao_nome || 'N/A'}</td>
                      <td className="p-3">{projeto.gerente_projeto_nome || 'N/A'}</td>
                      <td className="p-3"><Badge variant={projeto.status_projeto === 'CONCLUIDO' ? 'default' : 'outline'}>{projeto.status_projeto}</Badge></td>
                      <td className="p-3 text-right">{projeto.percentual_concluido || 0}%</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleVisualizarProjeto(projeto)} title="Visualizar"><Eye className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditarProjeto(projeto)} title="Editar"><Edit className="h-4 w-4"/></Button>
                        {projeto.status_projeto !== 'CANCELADO' && (
                          <Button variant="ghost" size="icon" onClick={() => handleCancelarProjetoClick(projeto.id)} title="Cancelar"><TrashIcon className="h-4 w-4 text-red-500"/></Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
         {!isLoadingProjetos && !errorProjetos && activeView === 'kanban' && (
            <div className="p-8 text-center border rounded-md bg-white shadow-sm"><p className="text-muted-foreground">Visualização Kanban de Projetos a ser implementada.</p></div>
        )}
      </div>

      {showFormProjetoModal && (
        <FormProjetos
          open={showFormProjetoModal}
          onOpenChange={setShowFormProjetoModal}
          projetoParaEditar={projetoParaEditar}
          onProjetoSaved={() => {
            fetchProjetos();
            setShowFormProjetoModal(false);
            setProjetoParaEditar(null);
          }}
          clientes={clientes.map(c => ({id: c.id, nome: c.nome}))}
          orgaos={orgaos.map(o => ({id: o.id, nome: o.nome}))}
          oportunidades={oportunidades.map(op => ({id: op.id, titulo: op.titulo}))}
          propostas={propostas.map(p => ({id: p.id, titulo: p.titulo, numero_proposta: p.numero_proposta }))} // Ajustar para o que FormProjetos espera
          licitacoes={licitacoes.map(l => ({id: l.id, titulo: l.titulo}))}
          gerentes={gerentes.map(r => ({id: r.id, name: r.nome}))} // 'users' são os gerentes
        />
      )}

      {/* Modal de Detalhes do Projeto (a ser criado e implementado) */}
      {/* {showDetalhesProjetoModal && projetoSelecionado && (
        <DetalhesProjeto
          projeto={projetoSelecionado}
          open={showDetalhesProjetoModal}
          onOpenChange={setShowDetalhesProjetoModal}
          // Callbacks
        />
      )} */}

      <AlertDialog open={showConfirmCancelModal} onOpenChange={setShowConfirmCancelModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este projeto? (O status será alterado para CANCELADO).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancelarProjeto} className="bg-destructive hover:bg-destructive/80">Sim, Cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
