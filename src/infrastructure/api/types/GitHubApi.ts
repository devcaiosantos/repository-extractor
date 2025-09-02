/**
 * Define as interfaces que representam a estrutura de dados EXATA
 * retornada pela API do GitHub. O objetivo aqui é ter uma tipagem
 * forte para a resposta crua da API, garantindo que nosso código
 * não quebre se a API mudar e facilitando o acesso aos dados.
 */

export interface GitHubApiUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  html_url: string;
  // ... outros campos do usuário podem ser adicionados se necessário
}

export interface GitHubApiLabel {
  id: number;
  node_id: string;
  name: string;
  color: string;
  description: string | null;
  default: boolean;
}

export interface GitHubApiIssue {
  id: number;
  node_id: string;
  url: string;
  html_url: string;
  number: number;
  state: "open" | "closed";
  title: string;
  body: string | null;
  user: GitHubApiUser;
  labels: GitHubApiLabel[];
  assignee: GitHubApiUser | null;
  assignees: GitHubApiUser[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  author_association: string;
  closed_by: GitHubApiUser | null;
  state_reason: "completed" | "not_planned" | "reopened" | null;
}
