"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Phone, Mail, User, PlusCircle, Edit3 as EditIcon, Edit, Save, Trash2, Landmark, AlertTriangle, Maximize2, Minimize2, Loader2 } from "lucide-react" // Incluído Edit
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
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
import { v4 as uuidv4 } from 'uuid'
import { useLicitacoesOtimizado, Licitacao as LicitacaoType } from "@/hooks/useLicitacoesOtimizado"; // Usar Licitacao do hook
import { Orgao, statusColors, statusLabels } from '@/types/licitacoes';
import { useOrgaoContatos, OrgaoContato, OrgaoContatoPayload } from "@/hooks/comercial/useOrgaoContatos"





interface DetalhesOrgaoProps {
  orgao: Partial<Orgao> | null; // Permitir Partial para criação/placeholder
  licitacao?: LicitacaoType | null; // Usar o tipo do hook
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrgaoUpdate?: (orgao: Orgao) => void;
  onOrgaoDelete?: (orgao: Orgao) => void;
  // onLicitacaoUpdate?: (licitacao: LicitacaoType) => void; // Removido se não usado diretamente aqui
  // onLicitacaoDelete?: (licitacao: LicitacaoType) => void; // Removido se não usado diretamente aqui
}



const getStatusColor = (status?: keyof typeof statusColors) => {
  if (!status) return "bg-gray-100 text-gray-800";
  return statusColors[status] || "bg-gray-100 text-gray-800";
};

const getStatusLabel = (status?: keyof typeof statusLabels) => {
  if (!status) return "Desconhecido";
  return statusLabels[status] || "Status Desconhecido";
};

const initialContatoFormData: Partial<OrgaoContatoPayload> = {
  nome: '',
  cargo: '',
  email: '',
  telefone: '',
};


export function DetalhesOrgao({
  orgao: orgaoProp, // Renomeado para evitar conflito com estado
  open,
  onOpenChange,
  onOrgaoUpdate,
  onOrgaoDelete,
}: DetalhesOrgaoProps) {
  const [activeTab, setActiveTab] = useState("resumo");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Orgao>>({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false); // Loading geral para o órgão
  const [nomeResponsavelInterno, setNomeResponsavelInterno] = useState<string>("");

  const { toast } = useToast();

  // Hook para contatos do órgão
  const {
    contatos,
    isLoading: isLoadingContatos,
    error: errorContatos,
    createContato,
    updateContato,
    deleteContato,
    fetchContatos,
  } = useOrgaoContatos(formData?.id); // Passa o ID do órgão atual para o hook

  const [showAddEditContatoDialog, setShowAddEditContatoDialog] = useState(false);
  const [contatoFormData, setContatoFormData] = useState<Partial<OrgaoContatoPayload>>(initialContatoFormData);
  const [contatoEmEdicao, setContatoEmEdicao] = useState<OrgaoContato | null>(null);
  const [isSubmittingContato, setIsSubmittingContato] = useState(false);
  const [contatoParaExcluirId, setContatoParaExcluirId] = useState<string | null>(null);
  const [showConfirmDeleteContato, setShowConfirmDeleteContato] = useState(false);

  const [licitacoesDoOrgao, setLicitacoesDoOrgao] = useState<LicitacaoType[]>([]);
  const [isLoadingLicitacoesOrgao, setIsLoadingLicitacoesOrgao] = useState(false);


  useEffect(() => {
    if (open) {
      setActiveTab("resumo");
      setIsEditing(false);
      if (orgaoProp) {
        setFormData(orgaoProp);
        if (orgaoProp.id) {
           // fetchContatos é chamado automaticamente pelo hook useOrgaoContatos quando orgaoId muda
           carregarLicitacoesDoOrgao(orgaoProp.id);
        }
      } else {
        setFormData({});
        setLicitacoesDoOrgao([]);
      }
    }
  }, [orgaoProp, open]);


  useEffect(() => {
    const buscarResponsavel = async () => {
      if (formData.responsavelInterno) {
        try {
          const response = await fetch(`/api/users/${formData.responsavelInterno}`);
          if (!response.ok) {
            console.error(`Erro ao buscar usuário: ${response.statusText}`);
            setNomeResponsavelInterno("Não encontrado"); return;
          }
          const data = await response.json();
          setNomeResponsavelInterno(data?.user?.name || data?.name || "Desconhecido");
        } catch (e) { console.error('Erro ao buscar responsável:', e); setNomeResponsavelInterno("Erro ao buscar"); }
      } else { setNomeResponsavelInterno(""); }
    };
    buscarResponsavel();
  }, [formData.responsavelInterno]);


  const carregarLicitacoesDoOrgao = async (currentOrgaoId?: string) => {
    const idParaConsulta = currentOrgaoId || formData?.id;
    if (!idParaConsulta) { setLicitacoesDoOrgao([]); return; }
    setIsLoadingLicitacoesOrgao(true);
    try {
      const response = await fetch(`/api/licitacoes?orgaoId=${idParaConsulta}`);
      if (!response.ok) throw new Error('Falha ao buscar licitações do órgão');
      const data = await response.json();
      setLicitacoesDoOrgao(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar licitações do órgão:', error);
      toast({ title: "Erro", description: "Não foi possível carregar as licitações deste órgão.", variant: "destructive" });
      setLicitacoesDoOrgao([]);
    } finally {
      setIsLoadingLicitacoesOrgao(false);
    }
  };

  const handleFieldChange = (field: keyof Orgao, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSalvarOrgao = async () => {
    if (!formData.id) { // Não pode salvar sem ID (caso de novo órgão, que não é o foco aqui)
        toast({ title: "Erro", description: "ID do órgão não encontrado para atualização.", variant: "destructive"});
        return;
    }
    setIsEditing(false); // Sair do modo de edição otimisticamente
    try {
        // A API PUT /api/licitacoes/orgaos/[id] espera o payload completo ou parcial em camelCase
        const payloadParaApi = { ...formData };
        // Remover campos que não devem ser enviados ou que são apenas para UI
        delete payloadParaApi.id;
        // delete (payloadParaApi as any).contatos;
        // delete (payloadParaApi as any).licitacoes;


        const response = await fetch(`/api/licitacoes/orgaos/${formData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadParaApi),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Erro ao salvar" }));
            throw new Error(errorData.error || errorData.message || "Falha ao salvar órgão");
        }
        const orgaoAtualizado = await response.json();
        if (onOrgaoUpdate) {
            onOrgaoUpdate(orgaoAtualizado); // Notifica o componente pai
        }
        setFormData(orgaoAtualizado); // Atualiza o formData local com a resposta da API
        toast({ title: "Sucesso", description: "Órgão atualizado com sucesso." });
    } catch (error: any) {
        setIsEditing(true); // Reverter para modo de edição em caso de erro
        toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    }
  };

  const handleExcluirOrgaoClick = () => setShowDeleteConfirm(true);

  const handleConfirmExcluirOrgao = async () => {
    if (!formData?.id) return;
    try {
        await fetch(`/api/licitacoes/orgaos/${formData.id}`, { method: 'DELETE' });
        toast({ title: "Sucesso", description: "Órgão excluído com sucesso." });
        if (onOrgaoDelete && formData) onOrgaoDelete(formData as Orgao);
        onOpenChange(false);
    } catch (error: any) {
        toast({ title: "Erro", description: `Falha ao excluir órgão: ${error.message}`, variant: "destructive" });
    } finally {
        setShowDeleteConfirm(false);
    }
  };

  // Funções CRUD para Contatos usando o hook
  const handleOpenAddContatoModal = () => {
    setContatoEmEdicao(null);
    setContatoFormData(initialContatoFormData);
    setShowAddEditContatoDialog(true);
  };

  const handleOpenEditContatoModal = (contato: OrgaoContato) => {
    setContatoEmEdicao(contato);
    setContatoFormData({
      nome: contato.nome,
      cargo: contato.cargo || "",
      email: contato.email || "",
      telefone: contato.telefone || "",
    });
    setShowAddEditContatoDialog(true);
  };

  const handleContatoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContatoFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitContato = async () => {
    if (!contatoFormData.nome) {
      toast({ title: "Erro", description: "Nome do contato é obrigatório.", variant: "destructive" });
      return;
    }
    if (!formData?.id) {
        toast({ title: "Erro", description: "ID do órgão não definido para associar contato.", variant: "destructive"});
        return;
    }

    setIsSubmittingContato(true);
    try {
      if (contatoEmEdicao) {
        await updateContato(contatoEmEdicao.id, contatoFormData as OrgaoContatoPayload);
        toast({ description: "Contato atualizado com sucesso!" });
      } else {
        await createContato(contatoFormData as OrgaoContatoPayload); // orgaoId já está no contexto do hook
        toast({ description: "Contato adicionado com sucesso!" });
      }
      setShowAddEditContatoDialog(false);
      setContatoEmEdicao(null);
      // fetchContatos(); // O hook deve atualizar a lista automaticamente
    } catch (error: any) {
      toast({ description: `Erro ao salvar contato: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmittingContato(false);
    }
  };

  const handleDeleteContatoClick = (contatoId: string) => {
    setContatoParaExcluirId(contatoId);
    setShowConfirmDeleteContato(true);
  };

  const handleConfirmDeleteContato = async () => {
    if (!contatoParaExcluirId) return;
    setIsSubmittingContato(true);
    try {
      await deleteContato(contatoParaExcluirId);
      toast({ description: "Contato excluído com sucesso." });
      setShowConfirmDeleteContato(false);
      setContatoParaExcluirId(null);
    } catch (error: any) {
      toast({ description: `Erro ao excluir contato: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmittingContato(false);
    }
  };


  if (!open || !formData) return null; // Se o modal não estiver aberto ou formData não carregado

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          className={`p-0 overflow-y-auto transition-all duration-300 ${
            isExpanded ? "w-[95vw] max-w-[95vw]" : "w-full md:max-w-2xl lg:max-w-3xl"
          }`}
        >
          <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center">
              <SheetTitle className="text-xl flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                {isEditing ? (
                  <Input value={formData.nome || ""} onChange={(e) => handleFieldChange("nome", e.target.value)} className="h-8 text-xl font-semibold"/>
                ) : (
                  formData.nome || "Detalhes do Órgão"
                )}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 rounded-full">
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5"><Edit className="w-3.5 h-3.5" />Editar</Button>
                ) : (
                  <Button onClick={handleSalvarOrgao} size="sm" className="gap-1.5"><Save className="w-3.5 h-3.5" />Salvar</Button>
                )}
                 <Button variant="destructive" size="sm" onClick={handleExcluirOrgaoClick} className="gap-1.5"><Trash2 className="w-3.5 h-3.5" />Excluir</Button>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="contatos">Contatos</TabsTrigger>
                <TabsTrigger value="licitacoes">Licitações</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="space-y-6">
                {/* ... (conteúdo da aba resumo como no original, usando formData) ... */}
                <Card><CardContent className="p-4"><h3 className="text-base font-semibold mb-3">Informações Gerais</h3> {/* ... (campos: CNPJ, Endereço, etc.) ... */} </CardContent></Card>
                <Card><CardContent className="p-4"><h3 className="text-base font-semibold mb-3">Detalhes Adicionais</h3> {/* ... (campos: Segmento, Responsável, etc.) ... */} </CardContent></Card>
              </TabsContent>

              <TabsContent value="contatos" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Contatos do Órgão</h3>
                  <Button size="sm" onClick={handleOpenAddContatoModal}><PlusCircle className="w-4 h-4 mr-2"/>Adicionar Contato</Button>
                </div>
                {isLoadingContatos && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin"/> Carregando...</div>}
                {errorContatos && <p className="text-red-500 text-sm">Erro ao carregar contatos: {errorContatos}</p>}
                {!isLoadingContatos && !errorContatos && contatos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>}
                {!isLoadingContatos && !errorContatos && contatos.length > 0 && (
                  <div className="space-y-3">
                    {contatos.map(contato => (
                      <Card key={contato.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{contato.nome}</p>
                              {contato.cargo && <p className="text-xs text-muted-foreground">{contato.cargo}</p>}
                            </div>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditContatoModal(contato)}><EditIcon className="h-4 w-4"/></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteContatoClick(contato.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                          </div>
                           <div className="mt-2 space-y-1 text-xs">
                            {contato.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground"/> <a href={`mailto:${contato.email}`} className="hover:underline">{contato.email}</a></div>}
                            {contato.telefone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground"/> <span>{contato.telefone}</span></div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="licitacoes" className="space-y-4">
                 <h3 className="text-lg font-semibold">Licitações Relacionadas</h3>
                 {isLoadingLicitacoesOrgao && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin"/> Carregando...</div>}
                 {!isLoadingLicitacoesOrgao && licitacoesDoOrgao.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma licitação encontrada para este órgão.</p>}
                 {!isLoadingLicitacoesOrgao && licitacoesDoOrgao.length > 0 && (
                    <div className="space-y-3">
                        {licitacoesDoOrgao.map(l => (
                            <Card key={l.id}><CardContent className="p-3">{l.titulo} - <Badge>{l.status}</Badge></CardContent></Card>
                        ))}
                    </div>
                 )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal Adicionar/Editar Contato */}
      <Dialog open={showAddEditContatoDialog} onOpenChange={(isOpen: boolean) => {
        setShowAddEditContatoDialog(isOpen);
        if (!isOpen) setContatoEmEdicao(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contatoEmEdicao ? "Editar Contato" : "Adicionar Novo Contato"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label htmlFor="contato-nome">Nome*</Label><Input id="contato-nome" name="nome" value={contatoFormData.nome || ""} onChange={handleContatoFormChange} /></div>
            <div><Label htmlFor="contato-cargo">Cargo</Label><Input id="contato-cargo" name="cargo" value={contatoFormData.cargo || ""} onChange={handleContatoFormChange} /></div>
            <div><Label htmlFor="contato-email">Email</Label><Input id="contato-email" name="email" type="email" value={contatoFormData.email || ""} onChange={handleContatoFormChange} /></div>
            <div><Label htmlFor="contato-telefone">Telefone</Label><Input id="contato-telefone" name="telefone" value={contatoFormData.telefone || ""} onChange={handleContatoFormChange} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setShowAddEditContatoDialog(false); setContatoEmEdicao(null);}} disabled={isSubmittingContato}>Cancelar</Button>
            <Button onClick={handleSubmitContato} disabled={isSubmittingContato}>
              {isSubmittingContato ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2" />}
              {contatoEmEdicao ? "Salvar Alterações" : "Adicionar Contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Excluir Contato */}
      <AlertDialog open={showConfirmDeleteContato} onOpenChange={setShowConfirmDeleteContato}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este contato?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContatoParaExcluirId(null)} disabled={isSubmittingContato}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteContato} className="bg-destructive hover:bg-destructive/90" disabled={isSubmittingContato}>
              {isSubmittingContato ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para Excluir Órgão (já existente) */}
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este órgão e todos os seus dados associados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExcluirOrgao} className="bg-destructive hover:bg-destructive/90">Excluir Órgão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


