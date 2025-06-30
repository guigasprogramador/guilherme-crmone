"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation" // Import useRouter
import { useAuth } from "@/hooks/useAuth" // Import useAuth
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProximasAtividades } from "@/components/dashboard/proximas-atividades"
import { OportunidadesRecentes } from "@/components/dashboard/oportunidades-recentes"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Not used directly
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Briefcase, Target, Users, TrendingUp } from "lucide-react" // BarChart3 not used
import { useEstatisticas } from "@/hooks/comercial/use-estatisticas"
import { useLicitacoes } from "@/hooks/useLicitacoes"
// import { toast } from "@/components/ui/use-toast" // Not used directly
import { DashboardCharts, MetricasResumo } from "@/components/dashboard/dashboard-charts"
import { LoaderCircle } from 'lucide-react'; // For loading indicator

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();

  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre' | 'ano'>('mes')
  const [licitacoesStats, setLicitacoesStats] = useState<any>(null)
  const [clientesAtivos, setClientesAtivos] = useState(0)
  
  const { estatisticas: estatisticasComercial, fetchEstatisticas, isLoading: loadingComercial } = useEstatisticas()
  const { licitacoes, fetchLicitacoes, loading: loadingLicitacoes } = useLicitacoes() // Call at top level

  // Consolidate loading state from useLicitacoes if needed, or use its specific loading for DashboardCharts
  // const { loading: loadingLicitacoesHook } = useLicitacoes() // Already called above


  // Effect for redirecting if not authenticated
  


  // Buscar estatísticas de licitações
  const fetchLicitacoesStats = async () => {
    try {
      const response = await fetch(`/api/licitacoes?estatisticas=true&periodo=${periodo}`)
      if (response.ok) {
        const data = await response.json()
        setLicitacoesStats(data)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de licitações:', error)
    }
  }

  // Buscar clientes ativos
  const fetchClientesAtivos = async () => {
    try {
      const response = await fetch('/api/comercial/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientesAtivos(data.length)
      }
    } catch (error) {
      console.error('Erro ao buscar clientes ativos:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) { // Only fetch data if authenticated
      fetchEstatisticas(periodo)
      fetchLicitacoesStats()
      fetchClientesAtivos()
      if (fetchLicitacoes) { // Ensure fetchLicitacoes is available from the top-level call
        fetchLicitacoes();
      }
    }
  }, [periodo, isAuthenticated, fetchEstatisticas, fetchLicitacoes]); // Added fetchLicitacoes to dependencies

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg">Carregando Dashboard...</p>
      </div>
    );
  }

  if (authLoading || !isAuthenticated) {
  return (
    <div className="flex items-center justify-center h-screen">
      <LoaderCircle className="h-12 w-12 animate-spin text-blue-600" />
      <p className="ml-4 text-lg">Carregando autenticação...</p>
    </div>
  );
}


  // Ações rápidas
  const acoesRapidas = [
    {
      titulo: 'Nova Licitação',
      descricao: 'Cadastrar nova licitação',
      icone: Briefcase,
      cor: 'bg-blue-500',
      acao: () => window.location.href = '/licitacoes'
    },
    {
      titulo: 'Nova Oportunidade',
      descricao: 'Criar oportunidade comercial',
      icone: Target,
      cor: 'bg-green-500',
      acao: () => window.location.href = '/comercial'
    },
    {
      titulo: 'Novo Documento',
      descricao: 'Upload de documento',
      icone: FileText,
      cor: 'bg-purple-500',
      acao: () => window.location.href = '/documentos'
    },
    {
      titulo: 'Novo Cliente',
      descricao: 'Cadastrar cliente',
      icone: Users,
      cor: 'bg-orange-500',
      acao: () => window.location.href = '/comercial'
    }
  ]

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm sm:text-base w-full sm:w-auto"
          >
            <option value="semana">Última Semana</option>
            <option value="mes">Último Mês</option>
            <option value="trimestre">Último Trimestre</option>
            <option value="ano">Último Ano</option>
          </select>
        </div>
      </div>

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Licitações</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{licitacoesStats?.total || 0}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Total no período</p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Oportunidades</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{estatisticasComercial?.totalOportunidades || 0}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Total no período</p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Em Negociação</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {estatisticasComercial?.valorTotalNegociacao ? 
                    new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(estatisticasComercial.valorTotalNegociacao) 
                    : 'R$ 0'
                  }
                </p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Valor total</p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Clientes Ativos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{clientesAtivos}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Total de clientes</p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {acoesRapidas.map((acao, index) => {
              const IconeComponent = acao.icone
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-3 sm:p-4 flex flex-col items-center gap-2 hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                  onClick={acao.acao}
                >
                  <div className={`p-2 sm:p-3 rounded-full ${acao.cor} text-white`}>
                    <IconeComponent className="h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-xs sm:text-sm truncate">{acao.titulo}</p>
                    <p className="text-xs text-gray-500 truncate hidden sm:block">{acao.descricao}</p>
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <DashboardCharts 
        estatisticasComercial={estatisticasComercial}
        licitacoesStats={licitacoesStats}
        isLoading={loadingComercial || loadingLicitacoes}
      />

      {/* Seção de Resumo */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <ProximasAtividades />
        <MetricasResumo 
          estatisticasComercial={estatisticasComercial}
          licitacoesStats={licitacoesStats}
        />
      </div>
    </div>
  )
}

