"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, CheckCircle, Calendar, Filter, Bell, Eye, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Interface para as notificações
interface Notificacao {
  id: number
  titulo: string
  descricao: string
  data: string
  tempo: string
  tipo: "urgente" | "informacao" | "sucesso"
  lida: boolean
  relacionado?: string
}

export default function NotificacoesPage() {
  // Estado para as notificações
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([
    {
      id: 1,
      titulo: "Prazo de Licitação Próximo",
      descricao: "O prazo para envio de documentos do Pregão Eletrônico 123/2023 vence em 3 dias.",
      data: "15/06/2023",
      tempo: "Há 2 horas",
      tipo: "urgente",
      lida: false,
      relacionado: "Pregão Eletrônico 123/2023",
    },
    {
      id: 2,
      titulo: "Nova Licitação Publicada",
      descricao: "Uma nova licitação foi publicada: Concorrência 92/2023 - Prefeitura de Campinas.",
      data: "14/06/2023",
      tempo: "Há 1 dia",
      tipo: "informacao",
      lida: false,
      relacionado: "Concorrência 92/2023",
    },
    {
      id: 3,
      titulo: "Documentação Aprovada",
      descricao: "Sua documentação para o Pregão Presencial 56/2023 foi aprovada com sucesso.",
      data: "12/06/2023",
      tempo: "Há 3 dias",
      tipo: "sucesso",
      lida: false,
      relacionado: "Pregão Presencial 56/2023",
    },
    {
      id: 4,
      titulo: "Reunião Agendada",
      descricao: "Reunião de alinhamento para Tomada de Preços 78/2023 agendada para 18/06/2023 às 14:00.",
      data: "11/06/2023",
      tempo: "Há 4 dias",
      tipo: "informacao",
      lida: true,
      relacionado: "Tomada de Preços 78/2023",
    },
    {
      id: 5,
      titulo: "Proposta Rejeitada",
      descricao: "Sua proposta para a Concorrência 45/2023 foi rejeitada. Clique para ver os detalhes.",
      data: "10/06/2023",
      tempo: "Há 5 dias",
      tipo: "urgente",
      lida: true,
      relacionado: "Concorrência 45/2023",
    },
  ])

  // Estado para filtros
  const [filtroTipo, setFiltroTipo] = useState<string[]>([])
  const [filtroLidas, setFiltroLidas] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState("todas")
  const [notificacoesFiltradas, setNotificacoesFiltradas] = useState<Notificacao[]>(notificacoes)

  // Efeito para filtrar notificações
  useEffect(() => {
    let filtradas = [...notificacoes]

    // Filtrar por tipo
    if (filtroTipo.length > 0) {
      filtradas = filtradas.filter((notificacao) => filtroTipo.includes(notificacao.tipo))
    }

    // Filtrar por lidas/não lidas
    if (filtroLidas !== null) {
      filtradas = filtradas.filter((notificacao) => notificacao.lida === filtroLidas)
    }

    // Filtrar por tab
    if (activeTab === "nao-lidas") {
      filtradas = filtradas.filter((notificacao) => !notificacao.lida)
    } else if (activeTab === "urgentes") {
      filtradas = filtradas.filter((notificacao) => notificacao.tipo === "urgente")
    }

    setNotificacoesFiltradas(filtradas)
  }, [notificacoes, filtroTipo, filtroLidas, activeTab])

  // Função para marcar notificação como lida
  const marcarComoLida = (id: number) => {
    setNotificacoes((prev) =>
      prev.map((notificacao) => (notificacao.id === id ? { ...notificacao, lida: true } : notificacao)),
    )
  }

  // Função para excluir notificação
  const excluirNotificacao = (id: number) => {
    setNotificacoes((prev) => prev.filter((notificacao) => notificacao.id !== id))
  }

  // Função para marcar todas como lidas
  const marcarTodasComoLidas = () => {
    setNotificacoes((prev) => prev.map((notificacao) => ({ ...notificacao, lida: true })))
  }

  // Simulação de novas notificações chegando
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% de chance de receber uma nova notificação a cada 30 segundos
      if (Math.random() < 0.1) {
        const novaNotificacao: Notificacao = {
          id: Date.now(),
          titulo: "Nova Atualização de Sistema",
          descricao: "O sistema foi atualizado com novas funcionalidades. Clique para saber mais.",
          data: new Date().toLocaleDateString(),
          tempo: "Agora",
          tipo: Math.random() < 0.3 ? "urgente" : Math.random() < 0.7 ? "informacao" : "sucesso",
          lida: false,
        }
        setNotificacoes((prev) => [novaNotificacao, ...prev])
      }
    }, 30000) // A cada 30 segundos

    return () => clearInterval(interval)
  }, [])

  // Função para obter o ícone baseado no tipo
  const getIconByType = (tipo: string) => {
    switch (tipo) {
      case "urgente":
        return <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
      case "informacao":
        return <Calendar className="h-4 w-4 text-blue-500 mr-2" />
      case "sucesso":
        return <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
      default:
        return <Bell className="h-4 w-4 mr-2" />
    }
  }

  // Função para obter a classe do badge baseado no tipo
  const getBadgeClassByType = (tipo: string) => {
    switch (tipo) {
      case "urgente":
        return "bg-red-100 text-red-800 border-red-300"
      case "informacao":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "sucesso":
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  // Contagem de notificações não lidas
  const naoLidasCount = notificacoes.filter((n) => !n.lida).length

  return (
    <div className="flex flex-col p-4 md:p-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">{naoLidasCount} notificações não lidas</p>
        </div>
        <div className="flex gap-2">
          {naoLidasCount > 0 && (
            <Button variant="outline" onClick={marcarTodasComoLidas}>
              <Eye className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuCheckboxItem
                checked={filtroTipo.includes("urgente")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFiltroTipo((prev) => [...prev, "urgente"])
                  } else {
                    setFiltroTipo((prev) => prev.filter((t) => t !== "urgente"))
                  }
                }}
              >
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                Urgentes
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filtroTipo.includes("informacao")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFiltroTipo((prev) => [...prev, "informacao"])
                  } else {
                    setFiltroTipo((prev) => prev.filter((t) => t !== "informacao"))
                  }
                }}
              >
                <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                Informações
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filtroTipo.includes("sucesso")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFiltroTipo((prev) => [...prev, "sucesso"])
                  } else {
                    setFiltroTipo((prev) => prev.filter((t) => t !== "sucesso"))
                  }
                }}
              >
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Sucessos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filtroLidas === true}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFiltroLidas(true)
                  } else {
                    setFiltroLidas(null)
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Lidas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filtroLidas === false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFiltroLidas(false)
                  } else {
                    setFiltroLidas(null)
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Não lidas
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="todas">
            Todas
            <Badge className="ml-2 bg-gray-100 text-gray-800">{notificacoes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="nao-lidas">
            Não lidas
            <Badge className="ml-2 bg-blue-100 text-blue-800">{notificacoes.filter((n) => !n.lida).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="urgentes">
            Urgentes
            <Badge className="ml-2 bg-red-100 text-red-800">
              {notificacoes.filter((n) => n.tipo === "urgente").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-0">
          <div className="grid gap-4">
            {notificacoesFiltradas.length > 0 ? (
              notificacoesFiltradas.map((notificacao) => (
                <Card key={notificacao.id} className={notificacao.lida ? "opacity-70" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center text-base">
                          {getIconByType(notificacao.tipo)}
                          {notificacao.titulo}
                        </CardTitle>
                        <CardDescription>{notificacao.relacionado}</CardDescription>
                      </div>
                      <Badge variant="outline" className={getBadgeClassByType(notificacao.tipo)}>
                        {notificacao.tipo === "urgente"
                          ? "Urgente"
                          : notificacao.tipo === "informacao"
                            ? "Informação"
                            : "Sucesso"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{notificacao.descricao}</p>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {notificacao.tempo}
                      </div>
                      <div className="flex gap-2">
                        {!notificacao.lida && (
                          <Button variant="ghost" size="sm" onClick={() => marcarComoLida(notificacao.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Marcar como lida
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => excluirNotificacao(notificacao.id)}>
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-medium">Nenhuma notificação encontrada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Não há notificações que correspondam aos filtros selecionados.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="nao-lidas" className="mt-0">
          <div className="grid gap-4">
            {notificacoesFiltradas.length > 0 ? (
              notificacoesFiltradas.map((notificacao) => (
                <Card key={notificacao.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center text-base">
                          {getIconByType(notificacao.tipo)}
                          {notificacao.titulo}
                        </CardTitle>
                        <CardDescription>{notificacao.relacionado}</CardDescription>
                      </div>
                      <Badge variant="outline" className={getBadgeClassByType(notificacao.tipo)}>
                        {notificacao.tipo === "urgente"
                          ? "Urgente"
                          : notificacao.tipo === "informacao"
                            ? "Informação"
                            : "Sucesso"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{notificacao.descricao}</p>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {notificacao.tempo}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => marcarComoLida(notificacao.id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Marcar como lida
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => excluirNotificacao(notificacao.id)}>
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 opacity-20 mb-4" />
                <h3 className="text-lg font-medium">Todas as notificações foram lidas</h3>
                <p className="text-sm text-muted-foreground mt-1">Você não tem notificações não lidas no momento.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="urgentes" className="mt-0">
          <div className="grid gap-4">
            {notificacoesFiltradas.length > 0 ? (
              notificacoesFiltradas.map((notificacao) => (
                <Card key={notificacao.id} className={notificacao.lida ? "opacity-70" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center text-base">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                          {notificacao.titulo}
                        </CardTitle>
                        <CardDescription>{notificacao.relacionado}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                        Urgente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{notificacao.descricao}</p>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {notificacao.tempo}
                      </div>
                      <div className="flex gap-2">
                        {!notificacao.lida && (
                          <Button variant="ghost" size="sm" onClick={() => marcarComoLida(notificacao.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Marcar como lida
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => excluirNotificacao(notificacao.id)}>
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-medium">Nenhuma notificação urgente</h3>
                <p className="text-sm text-muted-foreground mt-1">Você não tem notificações urgentes no momento.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

