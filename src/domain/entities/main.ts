/**
 * Interfaces simples e focadas para representar conceitos do nosso domínio.
 */

export interface DomainLabel {
  name: string;
  color: string;
}

export interface DomainAssignee {
  login: string;
  avatarUrl: string;
}

export interface Issue {
  id: number | string;
  number: number;
  title: string;
  body: string | null;
  author: string;
  state: "open" | "closed";
  url: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  commentsCount: number;
  labels: DomainLabel[];
  assignees: DomainAssignee[];
  closedBy: string | null;
  stateReason: string | null;
  pullRequest?: object;
  repositoryName: string;
  repositoryOwner: string;
}

export interface RepositoryInfo {
  owner: string;
  name: string;
  description: string | null;
  url: string;
  license: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssuesCount: number;
  totalIssuesCount: number;
  createdAt: Date;
  updatedAt: Date;
}
