"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Upload, Plus, Trash2, Download, Eye } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DocumentosLicitacaoProps {
  licitacaoId: string
  isEditing: boolean
}

interface Documento {
  id: string
  nome: string
  url: string
  arquivo: string
  tipo: string
  formato: string
  tamanho: number
  categoria: string
  categoriaId: string
  status: string
  dataCriacao: string
  dataAtualizacao: string
  categorias: string[]
}

export function DocumentosLicitacao({ licitacaoId, isEditing }: DocumentosLicitacaoProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [documentoParaExcluir, setDocumentoParaExcluir] = useState<string | null>(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [uploadando, setUploadando] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    categoriaId: ""
  })

  // Carregar documentos
  useEffect(() => {
    const carregarDocumentos = async () => {
      try {
        setCarregando(true)
        const response = await fetch(`/api/licitacoes/${licitacaoId}/documentos`)
        
        if (response.ok) {
          const data = await response.json()
          setDocumentos(data)
        } else {
          console.error("Erro ao carregar documentos:", response.statusText)
          toast.error("Não foi possível carregar os documentos da licitação")
        }
      } catch (error) {
        console.error("Erro ao carregar documentos:", error)
        toast.error("Erro ao carregar dados dos documentos")
      } finally {
        setCarregando(false)
      }
    }

    if (licitacaoId) {
      carregarDocumentos()
    }
  }, [licitacaoId])

  // Manipular seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setArquivoSelecionado(file)
      
      // Preencher o nome do documento com o nome do arquivo se estiver vazio
      if (!formData.nome) {
        setFormData(prev => ({
          ...prev,
          nome: file.name.split('.')[0] // Remove a extensão
        }))
      }
    }
  }

  // Fazer upload de documento
  const uploadDocumento = async () => {
    try {
      if (!arquivoSelecionado) {
        toast.error("Selecione um arquivo para upload")
        return
      }

      if (!formData.tipo) {
        toast.error("Selecione o tipo do documento")
        return
      }

      if (!formData.categoriaId) {
        toast.error("Selecione a categoria do documento")
        return
      }

      setUploadando(true)

      // Criar FormData para envio
      const formDataObj = new FormData()
      formDataObj.append('file', arquivoSelecionado)
      formDataObj.append('licitacaoId', licitacaoId)
      formDataObj.append('nome', formData.nome || arquivoSelecionado.name)
      formDataObj.append('tipo', formData.tipo)
      formDataObj.append('categoriaId', formData.categoriaId)

      // Enviar para a API
      const response = await fetch('/api/licitacoes/documentos/upload', {
        method: 'POST',
        body: formDataObj
      })

      if (response.ok) {
        const documentoAdicionado = await response.json()
        setDocumentos(prev => [...prev, documentoAdicionado])
        
        // Limpar formulário
        setArquivoSelecionado(null)
        setFormData({
          nome: "",
          tipo: "",
          categoriaId: ""
        })
        
        setDialogAberto(false)
        toast.success("Documento enviado com sucesso")
      } else {
        const erro = await response.json()
        console.error("Erro ao fazer upload:", erro)
        toast.error(erro.error || "Não foi possível fazer o upload do documento")
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error)
      toast.error("Erro ao fazer upload do documento")
    } finally {
      setUploadando(false)
    }
  }

  // Excluir documento
  const excluirDocumento = async (documentoId: string) => {
    try {
      const response = await fetch(`/api/licitacoes/${licitacaoId}/documentos/${documentoId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setDocumentos(prev => prev.filter(d => d.id !== documentoId))
        setDocumentoParaExcluir(null)
        toast.success("Documento excluído com sucesso")
      } else {
        console.error("Erro ao excluir documento:", response.statusText)
        toast.error("Não foi possível excluir o documento")
      }
    } catch (error) {
      console.error("Erro ao excluir documento:", error)
      toast.error("Erro ao excluir documento")
    }
  }

  // Formatar tamanho do arquivo
  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Obter ícone baseado no formato do arquivo
  const getIconeFormato = (formato: string) => {
    // Aqui você pode adicionar lógica para retornar ícones diferentes baseados no formato
    return <FileText className="h-4 w-4" />
  }

  // NOVO: filtro por categoria/tags
  const filtrarPorCategoria = (docs: Documento[], categoria: string) => docs.filter(doc => doc.categorias && doc.categorias.includes(categoria));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-500">Documentos da Licitação</h3>
        
        {isEditing && (
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload de Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Documento</DialogTitle>
                <DialogDescription>
                  Selecione um arquivo e preencha as informações para fazer o upload.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="arquivo">Arquivo</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {arquivoSelecionado && (
                    <p className="text-xs text-gray-500">
                      {arquivoSelecionado.name} ({formatarTamanho(arquivoSelecionado.size)})
                    </p>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Documento</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Nome do documento"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Edital">Edital</SelectItem>
                      <SelectItem value="Proposta">Proposta</SelectItem>
                      <SelectItem value="Certidão">Certidão</SelectItem>
                      <SelectItem value="Contrato">Contrato</SelectItem>
                      <SelectItem value="Planilha">Planilha</SelectItem>
                      <SelectItem value="Atestado">Atestado</SelectItem>
                      <SelectItem value="Documento">Documento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={formData.categoriaId} onValueChange={(value) => setFormData({...formData, categoriaId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="projetos">Projetos</SelectItem>
                      <SelectItem value="contabeis">Contábeis</SelectItem>
                      <SelectItem value="societarios">Societários</SelectItem>
                      <SelectItem value="juridicos">Jurídicos</SelectItem>
                      <SelectItem value="atestado_capacidade">Atestado de Capacidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={uploadando}>
                  Cancelar
                </Button>
                <Button onClick={uploadDocumento} disabled={uploadando || !arquivoSelecionado}>
                  {uploadando ? "Enviando..." : "Enviar Documento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {carregando ? (
        <div className="text-center py-8">Carregando documentos...</div>
      ) : documentos.length > 0 ? (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documentos.map((documento) => (
                <tr key={documento.id}>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center">
                      {getIconeFormato(documento.formato)}
                      <span className="ml-2">{documento.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{documento.tipo}</td>
                  <td className="px-4 py-3 text-sm">{documento.categoria}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatarTamanho(documento.tamanho)}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex justify-center space-x-2">
                      <a
                        href={documento.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <a
                        href={documento.url}
                        download
                        className="text-green-500 hover:text-green-700"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {isEditing && (
                        <button
                          onClick={() => setDocumentoParaExcluir(documento.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-gray-50">
          <p className="text-gray-500">Nenhum documento cadastrado para esta licitação.</p>
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => setDialogAberto(true)}
            >
              <Upload className="w-4 h-4" />
              Upload de Documento
            </Button>
          )}
        </div>
      )}
      
      <AlertDialog open={!!documentoParaExcluir} onOpenChange={(open) => !open && setDocumentoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentoParaExcluir && excluirDocumento(documentoParaExcluir)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}