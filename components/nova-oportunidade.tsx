"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarIcon, Save, Mail, FileText, Loader2 } from "lucide-react"
import { SeletorDocumentosComercial } from "@/components/comercial/seletor-documentos-comercial"
import { DocumentType } from "@/hooks/useDocuments"
// import { useAuth } from "@/hooks/useAuth"; // TODO: Adicionar para obtenção de token

interface ResponsavelSelecao {
  id: string;
  nome: string;
}

import { Dispatch, SetStateAction } from 'react';

interface NovaOportunidadeProps {
  onOportunidadeAdded?: (oportunidade: any) => void
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export function NovaOportunidade({ onOportunidadeAdded, open, setOpen }: NovaOportunidadeProps) {
  const [activeTab, setActiveTab] = useState("cliente")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initialFormData = {
    nomeCliente: "",
    cnpj: "",
    contatoNome: "",
    contatoTelefone: "",
    contatoEmail: "",
    endereco: "",
    segmento: "",
    titulo: "",
    descricao: "",
    valor: "",
    status: "novo_lead",
    prazo: "",
    tipo: "",
    tipoFaturamento: "",
    responsavelId: "",
  };

  const [formData, setFormData] = useState(initialFormData)
  const [dataReuniao, setDataReuniao] = useState<Date | undefined>()
  const [horaReuniao, setHoraReuniao] = useState("")

  const [listaResponsaveis, setListaResponsaveis] = useState<ResponsavelSelecao[]>([]);
  const [isLoadingResponsaveis, setIsLoadingResponsaveis] = useState(false);
  const [selectedResponsavelId, setSelectedResponsavelId] = useState<string | undefined>();

  const [criarEvento, setCriarEvento] = useState(true)
  const [enviarNotificacoes, setEnviarNotificacoes] = useState(true)
  const [documentosRepositorio, setDocumentosRepositorio] = useState<DocumentType[]>([])
  const [documentosNecessarios, setDocumentosNecessarios] = useState([
    { id: "doc1", nome: "Proposta Comercial", selecionado: false },
    { id: "doc2", nome: "Contrato de Serviço", selecionado: false },
  ])
  const [arquivosAnexados, setArquivosAnexados] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  // const { getAccessToken } = useAuth(); // TODO: Descomentar e usar quando useAuth estiver pronto

  useEffect(() => {
    const carregarResponsaveis = async () => {
      if (open) {
        setIsLoadingResponsaveis(true);
        try {
          // TODO: Adicionar header de autenticação se necessário, usando getAccessToken()
          // const token = await getAccessToken();
          // headers: { 'Authorization': `Bearer ${token}` }
          const response = await fetch('/api/comercial/responsaveis');
          if (!response.ok) {
            throw new Error('Falha ao buscar responsáveis');
          }
          const data = await response.json();
          setListaResponsaveis(data.map((r: any) => ({ id: r.id, nome: r.nome })));
        } catch (error) {
          console.error("Erro ao carregar responsáveis:", error);
          setListaResponsaveis([]);
        } finally {
          setIsLoadingResponsaveis(false);
        }
      }
    };
    carregarResponsaveis();
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateSelectChange = (name: string, date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, [name]: date ? format(date, "yyyy-MM-dd") : "" }));
  };

  const handleResponsavelSelectChange = (responsavelId: string) => {
    setSelectedResponsavelId(responsavelId);
    setFormData(prev => ({ ...prev, responsavelId: responsavelId }));
  };

  const handleDocumentoChange = (id: string, checked: boolean) => {
    setDocumentosNecessarios(
      documentosNecessarios.map((doc) => (doc.id === id ? { ...doc, selecionado: checked } : doc))
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const novoArquivos = Array.from(e.target.files)
      setArquivosAnexados(prev => [...prev, ...novoArquivos])
    }
  }

  const handleEscolherArquivos = () => {
    fileInputRef.current?.click()
  }

  const handleRemoverArquivo = (index: number) => {
    setArquivosAnexados(prev => prev.filter((_, i) => i !== index))
  }

  const validateFormForTab = (tab: string) => {
    if (tab === "cliente") {
      return formData.nomeCliente && formData.cnpj && formData.contatoNome && formData.contatoEmail && formData.segmento;
    } else if (tab === "oportunidade") {
      const tipoValid = formData.tipo && (formData.tipo === "servico" || (formData.tipo === "produto" && formData.tipoFaturamento));
      return formData.titulo && formData.status && tipoValid && selectedResponsavelId;
    }
    return true;
  }

  const handleNextTab = () => {
    if (!validateFormForTab(activeTab)) {
      alert("Por favor, preencha todos os campos obrigatórios da aba atual antes de prosseguir.");
      return;
    }
    if (activeTab === "cliente") setActiveTab("oportunidade");
    else if (activeTab === "oportunidade") setActiveTab("documentos");
    else if (activeTab === "documentos") setActiveTab("reuniao");
  }

  const handlePrevTab = () => {
    if (activeTab === "oportunidade") setActiveTab("cliente");
    else if (activeTab === "documentos") setActiveTab("oportunidade");
    else if (activeTab === "reuniao") setActiveTab("documentos");
  }

  const uploadAnexosOportunidade = async (oportunidadeId: string, arquivos: File[]): Promise<void> => {
    if (arquivos.length === 0) return;
    setIsUploadingAttachments(true);
    setAttachmentUploadProgress(0);
    let filesProcessed = 0;

    for (const arquivo of arquivos) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', arquivo);
      formDataUpload.append('nome', arquivo.name);
      formDataUpload.append('tipo', 'Anexo Oportunidade');
      formDataUpload.append('tags', 'comercial');
      if (oportunidadeId) {
        formDataUpload.append('oportunidadeId', oportunidadeId);
      }

      try {
        // TODO: Adicionar header de autenticação se necessário
        // const token = await getAccessToken();
        const response = await fetch('/api/documentos/doc/upload', {
          method: 'POST',
          credentials: 'include', // Manter se a API de upload usar cookies para sessão
          // headers: { 'Authorization': `Bearer ${token}` }, // Adicionar se usar token bearer
          body: formDataUpload,
        });
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Erro ao fazer upload de ${arquivo.name}: ${errorData}`);
        } else {
          console.log(`Arquivo ${arquivo.name} enviado com sucesso.`);
        }
      } catch (error) {
        console.error(`Exceção ao fazer upload de ${arquivo.name}:`, error);
      }
      filesProcessed++;
      setAttachmentUploadProgress(Math.round((filesProcessed / arquivos.length) * 100));
    }
    setIsUploadingAttachments(false);
  };

  const handleSubmit = async () => {
    if (!formData.nomeCliente || !formData.cnpj || !formData.contatoNome || !formData.contatoEmail || !formData.segmento ||
        !formData.titulo || !formData.status || !formData.tipo ||
        (formData.tipo === "produto" && !formData.tipoFaturamento) || !selectedResponsavelId) {
      alert("Por favor, preencha todos os campos obrigatórios em todas as abas antes de salvar.");
      setActiveTab("cliente");
      return;
    }
    setIsSubmitting(true);
    const oportunidadePayload = {
      cliente: formData.nomeCliente,
      cnpj: formData.cnpj,
      contatoNome: formData.contatoNome,
      contatoTelefone: formData.contatoTelefone,
      contatoEmail: formData.contatoEmail,
      endereco: formData.endereco,
      segmento: formData.segmento,
      titulo: formData.titulo,
      descricao: formData.descricao,
      valor: formData.valor ? parseFloat(formData.valor.replace(/\./g, "").replace(",", ".")) : null,
      status: formData.status,
      prazo: formData.prazo || null,
      tipo: formData.tipo,
      tipoFaturamento: formData.tipo === "produto" ? formData.tipoFaturamento : null,
      responsavelId: selectedResponsavelId,
      dataReuniao: dataReuniao ? format(dataReuniao, "yyyy-MM-dd") : null,
      horaReuniao: horaReuniao || null,
    };

    try {
      // TODO: Adicionar header de autenticação se necessário
      // const token = await getAccessToken();
      const response = await fetch('/api/comercial/oportunidades', {
        method: 'POST',
        credentials: 'include',
        // headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        headers: { 'Content-Type': 'application/json' }, // Temporário sem auth
        body: JSON.stringify(oportunidadePayload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido ao criar oportunidade." }));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }
      const newOportunidade = await response.json();
      if (newOportunidade && newOportunidade.id && arquivosAnexados.length > 0) {
        await uploadAnexosOportunidade(newOportunidade.id, arquivosAnexados);
      }
      if (onOportunidadeAdded) onOportunidadeAdded(newOportunidade);
      setFormData(initialFormData);
      setDataReuniao(undefined);
      setHoraReuniao("");
      setSelectedResponsavelId(undefined);
      setArquivosAnexados([]);
      setDocumentosRepositorio([]);
      setDocumentosNecessarios(documentosNecessarios.map(d => ({...d, selecionado: false})));
      setActiveTab("cliente");
      // O modal será fechado pelo componente pai após atualizar a lista
    } catch (error) {
      if (error instanceof Error) {
        let details = '';
        // Tenta extrair detalhes do erro retornado pelo backend
        if (error.message.startsWith('{') || error.message.startsWith('[')) {
          try {
            const errorJson = JSON.parse(error.message);
            details = `\nDetalhes: ${errorJson.details || ''}\nStack: ${errorJson.stack || ''}`;
          } catch {
            details = '';
          }
        } else {
          details = `\nResposta do servidor: ${error.message}`;
        }
        console.error("Erro ao criar oportunidade:", error.message, details);
        alert(`Falha ao criar oportunidade: ${error.message}${details}`);
      } else {
        console.error("Erro ao criar oportunidade:", error);
        alert("Falha ao criar oportunidade: Erro desconhecido");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Oportunidade</DialogTitle>
          <DialogDescription>Preencha os dados para cadastrar uma nova oportunidade comercial.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="cliente">Dados do Cliente</TabsTrigger>
            <TabsTrigger value="oportunidade">Oportunidade</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="reuniao">Agendamento</TabsTrigger>
          </TabsList>
          <TabsContent value="cliente" className="space-y-4">
            {/* ... (Conteúdo da aba Cliente) ... */}
            <div className="grid grid-cols-2 gap-4"> <div className="space-y-2"> <Label htmlFor="nomeCliente"> Nome/Razão Social <span className="text-red-500">*</span> </Label> <Input id="nomeCliente" name="nomeCliente" placeholder="Nome do cliente" value={formData.nomeCliente} onChange={handleInputChange} required /> </div> <div className="space-y-2"> <Label htmlFor="cnpj"> CNPJ <span className="text-red-500">*</span> </Label> <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={handleInputChange} required /> </div> </div>
            <div className="grid grid-cols-3 gap-4"> <div className="space-y-2"> <Label htmlFor="contatoNome"> Contato (Nome) <span className="text-red-500">*</span> </Label> <Input id="contatoNome" name="contatoNome" placeholder="Nome do contato" value={formData.contatoNome} onChange={handleInputChange} required /> </div> <div className="space-y-2"> <Label htmlFor="contatoTelefone"> Contato (Telefone) <span className="text-red-500">*</span> </Label> <Input id="contatoTelefone" name="contatoTelefone" placeholder="(00) 00000-0000" value={formData.contatoTelefone} onChange={handleInputChange} required /> </div> <div className="space-y-2"> <Label htmlFor="contatoEmail"> Contato (E-mail) <span className="text-red-500">*</span> </Label> <Input id="contatoEmail" name="contatoEmail" type="email" placeholder="email@exemplo.com" value={formData.contatoEmail} onChange={handleInputChange} required /> </div> </div>
            <div className="space-y-2"> <Label htmlFor="endereco">Endereço</Label> <Input id="endereco" name="endereco" placeholder="Endereço completo" value={formData.endereco} onChange={handleInputChange} /> </div>
            <div className="space-y-2"> <Label htmlFor="segmento"> Segmento <span className="text-red-500">*</span> </Label> <Select value={formData.segmento} onValueChange={(value) => handleSelectChange("segmento", value)}> <SelectTrigger> <SelectValue placeholder="Selecione o segmento" /> </SelectTrigger> <SelectContent> <SelectItem value="governo_federal">Governo Federal</SelectItem> <SelectItem value="governo_estadual">Governo Estadual</SelectItem> <SelectItem value="prefeitura">Prefeitura Municipal</SelectItem> <SelectItem value="empresa_publica">Empresa Pública</SelectItem> <SelectItem value="autarquia">Autarquia</SelectItem> <SelectItem value="empresa_privada">Empresa Privada</SelectItem> <SelectItem value="ong">ONG / Terceiro Setor</SelectItem> </SelectContent> </Select> </div>
            <div className="flex justify-end mt-4"> <Button onClick={handleNextTab} className="bg-[#1B3A53] hover:bg-[#2c5a80]"> Próximo </Button> </div>
          </TabsContent>
          <TabsContent value="oportunidade" className="space-y-4">
            {/* ... (Conteúdo da aba Oportunidade, incluindo o Select de Responsável) ... */}
            <div className="space-y-2"> <Label htmlFor="titulo"> Título da Oportunidade <span className="text-red-500">*</span> </Label> <Input id="titulo" name="titulo" placeholder="Ex: Implementação de Sistema ERP" value={formData.titulo} onChange={handleInputChange} required /> </div>
            <div className="space-y-2"> <Label htmlFor="descricao">Descrição da Oportunidade</Label> <Textarea id="descricao" name="descricao" placeholder="Descreva os detalhes da oportunidade" className="min-h-[100px]" value={formData.descricao} onChange={handleInputChange} /> </div>
            <div className="space-y-2">
                <Label htmlFor="responsavelId">Responsável <span className="text-red-500">*</span></Label>
                <Select value={selectedResponsavelId} onValueChange={handleResponsavelSelectChange} disabled={isLoadingResponsaveis}>
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingResponsaveis ? "Carregando..." : "Selecione um responsável"} />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoadingResponsaveis ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : listaResponsaveis.length === 0 ? (
                            <SelectItem value="no-options" disabled>Nenhum responsável encontrado</SelectItem>
                        ) : (
                            listaResponsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)
                        )}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4"> <div className="space-y-2"> <Label htmlFor="valor">Valor da Oportunidade (R$)</Label> <Input id="valor" name="valor" placeholder="Ex: 250000,00" value={formData.valor} onChange={handleInputChange} /> </div> <div className="space-y-2"> <Label htmlFor="prazo">Prazo Estimado</Label> <Popover> <PopoverTrigger asChild>
  <Button variant="outline" className={cn(
    "w-full justify-start text-left font-normal",
    !formData.prazo && "text-muted-foreground"
  )}>
    <CalendarIcon className="mr-2 h-4 w-4" />
    {formData.prazo ? format(new Date(formData.prazo), "PPP", { locale: ptBR }) : "Selecione uma data"}
  </Button>
</PopoverTrigger> <PopoverContent className="w-auto p-0"> <Calendar mode="single" selected={formData.prazo ? new Date(formData.prazo) : undefined} onSelect={(date) => handleDateSelectChange("prazo", date)} initialFocus /> </PopoverContent> </Popover> </div> </div>
            <div className="space-y-2"> <Label htmlFor="status"> Status Inicial <span className="text-red-500">*</span> </Label> <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}> <SelectTrigger> <SelectValue placeholder="Selecione o status" /> </SelectTrigger> <SelectContent> <SelectItem value="novo_lead">Novo Lead</SelectItem> <SelectItem value="agendamento_reuniao">Agendamento de Reunião</SelectItem> <SelectItem value="levantamento_oportunidades">Levantamento de Oportunidades</SelectItem> <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem> <SelectItem value="negociacao">Em Negociação</SelectItem> <SelectItem value="ganho">Ganho</SelectItem> <SelectItem value="perdido">Perdido</SelectItem> </SelectContent> </Select> </div>
            <div className="space-y-2"> <Label htmlFor="tipo"> Tipo de Oportunidade <span className="text-red-500">*</span> </Label> <Select value={formData.tipo} onValueChange={(value) => handleSelectChange("tipo", value)}> <SelectTrigger> <SelectValue placeholder="Selecione o tipo" /> </SelectTrigger> <SelectContent> <SelectItem value="produto">Produto</SelectItem> <SelectItem value="servico">Serviço</SelectItem> </SelectContent> </Select> </div>
            {formData.tipo === "produto" && ( <div className="space-y-2"> <Label htmlFor="tipoFaturamento"> Tipo de Faturamento <span className="text-red-500">*</span> </Label> <Select  value={formData.tipoFaturamento}  onValueChange={(value) => handleSelectChange("tipoFaturamento", value)} > <SelectTrigger> <SelectValue placeholder="Selecione o tipo de faturamento" /> </SelectTrigger> <SelectContent> <SelectItem value="direto">Faturamento Direto</SelectItem> <SelectItem value="distribuidor">Via Distribuidor</SelectItem> </SelectContent> </Select> </div> )}
            <div className="flex justify-between mt-4"> <Button variant="outline" onClick={handlePrevTab}> Voltar </Button> <Button onClick={handleNextTab} className="bg-[#1B3A53] hover:bg-[#2c5a80]"> Próximo </Button> </div>
          </TabsContent>
          <TabsContent value="documentos" className="space-y-4">
            {/* ... (Conteúdo da aba Documentos) ... */}
            <div className="space-y-4"> <div className="space-y-2"> <Label className="text-base font-medium">Checklist de Documentos Necessários</Label> <div className="grid grid-cols-2 gap-3 border rounded-md p-3"> {documentosNecessarios.map((doc) => ( <div key={doc.id} className="flex items-center space-x-2"> <Checkbox id={doc.id} checked={doc.selecionado} onCheckedChange={(checked) => handleDocumentoChange(doc.id, checked as boolean)} /> <Label htmlFor={doc.id} className="font-normal"> {doc.nome} </Label> </div> ))} </div> </div> <SeletorDocumentosComercial  onDocumentosSelecionados={(docs) => setDocumentosRepositorio(docs)} /> <div className="space-y-2 mt-6"> <Label className="text-base font-medium">Anexar Documentos</Label> <div className="border rounded-md p-3"> <div className="flex items-center"> <Button  variant="outline"  size="sm"  className="mr-2"  type="button" onClick={handleEscolherArquivos} > Escolher arquivos </Button> <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple /> <span className="text-sm text-muted-foreground"> {arquivosAnexados.length ? `${arquivosAnexados.length} arquivo(s) selecionado(s)` : "Nenhum arquivo escolhido"} </span> </div> {isUploadingAttachments && ( <div className="mt-2"> <Label>Progresso do Upload: {attachmentUploadProgress}%</Label> <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"> <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${attachmentUploadProgress}%` }}></div> </div> </div> )} {arquivosAnexados.length > 0 && !isUploadingAttachments && ( <div className="mt-2 space-y-1"> {arquivosAnexados.map((arquivo, index) => ( <div key={index} className="flex items-center text-sm"> <FileText className="h-3 w-3 mr-1" /> <span className="truncate max-w-[200px]">{arquivo.name}</span> <span className="text-xs text-muted-foreground ml-1"> ({Math.round(arquivo.size / 1024)} KB) </span> <Button variant="ghost"  size="sm"  className="h-5 w-5 p-0 ml-1" onClick={() => handleRemoverArquivo(index)} > × </Button> </div> ))} </div> )} <p className="text-xs text-muted-foreground mt-2"> Os documentos serão anexados após criar a oportunidade. </p> </div> </div> </div>
            <div className="flex justify-between mt-4"> <Button variant="outline" onClick={handlePrevTab}> Voltar </Button> <Button onClick={handleNextTab} className="bg-[#1B3A53] hover:bg-[#2c5a80]"> Próximo </Button> </div>
          </TabsContent>
          <TabsContent value="reuniao" className="space-y-4">
            {/* ... (Conteúdo da aba Reunião) ... */}
            <div className="border rounded-md p-4 space-y-4"> <div className="flex items-center gap-2"> <CalendarIcon className="h-5 w-5 text-blue-500" /> <h3 className="font-medium">Agendamento de Reunião</h3> </div> <div className="grid grid-cols-2 gap-4"> <div className="space-y-2"> <Label htmlFor="dataReuniao">Data da Reunião</Label> <Popover> <PopoverTrigger asChild>
  <Button variant="outline" className={cn(
    "w-full justify-start text-left font-normal",
    !dataReuniao && "text-muted-foreground"
  )}>
    <CalendarIcon className="mr-2 h-4 w-4" />
    {dataReuniao ? format(dataReuniao, "PPP", { locale: ptBR }) : "Selecione uma data"}
  </Button>
</PopoverTrigger> <PopoverContent className="w-auto p-0"> <Calendar mode="single" selected={dataReuniao} onSelect={setDataReuniao} initialFocus /> </PopoverContent> </Popover> </div> <div className="space-y-2"> <Label htmlFor="horaReuniao">Horário</Label> <Input id="horaReuniao" type="time" value={horaReuniao} onChange={(e) => setHoraReuniao(e.target.value)} /> </div> </div> </div>
            <div className="space-y-2"> <Label>Responsável pela Reunião (Exemplo)</Label> <Select value={selectedResponsavelId} onValueChange={handleResponsavelSelectChange}> <SelectTrigger> <SelectValue placeholder="Selecione um responsável" /> </SelectTrigger> <SelectContent> {listaResponsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)} </SelectContent> </Select> </div>
            <div className="border rounded-md p-4 space-y-4"> <div className="flex items-center gap-2"> <Mail className="h-5 w-5 text-blue-500" /> <h3 className="font-medium">Notificações e Calendário</h3> </div> <div className="space-y-3"> <div className="flex items-center space-x-2"> <Checkbox id="criarEvento" checked={criarEvento} onCheckedChange={(checked) => setCriarEvento(checked as boolean)} /> <Label htmlFor="criarEvento" className="font-normal"> Criar evento no calendário do Outlook e enviar convites </Label> </div> <div className="flex items-center space-x-2"> <Checkbox id="enviarNotificacoes" checked={enviarNotificacoes} onCheckedChange={(checked) => setEnviarNotificacoes(checked as boolean)} /> <Label htmlFor="enviarNotificacoes" className="font-normal"> Enviar notificações por e-mail para os responsáveis e cliente </Label> </div> </div> </div>
            <div className="flex justify-between mt-4"> <Button variant="outline" onClick={handlePrevTab}> Voltar </Button> <Button onClick={handleSubmit} disabled={isSubmitting || isUploadingAttachments} className="bg-[#1B3A53] hover:bg-[#2c5a80]"> {isSubmitting || isUploadingAttachments ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isUploadingAttachments ? "Enviando anexos..." : "Salvando..."} </> ) : ( <> <Save className="mr-2 h-4 w-4" /> Salvar Oportunidade </> )} </Button> </div>
          </TabsContent>
        </Tabs>
        <div className="text-sm text-muted-foreground mt-4"> <span className="text-red-500">*</span> Campos obrigatórios </div>
      </DialogContent>
    </Dialog>
  )
}
