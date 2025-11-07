import {
  Issue,
  PullRequest,
  RepositoryInfo,
  Comment,
  Commit,
} from "../domain/entities/main";
import { IRepoRepository } from "../domain/repositories/IRepoRepository";
import { ICommentExporter } from "../domain/services/ICommentExporter";
import { ICommitExporter } from "../domain/services/ICommitExporter";
import { IIssueExporter } from "../domain/services/IIssueExporter";
import { ILabelExporter } from "../domain/services/ILabelExporter";
import { IPullRequestExporter } from "../domain/services/IPullRequestExporter";
import { IRepoExporter } from "../domain/services/RepoExporter";
import { RepositoryIdentifier } from "../domain/value-objects/RepositoryIdentifier";

export interface ExtractInput {
  owner: string;
  repoName: string;
  token: string;
}

export class ExtractDataFromRepo {
  constructor(
    private readonly repoRepository: IRepoRepository,
    private readonly repoExporter: IRepoExporter,
    private readonly issuesExporter: IIssueExporter,
    private readonly pullRequestExporter: IPullRequestExporter,
    private readonly commentExporter: ICommentExporter,
    private readonly labelExporter: ILabelExporter,
    private readonly commitExporter: ICommitExporter
  ) {}

  async extractRepoInfoAndSave(input: ExtractInput): Promise<void> {
    const repositoryIdentifier = new RepositoryIdentifier(
      input.owner,
      input.repoName
    );

    console.log(
      `Extraindo dados do repositório: ${repositoryIdentifier.toString()}...`
    );

    const repoConsumer = async (repoInfo: RepositoryInfo): Promise<void> => {};

    console.log("Iniciando extração e salvamento no banco de dados...");

    const repoInfo = await this.repoRepository.findRepositoryInfo(
      repositoryIdentifier,
      input.token
    );

    await this.repoExporter.export(repoInfo, repositoryIdentifier);
    console.log("\n✅ Processo de salvamento no banco de dados concluído!");
  }

  async extractIssuesAndSave(input: ExtractInput): Promise<void> {
    const repositoryIdentifier = new RepositoryIdentifier(
      input.owner,
      input.repoName
    );

    await this.issuesExporter.export([], repositoryIdentifier, "replace");

    const issueConsumer = async (issues: Issue[]): Promise<void> => {
      if (issues.length > 0) {
        await this.issuesExporter.export(
          issues,
          repositoryIdentifier,
          "append"
        );
        await this.labelExporter.exportFromIssues(issues);
      }
    };

    const commentConsumer = async (comments: Comment[]): Promise<void> => {
      if (comments.length > 0) {
        await this.commentExporter.export(
          comments,
          repositoryIdentifier,
          "append"
        );
      }
    };

    console.log(
      "Iniciando extração e salvamento incremental no banco de dados..."
    );

    await this.repoRepository.findAllIssues(
      repositoryIdentifier,
      input.token,
      issueConsumer,
      commentConsumer
    );

    console.log("\n✅ Processo de salvamento no banco de dados concluído!");
  }

  async extractPullRequestsAndSave(input: ExtractInput): Promise<void> {
    const repositoryIdentifier = new RepositoryIdentifier(
      input.owner,
      input.repoName
    );

    await this.pullRequestExporter.export([], repositoryIdentifier, "replace");

    const pullRequestConsumer = async (
      pullRequests: PullRequest[]
    ): Promise<void> => {
      if (pullRequests.length > 0) {
        await this.pullRequestExporter.export(
          pullRequests,
          repositoryIdentifier,
          "append"
        );
        await this.labelExporter.exportFromPullRequests(pullRequests);
      }
    };

    const commentConsumer = async (comments: Comment[]): Promise<void> => {
      if (comments.length > 0) {
        await this.commentExporter.export(
          comments,
          repositoryIdentifier,
          "append"
        );
      }
    };

    const commitConsumer = async (commits: Commit[]): Promise<void> => {
      if (commits.length > 0) {
        await this.commitExporter.export(commits, repositoryIdentifier);
      }
    };

    console.log(
      "\nIniciando extração e salvamento de Pull Requests no banco de dados..."
    );

    await this.repoRepository.findAllPullRequests(
      repositoryIdentifier,
      input.token,
      pullRequestConsumer,
      commentConsumer,
      commitConsumer
    );

    console.log("\n✅ Processo de salvamento de Pull Requests concluído!");
  }
}
