// components/projetos/detalhes-projeto.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter, SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/ui/use-toast";
import {
  Edit, Save, PlusCircle, Trash2, CalendarIcon, User, Users, FileText, Loader2, ListChecks, CheckCircle, XCircle, Briefcase, UserPlus, UserMinus
} from "lucide-react"; // Adicionado UserPlus, UserMinus
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useProjetos, Projeto, ProjetoPayload, ProjetoUpdatePayload } from "@/hooks/projetos/useProjetos";
import { useProjetoTarefas, ProjetoTarefa, TarefaPayload, TarefaUpdatePayload } from "@/hooks/projetos/useProjetoTarefas";
import { useProjetoEquipe, MembroEquipe, AddMembroPayload, UpdatePapelPayload } from "@/hooks/projetos/useProjetoEquipe"; // Importar hook da equipe
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { VisualizadorDocumentos } from '@/components/documentos/visualizador-documentos';
// import { SeletorDocumentosProjetos } from "./seletor-documentos-projetos"; // A ser criado ou adaptado
import { DocumentType } from "@/hooks/useDocuments";


// Mock de usuários para select de responsável da tarefa/membro da equipe (substituir por fetch real de users)
// const mockUsuarios = [
//     { id: "user-uuid-1", name: "João Silva" },
//     { id: "user-uuid-2", name: "Maria Oliveira" },
//     { id: "user-uuid-3", name: "Carlos Pereira" },
// ]; // Usaremos todosResponsaveisSistema agora

interface DetalhesProjetoProps {
  projeto: Projeto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjetoUpdate?: () => void;
}

const statusProjetoOptions = [ /* ... (mantido) ... */ ];
const statusTarefaOptions = [ /* ... (mantido) ... */ ];

export function DetalhesProjeto({ projeto: projetoProp, open, onOpenChange, onProjetoUpdate }: DetalhesProjetoProps) {
  const [activeTab, setActiveTab] = useState("resumo");
  const [isEditingProjeto, setIsEditingProjeto] = useState(false);
  const [formDataProjeto, setFormDataProjeto] = useState<Partial<ProjetoUpdatePayload>>({});

  const { updateProjeto, isLoading: isLoadingProjetoUpdate } = useProjetos();
  const {
    tarefas, isLoading: isLoadingTarefas, fetchTarefas: fetchProjetoTarefas,
    createTarefa, updateTarefa, patchTarefa, deleteTarefa, setProjetoIdContext: setProjetoIdParaTarefas
  } = useProjetoTarefas(projetoProp?.id, {
      onProgressoProjetoPodeTerMudado: () => { if (onProjetoUpdate) onProjetoUpdate(); }
  });
  const {
    equipe, isLoading: isLoadingEquipe, fetchEquipe, addMembroEquipe, updatePapelMembro, removeMembroEquipe, setProjetoIdContext: setProjetoIdParaEquipe
  } = useProjetoEquipe(projetoProp?.id);


  const [showTarefaModal, setShowTarefaModal] = useState(false);
  const [tarefaFormData, setTarefaFormData] = useState<Partial<TarefaPayload>>({});
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<ProjetoTarefa | null>(null);
  const [isSubmittingTarefa, setIsSubmittingTarefa] = useState(false);
  const [showDeleteTarefaConfirm, setShowDeleteTarefaConfirm] = useState(false);
  const [tarefaParaExcluirId, setTarefaParaExcluirId] = useState<string | null>(null);

  const [todosResponsaveisSistema, setTodosResponsaveisSistema] = useState<Array<{ id: string, name: string }>>([]);

  // Estados para modal da Equipe
  const [showEquipeModal, setShowEquipeModal] = useState(false);
  const [equipeFormData, setEquipeFormData] = useState<AddMembroPayload>({ usuario_id: "", papel_no_projeto: "" });
  const [membroParaEditarPapel, setMembroParaEditarPapel] = useState<MembroEquipe | null>(null);
  const [isSubmittingEquipe, setIsSubmittingEquipe] = useState(false);
  const [showDeleteMembroConfirm, setShowDeleteMembroConfirm] = useState(false);
  const [membroParaRemoverId, setMembroParaRemoverId] = useState<string | null>(null);

  // Estados para Documentos
  const [documentosCarregadosKey, setDocumentosCarregadosKey] = useState(0);
  // const [showSeletorDocumentosModal, setShowSeletorDocumentosModal] = useState(false); // Para vincular existentes
  // const [isVinculandoDocumentos, setIsVinculandoDocumentos] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);


  useEffect(() => {
    if (projetoProp && open) {
      setFormDataProjeto({ /* ... (como antes) ... */
        nome_projeto: projetoProp.nome_projeto,
        descricao: projetoProp.descricao,
        status_projeto: projetoProp.status_projeto,
        data_inicio_prevista: projetoProp.data_inicio_prevista ? format(parseISO(projetoProp.data_inicio_prevista), 'yyyy-MM-dd') : undefined,
        data_fim_prevista: projetoProp.data_fim_prevista ? format(parseISO(projetoProp.data_fim_prevista), 'yyyy-MM-dd') : undefined,
        data_inicio_real: projetoProp.data_inicio_real ? format(parseISO(projetoProp.data_inicio_real), 'yyyy-MM-dd') : undefined,
        data_fim_real: projetoProp.data_fim_real ? format(parseISO(projetoProp.data_fim_real), 'yyyy-MM-dd') : undefined,
        gerente_projeto_id: projetoProp.gerente_projeto_id,
        percentual_concluido: projetoProp.percentual_concluido,
      });
      setProjetoIdParaTarefas(projetoProp.id);
      setProjetoIdParaEquipe(projetoProp.id);
      setDocumentosCarregadosKey(prev => prev + 1);
    } else if (!open) {
        setIsEditingProjeto(false);
    }
  }, [projetoProp, open, setProjetoIdParaTarefas, setProjetoIdParaEquipe]);

  useEffect(() => {
    if (open && todosResponsaveisSistema.length === 0) {
      const carregarUsuarios = async () => {
        try {
          // TODO: Usar useAuth para buscar token se necessário pela API /api/users
          const response = await fetch('/api/users?role=user&role=admin'); // Buscar usuários que podem ser da equipe/responsáveis
          if (!response.ok) throw new Error('Falha ao buscar usuários');
          const data = await response.json();
          setTodosResponsaveisSistema(data.map((u: any) => ({ id: u.id, name: u.name || u.email })));
        } catch (error) {
          console.error("Erro ao buscar usuários do sistema:", error);
          toast({ title: "Erro", description: "Não foi possível carregar lista de usuários.", variant: "destructive"});
        }
      };
      carregarUsuarios();
    }
  }, [open, todosResponsaveisSistema.length]);

  useEffect(() => {
    if (projetoProp?.id && open) {
      if (activeTab === "tarefas") fetchProjetoTarefas(projetoProp.id);
      if (activeTab === "equipe") fetchEquipe(projetoProp.id);
    }
  }, [activeTab, projetoProp?.id, open, fetchProjetoTarefas, fetchEquipe]);


  const handleProjetoFieldChange = (field: keyof ProjetoUpdatePayload, value: any) => { /* ... (mantido) ... */ };
  const handleSaveProjetoPrincipal = async () => { /* ... (mantido) ... */ };
  const handleOpenTarefaModal = (tarefa?: ProjetoTarefa) => { /* ... (mantido) ... */ };
  const handleTarefaFormChange = (field: keyof TarefaPayload | keyof TarefaUpdatePayload, value: any) => { /* ... (mantido) ... */ };
  const handleSubmitTarefa = async () => { /* ... (mantido) ... */ };
  const handleDeleteTarefaClick = (id: string) => { /* ... (mantido) ... */ };
  const handleConfirmDeleteTarefa = async () => { /* ... (mantido) ... */ };
  const handlePatchTarefaStatus = async (tarefaId: string, novoStatus: string) => { /* ... (mantido) ... */ };

  // --- Funções CRUD Equipe ---
  const handleOpenEquipeModal = (membro?: MembroEquipe) => {
    if (membro) {
      setMembroParaEditarPapel(membro);
      setEquipeFormData({ usuario_id: membro.usuario_id, papel_no_projeto: membro.papel_no_projeto });
    } else {
      setMembroParaEditarPapel(null);
      setEquipeFormData({ usuario_id: "", papel_no_projeto: "" });
    }
    setShowEquipeModal(true);
  };

  const handleEquipeFormChange = (field: keyof AddMembroPayload, value: string) => {
    setEquipeFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitEquipe = async () => {
    if (!projetoProp?.id || !equipeFormData.usuario_id || !equipeFormData.papel_no_projeto) {
      toast({ title: "Erro", description: "Usuário e Papel são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmittingEquipe(true);
    try {
      if (membroParaEditarPapel) { // Editando papel
        await updatePapelMembro(membroParaEditarPapel.usuario_id, { papel_no_projeto: equipeFormData.papel_no_projeto }, projetoProp.id);
        toast({ title: "Sucesso", description: "Papel do membro atualizado." });
      } else { // Adicionando novo membro
        await addMembroEquipe({ usuario_id: equipeFormData.usuario_id, papel_no_projeto: equipeFormData.papel_no_projeto }, projetoProp.id);
        toast({ title: "Sucesso", description: "Membro adicionado à equipe." });
      }
      setShowEquipeModal(false);
      // fetchEquipe(projetoProp.id); // Hook já deve atualizar a lista
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar membro da equipe.", variant: "destructive" });
    } finally {
      setIsSubmittingEquipe(false);
    }
  };

  const handleDeleteMembroClick = (usuarioId: string) => {
    setMembroParaRemoverId(usuarioId);
    setShowDeleteMembroConfirm(true);
  };

  const handleConfirmDeleteMembro = async () => {
    if (!projetoProp?.id || !membroParaRemoverId) return;
    setIsSubmittingEquipe(true);
    try {
      await removeMembroEquipe(membroParaRemoverId, projetoProp.id);
      toast({ title: "Sucesso", description: "Membro removido da equipe." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao remover membro.", variant: "destructive" });
    } finally {
      setShowDeleteMembroConfirm(false);
      setMembroParaRemoverId(null);
      setIsSubmittingEquipe(false);
    }
  };

  // --- Funções para Documentos --- (Placeholder para upload/vínculo)
  const handleUploadNovoDocumentoProjeto = () => {
      // TODO: Implementar modal de upload e chamada à API /api/documentos/doc/upload com projeto_id
      toast({title: "Info", description: "Upload de novo documento para projeto a ser implementado."});
  };
  const handleVincularDocumentoExistenteProjeto = () => {
      // TODO: Implementar SeletorDocumentos e chamada à API PATCH /api/documentos/doc/[docId] para setar projeto_id
      // ou API PATCH /api/projetos/[id]/documentos/vincular
      toast({title: "Info", description: "Vincular documento existente a projeto a ser implementado."});
  };
  const handleDesvincularDocumentoProjeto = async (documentoId: string) => {
    if (!projetoProp?.id) return;
    // TODO: Implementar chamada à API PATCH /api/documentos/doc/[docId] para setar projeto_id = null
    toast({title: "Info", description: `Desvincular documento ${documentoId} (sem excluir) a ser implementado.`});
    setDocumentosCarregadosKey(prev => prev + 1); // Força reload do Visualizador
  };


  if (!projetoProp || !open) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => { /* ... (mantido) ... */ }}>
        {/* ... (SheetContent e SheetHeader como antes) ... */}
        <SheetContent className="sm:max-w-3xl w-full p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* ... (Header com título, status, gerente, botões Editar/Salvar Projeto) ... */}
              <SheetHeader /* ... */ > {/* ... Conteúdo ... */} </SheetHeader>
              <Separator/>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="tarefas">Tarefas ({tarefas.length})</TabsTrigger>
                  <TabsTrigger value="equipe">Equipe ({equipe.length})</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="mt-4 space-y-4">
                  {/* ... (Conteúdo da aba Resumo como antes) ... */}
                </TabsContent>

                <TabsContent value="tarefas" className="mt-4 space-y-4">
                  {/* ... (Conteúdo da aba Tarefas como antes) ... */}
                </TabsContent>

                <TabsContent value="equipe" className="mt-4 space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => handleOpenEquipeModal()} disabled={!isEditingProjeto}><UserPlus className="mr-2 h-4 w-4"/> Adicionar Membro</Button>
                  </div>
                  {isLoadingEquipe && <div className="text-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                  {errorEquipe && <p className="text-red-500">Erro ao carregar equipe: {errorEquipe}</p>}
                  {!isLoadingEquipe && equipe.length === 0 && <p className="text-muted-foreground text-center">Nenhum membro na equipe.</p>}
                  <div className="space-y-3">
                    {equipe.map(membro => (
                      <Card key={membro.usuario_id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{membro.usuario_nome} <span className="text-xs text-muted-foreground">({membro.usuario_email})</span></p>
                              <p className="text-sm text-primary">{membro.papel_no_projeto}</p>
                            </div>
                            {isEditingProjeto && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEquipeModal(membro)}><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMembroClick(membro.usuario_id)}><UserMinus className="h-4 w-4 text-red-500"/></Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="documentos" className="mt-4 space-y-4">
                  <div className="flex justify-end gap-2">
                    {isEditingProjeto && (
                        <>
                            <Button size="sm" onClick={handleUploadNovoDocumentoProjeto}><Upload className="mr-2 h-4 w-4"/>Upload Novo</Button>
                            {/* <Button size="sm" onClick={handleVincularDocumentoExistenteProjeto} variant="outline"><LinkIcon className="mr-2 h-4 w-4"/>Vincular Existente</Button> */}
                        </>
                    )}
                  </div>
                  <VisualizadorDocumentos
                    key={`docs-projeto-${projetoProp.id}-${documentosCarregadosKey}`}
                    entityId={projetoProp.id}
                    entityType={"projeto" as any} // Cast se "projeto" não estiver no tipo do Visualizador
                    title=""
                    showFilters={true}
                    allowUpload={false} // Upload é feito pelo botão acima
                    showDesvincular={isEditingProjeto}
                    onDesvincularDocumento={handleDesvincularDocumentoProjeto}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Modal Adicionar/Editar Tarefa (como antes) */}
      {showTarefaModal && ( <Dialog open={showTarefaModal} onOpenChange={(isOpen) => { /* ... */ }}> {/* ... Conteúdo ... */} </Dialog> )}
      <AlertDialog open={showDeleteTarefaConfirm} onOpenChange={setShowDeleteTarefaConfirm}>{/* ... Conteúdo ... */}</AlertDialog>

      {/* Modal Adicionar/Editar Membro da Equipe */}
      {showEquipeModal && (
        <Dialog open={showEquipeModal} onOpenChange={(isOpen) => {
            setShowEquipeModal(isOpen);
            if (!isOpen) setMembroParaEditarPapel(null);
        }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{membroParaEditarPapel ? "Editar Papel do Membro" : "Adicionar Membro à Equipe"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              {!membroParaEditarPapel && ( // Campo de seleção de usuário apenas para adicionar novo
                <div><Label htmlFor="equipe-usuario">Usuário*</Label>
                  <Select value={equipeFormData.usuario_id} onValueChange={val => handleEquipeFormChange("usuario_id", val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um usuário"/></SelectTrigger>
                    <SelectContent>{todosResponsaveisSistema.map(u => <SelectItem key={u.id} value={u.id} disabled={equipe.some(m => m.usuario_id === u.id)}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {membroParaEditarPapel && <p><strong>Usuário:</strong> {membroParaEditarPapel.usuario_nome}</p>}
              <div><Label htmlFor="equipe-papel">Papel no Projeto*</Label><Input id="equipe-papel" value={equipeFormData.papel_no_projeto} onChange={e => handleEquipeFormChange("papel_no_projeto", e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEquipeModal(false)} disabled={isSubmittingEquipe}>Cancelar</Button>
              <Button onClick={handleSubmitEquipe} disabled={isSubmittingEquipe}>
                {isSubmittingEquipe ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                {membroParaEditarPapel ? "Salvar Papel" : "Adicionar Membro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* AlertDialog para Remover Membro da Equipe */}
      <AlertDialog open={showDeleteMembroConfirm} onOpenChange={setShowDeleteMembroConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Remoção</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover este membro da equipe do projeto?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMembroParaRemoverId(null)} disabled={isSubmittingEquipe}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteMembro} className="bg-destructive hover:bg-destructive/80" disabled={isSubmittingEquipe}>
                {isSubmittingEquipe ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UserMinus className="h-4 w-4 mr-2"/>} Remover Membro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Placeholder para Modal de Upload de Documento e Seletor de Documentos para Projeto */}
      {/* Estes seriam implementados de forma similar aos de Licitação/Oportunidade */}

    </>
  );
}

function formatFileSize(bytes: number): string { /* ... (mantido) ... */ }

```
