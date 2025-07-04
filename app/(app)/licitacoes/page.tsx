"use client"

import { useState, useEffect, useMemo, useCallback } from "react" // Adicionado useCallback
import { Button } from "@/components/ui/button"
import AppLayout from "@/app/(app)/layout";
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MoreHorizontal, Edit, Trash, Mail, Phone, Calendar, CheckCircle, XCircle, AlertTriangle, FileText, Download, Share2 } from "lucide-react"
import { DetalhesLicitacao } from "@/components/licitacoes/detalhes-licitacao";
import { DetalhesOrgao } from "@/components/licitacoes/detalhes-orgao";
import { statusLabels, statusColors } from "@/types/licitacoes";
import { FiltroLicitacoesOtimizado } from "@/components/licitacoes/filtro-licitacoes-otimizado";
import { NovaLicitacao } from "@/components/licitacoes/nova-licitacao";
import { LicitacaoKanbanBoard } from "@/components/licitacoes/licitacao-kanban-board";
import { useLicitacoesOtimizado, Licitacao, OrgaoDetalhado as OrgaoType, LicitacaoFiltros, LicitacaoStatus } from "@/hooks/useLicitacoesOtimizado";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from 'uuid';
// import { format } from 'date-fns'; // Removido se não usado diretamente aqui

export default function LicitacoesPage() {
  const { 
    licitacoes, 
    filteredLicitacoes, 
    setFilteredLicitacoes,
    estatisticas, 
    isLoading: loading, 
    carregarLicitacoes, // Usado para aplicar filtros
    carregarDadosIniciais, // Usado para carga inicial e refresh completo
    adicionarLicitacao,
    atualizarLicitacao,
    excluirLicitacao,
    atualizarStatusLicitacao
  } = useLicitacoesOtimizado();
  
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null)
  const [selectedOrgao, setSelectedOrgao] = useState<OrgaoType | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [orgaoDetailsOpen, setOrgaoDetailsOpen] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState("lista")
  const [excluirLicitacaoId, setExcluirLicitacaoId] = useState<string | null>(null)
  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)
  const [filtros, setFiltros] = useState<LicitacaoFiltros>({})
  const [loadingSelectedLicitacao, setLoadingSelectedLicitacao] = useState(false);


  const orgaos = useMemo(() => {
    const orgaosNomes = new Set<string>();
    licitacoes.forEach(item => { // Usar licitacoes (lista completa) para popular filtros
      if (typeof item.orgao === 'string' && item.orgao) {
        orgaosNomes.add(item.orgao);
      } else if (typeof item.orgao === 'object' && item.orgao?.nome) {
        orgaosNomes.add(item.orgao.nome);
      }
    });
    return Array.from(orgaosNomes);
  }, [licitacoes]);

  const responsaveis = useMemo(() => {
    const nomes = new Set<string>();
    licitacoes.forEach(item => {
      if (item.responsavel) nomes.add(item.responsavel);
    });
    return Array.from(nomes);
  }, [licitacoes]);

  const modalidades = useMemo(() => {
    const mods = new Set<string>();
    licitacoes.forEach(item => {
      if (item.modalidade) mods.add(item.modalidade);
    });
    return Array.from(mods);
  }, [licitacoes]);

  const aplicarFiltros = useCallback(async (novosFiltros: LicitacaoFiltros) => {
    setFiltros(novosFiltros);
    await carregarLicitacoes(novosFiltros); // O hook agora aplica os filtros e atualiza filteredLicitacoes
  }, [carregarLicitacoes]);

  useEffect(() => {
    carregarDadosIniciais();
  }, [carregarDadosIniciais])

  const handleLicitacaoAdded = async (novaLicitacaoData: any) => { // Tipo 'any' temporário
    // O componente NovaLicitacao já faz a requisição diretamente para a API
    // Apenas recarregamos os dados para atualizar a lista
    try {
      await carregarDadosIniciais();
    } catch (error) {
      console.error('Erro ao recarregar dados após adicionar licitação:', error);
    }
  }

  const handleLicitacaoUpdate = async (licitacaoAtualizadaData: Licitacao) => {
    try {
      // A função atualizarLicitacao do hook já atualiza o estado e recarrega os dados.
      await atualizarLicitacao(licitacaoAtualizadaData.id, licitacaoAtualizadaData as Partial<Licitacao>);
      toast({ title: "Sucesso!", description: "Licitação atualizada com sucesso." });
      setDetailsOpen(false); // Fechar o painel de detalhes
      // Atualizar o selectedLicitacao para refletir as mudanças imediatamente se estiver aberto
      // Isso é importante se o carregarDadosIniciais não for rápido o suficiente ou não atualizar o objeto em memória
      const licitacaoAtualizadaDoEstado = licitacoes.find(l => l.id === licitacaoAtualizadaData.id);
      if (licitacaoAtualizadaDoEstado) {
        setSelectedLicitacao(licitacaoAtualizadaDoEstado);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar a licitação.", variant: "destructive" });
    }
  }

  const handleDeleteLicitacaoClick = (licitacao: Licitacao) => {
    setExcluirLicitacaoId(licitacao.id);
    setDialogExcluirAberto(true);
  }

  const confirmDeleteLicitacao = async () => {
    if (!excluirLicitacaoId) return;
    try {
      await excluirLicitacao(excluirLicitacaoId);
      if (selectedLicitacao && selectedLicitacao.id === excluirLicitacaoId) {
        setDetailsOpen(false);
        setSelectedLicitacao(null);
      }
      toast({ title: "Sucesso!", description: "Licitação excluída com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível excluir a licitação.", variant: "destructive" });
    } finally {
      setDialogExcluirAberto(false);
      setExcluirLicitacaoId(null);
    }
  }

  const parseValorMonetario = (valor: string | number | null | undefined): number | null => {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor === 'number') return valor;
    
    let valorStr = String(valor).trim().replace(/[R$\s]/g, '');
    
    if (valorStr.includes(',') && valorStr.includes('.')) {
      valorStr = valorStr.replace(/\./g, '').replace(',', '.');
    } else if (valorStr.includes(',') && !valorStr.includes('.')) {
      valorStr = valorStr.replace(',', '.');
    } else if (valorStr.includes('.')) {
      const pontos = valorStr.split('.');
      if (pontos.length > 2 || (pontos.length === 2 && pontos[1].length !== 2)) {
        valorStr = valorStr.replace(/\./g, '');
      }
    }
    
    const resultado = parseFloat(valorStr);
    return isNaN(resultado) ? null : resultado;
  };

  const formatarValor = (valor?: number | string | null): string => {
    if (valor === null || valor === undefined) return 'N/A';
    const numValor = parseValorMonetario(valor);
    if (numValor === null) return 'N/A';
    return `R$ ${numValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const formatarValorCompacto = (valor?: number | string | null): string => {
    if (valor === null || valor === undefined) return 'R$ 0';
    const numValor = parseValorMonetario(valor);
    if (numValor === null) return 'N/A';

    if (numValor >= 1000000) return `R$ ${(numValor / 1000000).toFixed(1)}M`;
    if (numValor >= 1000) return `R$ ${(numValor / 1000).toFixed(0)}K`; // Sem decimais para K
    return `R$ ${numValor.toLocaleString('pt-BR', {maximumFractionDigits: 0})}`; // Sem decimais para valores menores
  }

  const handleLicitacaoClick = (licitacao: Licitacao) => {
    // Busca a versão mais recente da licitação da lista (que é atualizada pelo hook)
    const licitacaoAtual = licitacoes.find(l => l.id === licitacao.id) || licitacao;
    setSelectedLicitacao(licitacaoAtual);
    setDetailsOpen(true);
  }

  const handleOrgaoClick = (orgao: OrgaoType) => {
    setSelectedOrgao(orgao);
    setOrgaoDetailsOpen(true);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const licitacaoAtualizada = await atualizarStatusLicitacao(id, newStatus);
      if (licitacaoAtualizada) {
        if (selectedLicitacao && selectedLicitacao.id === id) {
          // Atualiza o estado selectedLicitacao com o objeto retornado pelo hook, que contém todas as informações atualizadas
          setSelectedLicitacao(licitacaoAtualizada);
        }
        toast({ title: "Status atualizado", description: "O status da licitação foi atualizado com sucesso." });
      }
    } catch (error) {
      // Erros já são tratados e logados no hook, e um toast de erro já deve ter sido exibido lá em caso de falha de refresh token
      // Se o erro for relançado pelo hook (ex: falha na requisição inicial e no retry), podemos tratar aqui se necessário.
      // No entanto, a implementação atual do hook não relança o erro após o logout.
      console.error('Falha ao atualizar status na página:', error);
      // O toast de erro para o usuário final já foi provavelmente mostrado pelo hook em caso de falha total.
    }
  }

  const handleOrgaoUpdate = (orgaoAtualizado: OrgaoType) => {
    console.log("Órgão atualizado (placeholder):", orgaoAtualizado);
    toast({ title: "Órgão atualizado", description: "A funcionalidade de atualização de órgão será implementada." });
    setSelectedOrgao(orgaoAtualizado);
  }

  const handleOrgaoDelete = (orgao: OrgaoType) => {
    console.log("Órgão excluído (placeholder):", orgao);
    toast({ title: "Órgão excluído", description: "A funcionalidade de exclusão de órgão será implementada." });
    setOrgaoDetailsOpen(false);
    setSelectedOrgao(null);
  }

  const refetchLicitacaoSelecionada = useCallback(async () => {
    if (selectedLicitacao?.id) {
      setLoadingSelectedLicitacao(true);
      console.log(`[Page] Refetching licitacao: ${selectedLicitacao.id}`);
      try {
        // Chamar carregarDadosIniciais para buscar todos os dados novamente.
        // Isso irá atualizar a lista 'licitacoes' no estado do hook.
        await carregarDadosIniciais();

        // Após carregarDadosIniciais, encontrar a licitação atualizada na nova lista do hook
        // e atualizar o estado selectedLicitacao.
        // É preciso acessar o estado mais recente de 'licitacoes' do hook,
        // o que pode ser um desafio aqui sem que o hook retorne a lista diretamente de carregarDadosIniciais
        // ou ter uma função getLicitacaoById no hook.
        // Solução: O hook atualiza seu estado interno 'licitacoes'.
        // Se a prop 'licitacao' do DetalhesLicitacao for diretamente da lista do hook,
        // ela será atualizada quando a lista for atualizada.
        // A lógica atual de handleLicitacaoClick já garante que selectedLicitacao
        // é uma referência a um item da lista do hook.
        // Para forçar a atualização do objeto em selectedLicitacao se ele não for uma referência direta
        // ou se a referência se perder:
        // const licitacaoAtualizada = licitacoes.find(l => l.id === selectedLicitacao.id); // 'licitacoes' aqui pode não ser a lista mais nova ainda
        // console.log("Licitacao atualizada encontrada na lista:", licitacaoAtualizada);
        // if (licitacaoAtualizada) {
        //   setSelectedLicitacao(licitacaoAtualizada);
        // } else {
        //   // Se não encontrar mais, talvez fechar os detalhes
        //   setDetailsOpen(false);
        //   setSelectedLicitacao(null);
        // }
        // Por enquanto, carregarDadosIniciais é o principal. O useEffect em DetalhesLicitacao que depende de 'licitacao'
        // (a prop) deverá atualizar o formData interno do DetalhesLicitacao.
        toast({title:"Dados Recarregados", description: "Os dados da licitação foram atualizados."})

      } catch (error) {
        toast({ title: "Erro", description: "Falha ao recarregar dados da licitação.", variant: "destructive" });
      } finally {
        setLoadingSelectedLicitacao(false);
      }
    }
  }, [selectedLicitacao, carregarDadosIniciais]); // Não adicionar 'licitacoes' aqui para evitar loop se setSelectedLicitacao for chamado dentro.

  // ... (resto do componente: handleDownloadEdital, etc. permanecem iguais)

  return (
    <div className="p-4 sm:p-6 md:p-8 overflow-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Licitações</h1>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <Card className="shadow-sm hover:shadow transition-shadow duration-200">
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{estatisticas.total}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Licitações totais</div>
          </CardContent>
        </Card>
        {/* ... outros cards ... */}
         <Card className="shadow-sm hover:shadow transition-shadow duration-200">
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{estatisticas.ativas}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Licitações ativas</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow transition-shadow duration-200">
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{estatisticas.vencidas}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Licitações vencidas</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow transition-shadow duration-200">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col">
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold truncate">{formatarValorCompacto(estatisticas.valorTotal)}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">R$ total em licitações</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow transition-shadow duration-200">
          <CardContent className="p-3 sm:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{estatisticas.taxaSucesso}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Taxa de sucesso</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={() => setAbaAtiva("kanban")} variant={abaAtiva === "kanban" ? "default" : "outline"} className="h-8 px-3 text-xs sm:text-sm">Kanban</Button>
              <Button size="sm" onClick={() => setAbaAtiva("lista")} variant={abaAtiva === "lista" ? "default" : "outline"} className="h-8 px-3 text-xs sm:text-sm">Lista</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <FiltroLicitacoesOtimizado onFilterChange={aplicarFiltros} orgaos={orgaos} responsaveis={responsaveis} modalidades={modalidades} />
              <NovaLicitacao onLicitacaoAdded={handleLicitacaoAdded} />
            </div>
          </div>

          <TabsContent value="lista" className="mt-2 sm:mt-4">
            <div className="rounded-md border shadow-sm">
              <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 sm:p-4">Título</th>
                      <th className="p-2 sm:p-4">Órgão</th>
                      <th className="p-2 sm:p-4 hidden sm:table-cell">Valor</th>
                      <th className="p-2 sm:p-4 hidden md:table-cell">Responsável</th>
                      <th className="p-2 sm:p-4 hidden md:table-cell">Data de Abertura</th>
                      <th className="p-2 sm:p-4">Status</th>
                      <th className="p-2 sm:p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="p-4 text-center"><div className="flex items-center justify-center space-x-2"><div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div><span>Carregando...</span></div></td></tr>
                    ) : filteredLicitacoes.length === 0 ? (
                      <tr><td colSpan={7} className="p-4 text-center"><div className="py-8"><p className="text-gray-500">Nenhuma licitação encontrada</p><p className="text-sm text-gray-400 mt-1">Ajuste os filtros ou adicione uma.</p></div></td></tr>
                    ) : (
                      filteredLicitacoes.map((licitacao) => (
                        <tr key={licitacao.id} className="border-b cursor-pointer hover:bg-gray-50 transition-colors duration-150" onClick={() => handleLicitacaoClick(licitacao)}>
                          <td className="p-2 sm:p-4"><div className="font-medium line-clamp-2">{licitacao.titulo}</div><div className="text-xs text-gray-500 sm:hidden mt-1">{formatarValor(licitacao.valorEstimado)}</div></td>
                          <td className="p-2 sm:p-4"><Button variant="link" className="p-0 h-auto text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); if (typeof licitacao.orgao === 'object') { handleOrgaoClick(licitacao.orgao); } }}>{typeof licitacao.orgao === 'object' ? licitacao.orgao.nome : licitacao.orgao}</Button></td>
                          <td className="p-2 sm:p-4 hidden sm:table-cell">{formatarValor(licitacao.valorEstimado)}</td>
                          <td className="p-2 sm:p-4 hidden md:table-cell">{licitacao.responsavel || "N/D"}</td>
                          <td className="p-2 sm:p-4 hidden md:table-cell">{licitacao.dataAbertura || "N/D"}</td>
                          <td className="p-2 sm:p-4"><StatusBadge status={licitacao.status || "N/D"} /></td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLicitacaoClick(licitacao); }}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteLicitacaoClick(licitacao);}} className="text-destructive"><Trash className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                                {/* ... outras ações ... */}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="kanban" className="mt-2 sm:mt-4">
            <div className="bg-white rounded-md border shadow-sm p-2 sm:p-4">
              <LicitacaoKanbanBoard licitacoes={filteredLicitacoes} onUpdateStatus={handleUpdateStatus} onLicitacaoClick={handleLicitacaoClick} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedLicitacao && detailsOpen && (
        <DetalhesLicitacao
          key={`licitacao-detail-${selectedLicitacao.id}`} // Chave para forçar remount se a licitação mudar
          licitacao={selectedLicitacao}
          open={detailsOpen}
          onOpenChange={(openState) => {
            setDetailsOpen(openState);
            if (!openState) setSelectedLicitacao(null);
          }}
          onUpdateStatus={handleUpdateStatus}
          onOrgaoClick={(orgao) => handleOrgaoClick(orgao)}
          onLicitacaoUpdate={handleLicitacaoUpdate}
          onLicitacaoDelete={handleDeleteLicitacaoClick}
          onLicitacaoNeedsRefresh={refetchLicitacaoSelecionada}
        />
      )}

      {selectedOrgao && orgaoDetailsOpen && (
        <DetalhesOrgao
          key={`orgao-${selectedOrgao.id}`}
          orgao={selectedOrgao}
          licitacao={selectedLicitacao} // Passar a licitação atual se relevante para o contexto do órgão
          open={orgaoDetailsOpen}
          onOpenChange={(openState) => {
            setOrgaoDetailsOpen(openState);
            if (!openState) setSelectedOrgao(null);
          }}
          onOrgaoUpdate={handleOrgaoUpdate}
          onOrgaoDelete={handleOrgaoDelete}
        />
      )}
      
      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle><DialogDescription>Tem certeza que deseja excluir esta licitação?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDialogExcluirAberto(false)}>Cancelar</Button><Button variant="destructive" onClick={confirmDeleteLicitacao}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status?: LicitacaoStatus | string }) { // Aceitar LicitacaoStatus ou string
  const currentStatus = status || "desconhecido"; // Fallback para status desconhecido
  const config = statusLabels[currentStatus as LicitacaoStatus]
    ? { label: statusLabels[currentStatus as LicitacaoStatus], class: statusColors[currentStatus as LicitacaoStatus] }
    : { label: currentStatus, class: "bg-gray-100 text-gray-800 border-gray-300" };

  return <span className={`rounded-full px-3 py-1 text-xs ${config.class}`}>{config.label}</span>;
}
