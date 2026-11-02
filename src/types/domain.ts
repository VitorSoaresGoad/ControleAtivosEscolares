import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type Perfil = 'admin' | 'professor';
export type StatusEquipamento = 'disponível' | 'em_uso' | 'em_manutencao';

export interface UsuarioAutorizado {
  email: string;
  nome: string;
  perfil: Perfil;
}

export interface UsuarioAutorizadoComId extends UsuarioAutorizado {
  documentId: string;
}

export interface Carrinho {
  id_carrinho: string;
  nome_sala: string;
  capacidade_total: number;
  ativo?: boolean;
  criado_em?: Timestamp;
}

export interface Equipamento {
  id_equipamento: string;
  id_carrinho: DocumentReference;
  numero_patrimonio: string;
  nome?: string;
  numero_serie?: string;
  status: StatusEquipamento;
  aluno_atual: string;
  hora_retirada: Timestamp | null;
  id_historico_atual?: string | null;
  email_professor_atual?: string | null;
  nome_professor_atual?: string | null;
  ultima_ocorrencia?: string;
  ultima_ocorrencia_em?: Timestamp;
  ultima_ocorrencia_email?: string;
  ultima_ocorrencia_historico_id?: string | null;
  ultima_ocorrencia_editada_em?: Timestamp;
  ultima_ocorrencia_editada_por?: string;
  atualizado_em?: Timestamp;
}

export interface RegistroHistorico {
  id_registro: string;
  id_equipamento: DocumentReference;
  email_professor: string;
  nome_professor?: string;
  nome_aluno: string;
  data_hora_retirada: Timestamp;
  data_hora_devolucao: Timestamp | null;
  ocorrencia: string;
  ocorrencia_criada_por?: string;
  ocorrencia_criada_por_nome?: string;
  ocorrencia_editada_em?: Timestamp;
  ocorrencia_editada_por?: string;
  ocorrencia_editada_por_nome?: string;
  nome_sala?: string;
  nome_equipamento?: string;
  numero_patrimonio?: string;
}

export interface EquipamentoComId extends Equipamento {
  documentId: string;
}

export interface CarrinhoResumo extends Carrinho {
  documentId: string;
  total: number;
  disponiveis: number;
  emUso: number;
  emManutencao: number;
}

export const STATUS_LABEL: Record<StatusEquipamento, string> = {
  disponível: 'Disponível',
  em_uso: 'Em uso',
  em_manutencao: 'Em manutenção',
};
