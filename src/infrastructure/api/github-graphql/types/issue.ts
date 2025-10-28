export interface GraphQLAuthor {
  login: string;
}

export interface GraphQLLabel {
  name: string;
  color: string;
}

export interface GraphQLAssignee {
  login: string;
  avatarUrl: string;
}

export interface GraphQLIssueNode {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: "OPEN" | "CLOSED";
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  comments: {
    totalCount: number;
  };
  author: GraphQLAuthor | null;
  labels: {
    nodes: GraphQLLabel[];
  };
  assignees: {
    nodes: GraphQLAssignee[];
  };
  stateReason: "completed" | "not_planned" | "reopened" | null;
}

export interface GraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GraphQLIssuesResponse {
  pageInfo: GraphQLPageInfo;
  nodes: GraphQLIssueNode[];
}

export interface GraphQLRepositoryResponse {
  repository: {
    issues: GraphQLIssuesResponse;
  };
  rateLimit: {
    cost: number;
    remaining: number;
    resetAt: string;
  };
}
