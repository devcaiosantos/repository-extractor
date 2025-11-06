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
  id: number | string;
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
  pull_request?: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
  };
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GraphQLIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  comments: {
    totalCount: number;
  };
  author: {
    login: string;
  } | null;
  labels: {
    nodes: { name: string; color: string }[];
  };
  assignees: {
    nodes: { login: string; avatarUrl: string }[];
  };
  closedBy: {
    login: string;
  } | null;
  stateReason: "completed" | "not_planned" | "reopened" | null;
}

export interface GraphQLSearchResponse {
  repository: {
    issues: {
      pageInfo: PageInfo;
      nodes: GraphQLIssue[];
    };
  };
  rateLimit: {
    cost: number;
    remaining: number;
    resetAt: string;
  };
}
