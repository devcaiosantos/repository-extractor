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

export class ExtractionPausedError extends Error {
  constructor() {
    super("Extração pausada pelo usuário");
    this.name = "ExtractionPausedError";
  }
}

export class ExtractDataFromRepo {
  constructor(
    private readonly repoRepository: IRepoRepository,
    private readonly extractionExporter: IExtractionRepository, // Adicionado
    private readonly repoExporter: IRepoExporter,
    private readonly issuesExporter: IIssueExporter,
    private readonly pullRequestExporter: IPullRequestExporter,
    private readonly commentExporter: ICommentExporter,
    private readonly labelExporter: ILabelExporter,
    private readonly commitExporter: ICommitExporter
  ) {}

  async execute(
    repoIdentifier: RepositoryIdentifier,
    token: string,
    extractioParam?: Extraction
  ): Promise<void> {
    const repoInfo = await this.repoRepository.findRepositoryInfo(
      repoIdentifier,
      token
    );
    await this.repoExporter.export(repoInfo, repoIdentifier);

    const extraction =
      extractioParam ||
      (await this.extractionExporter.findOrCreate(repoIdentifier));

    try {
      await this.extractionExporter.updateStatus(extraction.id, "running");

      // Definir totais esperados e step inicial apenas se não estiverem definidos (primeira execução)
      if (!extraction.total_issues_expected) {
        await this.extractionExporter.updateProgress(extraction.id, {
          total_issues_expected: repoInfo.totalIssuesCount,
          total_prs_expected: repoInfo.totalPullRequestsCount,
          current_step: "issues",
          progress_percentage: 0, // Começar de 0%
        });
        extraction.total_issues_expected = repoInfo.totalIssuesCount;
        extraction.total_prs_expected = repoInfo.totalPullRequestsCount;
      } else if (!extraction.current_step) {
        // Se está retomando, apenas garantir que tem o step
        await this.extractionExporter.updateProgress(extraction.id, {
          current_step: "issues",
        });
      }

      await this.extractIssuesAndSave(extraction, token, repoIdentifier);

      // Atualizar step para Pull Requests
      await this.extractionExporter.updateProgress(extraction.id, {
        current_step: "pull_requests",
      });

      await this.extractPullRequestsAndSave(extraction, token, repoIdentifier);

      // Finalizar com 100%
      await this.extractionExporter.updateProgress(extraction.id, {
        current_step: "completed",
        progress_percentage: 100,
      });

      await this.extractionExporter.updateStatus(extraction.id, "completed");
    } catch (error) {
      await this.extractionExporter.logError(extraction.id, error as Error); // Loga o erro no job
      throw error;
    }
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
      await this.checkIfShouldPause(extraction.id);
      if (issues.length > 0) {
        await this.issuesExporter.export(issues, repoId, "append");
        await this.labelExporter.exportFromIssues(issues);

        const newTotal = (extraction.total_issues_fetched || 0) + issues.length;
        extraction.total_issues_fetched = newTotal; // Update local state

        // Calcular progresso baseado no total absoluto (issues + PRs)
        let progressPercentage = 0;
        const totalExpected =
          (extraction.total_issues_expected || 0) +
          (extraction.total_prs_expected || 0);
        const totalFetched = newTotal + (extraction.total_prs_fetched || 0);

        if (totalExpected > 0) {
          progressPercentage = Math.min(
            100,
            (totalFetched / totalExpected) * 100
          );
        }

        await this.extractionExporter.updateProgress(extraction.id, {
          last_issue_cursor: cursor,
          total_issues_fetched: newTotal,
          progress_percentage: Math.floor(progressPercentage),
        });
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
      await this.checkIfShouldPause(extraction.id);
      if (pullRequests.length > 0) {
        await this.pullRequestExporter.export(pullRequests, repoId, "append");
        await this.labelExporter.exportFromPullRequests(pullRequests);

        const newTotal =
          (extraction.total_prs_fetched || 0) + pullRequests.length;
        extraction.total_prs_fetched = newTotal;

        // Calcular progresso baseado no total absoluto (issues + PRs)
        let progressPercentage = 0;
        const totalExpected =
          (extraction.total_issues_expected || 0) +
          (extraction.total_prs_expected || 0);
        const totalFetched = (extraction.total_issues_fetched || 0) + newTotal;

        if (totalExpected > 0) {
          progressPercentage = Math.min(
            100,
            (totalFetched / totalExpected) * 100
          );
        }

        await this.extractionExporter.updateProgress(extraction.id, {
          last_pr_cursor: cursor,
          total_prs_fetched: newTotal,
          progress_percentage: Math.floor(progressPercentage),
        });
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
  }

  private async checkIfShouldPause(extractionId: string): Promise<void> {
    const extraction = await this.extractionExporter.findById(extractionId);

    if (!extraction) {
      throw new Error("Extração não encontrada");
    }

    if (extraction.status === "paused") {
      throw new ExtractionPausedError();
    }
  }
}
