"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Save, Upload, FileText, LinkIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useLicitacoes, Licitacao } from "@/hooks/useLicitacoes"
import { MultiSelectTags } from "@/components/ui/multi-select-tags";

interface NovoDocumentoProps {
  onDocumentoAdded?: (documento: any, arquivo?: File) => void
}

export function NovoDocumento({ onDocumentoAdded }: NovoDocumentoProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  // Usar o hook para buscar licitações
  const { licitacoes, loading: loadingLicitacoes, fetchLicitacoes } = useLicitacoes()

  // Estados para os campos do formulário
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    tags: [] as string[],
    licitacao: "",
    descricao: "",
    numeroDocumento: "",
    urlDocumento: "",
    dataValidade: "",
  })

  // Estado para arquivos anexados
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  
  // Carregar licitações quando o componente montar e não apenas quando o diálogo for aberto
  useEffect(() => {
    // Tentar carregar as licitações imediatamente ao montar o componente
    fetchLicitacoes()
  }, [fetchLicitacoes])
  
  // Efeito adicional para abrir o diálogo
  useEffect(() => {
    if (open && licitacoes.length === 0 && !loadingLicitacoes) {
      // Se abrir o diálogo e não tiver licitações carregadas ainda, tenta carregar novamente
      fetchLicitacoes()
    }
  }, [open, licitacoes.length, loadingLicitacoes, fetchLicitacoes])

  // Funções de manipulação de formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTagsChange = (values: string[]) => {
    setFormData((prev) => ({ ...prev, tags: values }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivoSelecionado(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    // Validar campos obrigatórios
    if (!formData.nome || !formData.tipo || !formData.tags.length) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Encontrar detalhes da licitação selecionada (se houver)
      let licitacaoNome = "Não vinculado"
      if (formData.licitacao !== "sem_licitacao") {
        const licitacaoSelecionada = licitacoes.find(lic => lic.id === formData.licitacao)
        if (licitacaoSelecionada) {
          // Combinamos a modalidade e número para exibição amigável
          licitacaoNome = `${licitacaoSelecionada.modalidade} ${licitacaoSelecionada.numero}`
        }
      }
      
      // Criar objeto de documento
      const novoDocumento = {
        nome: formData.nome,
        tipo: formData.tipo,
        tags: formData.tags,
        licitacao: formData.licitacao === "sem_licitacao" ? "Não vinculado" : licitacaoNome,
        licitacaoId: formData.licitacao === "sem_licitacao" ? "" : formData.licitacao,
        dataUpload: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
        tamanho: arquivoSelecionado ? `${(arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB` : "0 KB",
        dataValidade: formData.dataValidade ? format(new Date(formData.dataValidade), "dd/MM/yyyy", { locale: ptBR }) : "",
        descricao: formData.descricao,
        numeroDocumento: formData.numeroDocumento,
        urlDocumento: formData.urlDocumento,
        uploadPor: "Usuário atual" // Idealmente substituir pelo nome do usuário logado
      }

      // Notificar componente pai
      if (onDocumentoAdded) {
        await onDocumentoAdded(novoDocumento, arquivoSelecionado || undefined)
      }

      // Resetar formulário
      setFormData({
        nome: "",
        tipo: "",
        tags: [],
        licitacao: "",
        descricao: "",
        numeroDocumento: "",
        urlDocumento: "",
        dataValidade: "",
      })
      setArquivoSelecionado(null)

      // Fechar o diálogo
      setOpen(false)
      
      toast({
        title: "Documento criado",
        description: "O documento foi criado com sucesso!",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao criar documento",
        description: error.message || "Ocorreu um erro ao criar o documento.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Categorias disponíveis
  const categoriasDisponiveis = [
    { value: "juridicos", label: "Jurídicos" },
    { value: "contabeis", label: "Contábeis" },
    { value: "projetos", label: "Projetos" },
    { value: "tecnicos", label: "Técnicos" },
    { value: "societarios", label: "Societários" },
    { value: "licitacao", label: "Licitação" },
    { value: "comercial", label: "Comercial" },
  ];

  // Formatar o nome da licitação para exibição (modalidade + número)
  const formatarNomeLicitacao = (licitacao: Licitacao): string => {
    return `${licitacao.modalidade} ${licitacao.numero}`;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-primary text-white">
          <Plus className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Documento</DialogTitle>
          <DialogDescription>
            Preencha os dados para cadastrar um novo documento. Campos com <span className="text-red-500">*</span> são
            obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome do Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Ex: Contrato de Prestação de Serviços"
                value={formData.nome}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select name="tipo" value={formData.tipo} onValueChange={(value) => handleSelectChange("tipo", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contrato">Contrato</SelectItem>
                  <SelectItem value="Edital">Edital</SelectItem>
                  <SelectItem value="Proposta">Proposta</SelectItem>
                  <SelectItem value="Certidão">Certidão</SelectItem>
                  <SelectItem value="Nota Fiscal">Nota Fiscal</SelectItem>
                  <SelectItem value="Atestado">Atestado</SelectItem>
                  <SelectItem value="Declaração">Declaração</SelectItem>
                  <SelectItem value="Apresentação">Apresentação</SelectItem>
                  <SelectItem value="Planilha">Planilha</SelectItem>
                  <SelectItem value="Documento Legal">Documento Legal</SelectItem>
                  <SelectItem value="Ata">Ata</SelectItem>
                  <SelectItem value="Relatório">Relatório</SelectItem>
                  <SelectItem value="Parecer">Parecer</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags <span className="text-red-500">*</span>
              </Label>
              <MultiSelectTags
                options={categoriasDisponiveis}
                value={formData.tags}
                onChange={handleTagsChange}
                placeholder="Selecione as tags"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {(Array.isArray(formData.tags) ? formData.tags : []).map((cat) => {
                  const label = categoriasDisponiveis.find(c => c.value === cat)?.label || cat;
                  return (
                    <span key={cat} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{label}</span>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="licitacao">Licitação (opcional)</Label>
              <Select
                value={formData.licitacao}
                onValueChange={(value) => handleSelectChange("licitacao", value)}
              >
                <SelectTrigger
                  id="licitacao"
                  className={loadingLicitacoes ? "animate-pulse" : ""}
                >
                  <SelectValue placeholder="Vincular à licitação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_licitacao">Não vincular</SelectItem>
                  {loadingLicitacoes ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      Carregando licitações...
                    </div>
                  ) : licitacoes && licitacoes.length > 0 ? (
                    licitacoes.map((licitacao) => (
                      <SelectItem key={licitacao.id} value={licitacao.id}>
                        {formatarNomeLicitacao(licitacao)}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      Nenhuma licitação encontrada
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Descreva o documento"
              className="min-h-[80px]"
              value={formData.descricao}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroDocumento">Número do Documento</Label>
              <Input
                id="numeroDocumento"
                name="numeroDocumento"
                placeholder="Ex: 123/2023"
                value={formData.numeroDocumento}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataValidade">Data de Validade</Label>
              <Input
                id="dataValidade"
                name="dataValidade"
                type="date"
                value={formData.dataValidade}
                onChange={handleInputChange}
                className="w-full"
                min={new Date().toISOString().split('T')[0]} // Data mínima é hoje
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urlDocumento">URL do Documento (opcional)</Label>
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                id="urlDocumento"
                name="urlDocumento"
                placeholder="https://..."
                value={formData.urlDocumento}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload do Documento</Label>
            <div className="border rounded-md p-4">
              <Input type="file" onChange={handleFileChange} className="cursor-pointer" />
              {arquivoSelecionado && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>{arquivoSelecionado.name}</span>
                  <span className="text-muted-foreground">
                    ({(arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-white pt-4 pb-2 border-t mt-2">
          <div className="text-sm text-muted-foreground">
            <span className="text-red-500">*</span> Campos obrigatórios
          </div>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#1B3A53] hover:bg-[#2c5a80]"
          >
            {isSubmitting ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Documento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
