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
  totalPullRequestsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PullRequest {
  id: number | string;
  number: number;
  title: string;
  body: string | null;
  author: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  url: string;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  mergedAt: Date | null;
  labels: DomainLabel[];
  assignees: DomainAssignee[];
  repositoryName: string;
  repositoryOwner: string;
  commitsCount: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  baseRefName: string;
  headRefName: string;
  associatedIssueId: string | null;
}

export interface Comment {
  id: string;
  body: string | null;
  author: string | null;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  repositoryOwner: string;
  repositoryName: string;
  issueId?: string;
  pullRequestId?: string;
}

export interface CommitFile {
  filePath: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface Commit {
  sha: string;
  message: string;
  authorName: string | null;
  authoredDate: Date | null;
  committerName: string | null;
  committedDate: Date | null;
  url: string;
  additions: number;
  deletions: number;
  totalChangedFiles: number;
  pullRequestId: string | null;
  repositoryOwner: string;
  repositoryName: string;
}

export type ExtractionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "paused";

export interface Extraction {
  id: string;
  repository_owner: string;
  repository_name: string;
  status: ExtractionStatus;
  last_issue_cursor?: string | null;
  last_pr_cursor?: string | null;
  total_issues_fetched: number;
  total_prs_fetched: number;
  total_issues_expected?: number | null;
  total_prs_expected?: number | null;
  current_step?: string | null;
  progress_percentage: number;
  error_message?: string | null;
  started_at?: Date | null;
  finished_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}
