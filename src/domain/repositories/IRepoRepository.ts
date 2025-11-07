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
    processPage: (issues: Issue[]) => Promise<void>,
    processCommentsPage: (comments: Comment[]) => Promise<void>
  ): Promise<void>;

  findAllPullRequests(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (pullRequests: PullRequest[]) => Promise<void>,
    processCommentsPage: (comments: Comment[]) => Promise<void>,
    processCommitsPage: (commits: Commit[]) => Promise<void>
  ): Promise<void>;
}
