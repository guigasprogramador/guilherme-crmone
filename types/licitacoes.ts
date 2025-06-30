export interface DocumentoDetalhado {
  id: string;
  nome: string;
  url?: string;
  arquivo_path?: string;
  arquivo?: string;
  tipo?: string;
  formato?: string;
  tamanho?: number;
  status?: string;
  criado_por?: string; // User ID
  data_criacao?: string; // ISO String
  data_atualizacao?: string; // ISO String
  tags?: string[];
  categoria?: string; 
  numeroDocumento?: string;
  dataValidade?: string; 
  licitacaoId?: string;
}

export interface ResponsavelDetalhado {
  id: string; 
  nome?: string;
  papel?: string;
}

export interface OrgaoDetalhado {
  id: string;
  nome: string;
}

export interface Licitacao {
  valorHomologado?: number;
  id: string;
  titulo: string;
  status?: LicitacaoStatus;
  modalidade?: string;
  numeroProcesso?: string;
  dataAbertura?: string; 
  dataPublicacao?: string; 
  dataJulgamento?: string; 
  dataLimiteProposta?: string; 
  valorEstimado?: string; 
  _valorEstimadoNumerico?: number; 
  valorProposta?: number; 
  objeto?: string;
  edital?: string;
  numeroEdital?: string;
  responsavelId?: string;
  responsavel?: string; 
  prazo?: string;
  urlLicitacao?: string;
  urlEdital?: string;
  descricao?: string;
  formaPagamento?: string;
  obsFinanceiras?: string;
  tipo?: string;
  tipoFaturamento?: string;
  margemLucro?: number;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  posicaoKanban?: number;
  dataCriacao?: string; 
  dataAtualizacao?: string; 
  orgaoId?: string;
  orgao?: OrgaoDetalhado | string; 
  responsaveis?: ResponsavelDetalhado[];
  documentos?: DocumentoDetalhado[];
}

export interface LicitacaoFiltros {
  termo?: string;
  status?: string;
  orgao?: string;
  responsavel?: string;
  modalidade?: string;
  dataInicio?: string;
  dataFim?: string;
  valorMinimo?: number;
  valorMaximo?: number;
}

export type LicitacaoStatus = 
  | "analise_interna"
  | "analise_edital"
  | "aguardando_pregao"
  | "em_andamento"
  | "envio_documentos"
  | "assinaturas"
  | "vencida"
  | "nao_vencida"
  | "concluida"
  | "arquivada";

export const statusColors: Record<LicitacaoStatus, string> = {
  analise_interna: "bg-blue-100 text-blue-800",
  analise_edital: "bg-yellow-100 text-yellow-800",
  aguardando_pregao: "bg-purple-100 text-purple-800",
  em_andamento: "bg-cyan-100 text-cyan-800",
  envio_documentos: "bg-indigo-100 text-indigo-800",
  assinaturas: "bg-pink-100 text-pink-800",
  vencida: "bg-green-100 text-green-800",
  nao_vencida: "bg-red-100 text-red-800",
  concluida: "bg-gray-100 text-gray-800",
  arquivada: "bg-gray-100 text-gray-800"
};

export const statusLabels: Record<LicitacaoStatus, string> = {
  analise_interna: "Análise Interna",
  analise_edital: "Análise de Edital",
  aguardando_pregao: "Aguardando Pregão",
  em_andamento: "Em Andamento",
  envio_documentos: "Envio de Documentos",
  assinaturas: "Assinaturas",
  vencida: "Vencida",
  nao_vencida: "Não Vencida",
  concluida: "Concluída",
  arquivada: "Arquivada"
};

export interface LicitacaoEstatisticas {
  total: number;
  ativas: number;
  vencidas: number;
  valorTotal: number;
  taxaSucesso: number;
  pregoesProximos: number;
  porModalidade: Record<string, number>;
  porStatus: Record<string, number>;
}

export interface Orgao {
  id: string;
  nome: string;
  tipo?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  segmento?: string;
  origemLead?: string;
  responsavelInterno?: string;
  descricao?: string;
  observacoes?: string;
  faturamento?: string;
  contatos?: OrgaoContato[];
  dataCriacao: string;
  dataAtualizacao: string;
  ativo: boolean;
}

export interface OrgaoContato {

    id: string;
    nome: string;
    cargo?: string;
    email: string;
    telefone?: string;
}
