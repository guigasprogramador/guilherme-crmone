"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar" // Renomeado para evitar conflito
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Building2,
  Calendar,
  Edit,
  Save,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  LinkIcon,
  DollarSign,
  User,
  AlertTriangle,
  BadgeDollarSign,
  Plus,
  Maximize2,
  Minimize2,
  Loader2,
  ClipboardList, // Para aba Etapas
  Users as UsersIcon // Para Responsável da Etapa
} from "lucide-react"
import { toast } from "sonner"
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
import { ResumoLicitacao } from "./resumo-licitacao"
import { ServicosLicitacao } from "./servicos-licitacao"
import { VisualizadorDocumentos } from "@/components/documentos/visualizador-documentos"
import { Licitacao, OrgaoDetalhado as OrgaoType } from "@/hooks/useLicitacoesOtimizado";
import { useLicitacaoEtapas, LicitacaoEtapa, LicitacaoEtapaPayload } from "@/hooks/comercial/useLicitacaoEtapas" // Ajuste o caminho se necessário
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";


interface DetalhesLicitacaoProps {
  licitacao: Licitacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  onOrgaoClick?: (orgao: OrgaoType) => void;
  onLicitacaoUpdate?: (licitacao: Licitacao) => void;
  onLicitacaoDelete?: (licitacao: Licitacao) => void;
  onLicitacaoNeedsRefresh?: () => void;
}

// ... (statusColors, statusLabels, flowSteps mantidos)
const statusColors: Record<string, string> = {
  analise_interna: "bg-blue-100 text-blue-800 border-blue-300",
  aguardando_pregao: "bg-purple-100 text-purple-800 border-purple-300",
  vencida: "bg-green-100 text-green-800 border-green-300",
  nao_vencida: "bg-red-100 text-red-800 border-red-300",
  envio_documentos: "bg-yellow-100 text-yellow-800 border-yellow-300",
  assinaturas: "bg-orange-100 text-orange-800 border-orange-300",
  concluida: "bg-emerald-100 text-emerald-800 border-emerald-300",
  elaboracao_proposta: "bg-teal-100 text-teal-800 border-teal-300",
  em_disputa: "bg-cyan-100 text-cyan-800 border-cyan-300",
  cancelada: "bg-gray-100 text-gray-800 border-gray-300",
  suspensa: "bg-rose-100 text-rose-800 border-rose-300",
  impugnada: "bg-pink-100 text-pink-800 border-pink-300",
  // Status para Etapas
  pendente: "bg-gray-200 text-gray-700",
  em_andamento: "bg-blue-200 text-blue-700",
  // concluida: "bg-green-200 text-green-700", // Já definido, mas pode ser diferente para etapas
  atrasada: "bg-red-200 text-red-700",
  // cancelada: "bg-gray-400 text-white", // Já definido
};

const statusEtapaLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

const statusEtapaOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];


const statusLabels: Record<string, string> = {
  analise_interna: "Análise Interna",
  aguardando_pregao: "Aguardando Pregão",
  vencida: "Vencida",
  nao_vencida: "Não Vencida",
  envio_documentos: "Envio de Documentos",
  assinaturas: "Assinaturas",
  concluida: "Concluída",
  elaboracao_proposta: "Elaboração de Proposta",
  em_disputa: "Em Disputa",
  cancelada: "Cancelada",
  suspensa: "Suspensa",
  impugnada: "Impugnada",
};

const flowSteps = [
  { id: "analise_interna", label: "Análise Interna" },
  { id: "elaboracao_proposta", label: "Elaboração de Proposta" },
  { id: "aguardando_pregao", label: "Aguardando Pregão" },
  { id: "em_disputa", label: "Em Disputa" },
  { id: "envio_documentos", label: "Envio de Documentos" },
  { id: "assinaturas", label: "Assinaturas" },
  { id: "vencida", label: "Vencida" },
  { id: "nao_vencida", label: "Não Vencida" },
  { id: "concluida", label: "Concluída" },
  { id: "cancelada", label: "Cancelada" },
  { id: "suspensa", label: "Suspensa" },
  { id: "impugnada", label: "Impugnada" },
];

type LicitacaoWithValores = Licitacao & { valorProposta?: number; valorHomologado?: number };

export function DetalhesLicitacao({
  licitacao,
  open,
  onOpenChange,
  onUpdateStatus,
  onOrgaoClick,
  onLicitacaoUpdate,
  onLicitacaoDelete,
  onLicitacaoNeedsRefresh,
}: DetalhesLicitacaoProps) {
  const { user } = useAuth();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [activeTab, setActiveTab] = useState("resumo")
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<LicitacaoWithHomologado>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [uploadando, setUploadando] = useState(false);

  const [documentosLicitacao, setDocumentosLicitacao] = useState<any[]>([])
  const [carregandoDocumentos, setCarregandoDocumentos] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState("")
  const [enviandoArquivo, setEnviandoArquivo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)

  const [docParaExcluir, setDocParaExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [showConfirmDeleteDocModal, setShowConfirmDeleteDocModal] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  // Estados para Etapas
  const {
    etapas,
    isLoading: isLoadingEtapas,
    error: errorEtapas,
    createEtapa,
    updateEtapa,
    deleteEtapa,
    fetchEtapas, // Para re-fetch manual se necessário
  } = useLicitacaoEtapas(licitacao?.id);

  const [showEtapaModal, setShowEtapaModal] = useState(false);
  const initialEtapaFormData: Partial<LicitacaoEtapaPayload> = { nome: "", descricao: "", dataLimite: "", status: "pendente", responsavelId: "", observacoes: "", dataConclusao: "" };
  const [etapaFormData, setEtapaFormData] = useState<Partial<LicitacaoEtapaPayload>>(initialEtapaFormData);
  const [etapaEmEdicao, setEtapaEmEdicao] = useState<LicitacaoEtapa | null>(null);

  const [isSubmittingEtapa, setIsSubmittingEtapa] = useState(false);
  const [todosResponsaveisParaEtapa, setTodosResponsaveisParaEtapa] = useState<Array<{ id: string, name: string }>>([]);
  const [etapaParaExcluirId, setEtapaParaExcluirId] = useState<string | null>(null);
  const [showConfirmDeleteEtapaModal, setShowConfirmDeleteEtapaModal] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("resumo");
      setIsEditing(false);
      // Resetar estados de modais de etapa ao abrir o painel principal
      setShowEtapaModal(false);
      setEtapaEmEdicao(null);
      setEtapaFormData(initialEtapaFormData);
    }
  }, [open]);

  useEffect(() => {
    if (licitacao) {
      // Tratar valorEstimado como número para o formulário
      let valorEstimadoNumerico = null;
      if (licitacao._valorEstimadoNumerico !== undefined) {
        valorEstimadoNumerico = licitacao._valorEstimadoNumerico;
      } else if (licitacao.valorEstimado) {
        // Se valorEstimado for uma string formatada, converter para número
        const valorLimpo = String(licitacao.valorEstimado).replace(/[^0-9,.-]+/g, '').replace('.', '').replace(',', '.');
        valorEstimadoNumerico = valorLimpo ? parseFloat(valorLimpo) : null;
      }
      
      setFormData({
        ...licitacao,
        valorEstimado: valorEstimadoNumerico,
        orgao: typeof licitacao.orgao === 'object' ? licitacao.orgao?.nome : licitacao.orgao,
        orgaoId: licitacao.orgaoId || (typeof licitacao.orgao === 'object' ? licitacao.orgao?.id : null),
        responsaveis: licitacao.responsaveis || [],
      });
    }
  }, [licitacao]);

  useEffect(() => {
    if (licitacao?.id && open) { // Apenas carregar se o painel estiver aberto e tiver licitacaoId
      if (activeTab === "documentos") buscarDocumentos(licitacao.id);
      if (activeTab === "etapas") fetchEtapas(licitacao.id); // Hook useLicitacaoEtapas já faz isso, mas podemos forçar se necessário
    }
  }, [activeTab, licitacao?.id, open, fetchEtapas]); // Adicionado open

  // Carregar responsáveis para o Select do formulário de etapa
  useEffect(() => {
    const carregarResponsaveisParaEtapas = async () => {
      if (showEtapaModal) { // Carregar apenas quando o modal estiver visível
        try {
          // TODO: Adicionar header de autenticação
          const response = await fetch('/api/users?filterByRole=user&filterByRole=admin'); // Ajuste a API e filtros
          if (!response.ok) throw new Error('Falha ao buscar responsáveis');
          const data = await response.json();
          setTodosResponsaveisParaEtapa(data.map((u: any) => ({ id: u.id, name: u.name || u.email })));
        } catch (error) {
          console.error("Erro ao buscar responsáveis para etapas:", error);
          toast.error("Não foi possível carregar a lista de responsáveis.");
        }
      }
    };
    carregarResponsaveisParaEtapas();
  }, [showEtapaModal]);


  const buscarDocumentos = async (licitacaoId: string) => {
    try {
      setCarregandoDocumentos(true);
      const response = await fetch(`/api/licitacoes/${licitacaoId}/documentos`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocumentosLicitacao(data);
      } else {
        console.error("Erro ao carregar documentos:", response.statusText);
        toast.error("Não foi possível carregar os documentos da licitação");
      }
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      toast.error("Erro ao carregar dados dos documentos");
    } finally {
      setCarregandoDocumentos(false);
    }
  };
  const baixarDocumento = (url: string, nome: string) => {
    try {
      // Criar um link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast.error('Erro ao baixar o documento');
    }
  };
  const uploadDocumento = async () => {
  try {
    if (!arquivoSelecionado) {
      toast.error("Selecione um arquivo para upload");
      return;
    }
    if (!tipoDocumento) {
      toast.error("Selecione o tipo do documento");
      return;
    }
    // Adicione aqui outros campos obrigatórios se necessário

    setEnviandoArquivo(true);

    // Verifica se o usuário está autenticado
    if (!user || !user.id) {
      toast.error("Usuário não autenticado. Faça login novamente.");
      setEnviandoArquivo(false);
      return;
    }

    // Cria o FormData para envio
    const formDataObj = new FormData();
    formDataObj.append('file', arquivoSelecionado);
    if (licitacao?.id) formDataObj.append('licitacaoId', licitacao.id.toString());
    formDataObj.append('nome', arquivoSelecionado.name);
    formDataObj.append('tipo', tipoDocumento);
    // Adiciona o campo obrigatório uploadPor (ID do usuário)
    formDataObj.append('uploadPor', user.id);

    // Envia para o backend
    const response = await fetch('/api/licitacoes/documentos/upload', {
      method: 'POST',
      credentials: 'include',
      body: formDataObj,
    });

    if (response.ok) {
      // Limpa o formulário e fecha o dialog
      setArquivoSelecionado(null);
      setTipoDocumento('');
      setUploadDialogOpen(false);
      toast.success("Documento enviado com sucesso");
      // Atualize a lista de documentos, se necessário
      if (licitacao?.id) buscarDocumentos(licitacao.id);
    } else {
      const erro = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      toast.error(erro.error || "Não foi possível fazer o upload do documento");
    }
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    toast.error("Erro ao fazer upload do documento");
  } finally {
    setEnviandoArquivo(false);
  }
};
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoSelecionado(file);
    }
  };
  
  const handleDeleteDocumentoClick = (doc: { id: string; nome: string }) => {
    setDocParaExcluir(doc);
    setShowConfirmDeleteDocModal(true);
  };
  const handleConfirmDeleteDocumento = async () => {
    if (!docParaExcluir) return;
    
    try {
      setIsDeletingDocument(true);
      const response = await fetch(`/api/licitacoes/documentos/upload?id=${docParaExcluir.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Documento excluído com sucesso');
        // Atualizar a lista de documentos
        if (licitacao?.id) {
          buscarDocumentos(licitacao.id);
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(error.error || 'Erro ao excluir documento');
      }
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Erro ao excluir documento');
    } finally {
      setIsDeletingDocument(false);
      setShowConfirmDeleteDocModal(false);
      setDocParaExcluir(null);
    }
  };
  const handleFieldChange = (field: keyof Licitacao, value: any) => {
    // Tratamento especial para campos numéricos
    if (field === 'valorEstimado' || field === 'valorProposta' || field === 'valorHomologado') {
      // Converter string para número, removendo formatação se necessário
      const numericValue = value === '' || value === null || value === undefined ? null : parseFloat(String(value).replace(/[^0-9,.-]+/g, '').replace('.', '').replace(',', '.'));
      setFormData(prev => ({
        ...prev,
        [field]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  const handleSave = async () => {
    try {
      if (!licitacao?.id) {
        toast.error('ID da licitação não encontrado');
        return;
      }

      const response = await fetch(`/api/licitacoes/${licitacao.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const updatedLicitacao = await response.json();
        toast.success('Licitação atualizada com sucesso');
        setIsEditing(false);
        
        // Notificar o componente pai sobre a atualização
        if (onLicitacaoUpdate) {
          onLicitacaoUpdate(updatedLicitacao);
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(error.error || 'Erro ao atualizar licitação');
      }
    } catch (error) {
      console.error('Erro ao salvar licitação:', error);
      toast.error('Erro ao salvar alterações');
    }
  };
  const handleDelete = () => { /* ... (mantido) ... */ };
  const atualizarStatus = (novoStatus: string) => { /* ... (mantido) ... */ };

  // Funções CRUD para Etapas
  const handleOpenEtapaModal = (etapa?: LicitacaoEtapa) => {
    if (etapa) {
      setEtapaEmEdicao(etapa);
      // Formatar dataLimite e dataConclusao de DD/MM/YYYY para YYYY-MM-DD para o input date
      const formatToInputDate = (dateStr?: string | null) => {
        if (!dateStr) return "";
        try {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch { return ""; } // Retorna vazio se o formato for inesperado
      };
      setEtapaFormData({
        nome: etapa.nome,
        descricao: etapa.descricao || "",
        dataLimite: formatToInputDate(etapa.dataLimite),
        status: etapa.status || "pendente",
        responsavelId: etapa.responsavelId ? String(etapa.responsavelId) : "none",
        observacoes: etapa.observacoes || "",
        dataConclusao: formatToInputDate(etapa.dataConclusao),
      });
    } else {
      setEtapaEmEdicao(null);
      setEtapaFormData(initialEtapaFormData);
    }
    setShowEtapaModal(true);
  };

  const handleSubmitEtapa = async () => {
    if (!etapaFormData.nome || !etapaFormData.status || !etapaFormData.dataLimite) {
      toast.error("Nome, Status e Data Limite da etapa são obrigatórios.");
      return;
    }
    if (!licitacao?.id) {
      toast.error("ID da Licitação não encontrado.");
      return;
    }

    setIsSubmittingEtapa(true);
    try {
      const payload: LicitacaoEtapaPayload = {
        nome: etapaFormData.nome!,
        status: etapaFormData.status!,
        descricao: etapaFormData.descricao || null,
        // Enviar data no formato que a API espera (DD/MM/YYYY), a API fará a conversão para YYYY-MM-DD
        dataLimite: etapaFormData.dataLimite ? format(new Date(etapaFormData.dataLimite), 'dd/MM/yyyy') : null,
        responsavelId: etapaFormData.responsavelId === "none" ? null : etapaFormData.responsavelId || null,
        observacoes: etapaFormData.observacoes || null,
        dataConclusao: etapaFormData.dataConclusao ? format(new Date(etapaFormData.dataConclusao), 'dd/MM/yyyy') : null,
      };

      if (etapaEmEdicao) {
        await updateEtapa(etapaEmEdicao.id, payload);
        toast.success("Etapa atualizada com sucesso!");
      } else {
        await createEtapa(payload);
        toast.success("Etapa adicionada com sucesso!");
      }
      setShowEtapaModal(false);
      setEtapaEmEdicao(null);
      // O hook useLicitacaoEtapas já deve atualizar a lista 'etapas'
    } catch (error: any) {
      toast.error(`Erro ao salvar etapa: ${error.message}`);
    } finally {
      setIsSubmittingEtapa(false);
    }
  };

  const handleDeleteEtapaClick = (etapaId: string) => {
    setEtapaParaExcluirId(etapaId);
    setShowConfirmDeleteEtapaModal(true);
  };

  const handleConfirmDeleteEtapa = async () => {
    if (!etapaParaExcluirId || !licitacao?.id) return;
    setIsSubmittingEtapa(true); // Reutilizar o estado de submissão
    try {
      await deleteEtapa(etapaParaExcluirId);
      toast.success("Etapa excluída com sucesso.");
      setShowConfirmDeleteEtapaModal(false);
      setEtapaParaExcluirId(null);
    } catch (error: any) {
      toast.error(`Erro ao excluir etapa: ${error.message}`);
    } finally {
      setIsSubmittingEtapa(false);
    }
  };

  const handleEtapaFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEtapaFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEtapaDateChange = (field: 'dataLimite' | 'dataConclusao', date?: Date) => {
    setEtapaFormData(prev => ({ ...prev, [field]: date ? format(date, 'yyyy-MM-dd') : "" }));
  };


  if (!licitacao) return null;

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

  const valorExibicao = formData.valorEstimado
    ? (parseValorMonetario(formData.valorEstimado) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : "N/A";

  return (
    <>
      <Sheet key={`licitacao-sheet-${licitacao?.id}`} open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={`overflow-y-auto transition-all duration-300 ${
            isExpanded ? "w-[95vw] max-w-[95vw]" : "w-full md:max-w-3xl lg:max-w-4xl"
          }`}
        >
          <SheetHeader className="mb-6">
            {/* ... (SheetHeader content) ... */}
             <div className="flex justify-between items-center">
              <SheetTitle className="text-xl">{formData.titulo || "Licitação"}</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 rounded-full" title={isExpanded ? "Recolher painel" : "Expandir painel"}>
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mt-2">
                <Button variant="link" className="p-0 h-auto font-normal" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onOrgaoClick && typeof formData.orgao === 'object' && formData.orgao) { onOrgaoClick(formData.orgao as OrgaoType); }}}>
                  <Building2 className="w-4 h-4 mr-1" />
                  {typeof formData.orgao === 'object' ? (formData.orgao as any)?.nome : formData.orgao}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className={statusColors[formData.status || "analise_interna"]}>{statusLabels[formData.status || "analise_interna"]}</Badge>
              <Badge variant="outline" className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Prazo: {formData.prazo || formData.dataAbertura}</Badge>
              <Badge variant="outline" className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {valorExibicao}</Badge>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              {isEditing ? (
                <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Salvar Alterações</Button>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2"><Edit className="w-4 h-4" /> Editar</Button>
              )}
              <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" className="gap-2"><Trash2 className="w-4 h-4" />Excluir</Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="resumo" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4"> {/* Ajustado para 6 colunas */}
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="servicos">Itens/Serviços</TabsTrigger>
              <TabsTrigger value="etapas">Etapas</TabsTrigger> {/* Nova Aba */}
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="valores">Valores</TabsTrigger>
            </TabsList>

            {/* ... (Conteúdo das abas Resumo, Serviços/Itens, Documentos, Valores) ... */}
            <TabsContent value="resumo">
              {/* ... (Conteúdo existente da aba Resumo) ... */}
              <ResumoLicitacao licitacaoId={licitacao.id} isEditing={isEditing} />
               <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* ... (Conteúdo Coluna Esquerda e Direita do Resumo) ... */}
                </div>
                 {formData.descricao && ( <div className="mt-4"> <h3 className="text-sm font-medium text-gray-500 mb-2">Descrição Detalhada</h3> <p className="text-sm whitespace-pre-line">{formData.descricao}</p> </div> )}
                 <div className="mt-4"> <h3 className="text-sm font-medium text-gray-500 mb-2">Equipe Responsável</h3> {/* ... (Lógica de exibição de responsáveis) ... */} </div>
               </div>
            </TabsContent>
            <TabsContent value="servicos">
              <ServicosLicitacao licitacaoId={licitacao.id} isEditing={isEditing} onServicosUpdated={() => { if (onLicitacaoNeedsRefresh) onLicitacaoNeedsRefresh(); }} />
            </TabsContent>

            {/* Nova Aba Etapas */}
            <TabsContent value="etapas" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Etapas da Licitação</h3>
                {isEditing && (
                  <Button size="sm" onClick={() => handleOpenEtapaModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Etapa
                  </Button>
                )}
              </div>
              {isLoadingEtapas && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin" /> Carregando etapas...</div>}
              {errorEtapas && <p className="text-red-500">Erro ao carregar etapas: {errorEtapas}</p>}
              {!isLoadingEtapas && !errorEtapas && etapas.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  Nenhuma etapa definida para esta licitação.
                </div>
              )}
              {!isLoadingEtapas && !errorEtapas && etapas.length > 0 && (
                <div className="space-y-3">
                  {etapas.map(etapa => (
                    <Card key={etapa.id}>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-md">{etapa.nome}</CardTitle>
                          <Badge variant={etapa.status === 'concluida' ? 'default' : 'outline'} className={statusColors[etapa.status] || ''}>
                            {statusEtapaLabels[etapa.status] || etapa.status}
                          </Badge>
                        </div>
                        {etapa.dataLimite && <p className="text-xs text-muted-foreground">Prazo: {etapa.dataLimite}</p>}
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {etapa.descricao && <p className="text-sm text-gray-600">{etapa.descricao}</p>}
                        {etapa.responsavelNome && <p className="text-xs text-muted-foreground">Responsável: {etapa.responsavelNome}</p>}
                        {etapa.dataConclusao && <p className="text-xs text-muted-foreground">Concluída em: {etapa.dataConclusao}</p>}
                        {etapa.observacoes && <p className="text-xs mt-1 p-2 bg-gray-50 rounded">Obs: {etapa.observacoes}</p>}
                        {isEditing && (
                          <div className="flex justify-end space-x-2 mt-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEtapaModal(etapa)}><Edit className="h-3 w-3 mr-1"/>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteEtapaClick(etapa.id)}><Trash2 className="h-3 w-3 mr-1"/>Excluir</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documentos">
              <VisualizadorDocumentos
                entityId={licitacao?.id || ''}
                entityType="licitacao"
                title="Documentos da Licitação"
                showFilters={true}
                allowUpload={isEditing}
                onDocumentUpload={() => setUploadDialogOpen(true)}
              />
            </TabsContent>

            <TabsContent value="valores">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <Label htmlFor="valorEstimado">Valor Estimado</Label>
      <Input
        id="valorEstimado"
        type="number"
        value={formData.valorEstimado || ''}
        onChange={e => handleFieldChange('valorEstimado', e.target.value)}
        disabled={!isEditing}
        min={0}
        step={0.01}
      />
    </div>
    {formData.valorProposta !== undefined && (
      <div>
        <Label htmlFor="valorProposta">Valor Proposta</Label>
        <Input
          id="valorProposta"
          type="number"
          value={formData.valorProposta || ''}
          onChange={e => handleFieldChange('valorProposta', e.target.value)}
          disabled={!isEditing}
          min={0}
          step={0.01}
        />
      </div>
    )}

    {typeof formData.valorHomologado !== 'undefined' && (
        <div className="space-y-2">
          <Label htmlFor="valorHomologado">Valor Homologado</Label>
          <Input
            id="valorHomologado"
            type="number"
            value={formData.valorHomologado ?? ''}
            onChange={e => handleFieldChange('valorHomologado', e.target.value) as any}
            disabled={!isEditing}
            min={0}
            step={0.01}
          />
        </div>
      )}
      {/* Adicione outros campos de valores relevantes conforme necessário */}
    </div>
  <div className="flex justify-end mt-6">
    {isEditing && (
      <Button onClick={handleSave} className="gap-2">
        <Save className="w-4 h-4" /> Salvar Valores
      </Button>
    )}
  </div>
</TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Modal Adicionar/Editar Etapa */}
      {showEtapaModal && (
        <Dialog open={showEtapaModal} onOpenChange={(isOpen) => {
          setShowEtapaModal(isOpen);
          if (!isOpen) {
            setEtapaEmEdicao(null);
            setEtapaFormData(initialEtapaFormData);
            console.log('[Dialog] Modal fechado, limpando estado de edição e formulário.');
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{etapaEmEdicao ? "Editar Etapa" : "Adicionar Nova Etapa"}</DialogTitle>
              <DialogDescription>Preencha os detalhes da etapa da licitação.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label htmlFor="etapa-nome">Nome da Etapa*</Label><Input id="etapa-nome" name="nome" value={etapaFormData.nome || ""} onChange={handleEtapaFormChange} /></div>
              <div><Label htmlFor="etapa-descricao">Descrição</Label><Textarea id="etapa-descricao" name="descricao" value={etapaFormData.descricao || ""} onChange={handleEtapaFormChange} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="etapa-dataLimite">Data Limite*</Label>
                  <Input type="date" id="etapa-dataLimite" name="dataLimite" value={etapaFormData.dataLimite || ""} onChange={handleEtapaFormChange} />
                </div>
                <div>
                  <Label htmlFor="etapa-status">Status*</Label>
                  <Select name="status" value={etapaFormData.status || "pendente"} onValueChange={(value) => setEtapaFormData(prev => ({...prev, status: value}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statusEtapaOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="etapa-responsavelId">Responsável</Label>
                <Select name="responsavelId" value={etapaFormData.responsavelId ?? "none"} onValueChange={(value) => setEtapaFormData(prev => ({...prev, responsavelId: value}))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguém</SelectItem>
                    {todosResponsaveisParaEtapa.map(resp => <SelectItem key={resp.id} value={resp.id}>{resp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="etapa-observacoes">Observações</Label><Textarea id="etapa-observacoes" name="observacoes" value={etapaFormData.observacoes || ""} onChange={handleEtapaFormChange} /></div>
              <div>
                <Label htmlFor="etapa-dataConclusao">Data de Conclusão</Label>
                <Input type="date" id="etapa-dataConclusao" name="dataConclusao" value={etapaFormData.dataConclusao || ""} onChange={handleEtapaFormChange} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setShowEtapaModal(false); setEtapaEmEdicao(null);}} disabled={isSubmittingEtapa}>Cancelar</Button>
              <Button onClick={handleSubmitEtapa} disabled={isSubmittingEtapa}>
                {isSubmittingEtapa ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2" />}
                {etapaEmEdicao ? "Salvar Alterações" : "Adicionar Etapa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AlertDialog para Excluir Etapa */}
      <AlertDialog open={showConfirmDeleteEtapaModal} onOpenChange={setShowConfirmDeleteEtapaModal}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta etapa?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEtapaParaExcluirId(null)} disabled={isSubmittingEtapa}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteEtapa} className="bg-destructive hover:bg-destructive/90" disabled={isSubmittingEtapa}>
              {isSubmittingEtapa ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir Etapa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ... (outros AlertDialogs existentes) ... */}
       <AlertDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Upload de Documento</AlertDialogTitle><AlertDialogDescription>Selecione um arquivo.</AlertDialogDescription></AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div><Label htmlFor="tipoDoc">Tipo</Label><Select value={tipoDocumento} onValueChange={setTipoDocumento}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="Edital">Edital</SelectItem><SelectItem value="Proposta">Proposta</SelectItem> <SelectItem value="Contrato">Contrato</SelectItem><SelectItem value="Anexo">Anexo</SelectItem><SelectItem value="Habilitação">Doc. Habilitação</SelectItem><SelectItem value="Técnico">Doc. Técnico</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="arquivoUp">Arquivo</Label><div className="mt-2"><input type="file" id="arquivoUp" ref={fileInputRef} className="hidden" onChange={handleFileSelection} /><div className="flex items-center gap-2"><Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full justify-start"><Upload className="w-4 h-4 mr-2" />{arquivoSelecionado ? arquivoSelecionado.name : "Selecionar"}</Button>{arquivoSelecionado && (<Button variant="ghost" size="icon" onClick={() => setArquivoSelecionado(null)}><Trash2 className="w-4 h-4 text-red-500" /></Button>)}</div>{arquivoSelecionado && (<p className="text-xs text-gray-500 mt-1">{formatFileSize(arquivoSelecionado.size)}</p>)}</div></div>
          </div>
          <AlertDialogFooter><AlertDialogCancel onClick={() => {setArquivoSelecionado(null); setTipoDocumento("");}}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={uploadDocumento} disabled={!arquivoSelecionado || enviandoArquivo}>{enviandoArquivo ? (<><Loader2 className="animate-spin mr-2 h-4 w-4"/>Enviando...</>) : ("Fazer Upload")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {deleteDialogOpen && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Licitação</AlertDialogTitle></AlertDialogHeader><AlertDialogDescription>Tem certeza? Ação irreversível.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      )}

      {/* AlertDialog para Confirmação de Exclusão de Documento */}
      <AlertDialog open={showConfirmDeleteDocModal} onOpenChange={setShowConfirmDeleteDocModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir o documento "{docParaExcluir?.nome}"? Esta ação não pode ser desfeita e o arquivo será removido do armazenamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowConfirmDeleteDocModal(false); setDocParaExcluir(null);}} disabled={isDeletingDocument}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDocumento}
              disabled={isDeletingDocument}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingDocument ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (!isFinite(i)) return '0 Bytes';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
