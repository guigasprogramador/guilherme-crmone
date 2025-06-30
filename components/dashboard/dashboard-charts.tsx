'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart as PieChartIcon } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts"

interface ChartData {
  name: string
  value: number
  color?: string
}

interface DashboardChartsProps {
  estatisticasComercial: any
  licitacoesStats: any
  isLoading: boolean
}

const CORES_PADRAO = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#059669', '#DC2626', '#7C3AED'
]

export function DashboardCharts({ estatisticasComercial, licitacoesStats, isLoading }: DashboardChartsProps) {
  // Dados para os gráficos
  const dadosComercial = estatisticasComercial ? [
    { name: 'Novo Lead', value: estatisticasComercial.estatisticasPorStatus.novo_lead, color: '#3B82F6' },
    { name: 'Reunião', value: estatisticasComercial.estatisticasPorStatus.agendamento_reuniao, color: '#10B981' },
    { name: 'Oportunidades', value: estatisticasComercial.estatisticasPorStatus.levantamento_oportunidades, color: '#F59E0B' },
    { name: 'Proposta', value: estatisticasComercial.estatisticasPorStatus.proposta_enviada, color: '#8B5CF6' },
    { name: 'Negociação', value: estatisticasComercial.estatisticasPorStatus.negociacao, color: '#EF4444' },
    { name: 'Ganho', value: estatisticasComercial.estatisticasPorStatus.fechado_ganho, color: '#059669' },
  ].filter(item => item.value > 0) : []

  const dadosLicitacoes = licitacoesStats ? [
    { name: 'Total', value: licitacoesStats.total },
    { name: 'Ativas', value: licitacoesStats.ativas },
    { name: 'Vencidas', value: licitacoesStats.vencidas },
  ] : []

  const dadosTemporais: string | any[] | undefined = []
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              Carregando gráficos...
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              Carregando gráficos...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Gráfico de Pizza - Oportunidades por Status */}
      {dadosComercial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Oportunidades por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosComercial}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosComercial.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || CORES_PADRAO[index % CORES_PADRAO.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Barras - Licitações */}
      {dadosLicitacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Status das Licitações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosLicitacoes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Quantidade']}
                  labelFormatter={(label) => `Status: ${label}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Linha - Evolução Temporal */}
      {dadosTemporais.length > 0 && (
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosTemporais} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="oportunidades" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Oportunidades"
                />
                <Line 
                  type="monotone" 
                  dataKey="licitacoes" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Licitações"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente para métricas resumidas
interface MetricasResumoProps {
  estatisticasComercial?: any
  licitacoesStats?: any
}

export function MetricasResumo({ estatisticasComercial, licitacoesStats }: MetricasResumoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo do Período</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {estatisticasComercial && (
            <>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-600">
                  {estatisticasComercial.estatisticasPorStatus?.fechado_ganho || 0}
                </p>
                <p className="text-sm text-green-700">Oportunidades Ganhas</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">
                  {estatisticasComercial.taxaConversao || 0}%
                </p>
                <p className="text-sm text-blue-700">Taxa de Conversão</p>
              </div>
            </>
          )}
          {licitacoesStats && (
            <>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-2xl font-bold text-purple-600">
                  {licitacoesStats.vencidas || 0}
                </p>
                <p className="text-sm text-purple-700">Licitações Vencidas</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">
                  {licitacoesStats.taxaSucesso || 0}%
                </p>
                <p className="text-sm text-orange-700">Taxa de Sucesso</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}