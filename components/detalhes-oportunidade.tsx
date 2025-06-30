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
  // ChevronLeft, // Removido se não usado
  // ChevronRight, // Removido se não usado
  Maximize2,
  Minimize2,
  MapPin,
  Users,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  ExternalLink as ExternalLinkIcon,
  Loader2,
  PlusCircle as PlusCircleIcon,
  Trash2 as Trash2Icon,
  Edit3 as Edit3Icon,
  PackageIcon
} from "lucide-react"
import Link from "next/link"
import { useReunioes } from "@/hooks/comercial/use-reunioes"
import type { Reuniao as ReuniaoType, Nota } from "@/types/comercial"
import { AgendarReuniao } from "@/components/comercial/agendar-reuniao"
import { useNotas, Nota } from "@/hooks/comercial/use-notas";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useOportunidadeItens, OportunidadeItem } from "@/hooks/comercial/use-oportunidade-itens";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface Oportunidade {
  id: string
  titulo: string
  cliente: string // Nome do cliente
  clienteId?: string // ID do cliente
  valor: string // Este será atualizado pela soma dos itens
  responsavel: string // Nome do responsável
  responsavelId?: string // ID do responsável
  prazo: string
  status: string
  descricao?: string
  dataAgenda?: string // Campo legado, pode ser removido se não usado
  tipo?: "produto" | "servico"
  tipoFaturamento?: "direto" | "distribuidor"
  // dataReuniao e horaReuniao podem ser derivados da lista de reuniões
}

interface DetalhesOportunidadeProps {
  oportunidade: Oportunidade | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClienteClick?: (clienteNome: string, clienteId?: string) => void // Passar ID também
  onOportunidadeNeedsRefresh?: () => void;
}

// ... (statusColors, statusLabels, flowSteps - mantidos como estão no original)
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
  const [isEditing, setIsEditing] = useState(false) // Para edição da oportunidade principal
  const [formData, setFormData] = useState<Partial<Oportunidade>>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const [documentosOportunidade, setDocumentosOportunidade] = useState<any[]>([])
  const [isLoadingDocumentos, setIsLoadingDocumentos] = useState(false)
  const [showAgendarReuniaoModal, setShowAgendarReuniaoModal] = useState(false);
  const [isAddingNota, setIsAddingNota] = useState(false);

  // Estados para CRUD de Itens da Oportunidade
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
    fetchReunioes
  } = useReunioes(oportunidade?.id);

  const {
    notas: notasDaOportunidade,
    isLoading: isLoadingNotas,
    createNota,
    fetchNotas
  } = useNotas(oportunidade?.id);

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
        descricao:
          oportunidade.descricao ||
          "Implementação de solução tecnológica para atender às necessidades específicas do cliente, incluindo módulos de gestão, relatórios e integrações com sistemas existentes.",
      });
      setDocumentosOportunidade([]);
      // Outros resets de estado relacionados a abas podem ser feitos aqui se necessário
      // Por exemplo, se as notas ou itens não devem persistir visualmente ao trocar de oportunidade
      if (activeTab === "notas" && oportunidade?.id) fetchNotas(oportunidade.id);
      if (activeTab === "servicos" && oportunidade?.id && typeof fetchItensDaOportunidade === 'function') fetchItensDaOportunidade(oportunidade.id); // Re-fetch itens usando referência do hook
    }
  }, [oportunidade, activeTab]); // Adicionado activeTab para re-fetch quando a aba é acessada

  useEffect(() => {
    if (oportunidade?.id && activeTab === "documentos" && documentosOportunidade.length === 0) {
      const fetchDocumentos = async () => {
        setIsLoadingDocumentos(true);
        try {
          const response = await fetch(`/api/documentos/por-oportunidade?oportunidadeId=${oportunidade.id}`);
          if (!response.ok) {
            throw new Error('Falha ao buscar documentos da oportunidade');
          }
          const data = await response.json();
          setDocumentosOportunidade(data);
        } catch (error) {
          console.error("Erro ao buscar documentos:", error);
          setDocumentosOportunidade([]);
        } finally {
          setIsLoadingDocumentos(false);
        }
      };
      fetchDocumentos();
    }
  }, [oportunidade?.id, activeTab, documentosOportunidade.length]);

  const adicionarNota = async () => {
    if (!novaNota.trim() || !oportunidade?.id || !user?.id) {
      toast({ title: "Erro", description: "Nota não pode ser vazia.", variant: "destructive" });
      return;
    }
    setIsAddingNota(true);
    try {
      await createNota({ oportunidadeId: oportunidade.id, autorId: user.id, autor: user.name, texto: novaNota.trim() });
      setNovaNota("");
      toast({ title: "Sucesso", description: "Nota adicionada." });
    } catch (error) {
      toast({ title: "Erro", description: `Falha ao adicionar nota: ${error instanceof Error ? error.message : "Erro desconhecido"}`, variant: "destructive" });
    } finally {
      setIsAddingNota(false);
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

  const handleSave = () => {
    console.log("Salvando dados:", formData);
    setIsEditing(false);
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
                {/* O valor exibido aqui deve ser o da oportunidade (que é atualizado pela API de itens) */}
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

            {/* Aba Resumo (mantida como estava, mas o valor da oportunidade deve refletir o total dos itens) */}
            {activeTab === "resumo" && (
              <div className="space-y-4">
                {/* ... Conteúdo da aba Resumo ... (sem alterações diretas nesta etapa, mas o campo formData.valor deve ser atualizado) */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
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
                        <Select value={formData.responsavel} onValueChange={(value) => handleFieldChange("responsavel", value)}>
                          <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ana Silva">Ana Silva</SelectItem>
                            <SelectItem value="Carlos Oliveira">Carlos Oliveira</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-800">{formData.responsavel?.charAt(0) || "?"}</div>
                        <span>{formData.responsavel}</span>
                      </div>
                    )}
                  </div>
                  {/* Outros campos do resumo */}
                </div>
              </div>
              </div>
            )}

            {/* Aba Itens/Serviços */}
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

            {/* ... Outras Abas (Agendamentos, Notas, Documentos) ... */}
            {activeTab === "agendamentos" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium">Agendamentos</h3><Button size="sm" onClick={() => setShowAgendarReuniaoModal(true)} disabled={!oportunidade}><PlusCircleIcon className="w-4 h-4 mr-2" />Agendar Nova Reunião</Button></div>
                {isLoadingReunioes ? (<div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Carregando reuniões...</p></div>) : reunioesDaOportunidade.length > 0 ? (<div className="space-y-3">{reunioesDaOportunidade.map((reuniao: ReuniaoType) => (<div key={reuniao.id} className="border rounded-lg p-4 hover:border-gray-400 transition-colors"><div className="flex justify-between items-start"><div><h4 className="font-medium">{reuniao.titulo}</h4><p className="text-sm text-muted-foreground mt-1">{new Date(reuniao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {' às '} {new Date(reuniao.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {reuniao.local && ` - ${reuniao.local}`}</p></div><Badge variant={reuniao.concluida ? 'default' : 'outline'} className={reuniao.concluida ? 'bg-green-100 text-green-800' : ''}>{reuniao.concluida ? "Concluída" : "Pendente"}</Badge></div>{reuniao.participantes && reuniao.participantes.length > 0 && (<div className="mt-2"><h5 className="text-xs font-medium text-muted-foreground">Participantes:</h5><div className="flex flex-wrap gap-1 mt-1">{reuniao.participantes.map((p: string, idx: number) => (<Badge key={idx} variant="secondary" className="text-xs">{p}</Badge>))}</div></div>)}{reuniao.notas && (<div className="mt-2"><h5 className="text-xs font-medium text-muted-foreground">Notas:</h5><p className="text-sm text-gray-600 whitespace-pre-wrap">{reuniao.notas}</p></div>)}</div>))}</div>) : (<div className="text-center py-6"><CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Nenhuma reunião agendada.</p></div>)}
              </div>
            )}
            {oportunidade && (<AgendarReuniao open={showAgendarReuniaoModal} onOpenChange={setShowAgendarReuniaoModal} oportunidadeId={oportunidade.id} clienteId={oportunidade.clienteId} clienteNome={oportunidade.cliente} onReuniaoAgendada={() => { if (oportunidade?.id) fetchReunioes(oportunidade.id); setShowAgendarReuniaoModal(false); }} />)}
            {activeTab === "notas" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2"><Label htmlFor="nova-nota">Adicionar nota</Label><Textarea id="nova-nota" placeholder="Digite uma nova nota..." value={novaNota} onChange={(e) => setNovaNota(e.target.value)} rows={3} disabled={isAddingNota} /><div className="flex justify-end"><Button size="sm" onClick={adicionarNota} disabled={!novaNota.trim() || isAddingNota}>{isAddingNota ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />} {isAddingNota ? "Adicionando..." : "Adicionar"}</Button></div></div>
                <Separator />
                {isLoadingNotas ? (<div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Carregando notas...</p></div>) : notasDaOportunidade.length > 0 ? (<div className="space-y-4">{notasDaOportunidade.map((nota: Nota) => (<div key={nota.id} className="border rounded-lg p-4 bg-white shadow-sm"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">{nota.autor ? nota.autor.substring(0, 2).toUpperCase() : "SN"}</div><div><p className="font-medium text-sm">{nota.autor || "Usuário desconhecido"}</p><p className="text-xs text-gray-500">{new Date(nota.data).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p></div></div></div><p className="text-sm text-gray-700 whitespace-pre-wrap">{nota.texto}</p></div>))}</div>) : (<div className="text-center py-6"><MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Nenhuma nota adicionada.</p></div>)}
              </div>
            )}
            {activeTab === "documentos" && (
              <div className="space-y-4">
                <Card><CardHeader><CardTitle>Documentos da Oportunidade</CardTitle></CardHeader><CardContent>{isLoadingDocumentos ? (<div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Carregando documentos...</p></div>) : documentosOportunidade.length > 0 ? (<ul className="space-y-3">{documentosOportunidade.map((doc) => (<li key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100"><div className="flex items-center space-x-3"><FileTextIcon className="h-5 w-5 text-blue-500" /><div><a href={doc.url_documento} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline hover:text-blue-800" title={doc.nome}>{doc.nome.length > 40 ? `${doc.nome.substring(0, 37)}...` : doc.nome}</a><p className="text-xs text-muted-foreground">{doc.tipo} - {doc.formato?.toUpperCase()} - {doc.tamanho}</p></div></div><div className="text-xs text-muted-foreground">Upload: {doc.data_criacao}</div></li>))}</ul>) : (<div className="text-center py-6"><FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Nenhum documento associado.</p></div>)}</CardContent></Card>
              </div>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Modal Adicionar Item */}
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

      {/* Modal Editar Item */}
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

      {/* AlertDialog para Excluir Item */}
      <AlertDialog open={showDeleteItemConfirm} onOpenChange={setShowDeleteItemConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
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
    </>
  )
}
