// Interfaces para o módulo comercial

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  contatoNome: string;
  contatoTelefone: string;
  contatoEmail: string;
  endereco?: string;
  segmento: string;
  dataCadastro: string;
  ativo: boolean;
  cidade?: string;
  estado?: string;
  descricao?: string;
  observacoes?: string;
  faturamento?: number | string;
  dataAtualizacao?: string;
  responsavelInterno?: string;
}

export interface Oportunidade {
  id: string;
  titulo: string;
  cliente: string;
  clienteId: string;
  valor: string;
  valorNegociado?: string;
  responsavel: string;
  responsavelId: string;
  prazo: string;
  status: OportunidadeStatus;
  descricao?: string;
  dataCriacao: string;
  dataAtualizacao: string;
  // Campos adicionais
  cnpj?: string;
  contatoNome?: string;
  contatoTelefone?: string;
  contatoEmail?: string;
  endereco?: string;
  segmento?: string;
  dataReuniao?: string;
  horaReuniao?: string;
  responsaveisIds?: string[];
  tipo?: OportunidadeTipo;
  tipoFaturamento?: OportunidadeTipoFaturamento;
  probabilidade?: number; // Probabilidade de fechamento (%)
  motivoPerda?: string; // Motivo da perda da oportunidade
  posicaoKanban?: number; // Posição no quadro Kanban
}

export type OportunidadeStatus = 
  | "novo_lead"
  | "agendamento_reuniao"
  | "levantamento_oportunidades"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";

export type OportunidadeTipo =
  | "produto"
  | "servico";

export type OportunidadeTipoFaturamento =
  | "direto"
  | "distribuidor";

export interface Nota {
  id: string;
  oportunidadeId: string;
  autor: string;
  autorId: string;
  data: string;
  texto: string;
}

export interface Reuniao {
  id: string;
  oportunidadeId: string;
  titulo: string;
  data: string;
  hora: string;
  local?: string;
  participantes: string[];
  notas?: string;
  concluida: boolean;
}

export interface Responsavel {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  contatoTelefone?: string;
  user_id?: string | null;
  cargo?: string;
  departamento?: string;
  ativo: boolean;
}

export interface Contato {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  principal?: boolean;
}

// Campos adicionais para cliente que podem ser utilizados na UI
export interface ClienteDetalhado extends Cliente {
  tipo?: string;
  cidade?: string;
  estado?: string;
  contatos?: Contato[];
  responsavelInterno?: string;
  descricao?: string;
  observacoes?: string;
  faturamento?: string;
  oportunidades?: Oportunidade[];
}

export interface OportunidadeFiltros {
  termo?: string;
  status?: string;
  cliente?: string;
  responsavel?: string;
  dataInicio?: Date;
  dataFim?: Date;
  valorMinimo?: number;
  valorMaximo?: number;
}
