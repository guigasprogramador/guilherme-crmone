"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Save, Plus, Trash2, FileText, Loader2 } from "lucide-react" // Adicionado Loader2
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface ResumoLicitacaoProps {
  licitacaoId: string
  isEditing: boolean
}

interface Resumo {
  id: string
  licitacao_id: string
  conteudo: string
  pontos_importantes: string[]
  data_criacao: string
  data_atualizacao: string
}

export function ResumoLicitacao({ licitacaoId, isEditing }: ResumoLicitacaoProps) {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [conteudo, setConteudo] = useState("")
  const [novoPonto, setNovoPonto] = useState("")
  const [pontosImportantes, setPontosImportantes] = useState<string[]>([])
  const [editado, setEditado] = useState(false)
  const [isSaving, setIsSaving] = useState(false); // Estado para salvar

  // Carregar resumo
  useEffect(() => {
    const carregarResumo = async () => {
      try {
        setCarregando(true)
        const response = await fetch(`/api/licitacoes/${licitacaoId}/resumo`)
        
        if (response.ok) {
          const data = await response.json()
          // Verifica se recebemos dados válidos
          if (data && (data.id || data.licitacao_id)) {
            setResumo(data)
            setConteudo(data.conteudo || "")
            setPontosImportantes(data.pontos_importantes || [])
          } else {
            // Inicializa com valores vazios se não houver resumo
            setResumo(null)
            setConteudo("")
            setPontosImportantes([])
          }
        } else {
          console.error("Erro ao carregar resumo:", response.statusText)
          toast.error("Não foi possível carregar o resumo da licitação")
        }
      } catch (error) {
        console.error("Erro ao carregar resumo:", error)
        toast.error("Erro ao carregar resumo")
      } finally {
        setCarregando(false)
      }
    }

    if (licitacaoId) {
      carregarResumo()
    }
  }, [licitacaoId])

  // Salvar resumo
  const salvarResumo = async () => {
    setIsSaving(true); // Inicia o salvamento
    try {
      const method = "PUT"; // API PUT faz upsert
      const url = `/api/licitacoes/${licitacaoId}/resumo`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conteudo,
          pontos_importantes: pontosImportantes
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResumo(data)
        setEditado(false)
        toast.success("Resumo salvo com sucesso")
      } else {
        console.error("Erro ao salvar resumo:", response.statusText)
        toast.error("Não foi possível salvar o resumo")
      }
    } catch (error) {
      console.error("Erro ao salvar resumo:", error)
      toast.error("Erro ao salvar resumo")
    } finally {
      setIsSaving(false); // Finaliza o salvamento
    }
  }

  // Adicionar ponto importante
  const adicionarPonto = () => {
    if (!novoPonto.trim()) return
    
    setPontosImportantes([...pontosImportantes, novoPonto.trim()])
    setNovoPonto("")
    setEditado(true)
  }

  // Remover ponto importante
  const removerPonto = (index: number) => {
    const novosPontos = [...pontosImportantes]
    novosPontos.splice(index, 1)
    setPontosImportantes(novosPontos)
    setEditado(true)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">Resumo da Licitação</h3>
          
          {carregando ? (
            <div className="text-center py-4">Carregando resumo...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="conteudo">Conteúdo do Resumo</Label>
                {isEditing ? (
                  <Textarea
                    id="conteudo"
                    value={conteudo}
                    onChange={(e) => {
                      setConteudo(e.target.value)
                      setEditado(true)
                    }}
                    className="min-h-[200px]"
                    placeholder="Descreva os principais pontos da licitação..."
                  />
                ) : (
                  <div className="mt-2 p-3 border rounded-md bg-gray-50">
                    {conteudo ? (
                      <p className="whitespace-pre-wrap">{conteudo}</p>
                    ) : (
                      <p className="text-gray-500 italic">Nenhum resumo cadastrado para esta licitação.</p>
                    )}
                  </div>
                )}
              </div>

              {isEditing && editado && (
                <div className="flex justify-end">
                  <Button onClick={salvarResumo} className="gap-2" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? "Salvando..." : "Salvar Resumo"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">Pontos Importantes</h3>
          
          {carregando ? (
            <div className="text-center py-4">Carregando pontos importantes...</div>
          ) : (
            <div className="space-y-4">
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    value={novoPonto}
                    onChange={(e) => setNovoPonto(e.target.value)}
                    placeholder="Adicionar ponto importante"
                    onKeyDown={(e) => e.key === 'Enter' && adicionarPonto()}
                  />
                  <Button onClick={adicionarPonto}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {pontosImportantes.length > 0 ? (
                  pontosImportantes.map((ponto, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                      {ponto}
                      {isEditing && (
                        <button 
                          onClick={() => removerPonto(index)}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-500 italic">
                    {isEditing 
                      ? "Adicione pontos importantes para destacar nesta licitação."
                      : "Nenhum ponto importante destacado para esta licitação."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}