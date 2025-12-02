import {
  Comment,
  Commit,
  Issue,
  PullRequest,
  RepositoryInfo,
} from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

export interface IRepoRepository {
  findRepositoryInfo(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<RepositoryInfo>;

  findAllIssues(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (issues: Issue[], newCursor: string | null) => Promise<void>,
    processCommentsPage: (comments: Comment[]) => Promise<void>,
    startCursor?: string | null
  ): Promise<void>;

  findAllPullRequests(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (
      pullRequests: PullRequest[],
      newCursor: string | null
    ) => Promise<void>,
    processCommentsPage: (comments: Comment[]) => Promise<void>,
    processCommitsPage: (commits: Commit[]) => Promise<void>,
    startCursor?: string | null
  ): Promise<void>;
}
