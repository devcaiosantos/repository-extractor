import { GraphQLCommentNode } from "./comment";
import {
  GraphQLAssignee,
  GraphQLAuthor,
  GraphQLLabel,
  GraphQLPageInfo,
} from "./issue";

export interface GraphQLPullRequestNode {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: "OPEN" | "CLOSED" | "MERGED";
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  comments: {
    totalCount: number;
    nodes: GraphQLCommentNode[];
    pageInfo: GraphQLPageInfo;
  };
  author: GraphQLAuthor | null;
  labels: {
    nodes: GraphQLLabel[];
  };
  assignees: {
    nodes: GraphQLAssignee[];
  };
  commits: {
    totalCount: number;
  };
  additions: number;
  deletions: number;
  changedFiles: number;
  baseRefName: string;
  headRefName: string;
  closingIssuesReferences: {
    nodes: {
      id: string;
    }[];
  };
}

export interface GraphQLPullRequestsResponse {
  pageInfo: GraphQLPageInfo;
  totalCount: number;
  nodes: GraphQLPullRequestNode[];
}

export interface GraphQLPullRequestRepoResponse {
  repository: {
    pullRequests: GraphQLPullRequestsResponse;
  };
}
