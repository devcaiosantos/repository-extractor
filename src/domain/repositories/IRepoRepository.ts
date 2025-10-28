import { Issue, RepositoryInfo } from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

export interface IRepoRepository {
  findRepositoryInfo(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<RepositoryInfo>;

  findAllIssues(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (issues: Issue[]) => Promise<void>
  ): Promise<void>;

  findAllPullRequests(
    identifier: RepositoryIdentifier,
    token: string
    //processPage: (pullRequests: Issue[]) => Promise<void>
  ): Promise<void>;
}
