import { Issue, RepositoryInfo } from "../domain/entities/main";
import { IIssueRepository } from "../domain/repositories/IIssueRepository";
import { IRepoRepository } from "../domain/repositories/IRepoRepository";
import { IIssueExporter } from "../domain/services/IIssueExporter";
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
    private readonly issuesExporter: IIssueExporter
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
      }
    };

    console.log(
      "Iniciando extração e salvamento incremental no banco de dados..."
    );

    await this.repoRepository.findAllIssues(
      repositoryIdentifier,
      input.token,
      issueConsumer
    );

    console.log("\n✅ Processo de salvamento no banco de dados concluído!");
  }
}
