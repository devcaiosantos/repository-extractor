import { Extraction } from "../domain/entities/main";
import {
  Issue,
  PullRequest,
  RepositoryInfo,
  Comment,
  Commit,
} from "../domain/entities/main";
import { IExtractionRepository } from "../domain/repositories/IExtractionRepository";
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
    private readonly extractionRepository: IExtractionRepository, // Adicionado
    private readonly repoExporter: IRepoExporter,
    private readonly issuesExporter: IIssueExporter,
    private readonly pullRequestExporter: IPullRequestExporter,
    private readonly commentExporter: ICommentExporter,
    private readonly labelExporter: ILabelExporter,
    private readonly commitExporter: ICommitExporter
  ) {}

  async execute(extraction: Extraction, token: string): Promise<void> {
    const repositoryIdentifier = new RepositoryIdentifier(
      extraction.repository_owner,
      extraction.repository_name
    );

    await this.extractionRepository.updateStatus(extraction.id, "running");

    // 1. Extrair informações do repositório (sempre acontece)
    console.log(
      `Extraindo dados do repositório: ${repositoryIdentifier.toString()}...`
    );
    const repoInfo = await this.repoRepository.findRepositoryInfo(
      repositoryIdentifier,
      token
    );
    await this.repoExporter.export(repoInfo, repositoryIdentifier);
    console.log("✅ Informações do repositório salvas.");

    // 2. Extrair Issues
    console.log("\nIniciando extração de Issues...");
    await this.extractIssuesAndSave(extraction, token, repositoryIdentifier);

    // 3. Extrair Pull Requests
    console.log("\nIniciando extração de Pull Requests...");
    await this.extractPullRequestsAndSave(
      extraction,
      token,
      repositoryIdentifier
    );

    await this.extractionRepository.updateStatus(extraction.id, "completed");
    console.log("\n🎉 Extração concluída com sucesso!");
  }

  private async extractIssuesAndSave(
    extraction: Extraction,
    token: string,
    repoId: RepositoryIdentifier
  ): Promise<void> {
    const issueConsumer = async (
      issues: Issue[],
      cursor: string | null
    ): Promise<void> => {
      if (issues.length > 0) {
        await this.issuesExporter.export(issues, repoId, "append");
        await this.labelExporter.exportFromIssues(issues);
        await this.extractionRepository.updateProgress(extraction.id, {
          last_issue_cursor: cursor,
          total_issues_fetched:
            (extraction.total_issues_fetched || 0) + issues.length,
        });
        extraction.total_issues_fetched += issues.length; // Update local state
      }
    };

    const commentConsumer = async (comments: Comment[]): Promise<void> => {
      if (comments.length > 0) {
        await this.commentExporter.export(comments, repoId, "append");
      }
    };

    await this.repoRepository.findAllIssues(
      repoId,
      token,
      issueConsumer,
      commentConsumer,
      extraction.last_issue_cursor // Passa o cursor inicial
    );
    console.log("✅ Issues salvas.");
  }

  private async extractPullRequestsAndSave(
    extraction: Extraction,
    token: string,
    repoId: RepositoryIdentifier
  ): Promise<void> {
    const pullRequestConsumer = async (
      pullRequests: PullRequest[],
      cursor: string | null
    ): Promise<void> => {
      if (pullRequests.length > 0) {
        await this.pullRequestExporter.export(pullRequests, repoId, "append");
        await this.labelExporter.exportFromPullRequests(pullRequests);
        await this.extractionRepository.updateProgress(extraction.id, {
          last_pr_cursor: cursor,
          total_prs_fetched:
            (extraction.total_prs_fetched || 0) + pullRequests.length,
        });
        extraction.total_prs_fetched += pullRequests.length; // Update local state
      }
    };

    const commentConsumer = async (comments: Comment[]): Promise<void> => {
      if (comments.length > 0) {
        await this.commentExporter.export(comments, repoId, "append");
      }
    };

    const commitConsumer = async (commits: Commit[]): Promise<void> => {
      if (commits.length > 0) {
        await this.commitExporter.export(commits, repoId);
      }
    };

    await this.repoRepository.findAllPullRequests(
      repoId,
      token,
      pullRequestConsumer,
      commentConsumer,
      commitConsumer,
      extraction.last_pr_cursor // Passa o cursor inicial
    );
    console.log("✅ Pull Requests salvos.");
  }
}
