"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, CheckIcon, Loader2 } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale"
import { toast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useReunioes, Reuniao as ReuniaoType } from "@/hooks/comercial/use-reunioes";

interface AgendarReuniaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidadeId: string;
  clienteId?: string;
  clienteNome?: string;
  onReuniaoAgendada: () => void; // Callback para criação ou atualização
  reuniaoParaEditar?: ReuniaoType | null; // Dados da reunião para edição
}

// Interface para o estado do formulário
interface FormDataReuniao {
  titulo: string;
  data: Date | undefined;
  hora: string; // HH:mm
  local: string;
  linkReuniao: string; // Para local 'online'
  enderecoReuniao: string; // Para local 'presencial'
  notas: string; // Pauta/descrição da reunião
  // participantes: any[]; // Simplificado por agora, a API lida com isso de forma mais complexa
  concluida: boolean;
}

export function AgendarReuniao({ 
  open, 
  onOpenChange, 
  oportunidadeId,
  clienteId,
  clienteNome,
  onReuniaoAgendada,
  reuniaoParaEditar
}: AgendarReuniaoProps) {
  const { createReuniao, updateReuniao, isLoading: isHookLoading } = useReunioes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!reuniaoParaEditar;

  const initialFormData: FormDataReuniao = {
    titulo: `Reunião - Oportunidade com ${clienteNome || 'Cliente'}`,
    data: addDays(new Date(), 1),
    hora: "09:00",
    local: "online",
    linkReuniao: "",
    enderecoReuniao: "",
    notas: "",
    concluida: false,
  };

  const [formData, setFormData] = useState<FormDataReuniao>(initialFormData);

  // Efeito para popular o formulário quando em modo de edição
  useEffect(() => {
    if (isEditMode && reuniaoParaEditar) {
      setFormData({
        titulo: reuniaoParaEditar.titulo || '',
        // A data da API pode vir como string 'YYYY-MM-DDTHH:mm:ss.sssZ' ou 'DD/MM/YYYY'
        // Precisamos normalizar para um objeto Date para o Calendar
        // E extrair a hora para o input time.
        data: reuniaoParaEditar.data ? parseISO(reuniaoParaEditar.data) : undefined, // Assumindo que a API retorna data ISO
        hora: reuniaoParaEditar.hora || (reuniaoParaEditar.data ? format(parseISO(reuniaoParaEditar.data), 'HH:mm') : "09:00"),
        local: reuniaoParaEditar.local || "online", // Pode precisar de ajuste se 'local' na API for o link/endereço
        linkReuniao: (reuniaoParaEditar.local && reuniaoParaEditar.local.startsWith('http')) ? reuniaoParaEditar.local : "",
        enderecoReuniao: (reuniaoParaEditar.local && !reuniaoParaEditar.local.startsWith('http')) ? reuniaoParaEditar.local : "",
        notas: reuniaoParaEditar.notas || "",
        concluida: reuniaoParaEditar.concluida || false,
      });
    } else {
      // Reset para nova reunião
      setFormData({
        ...initialFormData,
        titulo: `Reunião - Oportunidade com ${clienteNome || 'Cliente'}`,
      });
    }
  }, [reuniaoParaEditar, isEditMode, open, clienteNome]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormDataReuniao, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, data: date}));
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (!formData.data || !formData.hora || !formData.titulo.trim()) {
      toast({ title: "Erro", description: "Título, data e hora são obrigatórios.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    // A API de reuniões espera data e hora separadas ou um timestamp combinado.
    // O schema original da tabela `reunioes` tem `data_hora TIMESTAMP NOT NULL`.
    // A API POST em `reunioes/route.ts` espera `data` (YYYY-MM-DD) e `hora` (HH:MM).
    // A API PUT em `reunioes/[id]/route.ts` também espera `data` e `hora` para reconstruir.

    const localFinal = formData.local === "online" ? formData.linkReuniao :
                       formData.local === "presencial" ? formData.enderecoReuniao : formData.local;

    const reuniaoPayload = {
      oportunidade_id: oportunidadeId, // A API de PUT também espera oportunidade_id
      titulo: formData.titulo,
      data: formData.data ? format(formData.data, "yyyy-MM-dd") : null, // API espera YYYY-MM-DD
      hora: formData.hora, // API espera HH:MM
      local: localFinal,
      notas: formData.notas, // pauta/descricao
      concluida: formData.concluida,
      // participantes: [], // A API de reunião lida com participantes de forma mais complexa
                           // Para edição, a API PUT de reunião deleta e recria participantes.
                           // Se quisermos editar participantes aqui, precisaríamos de uma UI para isso.
                           // Por simplicidade, a edição de participantes não está incluída neste modal agora.
    };

    try {
      if (isEditMode && reuniaoParaEditar?.id) {
        await updateReuniao(reuniaoParaEditar.id, reuniaoPayload);
        toast({ title: "Sucesso", description: "Reunião atualizada com sucesso." });
      } else {
        await createReuniao(reuniaoPayload);
        toast({ title: "Sucesso", description: "Reunião agendada com sucesso." });
      }

      onReuniaoAgendada(); // Callback para o pai (DetalhesOportunidade) recarregar a lista
      onOpenChange(false); // Fechar o modal
      // Resetar o formulário é feito pelo useEffect quando `reuniaoParaEditar` muda ou `open` se torna false.

    } catch (error) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'agendar'} reunião:`, error);
      toast({
        title: `Erro ao ${isEditMode ? 'Atualizar' : 'Agendar'} Reunião`,
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) { // Resetar o formulário se o modal for fechado sem salvar (em modo de criação)
        if (!isEditMode) setFormData(initialFormData);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Reunião" : "Agendar Nova Reunião"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize os detalhes da reunião." : `Agende uma reunião para a oportunidade com ${clienteNome || 'o cliente'}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="titulo">Título da Reunião *</Label>
            <Input id="titulo" name="titulo" value={formData.titulo} onChange={handleChange} placeholder="Ex: Apresentação da Proposta"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="data">Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.data && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data ? format(formData.data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.data} onSelect={handleDateChange} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="hora">Horário *</Label>
              <Input id="hora" name="hora" type="time" value={formData.hora} onChange={handleChange} />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="local">Local</Label>
            <Select value={formData.local} onValueChange={(value) => handleSelectChange("local", value)}>
              <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                {/* <SelectItem value="hibrido">Híbrido</SelectItem> */}
                <SelectItem value="outro">Outro (especificar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.local === "online" && (
            <div className="space-y-1">
              <Label htmlFor="linkReuniao">Link da reunião</Label>
              <Input id="linkReuniao" name="linkReuniao" placeholder="https://meet.google.com/..." value={formData.linkReuniao} onChange={handleChange}/>
            </div>
          )}
          
          {formData.local === "presencial" && (
            <div className="space-y-1">
              <Label htmlFor="enderecoReuniao">Endereço</Label>
              <Input id="enderecoReuniao" name="enderecoReuniao" placeholder="Rua, número, complemento..." value={formData.enderecoReuniao} onChange={handleChange}/>
            </div>
          )}
           {formData.local === "outro" && (
            <div className="space-y-1">
              <Label htmlFor="outroLocal">Especificar Local</Label>
              <Input id="outroLocal" name="linkReuniao" placeholder="Telefone, etc." value={formData.linkReuniao} onChange={handleChange}/> {/* Reutilizando linkReuniao para "outro" */}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notas">Pauta / Notas</Label>
            <Textarea id="notas" name="notas" placeholder="Detalhe os tópicos a serem discutidos..." value={formData.notas} onChange={handleChange} className="min-h-[80px]"/>
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="concluida" name="concluida" checked={formData.concluida} onChange={(e) => handleSelectChange("concluida", e.target.checked)} className="h-4 w-4"/>
            <Label htmlFor="concluida" className="font-normal">Reunião Concluída</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || isHookLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isHookLoading}>
            {(isSubmitting || isHookLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckIcon className="mr-2 h-4 w-4" />}
            {isEditMode ? "Salvar Alterações" : "Agendar Reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
