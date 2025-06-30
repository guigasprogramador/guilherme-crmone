"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, CheckIcon, Loader2 } from "lucide-react"; // Added Loader2
import { Oportunidade } from "@/types/comercial";
import { format, addDays, addMinutes } from "date-fns"; // Added addMinutes
import { ptBR } from "date-fns/locale"
import { toast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useReunioes } from "@/hooks/comercial/use-reunioes"; // Importar hook

interface AgendarReuniaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidadeId: string; // Passar ID da oportunidade
  clienteId?: string; // Passar ID do cliente (opcional, mas útil)
  clienteNome?: string; // Nome do cliente para exibição
  responsavelAtualNome?: string; // Nome do responsável atual da oportunidade
  onReuniaoAgendada?: () => void; // Callback sem argumento
}

export function AgendarReuniao({ 
  open, 
  onOpenChange, 
  oportunidadeId,
  clienteId,
  clienteNome,
  responsavelAtualNome,
  onReuniaoAgendada
}: AgendarReuniaoProps) {
  const { createReuniao, isLoading: isLoadingCreateReuniao } = useReunioes();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [titulo, setTitulo] = useState<string>(`Reunião - Oportunidade com ${clienteNome || 'Cliente'}`);
  const [data, setData] = useState<Date | undefined>(addDays(new Date(), 1));
  const [hora, setHora] = useState<string>("09:00");
  const [duracao, setDuracao] = useState<string>("30");
  const [local, setLocal] = useState<string>("online");
  const [link, setLink] = useState<string>("");
  const [endereco, setEndereco] = useState<string>("");
  const [pauta, setPauta] = useState<string>("");
  // const [participantesExternos, setParticipantesExternos] = useState<string>(""); // Campo para participantes externos (nomes)
  
  const [emailCliente, setEmailCliente] = useState(""); // Será preenchido ou pode ser removido se não usado diretamente
  const [erroEmailCliente, setErroEmailCliente] = useState<string>("");
  
  const [responsaveisOpcoes, setResponsaveisOpcoes] = useState<Array<{id: string, nome: string, email: string}>>([]);
  const [responsaveisSelecionados, setResponsaveisSelecionados] = useState<Array<{id: string, nome: string, email: string}>>([]);
  const [erroResponsaveis, setErroResponsaveis] = useState<string>("");

  // Atualizar título e email do cliente se a oportunidade mudar
  useEffect(() => {
    if (oportunidadeId && clienteNome) {
      setTitulo(`Reunião - Oportunidade com ${clienteNome}`);
    }
    // Lógica para buscar email do cliente se necessário (ex: com base no clienteId)
    // setEmailCliente(oportunidade.clienteEmail || (oportunidade.cliente && oportunidade.cliente.email) || "");
  }, [oportunidadeId, clienteNome]);

  useEffect(() => {
    const buscarResponsaveis = async () => {
      try {
        const resp = await fetch("/api/comercial/responsaveis");
        if (!resp.ok) throw new Error("Falha ao buscar responsáveis");
        const data = await resp.json();
        setResponsaveisOpcoes(data);
      } catch (error) {
        console.error("Erro ao buscar responsáveis:", error);
        toast({ title: "Erro", description: "Não foi possível carregar a lista de responsáveis.", variant: "destructive" });
      }
    };
    if (open) { // Buscar apenas quando o modal estiver aberto
      buscarResponsaveis();
    }
  }, [open]);

  // Validação de e-mail simples
  const validarEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  // Função para lidar com o agendamento da reunião
  const handleAgendar = async () => {
    setIsSubmitting(true);
    setErroEmailCliente("");
    setErroResponsaveis("");

    if (!data || !hora || !titulo.trim()) {
      toast({ title: "Erro", description: "Título, data e hora são obrigatórios.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (responsaveisSelecionados.length === 0) {
      setErroResponsaveis("Selecione pelo menos um responsável interno.");
      setIsSubmitting(false);
      return;
    }
    // Validação de e-mail do cliente pode ser opcional dependendo da necessidade de notificação
    // if (emailCliente && !validarEmail(emailCliente)) {
    //   setErroEmailCliente("E-mail do cliente inválido, se fornecido.");
    //   setIsSubmitting(false);
    //   return;
    // }

    const dataInicio = new Date(`${format(data, "yyyy-MM-dd")}T${hora}`);
    const dataFim = addMinutes(dataInicio, parseInt(duracao));

    const participantesPayload = responsaveisSelecionados.map(r => ({
      participante_id: r.id,
      tipo_participante: 'interno',
      confirmado: true
    }));

    // Adicionar participantes externos (contatos do cliente) se houver uma lógica para obter seus IDs
    // Ex: Se `participantesExternos` fosse um array de IDs de contatos:
    // participantesPayload.push(...participantesExternos.map(id => ({ participante_id: id, tipo_participante: 'externo', confirmado: false })));

    const reuniaoPayload = {
      oportunidade_id: oportunidadeId,
      titulo: titulo,
      data_inicio: dataInicio.toISOString(),
      data_fim: dataFim.toISOString(),
      local: local === "online" ? link : local === "presencial" ? endereco : local,
      notas: pauta, // Usando 'notas' para 'pauta' conforme a tabela reunioes
      status: "agendada",
      participantes: participantesPayload,
      // criado_por: userId, // Se tiver o ID do usuário logado
      sendEmail: true // Ou um checkbox no form
    };

    try {
      await createReuniao(reuniaoPayload);

      toast({
        title: "Reunião Agendada",
        description: `Reunião "${titulo}" agendada com sucesso.`,
      });

      if (onReuniaoAgendada) {
        onReuniaoAgendada();
      }
      onOpenChange(false);
      // Resetar campos do formulário
      setTitulo(`Reunião - Oportunidade com ${clienteNome || 'Cliente'}`);
      setData(addDays(new Date(), 1));
      setHora("09:00");
      setDuracao("30");
      setLocal("online");
      setLink("");
      setEndereco("");
      setPauta("");
      // setParticipantesExternos("");
      setResponsaveisSelecionados([]);
      setEmailCliente("");

    } catch (error) {
      console.error("Erro ao agendar reunião:", error);
      toast({
        title: "Erro ao Agendar Reunião",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
          <DialogDescription>
            {`Agende uma reunião para a oportunidade com ${clienteNome || 'o cliente'}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tituloReuniao">Título da Reunião *</Label>
            <Input
              id="tituloReuniao"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Apresentação da Proposta"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <div>
                <Label htmlFor="hora">Horário</Label>
                <Input 
                  type="time"
                  id="hora"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
              
              <div className="mt-4">
                <Label htmlFor="duracao">Duração (minutos)</Label>
                <Select value={duracao} onValueChange={setDuracao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mt-4">
                <Label htmlFor="local">Local</Label>
                <Select value={local} onValueChange={setLocal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {local === "online" || local === "hibrido" ? (
                <div className="mt-4">
                  <Label htmlFor="link">Link da reunião</Label>
                  <Input 
                    id="link"
                    placeholder="https://meet.google.com/..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>
              ) : null}
              
              {local === "presencial" || local === "hibrido" ? (
                <div className="mt-4">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input 
                    id="endereco"
                    placeholder="Rua, número, complemento..."
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </div>
          
          
          <div className="space-y-2">
            <Label htmlFor="pauta">Pauta da reunião</Label>
            <Textarea 
              id="pauta"
              placeholder="Detalhe os tópicos a serem discutidos..."
              value={pauta}
              onChange={(e) => setPauta(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emailCliente">E-mail do Cliente</Label>
            <Input
              id="emailCliente"
              type="email"
              value={emailCliente}
              onChange={(e) => setEmailCliente(e.target.value)}
              placeholder="cliente@exemplo.com"
              className={erroEmailCliente ? "border-red-500" : ""}
            />
            {erroEmailCliente && <span className="text-xs text-red-500">{erroEmailCliente}</span>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="responsaveis">Responsáveis</Label>
            <div>
              <select
                multiple
                value={responsaveisSelecionados.map(r => r.id)}
                onChange={e => {
                  const selecionados = Array.from(e.target.selectedOptions).map(opt => responsaveisOpcoes.find(r => r.id === opt.value));
                  setResponsaveisSelecionados(selecionados.filter(Boolean));
                }}
                className="w-full h-24 border rounded"
              >
                {responsaveisOpcoes.map(r => (
                  <option key={r.id} value={r.id}>{r.nome} ({r.email})</option>
                ))}
              </select>
            </div>
            {erroResponsaveis && <span className="text-xs text-red-500">{erroResponsaveis}</span>}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || isLoadingCreateReuniao}>
            Cancelar
          </Button>
          <Button onClick={handleAgendar} disabled={isSubmitting || isLoadingCreateReuniao}>
            {isSubmitting || isLoadingCreateReuniao ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckIcon className="mr-2 h-4 w-4" />
            )}
            Agendar Reunião
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
