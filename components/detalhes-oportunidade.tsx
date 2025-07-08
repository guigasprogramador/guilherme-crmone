"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mail,
  Phone,
  Building,
  Clock,
  DollarSign,
  User,
  CalendarIcon,
  PlusCircle,
  MessageSquare,
  Edit,
  Save,
  Maximize2,
  Minimize2,
  MapPin,
  Users,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  ExternalLink as ExternalLinkIcon,
  Link as LinkIcon,
  Loader2,
  PlusCircle as PlusCircleIcon,
  Trash2 as Trash2Icon,
  Edit3 as Edit3Icon, // Usado para Notas e Itens
  Edit2 as EditReuniaoIcon, // Novo para Reuniões
  PackageIcon
} from "lucide-react"
import Link from "next/link"
import { useReunioes, Reuniao as ReuniaoType } from "@/hooks/comercial/use-reunioes";
import { useNotas, Nota } from "@/hooks/comercial/use-notas";
import { AgendarReuniao } from "@/components/comercial/agendar-reuniao"
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useOportunidadeItens, OportunidadeItem } from "@/hooks/comercial/use-oportunidade-itens";
import { VisualizadorDocumentos } from "@/components/documentos/visualizador-documentos";
import { SeletorDocumentosComercial } from "@/components/comercial/seletor-documentos-comercial";
import { DocumentType } from "@/hooks/useDocuments";

function parseValorMonetario(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  if (!valor || typeof valor !== 'string') return 0;
  const valorLimpo = valor.toString().trim();
  let valorSemSimbolo = valorLimpo.replace(/[R$\s]/g, '');
  if (!valorSemSimbolo.includes(',') && !valorSemSimbolo.includes('.')) {
    const num = parseInt(valorSemSimbolo) || 0;
    return num;
  }
  if (valorSemSimbolo.includes(',')) {
    valorSemSimbolo = valorSemSimbolo.replace(/\./g, '').replace(',', '.');
  }
  else if (valorSemSimbolo.includes('.')) {
    const pontos = valorSemSimbolo.split('.');
    if (pontos.length > 2) {
      const parteInteira = pontos.slice(0, -1).join('');
      const parteDecimal = pontos[pontos.length - 1];
      valorSemSimbolo = parteInteira + '.' + parteDecimal;
    }
    else if (pontos[1] && pontos[1].length === 3 && /^\d+$/.test(pontos[1])) {
      valorSemSimbolo = valorSemSimbolo.replace('.', '');
    }
  }
  const resultado = parseFloat(valorSemSimbolo) || 0;
  return resultado;
}
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface Oportunidade {
  id: string
  titulo: string
  cliente: string
  clienteId?: string
  valor: string
  responsavel: string
  responsavelId?: string
  prazo: string
  status: string
  descricao?: string
  dataAgenda?: string
  tipo?: "produto" | "servico"
  tipoFaturamento?: "direto" | "distribuidor"
}

interface DetalhesOportunidadeProps {
  oportunidade: Oportunidade | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClienteClick?: (clienteNome: string, clienteId?: string) => void
  onOportunidadeNeedsRefresh?: () => void;
}

const statusColors: Record<string, string> = {
  novo_lead: "bg-blue-100 text-blue-800 border-blue-300",
  agendamento_reuniao: "bg-indigo-100 text-indigo-800 border-indigo-300",
  levantamento_oportunidades: "bg-purple-100 text-purple-800 border-purple-300",
  proposta_enviada: "bg-amber-100 text-amber-800 border-amber-300",
  negociacao: "bg-orange-100 text-orange-800 border-orange-300",
  fechado_ganho: "bg-green-100 text-green-800 border-green-300",
  fechado_perdido: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  agendamento_reuniao: "Agendamento de Reunião",
  levantamento_oportunidades: "Levantamento de Oportunidades",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado_ganho: "Fechado (Ganho)",
  fechado_perdido: "Fechado (Perdido)",
};

const flowSteps = [
  { id: "novo_lead", label: "Novo Lead" },
  { id: "agendamento_reuniao", label: "Agendamento de Reunião" },
  { id: "levantamento_oportunidades", label: "Levantamento de Oportunidades" },
  { id: "proposta_enviada", label: "Proposta Enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado_ganho", label: "Fechado (Ganho)" },
  { id: "fechado_perdido", label: "Fechado (Perdido)" },
];


export function DetalhesOportunidade({ oportunidade, open, onOpenChange, onClienteClick, onOportunidadeNeedsRefresh }: DetalhesOportunidadeProps) {
  const [activeTab, setActiveTab] = useState("resumo")
  const [novaNota, setNovaNota] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Oportunidade & { responsavelId?: string }>>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const [documentosCarregados, setDocumentosCarregados] = useState(false);
  const [showAgendarReuniaoModal, setShowAgendarReuniaoModal] = useState(false);
  const [isAddingNota, setIsAddingNota] = useState(false);
  const [showSeletorDocumentosModal, setShowSeletorDocumentosModal] = useState(false);
  const [isVinculandoDocumentos, setIsVinculandoDocumentos] = useState(false);
  const [isDesvinculandoDoc, setIsDesvinculandoDoc] = useState(false);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const initialNovoItemFormData: Partial<Omit<OportunidadeItem, 'id' | 'valorTotal' | 'createdAt' | 'updatedAt' | 'oportunidadeId'>> = {
    itemNome: "", quantidade: 1, valorUnitario: 0, unidade: "", descricao: "", ordem: 0
  };
  const [novoItemFormData, setNovoItemFormData] = useState(initialNovoItemFormData);
  const [editItemFormData, setEditItemFormData] = useState<OportunidadeItem | null>(null);
  const [itemParaExcluirId, setItemParaExcluirId] = useState<string | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const { user } = useAuth();
  const {
    reunioes: reunioesDaOportunidade,
    isLoading: isLoadingReunioes,
    fetchReunioes,
    // createReuniao, // Será chamado dentro de AgendarReuniao
    updateReuniao,
    deleteReuniao,
  } = useReunioes(oportunidade?.id);

  // Estados para CRUD de Reunião
  const [reuniaoParaEditar, setReuniaoParaEditar] = useState<ReuniaoType | null>(null);
  const [showDeleteReuniaoConfirm, setShowDeleteReuniaoConfirm] = useState(false);
  const [reuniaoParaExcluirId, setReuniaoParaExcluirId] = useState<string | null>(null);
  const [isSubmittingReuniao, setIsSubmittingReuniao] = useState(false);

  const {
    notas: notasDaOportunidade,
    isLoading: isLoadingNotas,
    createNota,
    updateNota,
    deleteNota,
    setOportunidadeId: setOportunidadeIdParaNotas,
  } = useNotas(oportunidade?.id);

  const [editingNotaId, setEditingNotaId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [isSubmittingNota, setIsSubmittingNota] = useState(false);
  const [showDeleteNotaConfirm, setShowDeleteNotaConfirm] = useState(false);
  const [notaParaExcluirId, setNotaParaExcluirId] = useState<string | null>(null);

  const {
    itens: itensDaOportunidade,
    isLoading: isLoadingItens,
    error: errorItens,
    fetchItens: fetchItensDaOportunidade,
    createItem: createOportunidadeItem,
    updateItem: updateOportunidadeItem,
    deleteItem: deleteOportunidadeItem,
  } = useOportunidadeItens(oportunidade?.id);

  useEffect(() => {
    if (oportunidade) {
      setFormData({
        ...oportunidade,
        responsavelId: oportunidade.responsavelId,
        descricao:
          oportunidade.descricao ||
          "Implementação de solução tecnológica para atender às necessidades específicas do cliente, incluindo módulos de gestão, relatórios e integrações com sistemas existentes.",
      });
      setDocumentosCarregados(false);
      if (typeof setOportunidadeIdParaNotas === 'function') {
        setOportunidadeIdParaNotas(oportunidade.id);
      }
       // Fetch reuniões quando a oportunidade é carregada/alterada
      if (oportunidade.id) {
        fetchReunioes(oportunidade.id);
      }

    } else {
      if (typeof setOportunidadeIdParaNotas === 'function') {
        setOportunidadeIdParaNotas(undefined);
      }
    }
  }, [oportunidade, setOportunidadeIdParaNotas, fetchReunioes]);

  useEffect(() => {
    if (oportunidade?.id) {
      if (activeTab === "servicos" && typeof fetchItensDaOportunidade === 'function') {
        fetchItensDaOportunidade(oportunidade.id);
      }
      if (activeTab === "documentos" && !documentosCarregados) {
        setDocumentosCarregados(true);
      }
    }
  }, [activeTab, oportunidade?.id, fetchItensDaOportunidade, documentosCarregados]);


  const handleDocumentosSelecionadosParaVinculo = async (documentosSelecionados: DocumentType[]) => {
    if (!oportunidade || documentosSelecionados.length === 0) {
      setShowSeletorDocumentosModal(false);
      return;
    }
    setIsVinculandoDocumentos(true);
    const documentos_ids = documentosSelecionados.map(doc => doc.id);

    try {
      const response = await fetch(`/api/comercial/oportunidades/${oportunidade.id}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentos_ids }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Erro ao vincular documentos."}));
        throw new Error(errorData.message || "Falha ao vincular documentos.");
      }

      const result = await response.json();
      toast({
        title: "Sucesso",
        description: result.message || `${result.vinculados || 0} documento(s) vinculado(s) com sucesso.`,
      });
      setDocumentosCarregados(false);
      setShowSeletorDocumentosModal(false);
    } catch (error) {
      toast({
        title: "Erro ao Vincular Documentos",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsVinculandoDocumentos(false);
    }
  };

  const handleDesvincularDocumento = async (documentoId: string) => {
    if (!oportunidade?.id) {
      toast({ title: "Erro", description: "ID da oportunidade não encontrado.", variant: "destructive" });
      return;
    }
    setIsDesvinculandoDoc(true);
    try {
      const response = await fetch(`/api/comercial/oportunidades/${oportunidade.id}/documentos?documento_id=${documentoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Erro ao desvincular documento." }));
        throw new Error(errorData.message || "Falha ao desvincular documento.");
      }

      const result = await response.json();
      toast({
        title: "Sucesso",
        description: result.message || "Documento desvinculado com sucesso.",
      });
      setDocumentosCarregados(false);
    } catch (error) {
      toast({
        title: "Erro ao Desvincular Documento",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
      setDocumentosCarregados(false);
    } finally {
      setIsDesvinculandoDoc(false);
    }
  };

  const handleEditReuniaoClick = (reuniao: ReuniaoType) => {
    setReuniaoParaEditar(reuniao);
    setShowAgendarReuniaoModal(true);
  };

  const handleDeleteReuniaoClick = (reuniaoId: string) => {
    setReuniaoParaExcluirId(reuniaoId);
    setShowDeleteReuniaoConfirm(true);
  };

  const handleConfirmDeleteReuniao = async () => {
    if (!reuniaoParaExcluirId || !oportunidade?.id) return;
    setIsSubmittingReuniao(true);
    try {
      await deleteReuniao(reuniaoParaExcluirId);
      toast({ title: "Sucesso", description: "Reunião excluída." });
      fetchReunioes(oportunidade.id); // Recarregar reuniões
    } catch (error) {
      toast({ title: "Erro", description: `Falha ao excluir reunião: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingReuniao(false);
      setShowDeleteReuniaoConfirm(false);
      setReuniaoParaExcluirId(null);
    }
  };

  const handleReuniaoSalva = () => {
    if(oportunidade?.id) fetchReunioes(oportunidade.id);
    setShowAgendarReuniaoModal(false);
    setReuniaoParaEditar(null);
  };

  const adicionarNota = async () => {
    if (!novaNota.trim() || !oportunidade?.id || !user?.id) {
      toast({ title: "Erro", description: "Nota não pode ser vazia.", variant: "destructive" });
      return;
    }
    setIsAddingNota(true);
    try {
      await createNota({
        oportunidadeId: oportunidade.id,
        autorId: user.id,
        texto: novaNota.trim(),
      });
      setNovaNota("");
      toast({ title: "Sucesso", description: "Nota adicionada." });
    } catch (error) {
      toast({ title: "Erro", description: `Falha ao adicionar nota: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsAddingNota(false);
    }
  };

  const handleEditNotaClick = (nota: Nota) => {
    setEditingNotaId(nota.id);
    setEditText(nota.texto);
  };

  const handleCancelEditNota = () => {
    setEditingNotaId(null);
    setEditText("");
  };

  const handleSaveNota = async (notaId: string) => {
    if (!editText.trim()) {
      toast({ title: "Erro", description: "O texto da nota não pode ser vazio.", variant: "destructive" });
      return;
    }
    setIsSubmittingNota(true);
    try {
      await updateNota(notaId, { texto: editText.trim() });
      toast({ title: "Sucesso", description: "Nota atualizada." });
      setEditingNotaId(null);
      setEditText("");
    } catch (error) {
      toast({ title: "Erro", description: `Falha ao atualizar nota: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingNota(false);
    }
  };

  const handleDeleteNotaClick = (notaId: string) => {
    setNotaParaExcluirId(notaId);
    setShowDeleteNotaConfirm(true);
  };

  const handleConfirmDeleteNota = async () => {
    if (!notaParaExcluirId) return;
    setIsSubmittingNota(true);
    try {
      await deleteNota(notaParaExcluirId);
      toast({ title: "Sucesso", description: "Nota excluída." });
      setNotaParaExcluirId(null);
      setShowDeleteNotaConfirm(false);
    } catch (error) {
      toast({ title: "Erro", description: `Falha ao excluir nota: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingNota(false);
    }
  };

  const handleCreateItem = async () => {
    if (!oportunidade?.id || !novoItemFormData.itemNome || novoItemFormData.quantidade === undefined || novoItemFormData.valorUnitario === undefined) {
      toast({ title: "Erro", description: "Nome do item, quantidade e valor unitário são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmittingItem(true);
    try {
      const payload = {
        ...novoItemFormData,
        oportunidadeId: oportunidade.id,
        quantidade: Number(novoItemFormData.quantidade) || 0,
        valorUnitario: Number(novoItemFormData.valorUnitario) || 0,
      };
      await createOportunidadeItem(payload as Omit<OportunidadeItem, 'id' | 'valorTotal' | 'createdAt' | 'updatedAt'>);
      toast({ title: "Sucesso", description: "Item adicionado à oportunidade." });
      setShowAddItemModal(false);
      setNovoItemFormData(initialNovoItemFormData);
      if (onOportunidadeNeedsRefresh) onOportunidadeNeedsRefresh();
    } catch (error) {
      toast({ title: "Erro", description: `Não foi possível adicionar o item: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleEditItemClick = (item: OportunidadeItem) => {
    setEditItemFormData({...item});
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async () => {
    if (!editItemFormData || !editItemFormData.id || !editItemFormData.itemNome || editItemFormData.quantidade === undefined || editItemFormData.valorUnitario === undefined) {
      toast({ title: "Erro", description: "Nome do item, quantidade e valor unitário são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmittingItem(true);
    try {
      const { id, oportunidadeId, createdAt, updatedAt, valorTotal, ...dadosParaAtualizar } = editItemFormData;
      const payload = {
          ...dadosParaAtualizar,
          quantidade: Number(dadosParaAtualizar.quantidade) || 0,
          valorUnitario: Number(dadosParaAtualizar.valorUnitario) || 0,
      };
      await updateOportunidadeItem(id, payload);
      toast({ title: "Sucesso", description: "Item atualizado." });
      setShowEditItemModal(false);
      setEditItemFormData(null);
      if (onOportunidadeNeedsRefresh) onOportunidadeNeedsRefresh();
    } catch (error) {
      toast({ title: "Erro", description: `Não foi possível atualizar o item: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItemClick = (itemId: string) => {
    setItemParaExcluirId(itemId);
    setShowDeleteItemConfirm(true);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemParaExcluirId) return;
    setIsSubmittingItem(true);
    try {
      await deleteOportunidadeItem(itemParaExcluirId);
      toast({ title: "Sucesso", description: "Item excluído." });
      setItemParaExcluirId(null);
      setShowDeleteItemConfirm(false);
      if (onOportunidadeNeedsRefresh) onOportunidadeNeedsRefresh();
    } catch (error) {
      toast({ title: "Erro", description: `Não foi possível excluir o item: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!oportunidade?.id) return;
    
    try {
      const payload: any = {
        titulo: formData.titulo,
        status: formData.status,
        descricao: formData.descricao,
      };

      if (formData.prazo) payload.prazo = formData.prazo;
      if (formData.responsavelId) payload.responsavelId = formData.responsavelId;
      if (formData.tipo) payload.tipo = formData.tipo;
      if (formData.tipoFaturamento) payload.tipoFaturamento = formData.tipoFaturamento;

      const response = await fetch(`/api/comercial/oportunidades/${oportunidade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar oportunidade');
      }
      
      toast({ 
        title: "Sucesso", 
        description: "Oportunidade atualizada com sucesso." 
      });
      
      setIsEditing(false);
      
      if (onOportunidadeNeedsRefresh) {
        onOportunidadeNeedsRefresh();
      }
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: `Falha ao atualizar oportunidade: ${error instanceof Error ? error.message : "Erro desconhecido"}`, 
        variant: "destructive" 
      });
    }
  };

  const atualizarStatus = (novoStatus: string) => {
    setFormData((prev) => ({ ...prev, status: novoStatus }));
    console.log(`Status atualizado para: ${novoStatus}`);
  };

  if (!oportunidade) return null;

  const valorTotalItens = itensDaOportunidade.reduce((acc, item) => acc + item.valorTotal, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={`overflow-y-auto transition-all duration-300 ${
            isExpanded ? "w-[95vw] max-w-[95vw]" : "w-full md:max-w-3xl lg:max-w-4xl"
          }`}
        >
          <SheetHeader className="mb-6">
            <div className="flex justify-between items-center">
              <SheetTitle className="text-xl">{oportunidade.titulo}</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 rounded-full" title={isExpanded ? "Recolher painel" : "Expandir painel"}>
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mt-2">
                <Button variant="link" className="p-0 h-auto font-normal" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onClienteClick && oportunidade.clienteId) { onClienteClick(oportunidade.cliente, oportunidade.clienteId); }}}>
                  <Building className="w-4 h-4 mr-1" />
                  {oportunidade.cliente}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className={statusColors[oportunidade.status]}>{statusLabels[oportunidade.status]}</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {parseFloat(oportunidade.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prazo: {oportunidade.prazo}</Badge>
              <Badge variant="outline" className="flex items-center gap-1"><User className="w-3 h-3" /> {oportunidade.responsavel}</Badge>
            </div>
            <div className="flex justify-end mt-4">
              {isEditing ? (
                <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Salvar Alterações</Button>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2"><Edit className="w-4 h-4" /> Editar</Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="resumo" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="servicos">Itens/Serviços</TabsTrigger>
              <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            {activeTab === "resumo" && (
              <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Valor da Oportunidade</h3>
                    <p className="mt-1 font-medium">
                      {parseFloat(oportunidade.valor || "0").toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Descrição da Demanda</h3>
                    {isEditing ? (
                      <Textarea value={formData.descricao} onChange={(e) => handleFieldChange("descricao", e.target.value)} rows={4} className="mt-1"/>
                    ) : (
                      <p className="mt-1">{formData.descricao}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Detalhes do Cliente</h3>
                    <div className="mt-1 space-y-2">
                      <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400" /><Link href="#" className="hover:underline">{oportunidade.cliente}</Link></div>
                      <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span>contato@{oportunidade.cliente.toLowerCase().replace(/\s/g, "")}.gov.br</span></div>
                      <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>(11) 3333-4444</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status da Oportunidade</h3>
                    {isEditing ? (
                      <div className="mt-1">
                        <Select value={formData.status} onValueChange={(value) => handleFieldChange("status", value)}>
                          <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                          <SelectContent>{flowSteps.map((step) => (<SelectItem key={step.id} value={step.id}>{step.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center gap-2"><Badge className={statusColors[formData.status || ""]}>{statusLabels[formData.status || ""]}</Badge></div>
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Alterar para:</h4>
                            <div className="flex flex-wrap gap-2">
                              {flowSteps.map((step, index) => {
                                const currentStepIndex = flowSteps.findIndex((s) => s.id === formData.status);
                                if (index !== currentStepIndex && (index === currentStepIndex + 1 || step.id === "fechado_perdido")) {
                                  return (<Button key={step.id} size="sm" variant="outline" onClick={() => atualizarStatus(step.id)}>{step.label}</Button>);
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Usuário Responsável</h3>
                    {isEditing ? (
                      <div className="mt-1">
                        <Select
                          value={formData.responsavelId || oportunidade.responsavelId}
                          onValueChange={(value) => handleFieldChange("responsavelId", value)}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={oportunidade.responsavelId || "id_placeholder"}>{oportunidade.responsavel || "Selecione"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-800">
                           {oportunidade.responsavel?.charAt(0) || "?"}
                        </div>
                        <span>{oportunidade.responsavel}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            )}

            {activeTab === "servicos" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Itens da Proposta / Serviços</h3>
                <Button size="sm" onClick={() => {
                  setNovoItemFormData(initialNovoItemFormData);
                  setShowAddItemModal(true);
                }}
                disabled={!oportunidade}>
                  <PlusCircleIcon className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              {isLoadingItens && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="ml-2">Carregando itens...</p>
                </div>
              )}
              {errorItens && <p className="text-red-500 text-sm">Erro ao carregar itens: {errorItens}</p>}

              {!isLoadingItens && !errorItens && itensDaOportunidade.length > 0 && (
                <div className="space-y-3">
                  {itensDaOportunidade.map((item) => (
                    <Card key={item.id} className="bg-gray-50/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-800">{item.itemNome}</h4>
                            {item.descricao && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{item.descricao}</p>}
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItemClick(item)}>
                              <Edit3Icon className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItemClick(item.id)}>
                              <Trash2Icon className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
                          <div><span className="font-medium">Qtde:</span> {item.quantidade} {item.unidade}</div>
                          <div><span className="font-medium">Vlr. Unit.:</span> {item.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          <div className="col-span-2 md:col-span-1"><span className="font-medium">Vlr. Total:</span> <span className="font-semibold">{item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                          {item.ordem !== null && item.ordem !== undefined && <div><span className="font-medium">Ordem:</span> {item.ordem}</div>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoadingItens && !errorItens && itensDaOportunidade.length === 0 && (
                 <div className="text-center py-6">
                  <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum item cadastrado para esta oportunidade.</p>
                </div>
              )}

              {itensDaOportunidade.length > 0 && (
                <div className="flex justify-end pt-4 border-t mt-4">
                  <span className="font-medium">Valor Total da Proposta (Itens):</span>
                  <span className="font-bold text-lg ml-2">
                    {valorTotalItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
            </div>
          )}

            {activeTab === "agendamentos" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Agendamentos</h3>
                  <Button size="sm" onClick={() => { setReuniaoParaEditar(null); setShowAgendarReuniaoModal(true);}} disabled={!oportunidade || isSubmittingReuniao}>
                    <PlusCircleIcon className="w-4 h-4 mr-2" />Agendar Nova Reunião
                  </Button>
                </div>
                {isLoadingReunioes && !reunioesDaOportunidade.length ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Carregando reuniões...</p></div>
                ) : reunioesDaOportunidade.length > 0 ? (
                  <div className="space-y-3">
                    {reunioesDaOportunidade.map((reuniao: ReuniaoType) => (
                      <div key={reuniao.id} className="border rounded-lg p-4 hover:border-gray-400 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{reuniao.titulo}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(reuniao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' às '}
                              {reuniao.hora || (reuniao.data ? new Date(reuniao.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')}
                              {reuniao.local && ` - ${reuniao.local}`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge variant={reuniao.concluida ? 'default' : 'outline'} className={reuniao.concluida ? 'bg-green-100 text-green-800' : ''}>
                              {reuniao.concluida ? "Concluída" : "Pendente"}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditReuniaoClick(reuniao)} disabled={isSubmittingReuniao}>
                              <EditReuniaoIcon className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteReuniaoClick(reuniao.id)} disabled={isSubmittingReuniao}>
                              <Trash2Icon className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        {Array.isArray(reuniao.participantes) && reuniao.participantes.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-muted-foreground">Participantes:</h5>
                            <div className="flex flex-wrap gap-1 mt-1">{(reuniao.participantes as any[]).map((p: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{typeof p === 'string' ? p : p.nome || p.participante_id}</Badge>
                            ))}</div>
                          </div>
                        )}
                        {reuniao.notas && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-muted-foreground">Pauta/Notas da Reunião:</h5>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{reuniao.notas}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nenhuma reunião agendada.</p>
                  </div>
                )}
              </div>
            )}
            {oportunidade && (
              <AgendarReuniao
                open={showAgendarReuniaoModal}
                onOpenChange={(isOpen) => {
                  setShowAgendarReuniaoModal(isOpen);
                  if (!isOpen) setReuniaoParaEditar(null);
                }}
                oportunidadeId={oportunidade.id}
                clienteId={oportunidade.clienteId}
                clienteNome={oportunidade.cliente}
                onReuniaoAgendada={handleReuniaoSalva}
                reuniaoParaEditar={reuniaoParaEditar}
              />
            )}

            {activeTab === "notas" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nova-nota">Adicionar nota</Label>
                  <Textarea id="nova-nota" placeholder="Digite uma nova nota..." value={novaNota} onChange={(e) => setNovaNota(e.target.value)} rows={3} disabled={isAddingNota || isSubmittingNota} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={adicionarNota} disabled={!novaNota.trim() || isAddingNota || isSubmittingNota}>
                      {isAddingNota ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                      {isAddingNota ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </div>
                </div>
                <Separator />
                {isLoadingNotas && !notasDaOportunidade.length ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2 text-muted-foreground">Carregando notas...</p>
                  </div>
                ) : notasDaOportunidade.length > 0 ? (
                  <div className="space-y-4">
                    {notasDaOportunidade.map((nota: Nota) => (
                      <div key={nota.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                              {nota.autor ? nota.autor.substring(0, 2).toUpperCase() : "SN"}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{nota.autor || "Usuário desconhecido"}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(nota.createdAt || nota.data || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {nota.updatedAt && nota.updatedAt !== nota.createdAt && <span className="italic ml-1">(editado)</span>}
                              </p>
                            </div>
                          </div>
                          {editingNotaId !== nota.id && (
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditNotaClick(nota)} disabled={isSubmittingNota}>
                                <Edit3Icon className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteNotaClick(nota.id)} disabled={isSubmittingNota}>
                                <Trash2Icon className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {editingNotaId === nota.id ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={3}
                              className="text-sm"
                              disabled={isSubmittingNota}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm" onClick={handleCancelEditNota} disabled={isSubmittingNota}>Cancelar</Button>
                              <Button size="sm" onClick={() => handleSaveNota(nota.id)} disabled={isSubmittingNota || !editText.trim()}>
                                {isSubmittingNota ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{nota.texto}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nenhuma nota adicionada.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documentos" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <Button
                    size="sm"
                    onClick={() => setShowSeletorDocumentosModal(true)}
                    disabled={isVinculandoDocumentos || !oportunidade || isDesvinculandoDoc}
                  >
                    {isVinculandoDocumentos ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <LinkIcon className="h-4 w-4 mr-2" />}
                    Vincular Documento Existente
                  </Button>
                </div>
                <VisualizadorDocumentos
                  key={documentosCarregados ? `docs-loaded-${oportunidade?.id}` : `docs-reloading-${oportunidade?.id}`}
                  entityId={oportunidade?.id || ''}
                  entityType="oportunidade"
                  title="Documentos da Oportunidade"
                  showFilters={true}
                  allowUpload={false}
                  showDesvincular={true}
                  onDesvincularDocumento={handleDesvincularDocumento}
                />
              </div>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>

      {oportunidade && showSeletorDocumentosModal && (
        <SeletorDocumentosComercial
          open={showSeletorDocumentosModal}
          onOpenChange={setShowSeletorDocumentosModal}
          onDocumentosSelecionados={handleDocumentosSelecionadosParaVinculo}
        />
      )}

      {oportunidade && (
        <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Item/Serviço à Oportunidade</DialogTitle>
              <DialogDescription>Preencha os detalhes do novo item.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label htmlFor="novo-item-nome">Nome do Item*</Label><Input id="novo-item-nome" value={novoItemFormData.itemNome || ""} onChange={e => setNovoItemFormData(prev => ({...prev, itemNome: e.target.value}))} /></div>
              <div><Label htmlFor="novo-item-desc">Descrição</Label><Textarea id="novo-item-desc" value={novoItemFormData.descricao || ""} onChange={e => setNovoItemFormData(prev => ({...prev, descricao: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="novo-item-qtd">Quantidade*</Label><Input id="novo-item-qtd" type="number" min="0" value={novoItemFormData.quantidade || 1} onChange={e => setNovoItemFormData(prev => ({...prev, quantidade: parseFloat(e.target.value) || 0}))} /></div>
                <div><Label htmlFor="novo-item-un">Unidade</Label><Input id="novo-item-un" value={novoItemFormData.unidade || ""} onChange={e => setNovoItemFormData(prev => ({...prev, unidade: e.target.value}))} /></div>
              </div>
              <div><Label htmlFor="novo-item-vlr">Valor Unitário*</Label><Input id="novo-item-vlr" type="number" min="0" step="0.01" value={novoItemFormData.valorUnitario || 0} onChange={e => setNovoItemFormData(prev => ({...prev, valorUnitario: parseFloat(e.target.value) || 0}))} /></div>
              <div><Label htmlFor="novo-item-ordem">Ordem</Label><Input id="novo-item-ordem" type="number" value={novoItemFormData.ordem || 0} onChange={e => setNovoItemFormData(prev => ({...prev, ordem: parseInt(e.target.value) || 0}))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItemModal(false)} disabled={isSubmittingItem}>Cancelar</Button>
              <Button onClick={handleCreateItem} disabled={isSubmittingItem}>
                {isSubmittingItem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {oportunidade && editItemFormData && (
        <Dialog open={showEditItemModal} onOpenChange={(isOpen) => {
          setShowEditItemModal(isOpen);
          if (!isOpen) setEditItemFormData(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Item da Oportunidade</DialogTitle>
              <DialogDescription>Modifique os detalhes do item.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label htmlFor="edit-item-nome">Nome do Item*</Label><Input id="edit-item-nome" value={editItemFormData.itemNome || ""} onChange={e => setEditItemFormData(prev => prev ? {...prev, itemNome: e.target.value} : null)} /></div>
              <div><Label htmlFor="edit-item-desc">Descrição</Label><Textarea id="edit-item-desc" value={editItemFormData.descricao || ""} onChange={e => setEditItemFormData(prev => prev ? {...prev, descricao: e.target.value} : null)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="edit-item-qtd">Quantidade*</Label><Input id="edit-item-qtd" type="number" min="0" value={editItemFormData.quantidade || 1} onChange={e => setEditItemFormData(prev => prev ? {...prev, quantidade: parseFloat(e.target.value) || 0} : null)} /></div>
                <div><Label htmlFor="edit-item-un">Unidade</Label><Input id="edit-item-un" value={editItemFormData.unidade || ""} onChange={e => setEditItemFormData(prev => prev ? {...prev, unidade: e.target.value} : null)} /></div>
              </div>
              <div><Label htmlFor="edit-item-vlr">Valor Unitário*</Label><Input id="edit-item-vlr" type="number" min="0" step="0.01" value={editItemFormData.valorUnitario || 0} onChange={e => setEditItemFormData(prev => prev ? {...prev, valorUnitario: parseFloat(e.target.value) || 0} : null)} /></div>
              <div><Label htmlFor="edit-item-ordem">Ordem</Label><Input id="edit-item-ordem" type="number" value={editItemFormData.ordem || 0} onChange={e => setEditItemFormData(prev => prev ? {...prev, ordem: parseInt(e.target.value) || 0} : null)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setShowEditItemModal(false); setEditItemFormData(null);}} disabled={isSubmittingItem}>Cancelar</Button>
              <Button onClick={handleUpdateItem} disabled={isSubmittingItem}>
                {isSubmittingItem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDeleteItemConfirm} onOpenChange={setShowDeleteItemConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão do Item</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tem certeza que deseja excluir este item da oportunidade? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setItemParaExcluirId(null)} disabled={isSubmittingItem}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                      onClick={handleConfirmDeleteItem}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isSubmittingItem}
                  >
                     {isSubmittingItem ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2Icon className="h-4 w-4 mr-2" />} Excluir Item
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteNotaConfirm} onOpenChange={setShowDeleteNotaConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão da Nota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotaParaExcluirId(null)} disabled={isSubmittingNota}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteNota}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmittingNota}
            >
              {isSubmittingNota ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2Icon className="h-4 w-4 mr-2" />} Excluir Nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para Excluir Reunião */}
      <AlertDialog open={showDeleteReuniaoConfirm} onOpenChange={setShowDeleteReuniaoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão da Reunião</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta reunião? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReuniaoParaExcluirId(null)} disabled={isSubmittingReuniao}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteReuniao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmittingReuniao}
            >
              {isSubmittingReuniao ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2Icon className="h-4 w-4 mr-2" />} Excluir Reunião
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
