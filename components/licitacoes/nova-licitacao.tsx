"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, parseISO } from "date-fns" // Adicionado parseISO
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Plus, CalendarIcon, Save, LinkIcon, FileText, Calculator, Mail, Clock, Loader2, Check, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Toggle } from "@/components/ui/toggle"
import { SeletorDocumentosLicitacao } from "@/components/licitacoes/seletor-documentos-licitacao"
import { DocumentType, useDocuments } from "@/hooks/useDocuments"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Licitacao } from "@/hooks/useLicitacoesOtimizado" // Usar a interface do hook
// import { useAuth } from "@/hooks/useAuth"; // TODO: Implementar obtenção de token via useAuth

interface NovaLicitacaoProps {
  onLicitacaoAdded?: (licitacao: any) => void;
  onLicitacaoUpdated?: (licitacao: any) => void; // Callback para atualização
  licitacaoParaEditar?: Licitacao | null; // Licitação existente para edição
  trigger?: React.ReactNode; // Para permitir um trigger customizado
  openDialog?: boolean; // Para controlar a abertura externamente
  setOpenDialog?: (open: boolean) => void; // Para controlar a abertura externamente
}

export function NovaLicitacao({
  onLicitacaoAdded,
  onLicitacaoUpdated,
  licitacaoParaEditar,
  trigger,
  openDialog: externalOpen,
  setOpenDialog: setExternalOpen
}: NovaLicitacaoProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dados-basicos");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimplifiedForm, setIsSimplifiedForm] = useState(true);
  const { toast } = useToast();

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

  const isEditMode = !!licitacaoParaEditar;

  // Estados para os campos do formulário
  const initialFormData = {
    nome: "",
    orgao: "",
    descricao: "",
    numeroEdital: "",
    modalidade: "pregao_eletronico",
    valorEstimado: "",
    valorProposta: "",
    margemLucro: "",
    contatoNome: "",
    contatoTelefone: "",
    contatoEmail: "",
    urlLicitacao: "",
    status: "analise_interna",
    tipo: "",
    tipoFaturamento: "",
    responsavel: "", // Manter para possível nome, mas priorizar responsavelId
    responsavelId: "", // Novo campo para o ID do responsável principal
    orgaoId: "",
  };
  const [formData, setFormData] = useState(initialFormData);

  const [dataPublicacao, setDataPublicacao] = useState<Date | undefined>(undefined);
  const [prazoEnvio, setPrazoEnvio] = useState<Date | undefined>(undefined); // Data de Abertura no form simplificado
  const [dataJulgamento, setDataJulgamento] = useState<Date | undefined>(undefined);

  const [documentosNecessarios, setDocumentosNecessarios] = useState([
    { id: "doc1", nome: "Certidão Negativa de Débitos", selecionado: false },
    { id: "doc2", nome: "Atestado de Capacidade Técnica", selecionado: false },
    { id: "doc3", nome: "Contrato Social", selecionado: false },
    // ... outros docs
  ]);

  // const [responsaveis, setResponsaveis] = useState([ // Removendo mock
  //   { id: "resp1", nome: "Ana Silva", selecionado: false },
  //   // ... outros responsáveis
  // ]);
  const [responsaveis, setResponsaveis] = useState<Array<{id: string, nome: string, selecionado: boolean}>>([]);
  const [todosResponsaveisApi, setTodosResponsaveisApi] = useState<Array<{id: string, nome: string}>>([]);


  const [arquivosAnexados, setArquivosAnexados] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [impostos, setImpostos] = useState({ iss: "5", icms: "18", pisCofins: "3.65", ir: "1.5", csll: "1" });
  const [criarEvento, setCriarEvento] = useState(true);
  const [enviarNotificacoes, setEnviarNotificacoes] = useState(true);
  const [documentosRepositorio, setDocumentosRepositorio] = useState<DocumentType[]>([]);
  const [documentos, setDocumentos] = useState<DocumentType[]>([]);
  const [documentosFiltrados, setDocumentosFiltrados] = useState<DocumentType[]>([]);
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [carregandoDocs, setCarregandoDocs] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { fetchDocuments } = useDocuments();
  // const { getAccessToken } = useAuth(); // TODO: Implementar obtenção de token via useAuth

  useEffect(() => {
    const carregarDadosAuxiliares = async () => {
      if (open) {
        // Carregar Usuários para Responsáveis
        try {
          const token = localStorage.getItem('accessToken');
          const response = await fetch('/api/users?filterByRole=user&filterByRole=admin', { // Idealmente filtrar por roles que podem ser responsáveis
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error("Falha ao buscar usuários");
          const usersFromApi = await response.json();
          const responsaveisFormatadosApi = usersFromApi.map((u: any) => ({
            id: u.id,
            nome: u.name || u.nome_completo || u.email
          }));
          setTodosResponsaveisApi(responsaveisFormatadosApi);

          // Configurar responsáveis para o checklist e para o select do responsável principal
          let responsaveisParaChecklist = responsaveisFormatadosApi.map((r: any) => ({
            id: r.id,
            nome: r.nome,
            selecionado: false,
          }));

          if (isEditMode && licitacaoParaEditar) {
            // Pré-selecionar múltiplos responsáveis
            if (licitacaoParaEditar.responsaveis && licitacaoParaEditar.responsaveis.length > 0) {
              const idsResponsaveisEdicao = licitacaoParaEditar.responsaveis.map((r: any) => r.id || r);
              responsaveisParaChecklist = responsaveisParaChecklist.map((r: any) => ({
                ...r,
                selecionado: idsResponsaveisEdicao.includes(r.id),
              }));
            }
            // Definir responsável principal
            setFormData(prev => ({ ...prev, responsavelId: licitacaoParaEditar.responsavelId || "" }));
          }
          setResponsaveis(responsaveisParaChecklist);

        } catch (error) {
          console.error("Erro ao buscar usuários para responsáveis:", error);
          setResponsaveis([{ id: "placeholder", nome: "Erro ao carregar", selecionado: false }]);
          setTodosResponsaveisApi([]);
        }

        // Carregar Documentos do Repositório (já existente no hook useEffect abaixo, pode ser combinado)
      }
    };

    carregarDadosAuxiliares();

    if (isEditMode && licitacaoParaEditar) {
      setFormData({
        nome: licitacaoParaEditar.titulo || "",
        orgao: typeof licitacaoParaEditar.orgao === 'string' ? licitacaoParaEditar.orgao : licitacaoParaEditar.orgao?.nome || "",
        orgaoId: typeof licitacaoParaEditar.orgao === 'object' ? licitacaoParaEditar.orgao.id : licitacaoParaEditar.orgaoId || "",
        descricao: licitacaoParaEditar.objeto || licitacaoParaEditar.descricao || "",
        numeroEdital: licitacaoParaEditar.numeroEdital || licitacaoParaEditar.edital || "",
        modalidade: licitacaoParaEditar.modalidade || "pregao_eletronico",
        valorEstimado: licitacaoParaEditar.valorEstimado?.toString() || "",
        valorProposta: licitacaoParaEditar.valorProposta?.toString() || "",
        margemLucro: licitacaoParaEditar.margemLucro?.toString() || "",
        contatoNome: licitacaoParaEditar.contatoNome || "",
        contatoTelefone: licitacaoParaEditar.contatoTelefone || "",
        contatoEmail: licitacaoParaEditar.contatoEmail || "",
        urlLicitacao: licitacaoParaEditar.urlLicitacao || licitacaoParaEditar.urlEdital || "",
        status: licitacaoParaEditar.status || "analise_interna",
        tipo: licitacaoParaEditar.tipo || "",
        tipoFaturamento: licitacaoParaEditar.tipoFaturamento || "",
        responsavel: licitacaoParaEditar.responsavel || "", // Nome para exibição, se necessário
        responsavelId: licitacaoParaEditar.responsavelId || "", // ID para o select
      });
      setDataPublicacao(licitacaoParaEditar.dataPublicacao ? parseISO(licitacaoParaEditar.dataPublicacao) : undefined);
      // Ajuste para dataAbertura (prazoEnvio no form simplificado)
      const dataAberturaString = licitacaoParaEditar.dataAbertura; // DD/MM/YYYY
      if (dataAberturaString && typeof dataAberturaString === 'string') {
          const parts = dataAberturaString.split('/');
          if (parts.length === 3) {
              setPrazoEnvio(new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
          } else {
             try { setPrazoEnvio(parseISO(dataAberturaString)); } catch (e) { console.warn("Data Abertura inválida:", dataAberturaString); setPrazoEnvio(undefined); }
          }
      } else {
          setPrazoEnvio(undefined);
      }

      const dataJulgamentoString = licitacaoParaEditar.dataJulgamento; // DD/MM/YYYY
       if (dataJulgamentoString && typeof dataJulgamentoString === 'string') {
          const parts = dataJulgamentoString.split('/');
          if (parts.length === 3) {
            setDataJulgamento(new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
          } else {
             try { setDataJulgamento(parseISO(dataJulgamentoString)); } catch (e) { console.warn("Data Julgamento inválida:", dataJulgamentoString); setDataJulgamento(undefined); }
          }
      } else {
          setDataJulgamento(undefined);
      }
      // Adicionar lógica para pré-selecionar documentos do repositório se estiver editando
      // e se licitacaoParaEditar.documentos contiver essa informação.
      if (licitacaoParaEditar.documentos && Array.isArray(licitacaoParaEditar.documentos)) {
        setDocumentosSelecionados(licitacaoParaEditar.documentos.map(d => d.id).filter(Boolean) as string[]);
      }


    } else {
      setFormData(initialFormData);
      setResponsaveis(todosResponsaveisApi.map(r => ({ id: r.id, nome: r.nome, selecionado: false })));
      setDataPublicacao(undefined);
      setPrazoEnvio(undefined);
      setDataJulgamento(undefined);
      setDocumentosSelecionados([]);
      setArquivosAnexados([]);
    }
  }, [licitacaoParaEditar, open, isEditMode]); // Removido todosResponsaveisApi, pois é setado dentro de carregarDadosAuxiliares


  useEffect(() => {
    const carregarDocumentosLicitacao = async () => {
      if (open) {
        try {
          setCarregandoDocs(true);
          const docsLicitacaoApi = await fetchDocuments({ tagNome: 'licitacao' });
          setDocumentos(docsLicitacaoApi || []);
          setDocumentosFiltrados(docsLicitacaoApi || []);
        } catch (error) {
          console.error("Erro ao carregar documentos:", error);
        } finally {
          setCarregandoDocs(false);
        }
      }
    };
    // Mover chamada para carregarDocumentosLicitacao para dentro do useEffect de 'open'
    // para que seja chamado junto com carregarUsuariosParaResponsaveis
    if (open) {
        carregarDocumentosLicitacao();
    }
  }, [fetchDocuments, open]); // Removido licitacaoParaEditar das dependências aqui, pois já está no useEffect acima

  useEffect(() => {
    if (!termoBusca.trim()) {
      setDocumentosFiltrados(documentos);
      return;
    }
    const termoLowerCase = termoBusca.toLowerCase();
    const filtrados = documentos.filter(doc => 
      doc.nome.toLowerCase().includes(termoLowerCase) || 
      doc.tipo.toLowerCase().includes(termoLowerCase) ||
      (doc.descricao && doc.descricao.toLowerCase().includes(termoLowerCase))
    );
    setDocumentosFiltrados(filtrados);
  }, [termoBusca, documentos]);

  useEffect(() => {
    const docsSelecionados = documentos.filter(doc => documentosSelecionados.includes(doc.id));
    setDocumentosRepositorio(docsSelecionados);
  }, [documentosSelecionados, documentos]);

  const toggleDocumento = (id: string) => {
    setDocumentosSelecionados(prev =>
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const novoArquivos = Array.from(e.target.files);
      setArquivosAnexados((prev) => [...prev, ...novoArquivos]);
    }
  };

  const handleEscolherArquivos = () => fileInputRef.current?.click();

  const handleRemoverArquivo = (index: number) => {
    setArquivosAnexados((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentoNecessarioChange = (id: string, checked: boolean) => {
    setDocumentosNecessarios(
      documentosNecessarios.map((doc) => (doc.id === id ? { ...doc, selecionado: checked } : doc)),
    );
  };

  const handleResponsavelChange = (id: string, checked: boolean) => {
    setResponsaveis(responsaveis.map((resp) => (resp.id === id ? { ...resp, selecionado: checked } : resp)))
  };

  const handleImpostoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setImpostos((prev) => ({ ...prev, [name]: value }));
  };

  const calcularValorComImpostos = () => {
    const valorProposta = Number.parseFloat(formData.valorProposta.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    const totalImpostos = (Number.parseFloat(impostos.iss) + Number.parseFloat(impostos.pisCofins) + Number.parseFloat(impostos.ir) + Number.parseFloat(impostos.csll)) / 100;
    return valorProposta * (1 + totalImpostos);
  };

  const uploadDocumentosAnexados = async (licitacaoId: string): Promise<boolean> => {
    if (arquivosAnexados.length === 0) return true;
    setIsUploading(true);
    setUploadProgress(0);
    let documentosProcessados = 0;
    try {
      for (const arquivo of arquivosAnexados) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', arquivo);
        formDataUpload.append('nome', arquivo.name);
        formDataUpload.append('tipo', 'Anexo Licitação');
        formDataUpload.append('licitacaoId', licitacaoId);

        // TODO: Refatorar obtenção de token para usar useAuth ou wrapper de API.
        const accessToken = localStorage.getItem('accessToken');
        const headers: HeadersInit = { 'Authorization': `Bearer ${accessToken}` };

        const response = await fetch('/api/documentos/doc/upload', {
          method: 'POST',
          credentials: 'include',
          headers: headers,
          body: formDataUpload
        });
        if (!response.ok) console.error(`Erro upload ${arquivo.name}`);
        documentosProcessados++;
        setUploadProgress(Math.round((documentosProcessados / arquivosAnexados.length) * 100));
      }
      return true;
    } catch (error) {
      console.error('Erro ao fazer upload de documentos:', error);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Evitar múltiplas submissões
    if (isSubmitting) {
      console.log('Submissão já em andamento, ignorando...');
      return;
    }

    if (isSimplifiedForm) {
      // No formulário simplificado, o campo `formData.responsavel` (texto) era usado. Agora usaremos `formData.responsavelId`.
      if (!formData.nome || !formData.orgao || !prazoEnvio || !dataJulgamento || !formData.responsavelId) {
        toast({ title: "Erro", description: "Formulário Simplificado: Nome, Órgão, Data da Licitação, Data do Julgamento e Responsável ID são obrigatórios.", variant: "destructive" });
        return;
      }
    } else {
      // No formulário completo, também usar `formData.responsavelId`.
      if (!formData.nome || !formData.orgao || !prazoEnvio || !dataJulgamento || !formData.tipo || !formData.responsavelId) {
        toast({ title: "Erro", description: "Formulário Completo: Nome, Órgão, Prazo Envio, Data Julgamento, Tipo e Responsável ID são obrigatórios.", variant: "destructive" });
        return;
      }
      if (formData.tipo === "produto" && !formData.tipoFaturamento) {
        toast({ title: "Erro", description: "Para 'Produto', o Tipo de Faturamento é obrigatório.", variant: "destructive" });
        return;
      }
    }
    setIsSubmitting(true);
    console.log('Iniciando submissão da licitação...');
    // TODO: Refatorar obtenção de token para usar useAuth ou wrapper de API.
    const accessToken = localStorage.getItem('accessToken');

    try {
      let orgaoIdToUse = formData.orgaoId;
      if (!isEditMode || (isEditMode && licitacaoParaEditar?.orgao !== formData.orgao)) { // Se está criando ou se o nome do órgão mudou na edição
        const orgaoResponse = await fetch("/api/licitacoes/orgaos", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: JSON.stringify({ nome: formData.orgao, tipo: "publico" }), // Assumindo tipo padrão
        });
        if (!orgaoResponse.ok) throw new Error(`Erro ao salvar órgão: ${await orgaoResponse.text()}`);
        const orgaoResult = await orgaoResponse.json();
        orgaoIdToUse = orgaoResult.id;
      }
      
      const payload = {
        ...formData,
        orgaoId: orgaoIdToUse,
        titulo: formData.nome, // API espera 'titulo'
        dataAbertura: prazoEnvio ? format(prazoEnvio, "yyyy-MM-dd") : undefined,
        dataPublicacao: dataPublicacao ? format(dataPublicacao, "yyyy-MM-dd") : undefined,
        valorEstimado: formData.valorEstimado ? Number(formData.valorEstimado.replace(/[^\d,]/g, "").replace(",", ".")) : undefined,
        valorProposta: formData.valorProposta ? Number(formData.valorProposta.replace(/[^\d,]/g, "").replace(",", ".")) : undefined,
        objeto: formData.descricao,
        dataJulgamento: dataJulgamento ? format(dataJulgamento, "yyyy-MM-dd") : undefined,
        responsavel_id: formData.responsavelId, // Usar o ID do responsável principal
        tipo: (isSimplifiedForm && !formData.tipo) ? "servico" : formData.tipo,
        documentos: documentosNecessarios.filter(d => d.selecionado).map(d => ({ nome: d.nome, tipo: "checklist" })),
        responsaveis: responsaveis.filter(r => r.selecionado).map(r => ({ id: r.id, papel: "responsavel" })),
        documentosRepositorioIds: documentosRepositorio.map(doc => doc.id),
      };
      delete (payload as any).nome; // 'nome' do form é 'titulo' na API
      delete (payload as any).orgao; // 'orgao' do form é usado para criar/buscar orgaoId
      delete (payload as any).responsavel; // 'responsavel' (nome) do form não é enviado, apenas responsavelId
      delete (payload as any).responsavelId; // 'responsavelId' do form é 'responsavel_id' na API


      let licitacaoSalva;
      if (isEditMode && licitacaoParaEditar?.id) {
        const response = await fetch(`/api/licitacoes/${licitacaoParaEditar.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Erro ao atualizar licitação: ${await response.text()}`);
        licitacaoSalva = await response.json();
        if (onLicitacaoUpdated) onLicitacaoUpdated(licitacaoSalva);
        toast({ title: "Sucesso!", description: "Licitação atualizada com sucesso." });
      } else {
        const response = await fetch("/api/licitacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 409) {
            toast({ title: "Aviso", description: "Esta licitação já existe.", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          throw new Error(`Erro ao criar licitação: ${errorText}`);
        }
        licitacaoSalva = await response.json();
        if (onLicitacaoAdded) onLicitacaoAdded(licitacaoSalva);
        toast({ title: "Sucesso!", description: "Licitação criada com sucesso." });
      }

      if (licitacaoSalva && licitacaoSalva.id && arquivosAnexados.length > 0) {
        await uploadDocumentosAnexados(licitacaoSalva.id);
      }

      setOpen(false);
      // Resetar formulário para modo de criação após salvar, se não for controlado externamente
      if (setExternalOpen === undefined) {
        setFormData(initialFormData);
        setDataPublicacao(undefined);
        setPrazoEnvio(undefined);
        setDataJulgamento(undefined);
        setArquivosAnexados([]);
        setDocumentosSelecionados([]);
      }

    } catch (error) {
      console.error('Erro ao salvar licitação:', error);
      toast({ title: "Erro", description: `Erro ao salvar licitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = isEditMode ? "Editar Licitação" : "Cadastrar Nova Licitação";
  const submitButtonText = isEditMode ? "Salvar Alterações" : "Salvar Licitação";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !isEditMode && ( // Botão padrão apenas para Nova Licitação se não houver trigger customizado
         <DialogTrigger asChild>
           <Button className="bg-[#1B3A53] hover:bg-[#2c5a80]">
             <Plus className="w-4 h-4 mr-2" />
             Nova Licitação
           </Button>
         </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{dialogTitle}</h2>
              {!isEditMode && ( // Toggle de formulário apenas para nova licitação
                <Toggle
                  pressed={isSimplifiedForm}
                  onPressedChange={setIsSimplifiedForm}
                  className="data-[state=on]:bg-primary"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span style={{ color: isSimplifiedForm ? 'white' : '#222' }}>{isSimplifiedForm ? "Simplificado" : "Completo"}</span>
                  </div>
                </Toggle>
              )}
            </div>
          </DialogTitle>
          {!isEditMode && <DialogDescription>Preencha os dados para cadastrar uma nova licitação no sistema.</DialogDescription>}
        </DialogHeader>

        {/* ... (Restante do JSX do formulário, que é extenso e não precisa ser colado aqui, mas será incluído no overwrite) ... */}
        {isSimplifiedForm ? (
           <div className="space-y-6 py-4"> {/* Adicionado py-4 para espaçamento */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome da Licitação *</Label>
                <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Nome da licitação" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="orgao">Órgão Responsável *</Label>
                <Input id="orgao" name="orgao" value={formData.orgao} onChange={handleInputChange} placeholder="Nome do órgão responsável" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prazoEnvio">Data da Licitação (Abertura/Prazo Envio) *</Label>
                <Input id="prazoEnvio" name="prazoEnvio" type="date" className="w-full" value={prazoEnvio ? format(prazoEnvio, "yyyy-MM-dd") : ""} onChange={(e) => setPrazoEnvio(e.target.value ? parseISO(e.target.value) : undefined)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dataPublicacao">Data de Publicação</Label>
                <Input id="dataPublicacao" name="dataPublicacao" type="date" className="w-full" value={dataPublicacao ? format(dataPublicacao, "yyyy-MM-dd") : ""} onChange={(e) => setDataPublicacao(e.target.value ? parseISO(e.target.value) : undefined)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dataJulgamento">Data do Julgamento/Pregão *</Label>
                <Input id="dataJulgamento" name="dataJulgamento" type="date" className="w-full" value={dataJulgamento ? format(dataJulgamento, "yyyy-MM-dd") : ""} onChange={(e) => setDataJulgamento(e.target.value ? parseISO(e.target.value) : undefined)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="responsavelId">Responsável Principal *</Label>
                <Select value={formData.responsavelId} onValueChange={(value) => handleSelectChange("responsavelId", value)}>
                  <SelectTrigger id="responsavelId">
                    <SelectValue placeholder="Selecione o responsável principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {todosResponsaveisApi.map(resp => (
                      <SelectItem key={resp.id} value={resp.id}>{resp.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Documentos e Anexos mantidos como estavam */}
              <div className="grid gap-2"><Label className="text-base font-medium">Documentos do Repositório (tag: licitação)</Label><div className="border rounded-md overflow-hidden"><div className="p-3 flex items-center justify-between"><div className="relative flex-1"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" /><Input type="text" placeholder="Buscar documentos..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="pl-8 h-9 text-sm"/></div><Badge variant="outline" className="bg-white ml-2">{documentosSelecionados.length} selecionados</Badge></div>{carregandoDocs ? (<div className="p-4 text-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div><p className="mt-2 text-sm text-gray-500">Carregando documentos...</p></div>) : documentosFiltrados.length === 0 ? (<div className="p-4 text-center"><p className="text-sm text-gray-500">Nenhum documento encontrado.</p></div>) : (<ScrollArea className="h-[200px]"><div className="divide-y">{documentosFiltrados.map((doc) => (<div key={doc.id} className={`p-2 flex items-start hover:bg-gray-50 cursor-pointer ${documentosSelecionados.includes(doc.id) ? 'bg-blue-50' : ''}`} onClick={() => toggleDocumento(doc.id)}><Checkbox checked={documentosSelecionados.includes(doc.id)} onCheckedChange={() => toggleDocumento(doc.id)} className="mr-2 mt-0.5"/><div className="flex-1 min-w-0"><div className="flex items-center"><FileText className="w-4 h-4 text-blue-500 mr-1.5 flex-shrink-0" /><p className="font-medium text-sm truncate">{doc.nome}</p></div><div className="flex items-center text-xs text-gray-500 mt-0.5"><span>{doc.tipo}</span>{doc.tamanho ? (<><span className="mx-1">•</span><span>{formatarTamanho(doc.tamanho)}</span></>) : null}</div></div>{documentosSelecionados.includes(doc.id) && (<Check className="w-4 h-4 text-green-500 ml-1 flex-shrink-0" />)}</div>))}</div></ScrollArea>)}</div></div>
              <div className="grid gap-2"><Label className="text-base font-medium">Anexar Documentos</Label><div className="border rounded-md p-3"><div className="flex items-center justify-between"><Button variant="outline" size="sm" className="mr-2" type="button" onClick={handleEscolherArquivos}>Escolher arquivos</Button><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple /><Badge variant="outline" className="bg-white">{arquivosAnexados.length} selecionado(s)</Badge></div>{arquivosAnexados.length > 0 && (<div className="mt-3 space-y-1 border-t pt-2">{arquivosAnexados.map((arquivo, index) => (<div key={index} className="flex items-center text-sm p-1 hover:bg-gray-50 rounded-sm"><FileText className="h-4 w-4 mr-2 text-blue-500" /><span className="truncate max-w-[200px] flex-1">{arquivo.name}</span><span className="text-xs text-muted-foreground ml-1 mr-2">({Math.round(arquivo.size / 1024)} KB)</span><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoverArquivo(index)}>×</Button></div>))}</div>)}<p className="text-xs text-muted-foreground mt-2">Os documentos serão anexados após criar a licitação</p></div></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />{submitButtonText}</>)}</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full py-4"> {/* Adicionado py-4 */}
              <TabsList className="w-full justify-start">
                <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
              </TabsList>
              <TabsContent value="dados-basicos" className="space-y-4 mt-4"> {/* Adicionado mt-4 */}
                {/* ... Conteúdo da Aba Dados Básicos (como no original, mas usando handleInputChange e formData) ... */}
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="nome">Nome da Licitação *</Label><Input id="nome" name="nome" placeholder="Nome da licitação" value={formData.nome} onChange={handleInputChange} required /></div><div className="space-y-2"><Label htmlFor="orgao">Órgão Responsável *</Label><Input id="orgao" name="orgao" placeholder="Nome do órgão responsável" value={formData.orgao} onChange={handleInputChange} required /></div></div>
                <div className="space-y-2"><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" name="descricao" placeholder="Descreva o objeto da licitação" className="min-h-[80px]" value={formData.descricao} onChange={handleInputChange}/></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="numeroEdital">Número do Edital</Label><Input id="numeroEdital" name="numeroEdital" placeholder="Ex: 123/2023" value={formData.numeroEdital} onChange={handleInputChange}/></div><div className="space-y-2"><Label htmlFor="modalidade">Modalidade</Label><Select value={formData.modalidade} onValueChange={(value) => handleSelectChange("modalidade", value)}><SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger><SelectContent><SelectItem value="pregao_eletronico">Pregão Eletrônico</SelectItem><SelectItem value="pregao_presencial">Pregão Presencial</SelectItem><SelectItem value="concorrencia">Concorrência</SelectItem><SelectItem value="tomada_precos">Tomada de Preços</SelectItem><SelectItem value="convite">Convite</SelectItem></SelectContent></Select></div></div>
                <div className="grid grid-cols-3 gap-4"><div className="space-y-2"><Label htmlFor="dataPublicacao">Data de Publicação</Label><Input id="dataPublicacao" name="dataPublicacao" type="date" className="w-full" value={dataPublicacao ? format(dataPublicacao, "yyyy-MM-dd") : ""} onChange={(e) => setDataPublicacao(e.target.value ? parseISO(e.target.value) : undefined)} /></div><div className="space-y-2"><Label htmlFor="prazoEnvio">Prazo para Envio *</Label><Input id="prazoEnvio" name="prazoEnvio" type="date" className="w-full" value={prazoEnvio ? format(prazoEnvio, "yyyy-MM-dd") : ""} onChange={(e) => setPrazoEnvio(e.target.value ? parseISO(e.target.value) : undefined)} required /></div><div className="space-y-2"><Label htmlFor="dataJulgamento">Data do Julgamento/Pregão *</Label><Input id="dataJulgamento" name="dataJulgamento" type="date" className="w-full" value={dataJulgamento ? format(dataJulgamento, "yyyy-MM-dd") : ""} onChange={(e) => setDataJulgamento(e.target.value ? parseISO(e.target.value) : undefined)} required /></div></div>
                <div className="space-y-2"><Label htmlFor="status">Status Inicial</Label><Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger><SelectContent><SelectItem value="analise_interna">Análise Interna</SelectItem><SelectItem value="aguardando_pregao">Aguardando Pregão</SelectItem><SelectItem value="envio_documentos">Envio de Documentos</SelectItem><SelectItem value="assinaturas">Assinaturas</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="urlLicitacao">URL da Licitação</Label><div className="flex items-center space-x-2"><LinkIcon className="h-4 w-4 text-muted-foreground" /><Input id="urlLicitacao" name="urlLicitacao" placeholder="https://..." value={formData.urlLicitacao} onChange={handleInputChange}/></div></div>
                <div className="grid grid-cols-2 gap-4 mt-4"><div className="space-y-2"><Label htmlFor="tipo">Tipo de Licitação *</Label><Select value={formData.tipo} onValueChange={(value) => handleSelectChange("tipo", value)}><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger><SelectContent><SelectItem value="produto">Produto</SelectItem><SelectItem value="servico">Serviço</SelectItem></SelectContent></Select></div>{formData.tipo === "produto" && (<div className="space-y-2"><Label htmlFor="tipoFaturamento">Tipo de Faturamento *</Label><Select value={formData.tipoFaturamento} onValueChange={(value) => handleSelectChange("tipoFaturamento", value)}><SelectTrigger><SelectValue placeholder="Selecione o tipo de faturamento" /></SelectTrigger><SelectContent><SelectItem value="direto">Faturamento Direto</SelectItem><SelectItem value="distribuidor">Via Distribuidor</SelectItem></SelectContent></Select></div>)}</div>
              </TabsContent>
              <TabsContent value="documentos" className="space-y-4 mt-4">
                {/* ... Conteúdo da Aba Documentos (como no original, mas usando handleDocumentoNecessarioChange) ... */}
                <div className="space-y-2"><Label className="text-base font-medium">Checklist de Documentos Necessários</Label><div className="grid grid-cols-2 gap-3 border rounded-md p-3">{documentosNecessarios.map((doc) => (<div key={doc.id} className="flex items-center space-x-2"><Checkbox id={`chk-${doc.id}`} checked={doc.selecionado} onCheckedChange={(checked) => handleDocumentoNecessarioChange(doc.id, !!checked)} /><Label htmlFor={`chk-${doc.id}`} className="font-normal">{doc.nome}</Label></div>))}</div></div>
                <SeletorDocumentosLicitacao onDocumentosSelecionados={(docs) => setDocumentosRepositorio(docs)} />
                <div className="space-y-2 mt-6"><Label className="text-base font-medium">Anexar Documentos</Label><div className="border rounded-md p-3"><div className="flex items-center"><Button variant="outline" size="sm" className="mr-2" type="button" onClick={handleEscolherArquivos}>Escolher arquivos</Button><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple /><span className="text-sm text-muted-foreground">{arquivosAnexados.length ? `${arquivosAnexados.length} arquivo(s) selecionado(s)` : "Nenhum arquivo escolhido"}</span></div>{arquivosAnexados.length > 0 && (<div className="mt-2 space-y-1">{arquivosAnexados.map((arquivo, index) => (<div key={index} className="flex items-center text-sm"><FileText className="h-3 w-3 mr-1" /><span className="truncate max-w-[200px]">{arquivo.name}</span><span className="text-xs text-muted-foreground ml-1">({Math.round(arquivo.size / 1024)} KB)</span><Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => handleRemoverArquivo(index)}>×</Button></div>))}</div>)}<p className="text-xs text-muted-foreground mt-2">Os documentos serão anexados após {isEditMode ? "atualizar" : "criar"} a licitação</p></div></div>
              </TabsContent>
              <TabsContent value="financeiro" className="space-y-4 mt-4">
                {/* ... Conteúdo da Aba Financeiro (como no original) ... */}
                <div className="grid grid-cols-3 gap-4"><div className="space-y-2"><Label htmlFor="valorEstimado">Estimativa de Custo (R$)</Label><Input id="valorEstimado" name="valorEstimado" placeholder="Ex: 250000,00" value={formData.valorEstimado} onChange={handleInputChange}/></div><div className="space-y-2"><Label htmlFor="valorProposta">Valor da Proposta (R$)</Label><Input id="valorProposta" name="valorProposta" placeholder="Ex: 230000,00" value={formData.valorProposta} onChange={handleInputChange}/></div><div className="space-y-2"><Label htmlFor="margemLucro">Margem de Lucro (%)</Label><Input id="margemLucro" name="margemLucro" placeholder="Ex: 15" value={formData.margemLucro} onChange={handleInputChange}/></div></div>
                <div className="border rounded-md p-4 space-y-4"><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-blue-500" /><h3 className="font-medium">Simulação de Impostos</h3></div><div className="grid grid-cols-2 md:grid-cols-5 gap-4"><div className="space-y-2"><Label htmlFor="iss">ISS (%)</Label><Input id="iss" name="iss" value={impostos.iss} onChange={handleImpostoChange} /></div><div className="space-y-2"><Label htmlFor="icms">ICMS (%)</Label><Input id="icms" name="icms" value={impostos.icms} onChange={handleImpostoChange} /></div><div className="space-y-2"><Label htmlFor="pisCofins">PIS/COFINS (%)</Label><Input id="pisCofins" name="pisCofins" value={impostos.pisCofins} onChange={handleImpostoChange} /></div><div className="space-y-2"><Label htmlFor="ir">IR (%)</Label><Input id="ir" name="ir" value={impostos.ir} onChange={handleImpostoChange} /></div><div className="space-y-2"><Label htmlFor="csll">CSLL (%)</Label><Input id="csll" name="csll" value={impostos.csll} onChange={handleImpostoChange} /></div></div>{formData.valorProposta && (<div className="mt-4 p-3 bg-muted rounded-md"><div className="flex justify-between items-center"><span className="font-medium">Valor com Impostos:</span><span className="font-bold text-lg">{calcularValorComImpostos().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div></div>)}</div>
                <div className="grid grid-cols-3 gap-4"><div className="space-y-2"><Label htmlFor="contatoNome">Contato (Nome)</Label><Input id="contatoNome" name="contatoNome" placeholder="Nome do contato" value={formData.contatoNome} onChange={handleInputChange}/></div><div className="space-y-2"><Label htmlFor="contatoTelefone">Contato (Telefone)</Label><Input id="contatoTelefone" name="contatoTelefone" placeholder="(00) 00000-0000" value={formData.contatoTelefone} onChange={handleInputChange}/></div><div className="space-y-2"><Label htmlFor="contatoEmail">Contato (E-mail)</Label><Input id="contatoEmail" name="contatoEmail" placeholder="email@exemplo.com" value={formData.contatoEmail} onChange={handleInputChange}/></div></div>
              </TabsContent>
              <TabsContent value="responsaveis" className="space-y-4 mt-4">
                {/* ... Conteúdo da Aba Responsáveis (como no original, mas usando handleResponsavelChange) ... */}
                <div className="space-y-2"><Label>Usuários Responsáveis</Label><div className="grid grid-cols-2 gap-2 border rounded-md p-3">{responsaveis.map((resp) => (<div key={resp.id} className="flex items-center space-x-2"><Checkbox id={`chk-resp-${resp.id}`} checked={resp.selecionado} onCheckedChange={(checked) => handleResponsavelChange(resp.id, !!checked)} /><Label htmlFor={`chk-resp-${resp.id}`} className="font-normal">{resp.nome}</Label></div>))}</div></div>
                <div className="border rounded-md p-4 space-y-4"><div className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-500" /><h3 className="font-medium">Notificações e Calendário</h3></div><div className="space-y-3"><div className="flex items-center space-x-2"><Checkbox id="criarEvento" checked={criarEvento} onCheckedChange={(checked) => setCriarEvento(!!checked)} /><Label htmlFor="criarEvento" className="font-normal">Criar evento no calendário e enviar convites</Label></div><div className="flex items-center space-x-2"><Checkbox id="enviarNotificacoes" checked={enviarNotificacoes} onCheckedChange={(checked) => setEnviarNotificacoes(!!checked)}/><Label htmlFor="enviarNotificacoes" className="font-normal">Enviar notificações por e-mail para os responsáveis</Label></div><div className="flex items-center space-x-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Lembretes automáticos: 7, 3 e 1 dia antes do prazo</span></div></div></div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground"><span className="text-red-500">*</span> Campos obrigatórios</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="bg-[#1B3A53] hover:bg-[#2c5a80]">{isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : (<><Save className="mr-2 h-4 w-4" />{submitButtonText}</>)}</Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
