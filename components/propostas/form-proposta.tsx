"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Save, PlusCircle, Trash2, DollarSign, Loader2 } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePropostas, Proposta, PropostaItem } from "@/hooks/propostas/usePropostas"; // Ajustar PropostaItem se necessário

// Tipos para props de select (simplificado)
interface SelectOption { id: string; nome?: string; name?: string; titulo?: string; }

interface FormPropostaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propostaParaEditar?: Proposta | null;
  onPropostaSaved: () => void;
  clientes: SelectOption[];
  orgaos?: SelectOption[]; // Órgãos podem vir de uma fonte diferente ou ser combinados com clientes
  oportunidades: SelectOption[];
  licitacoes: SelectOption[];
  responsaveis: SelectOption[]; // Usuários do sistema
}

interface PropostaFormData {
  titulo: string;
  numero_proposta?: string; // Gerado pela API na criação
  versao?: number;
  status_proposta: string;
  data_emissao: Date | undefined;
  data_validade?: Date | undefined;
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  licitacao_id?: string | null;
  responsavel_id?: string | null;
  moeda: string;
  percentual_desconto: number;
  valor_impostos: number; // Valor fixo de imposto
  condicoes_pagamento: string;
  prazo_entrega_execucao: string;
  observacoes_internas: string;
  escopo_geral: string;
  itens: Partial<PropostaItem>[];
}

const initialItemForm: Partial<PropostaItem> = {
  tipo_item: "SERVICO_CONSULTORIA",
  descricao_item: "",
  unidade_medida: "Hora",
  quantidade: 1,
  valor_unitario: 0,
};

export function FormProposta({
  open, onOpenChange, propostaParaEditar, onPropostaSaved,
  clientes, orgaos = [], oportunidades, licitacoes, responsaveis
}: FormPropostaProps) {
  const { createProposta, updateProposta, isLoading } = usePropostas();
  const isEditMode = !!propostaParaEditar;

  const initialFormData: PropostaFormData = {
    titulo: "",
    status_proposta: "EM_ELABORACAO",
    data_emissao: new Date(),
    data_validade: undefined,
    cliente_id: null,
    orgao_id: null,
    oportunidade_id: null,
    licitacao_id: null,
    responsavel_id: null,
    moeda: "BRL",
    percentual_desconto: 0,
    valor_impostos: 0,
    condicoes_pagamento: "",
    prazo_entrega_execucao: "",
    observacoes_internas: "",
    escopo_geral: "",
    itens: [{ ...initialItemForm }],
  };

  const [formData, setFormData] = useState<PropostaFormData>(initialFormData);
  const [selectedEntidadeTipo, setSelectedEntidadeTipo] = useState<'cliente' | 'orgao' | null>(null);


  useEffect(() => {
    if (propostaParaEditar && open) {
      setFormData({
        titulo: propostaParaEditar.titulo,
        numero_proposta: propostaParaEditar.numero_proposta,
        versao: propostaParaEditar.versao,
        status_proposta: propostaParaEditar.status_proposta,
        data_emissao: propostaParaEditar.data_emissao ? parseISO(propostaParaEditar.data_emissao) : new Date(),
        data_validade: propostaParaEditar.data_validade ? parseISO(propostaParaEditar.data_validade) : undefined,
        cliente_id: propostaParaEditar.cliente_id,
        orgao_id: propostaParaEditar.orgao_id,
        oportunidade_id: propostaParaEditar.oportunidade_id,
        licitacao_id: propostaParaEditar.licitacao_id,
        responsavel_id: propostaParaEditar.responsavel_id,
        moeda: propostaParaEditar.moeda || "BRL",
        percentual_desconto: propostaParaEditar.percentual_desconto || 0,
        valor_impostos: propostaParaEditar.valor_impostos || 0,
        condicoes_pagamento: propostaParaEditar.condicoes_pagamento || "",
        prazo_entrega_execucao: propostaParaEditar.prazo_entrega_execucao || "",
        observacoes_internas: propostaParaEditar.observacoes_internas || "",
        escopo_geral: propostaParaEditar.escopo_geral || "",
        itens: propostaParaEditar.itens?.map(item => ({ ...item })) || [{ ...initialItemForm }],
      });
      if (propostaParaEditar.cliente_id) setSelectedEntidadeTipo('cliente');
      else if (propostaParaEditar.orgao_id) setSelectedEntidadeTipo('orgao');
      else setSelectedEntidadeTipo(null);

    } else if (!isEditMode && open) {
      setFormData(initialFormData);
      setSelectedEntidadeTipo(null);
    }
  }, [propostaParaEditar, open, isEditMode]);

  const handleInputChange = (field: keyof PropostaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (field: 'data_emissao' | 'data_validade', date?: Date) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleItemChange = (index: number, field: keyof PropostaItem, value: any) => {
    const newItems = [...formData.itens];
    const itemToUpdate = { ...newItems[index], [field]: value };

    // Recalcular subtotal se quantidade ou valor_unitario mudar
    if (field === 'quantidade' || field === 'valor_unitario') {
        const qtd = field === 'quantidade' ? Number(value) : Number(itemToUpdate.quantidade);
        const val = field === 'valor_unitario' ? Number(value) : Number(itemToUpdate.valor_unitario);
        itemToUpdate.subtotal_item = parseFloat((qtd * val).toFixed(2));
    }
    newItems[index] = itemToUpdate;
    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const adicionarItem = () => {
    setFormData(prev => ({ ...prev, itens: [...prev.itens, { ...initialItemForm }] }));
  };

  const removerItem = (index: number) => {
    if (formData.itens.length <= 1) {
      toast({ title: "Atenção", description: "A proposta deve ter pelo menos um item.", variant: "default" });
      return;
    }
    const newItems = formData.itens.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const handleSubmit = async () => {
    if (!formData.titulo) {
      toast({ title: "Erro de Validação", description: "O título da proposta é obrigatório.", variant: "destructive" });
      return;
    }
    if (!selectedEntidadeTipo || (selectedEntidadeTipo === 'cliente' && !formData.cliente_id) || (selectedEntidadeTipo === 'orgao' && !formData.orgao_id)) {
        toast({ title: "Erro de Validação", description: "Selecione um Cliente ou Órgão para a proposta.", variant: "destructive" });
        return;
    }
    if (formData.itens.some(item => !item.descricao_item || item.quantidade! <= 0 || item.valor_unitario! < 0)) {
      toast({ title: "Erro de Validação", description: "Todos os itens devem ter descrição, quantidade positiva e valor unitário não negativo.", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      data_emissao: formData.data_emissao ? format(formData.data_emissao, "yyyy-MM-dd") : undefined,
      data_validade: formData.data_validade ? format(formData.data_validade, "yyyy-MM-dd") : null,
      cliente_id: selectedEntidadeTipo === 'cliente' ? formData.cliente_id : null,
      orgao_id: selectedEntidadeTipo === 'orgao' ? formData.orgao_id : null,
      // A API calculará os totais com base nos itens, desconto e impostos
      itens: formData.itens.map(item => ({ // Garantir que apenas os campos da API sejam enviados
          id: item.id, // Importante para PUT saber quais itens atualizar/manter
          tipo_item: item.tipo_item!,
          descricao_item: item.descricao_item!,
          unidade_medida: item.unidade_medida!,
          quantidade: Number(item.quantidade) || 0,
          valor_unitario: Number(item.valor_unitario) || 0,
          observacoes_item: item.observacoes_item,
          ordem: item.ordem
      })),
    };

    try {
      if (isEditMode && propostaParaEditar?.id) {
        await updateProposta(propostaParaEditar.id, payload as any); // Cast 'any' temporário
        toast({ title: "Sucesso", description: "Proposta atualizada." });
      } else {
        await createProposta(payload as any); // Cast 'any' temporário
        toast({ title: "Sucesso", description: "Proposta criada." });
      }
      onPropostaSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao salvar proposta.", variant: "destructive" });
    }
  };

  const calcularTotais = () => {
    const valorTotalItens = formData.itens.reduce((acc, item) => acc + (Number(item.quantidade || 0) * Number(item.valor_unitario || 0)), 0);
    const valorDesconto = valorTotalItens * (Number(formData.percentual_desconto || 0) / 100);
    const subtotalPosDesconto = valorTotalItens - valorDesconto;
    const valorTotalProposta = subtotalPosDesconto + (Number(formData.valor_impostos || 0)); // Assumindo valor_impostos é um valor fixo
    return { valorTotalItens, valorDesconto, subtotalPosDesconto, valorTotalProposta };
  };
  const totais = calcularTotais();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <ScrollArea className="max-h-[80vh]">
          <div className="p-1 pr-3"> {/* Padding to allow scrollbar within content */}
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Proposta" : "Criar Nova Proposta"} {formData.numero_proposta && `- ${formData.numero_proposta}`}</DialogTitle>
              <DialogDescription>
                Preencha os detalhes da proposta. {isEditMode && `Versão: ${formData.versao || 1}`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Seção Dados Gerais */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Dados Gerais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="titulo">Título da Proposta*</Label><Input id="titulo" value={formData.titulo} onChange={e => handleInputChange("titulo", e.target.value)} /></div>
                    <div><Label htmlFor="status_proposta">Status*</Label>
                      <Select value={formData.status_proposta} onValueChange={val => handleInputChange("status_proposta", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EM_ELABORACAO">Em Elaboração</SelectItem>
                          <SelectItem value="ENVIADA_AO_CLIENTE">Enviada ao Cliente</SelectItem>
                          <SelectItem value="EM_NEGOCIACAO">Em Negociação</SelectItem>
                          <SelectItem value="ACEITA">Aceita</SelectItem>
                          <SelectItem value="RECUSADA">Recusada</SelectItem>
                          <SelectItem value="CANCELADA">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="data_emissao">Data de Emissão*</Label>
                      <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.data_emissao && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.data_emissao ? format(formData.data_emissao, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.data_emissao} onSelect={date => handleDateChange("data_emissao", date)} initialFocus /></PopoverContent></Popover>
                    </div>
                    <div><Label htmlFor="data_validade">Data de Validade</Label>
                      <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.data_validade && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.data_validade ? format(formData.data_validade, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.data_validade} onSelect={date => handleDateChange("data_validade", date)} /></PopoverContent></Popover>
                    </div>
                  </div>

                  <div>
                    <Label>Proposta Para*</Label>
                    <div className="flex gap-4 mt-1">
                        <Button variant={selectedEntidadeTipo === 'cliente' ? 'default' : 'outline'} onClick={() => {setSelectedEntidadeTipo('cliente'); handleInputChange('orgao_id', null);}}>Cliente</Button>
                        <Button variant={selectedEntidadeTipo === 'orgao' ? 'default' : 'outline'} onClick={() => {setSelectedEntidadeTipo('orgao'); handleInputChange('cliente_id', null);}}>Órgão</Button>
                    </div>
                  </div>

                  {selectedEntidadeTipo === 'cliente' && (
                    <div><Label htmlFor="cliente_id">Cliente*</Label>
                      <Select value={formData.cliente_id || ""} onValueChange={val => handleInputChange("cliente_id", val || null)}><SelectTrigger><SelectValue placeholder="Selecione o Cliente" /></SelectTrigger><SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome || c.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                  )}
                  {selectedEntidadeTipo === 'orgao' && (
                     <div><Label htmlFor="orgao_id">Órgão*</Label>
                      <Select value={formData.orgao_id || ""} onValueChange={val => handleInputChange("orgao_id", val || null)}><SelectTrigger><SelectValue placeholder="Selecione o Órgão" /></SelectTrigger><SelectContent>{orgaos.map(o => <SelectItem key={o.id} value={o.id}>{o.nome || o.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="oportunidade_id">Oportunidade Associada</Label>
                      <Select value={formData.oportunidade_id || ""} onValueChange={val => handleInputChange("oportunidade_id", val || null)}><SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger><SelectContent>{oportunidades.map(op => <SelectItem key={op.id} value={op.id}>{op.titulo}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div><Label htmlFor="licitacao_id">Licitação Associada</Label>
                      <Select value={formData.licitacao_id || ""} onValueChange={val => handleInputChange("licitacao_id", val || null)}><SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger><SelectContent>{licitacoes.map(lic => <SelectItem key={lic.id} value={lic.id}>{lic.titulo}</SelectItem>)}</SelectContent></Select>
                    </div>
                  </div>
                   <div><Label htmlFor="responsavel_id">Responsável Interno</Label>
                      <Select value={formData.responsavel_id || ""} onValueChange={val => handleInputChange("responsavel_id", val || null)}><SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger><SelectContent>{responsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
              </Card>

              {/* Seção Itens da Proposta */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Itens da Proposta*</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {formData.itens.map((item, index) => (
                    <div key={index} className="p-3 border rounded-md space-y-3 relative">
                      {formData.itens.length > 1 && ( <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removerItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button> )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><Label htmlFor={`item-tipo-${index}`}>Tipo*</Label>
                          <Select value={item.tipo_item || ""} onValueChange={val => handleItemChange(index, "tipo_item", val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SOFTWARE_LICENCA">Licença de Software</SelectItem>
                              <SelectItem value="SERVICO_DESENVOLVIMENTO">Serviço de Desenvolvimento</SelectItem>
                              <SelectItem value="SERVICO_CONSULTORIA">Serviço de Consultoria</SelectItem>
                              <SelectItem value="SERVICO_SUPORTE">Serviço de Suporte Técnico</SelectItem>
                              <SelectItem value="HARDWARE">Hardware</SelectItem>
                              <SelectItem value="TREINAMENTO">Treinamento</SelectItem>
                              <SelectItem value="OUTRO">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label htmlFor={`item-unidade-${index}`}>Unidade*</Label><Input id={`item-unidade-${index}`} value={item.unidade_medida || ""} onChange={e => handleItemChange(index, "unidade_medida", e.target.value)} /></div>
                      </div>
                      <div><Label htmlFor={`item-desc-${index}`}>Descrição*</Label><Textarea id={`item-desc-${index}`} value={item.descricao_item || ""} onChange={e => handleItemChange(index, "descricao_item", e.target.value)} /></div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><Label htmlFor={`item-qtd-${index}`}>Quantidade*</Label><Input id={`item-qtd-${index}`} type="number" value={item.quantidade || 1} onChange={e => handleItemChange(index, "quantidade", parseFloat(e.target.value))} /></div>
                        <div><Label htmlFor={`item-valor-${index}`}>Valor Unitário*</Label><Input id={`item-valor-${index}`} type="number" value={item.valor_unitario || 0} onChange={e => handleItemChange(index, "valor_unitario", parseFloat(e.target.value))} /></div>
                        <div><Label>Subtotal</Label><Input value={(item.subtotal_item || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"})} readOnly disabled className="font-medium"/></div>
                      </div>
                       <div><Label htmlFor={`item-obs-${index}`}>Observações do Item</Label><Input id={`item-obs-${index}`} value={item.observacoes_item || ""} onChange={e => handleItemChange(index, "observacoes_item", e.target.value)} /></div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={adicionarItem} className="w-full gap-2"><PlusCircle className="h-4 w-4" />Adicionar Item</Button>
                </CardContent>
              </Card>

              {/* Seção Valores e Condições */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Valores e Condições</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-md bg-slate-50 space-y-2">
                        <div className="flex justify-between items-center"><span className="text-sm">Total dos Itens:</span><span className="font-semibold">{totais.valorTotalItens.toLocaleString("pt-BR", {style:"currency", currency:"BRL"})}</span></div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="percentual_desconto" className="text-sm whitespace-nowrap">Desconto (%):</Label>
                            <Input id="percentual_desconto" type="number" value={formData.percentual_desconto} onChange={e => handleInputChange("percentual_desconto", parseFloat(e.target.value) || 0)} className="w-24 h-8"/>
                            <span className="text-sm">({totais.valorDesconto.toLocaleString("pt-BR", {style:"currency", currency:"BRL"})})</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2"><span className="text-sm">Subtotal:</span><span className="font-semibold">{totais.subtotalPosDesconto.toLocaleString("pt-BR", {style:"currency", currency:"BRL"})}</span></div>
                         <div className="flex items-center gap-2">
                            <Label htmlFor="valor_impostos" className="text-sm whitespace-nowrap">Impostos (Valor Fixo):</Label>
                            <Input id="valor_impostos" type="number" value={formData.valor_impostos} onChange={e => handleInputChange("valor_impostos", parseFloat(e.target.value) || 0)} className="w-32 h-8"/>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2"><span className="text-lg font-bold">Valor Total da Proposta:</span><span className="text-lg font-bold">{totais.valorTotalProposta.toLocaleString("pt-BR", {style:"currency", currency:"BRL"})}</span></div>
                    </div>
                  <div><Label htmlFor="condicoes_pagamento">Condições de Pagamento</Label><Textarea id="condicoes_pagamento" value={formData.condicoes_pagamento} onChange={e => handleInputChange("condicoes_pagamento", e.target.value)} /></div>
                  <div><Label htmlFor="prazo_entrega_execucao">Prazo de Entrega/Execução</Label><Input id="prazo_entrega_execucao" value={formData.prazo_entrega_execucao} onChange={e => handleInputChange("prazo_entrega_execucao", e.target.value)} /></div>
                </CardContent>
              </Card>

              {/* Outras Seções (Escopo, Documentos, Observações) */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Detalhes Adicionais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div><Label htmlFor="escopo_geral">Escopo Geral dos Serviços/Produtos</Label><Textarea id="escopo_geral" value={formData.escopo_geral} onChange={e => handleInputChange("escopo_geral", e.target.value)} /></div>
                    {/* TODO: Adicionar UI para Documentos da Proposta */}
                    <div><Label htmlFor="observacoes_internas">Observações Internas</Label><Textarea id="observacoes_internas" value={formData.observacoes_internas} onChange={e => handleInputChange("observacoes_internas", e.target.value)} /></div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white py-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button></DialogClose>
              <Button type="button" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditMode ? "Salvar Alterações" : "Criar Proposta"}
              </Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
