"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, SheetClose
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Proposta, PropostaItem, PropostaDocumento, usePropostas } from "@/hooks/propostas/usePropostas";
import {
  Mail, Edit, FileText, DollarSign, CalendarDays, UserCircle, Briefcase, Building, FileArchive, Send, Loader2, Tag, CheckCircle, XCircle, AlertCircle, Info
} from "lucide-react";
import { VisualizadorDocumentos } from '@/components/documentos/visualizador-documentos'; // Reutilizar
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DetalhesPropostaProps {
  proposta: Proposta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlteraStatus: (propostaId: string, novoStatus: string, motivo?: string) => Promise<void>; // Para atualizar na lista principal
  onEdit: (proposta: Proposta) => void;
}

// Status e suas cores (exemplo)
const statusConfig: Record<string, { label: string; color: string }> = {
  EM_ELABORACAO: { label: "Em Elaboração", color: "bg-blue-100 text-blue-700" },
  ENVIADA_PARA_APROVACAO_INTERNA: { label: "Aprovação Interna", color: "bg-yellow-100 text-yellow-700" },
  AGUARDANDO_AJUSTES: { label: "Aguardando Ajustes", color: "bg-orange-100 text-orange-700" },
  PRONTA_PARA_ENVIO: { label: "Pronta para Envio", color: "bg-indigo-100 text-indigo-700" },
  ENVIADA_AO_CLIENTE: { label: "Enviada ao Cliente", color: "bg-purple-100 text-purple-700" },
  EM_NEGOCIACAO: { label: "Em Negociação", color: "bg-teal-100 text-teal-700" },
  ACEITA: { label: "Aceita", color: "bg-green-100 text-green-700" },
  RECUSADA: { label: "Recusada", color: "bg-red-100 text-red-700" },
  CANCELADA: { label: "Cancelada", color: "bg-gray-100 text-gray-700" },
};

const statusOptions = Object.entries(statusConfig).map(([value, { label }]) => ({ value, label }));


export function DetalhesProposta({ proposta, open, onOpenChange, onAlteraStatus, onEdit }: DetalhesPropostaProps) {
  const { updateStatusProposta, isLoading: isLoadingStatusUpdate } = usePropostas();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareSubject, setShareSubject] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [novoStatus, setNovoStatus] = useState(proposta?.status_proposta || "");
  const [motivoStatus, setMotivoStatus] = useState("");


  useEffect(() => {
    if (proposta) {
      setNovoStatus(proposta.status_proposta);
      setMotivoStatus(proposta.motivo_recusa_cancelamento || "");
      setShareSubject(`Proposta Comercial: ${proposta.titulo}`);
      setShareMessage(`Prezado(a),\n\nSegue a proposta comercial "${proposta.titulo}".\n\nAtenciosamente,`);
      // Tentar buscar email do contato principal para preencher shareEmail
      // (requereria buscar o contato do cliente/orgao associado à proposta)
    }
  }, [proposta]);

  if (!proposta) return null;

  const handleShareProposta = async () => {
    if (!shareEmail || !shareSubject || !shareMessage) {
      toast({ title: "Erro", description: "Todos os campos do email são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSendingEmail(true);
    try {
      const response = await fetch(`/api/propostas/${proposta.id}/compartilhar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Adicionar token de autenticação se a API de compartilhar exigir
          // 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          email_destinatario: shareEmail,
          assunto: shareSubject,
          corpo_email_personalizado: shareMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao compartilhar." }));
        throw new Error(errorData.error || errorData.message || "Falha ao enviar email da proposta.");
      }

      const result = await response.json();
      toast({ title: "Sucesso", description: result.message || "Proposta compartilhada por email." });
      setShowShareModal(false);

      // Notificar a página pai para recarregar a proposta, pois o status pode ter mudado
      if (onAlteraStatus) {
        // A API de compartilhar já atualiza o status e data_envio.
        // Apenas precisamos que a lista/detalhes na página principal sejam atualizados.
        // onAlteraStatus é um bom callback para isso, pois geralmente aciona um fetchPropostas.
        await onAlteraStatus(proposta.id, "ENVIADA_AO_CLIENTE"); // Status é simbólico aqui, o importante é o refresh
      }

    } catch (error: any) {
      toast({ title: "Erro ao Compartilhar", description: error.message || "Falha ao compartilhar proposta.", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSalvarStatus = async () => {
    if (!novoStatus) {
        toast({ title: "Erro", description: "Selecione um novo status.", variant: "destructive" });
        return;
    }
    try {
        await onAlteraStatus(proposta.id, novoStatus, (novoStatus === 'RECUSADA' || novoStatus === 'CANCELADA') ? motivoStatus : undefined);
        toast({ title: "Sucesso", description: "Status da proposta atualizado." });
        setShowStatusModal(false);
    } catch (error: any) {
        toast({ title: "Erro", description: error.message || "Falha ao atualizar status.", variant: "destructive"});
    }
  };

  const formatCurrency = (value?: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' });
  const formatDate = (dateString?: string | null) => dateString ? format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-3xl w-full p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-2xl">{proposta.titulo} <Badge variant="outline" className="ml-2 text-sm">#{proposta.numero_proposta} (v{proposta.versao})</Badge></SheetTitle>
                <div className="flex items-center space-x-2 pt-1">
                    <Badge className={statusConfig[proposta.status_proposta]?.color || statusConfig.EM_ELABORACAO.color}>
                        {statusConfig[proposta.status_proposta]?.label || proposta.status_proposta}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Emitida em: {formatDate(proposta.data_emissao)}</span>
                    {proposta.data_validade && <span className="text-xs text-muted-foreground">Válida até: {formatDate(proposta.data_validade)}</span>}
                </div>
              </SheetHeader>

              {/* Ações Principais */}
              <div className="flex gap-2">
                <Button onClick={() => onEdit(proposta)} variant="outline" size="sm"><Edit className="mr-2 h-4 w-4"/>Editar Proposta</Button>
                <Button onClick={() => setShowStatusModal(true)} variant="outline" size="sm"><Tag className="mr-2 h-4 w-4"/>Alterar Status</Button>
                <Button onClick={() => setShowShareModal(true)} variant="outline" size="sm"><Send className="mr-2 h-4 w-4"/>Compartilhar</Button>
              </div>
              <Separator/>

              {/* Detalhes da Proposta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-2 text-base flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Informações Gerais</h3>
                  <p><strong className="font-medium">Cliente/Órgão:</strong> {proposta.cliente_nome || proposta.orgao_nome || "N/A"}</p>
                  {proposta.oportunidade_titulo && <p><strong className="font-medium">Oportunidade:</strong> {proposta.oportunidade_titulo}</p>}
                  {proposta.licitacao_titulo && <p><strong className="font-medium">Licitação:</strong> {proposta.licitacao_titulo}</p>}
                  <p><strong className="font-medium">Responsável:</strong> {proposta.responsavel_nome || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-base flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Valores</h3>
                  <p><strong className="font-medium">Total Itens:</strong> {formatCurrency(proposta.valor_total_itens)}</p>
                  {proposta.percentual_desconto > 0 && <p><strong className="font-medium">Desconto:</strong> {proposta.percentual_desconto}% ({formatCurrency(proposta.valor_desconto)})</p>}
                  <p><strong className="font-medium">Subtotal:</strong> {formatCurrency(proposta.valor_subtotal_pos_desconto)}</p>
                  <p><strong className="font-medium">Impostos:</strong> {formatCurrency(proposta.valor_impostos)}</p>
                  <p className="text-base font-bold"><strong className="font-bold">Total da Proposta:</strong> {formatCurrency(proposta.valor_total_proposta)}</p>
                </div>
              </div>
              <Separator/>

              {/* Itens da Proposta */}
              <div>
                <h3 className="font-semibold mb-3 text-base flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary"/>Itens da Proposta</h3>
                {proposta.itens && proposta.itens.length > 0 ? (
                  <div className="space-y-3">
                    {proposta.itens.map((item, index) => (
                      <Card key={item.id || index} className="bg-slate-50">
                        <CardContent className="p-3 text-sm">
                          <p className="font-medium">{item.descricao_item}</p>
                          <p className="text-xs text-muted-foreground">Tipo: {item.tipo_item} | Unidade: {item.unidade_medida}</p>
                          <p>Qtd: {item.quantidade} x {formatCurrency(item.valor_unitario)} = <span className="font-semibold">{formatCurrency(item.subtotal_item)}</span></p>
                          {item.observacoes_item && <p className="text-xs italic mt-1">Obs: {item.observacoes_item}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Nenhum item na proposta.</p>}
              </div>
              <Separator/>

              {/* Outras Informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {proposta.escopo_geral && <div><h4 className="font-semibold mb-1">Escopo Geral</h4><Textarea value={proposta.escopo_geral} readOnly className="min-h-[80px] bg-slate-50"/></div>}
                {proposta.condicoes_pagamento && <div><h4 className="font-semibold mb-1">Condições de Pagamento</h4><Textarea value={proposta.condicoes_pagamento} readOnly className="min-h-[80px] bg-slate-50"/></div>}
                {proposta.prazo_entrega_execucao && <div><h4 className="font-semibold mb-1">Prazo de Entrega/Execução</h4><p>{proposta.prazo_entrega_execucao}</p></div>}
                {proposta.observacoes_internas && <div><h4 className="font-semibold mb-1">Observações Internas</h4><Textarea value={proposta.observacoes_internas} readOnly className="min-h-[80px] bg-slate-50"/></div>}
              </div>
              <Separator/>

              {/* Documentos da Proposta */}
              <div>
                <h3 className="font-semibold mb-3 text-base flex items-center"><FileArchive className="mr-2 h-5 w-5 text-primary"/>Documentos da Proposta</h3>
                <VisualizadorDocumentos
                  entityId={proposta.id}
                  entityType={"proposta" as any} // Cast temporário se 'proposta' não estiver no tipo
                  title="" // Título já está acima
                  showFilters={false}
                  allowUpload={false} // Upload/vínculo deve ser feito no FormProposta
                />
              </div>

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Modal de Compartilhamento */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compartilhar Proposta por Email</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div><Label htmlFor="share-email">Email do Destinatário*</Label><Input id="share-email" type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} /></div>
            <div><Label htmlFor="share-subject">Assunto*</Label><Input id="share-subject" value={shareSubject} onChange={e => setShareSubject(e.target.value)} /></div>
            <div><Label htmlFor="share-message">Mensagem*</Label><Textarea id="share-message" value={shareMessage} onChange={e => setShareMessage(e.target.value)} rows={5}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)} disabled={isSendingEmail}>Cancelar</Button>
            <Button onClick={handleShareProposta} disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2" />}
              Enviar Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Alterar Status */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
            <DialogHeader><DialogTitle>Alterar Status da Proposta</DialogTitle></DialogHeader>
            <div className="py-4 space-y-3">
                <div>
                    <Label htmlFor="novo-status">Novo Status</Label>
                    <Select value={novoStatus} onValueChange={setNovoStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                {(novoStatus === 'RECUSADA' || novoStatus === 'CANCELADA') && (
                    <div>
                        <Label htmlFor="motivo-status">Motivo (para Recusada/Cancelada)</Label>
                        <Textarea id="motivo-status" value={motivoStatus} onChange={e => setMotivoStatus(e.target.value)} />
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isLoadingStatusUpdate}>Cancelar</Button>
                <Button onClick={handleSalvarStatus} disabled={isLoadingStatusUpdate}>
                    {isLoadingStatusUpdate ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Status
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
