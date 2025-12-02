import { Extraction } from "../../domain/entities/main";
import { IExtractionRepository } from "../../domain/repositories/IExtractionRepository";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";
import { ExtractDataFromRepo } from "../../application/ExtractIRepoData";
import { PostgresRepoExporter } from "../../infrastructure/exporters/PostgresRepoExporter";
import { PostgresIssueExporter } from "../../infrastructure/exporters/PostgresIssueExporter";
import { PostgresPullRequestExporter } from "../../infrastructure/exporters/PostgresPullRequestExporter";
import { PostgresCommentExporter } from "../../infrastructure/exporters/PostgresCommentExporter";
import { PostgresLabelExporter } from "../../infrastructure/exporters/PostgresLabelExporter";
import { PostgresCommitExporter } from "../../infrastructure/exporters/PostgresCommitExporter";
import { GitHubGraphqlRepository } from "../../infrastructure/api/github-graphql/GithubGraphqlRepository";

export class ExtractionService {
  constructor(private readonly extractionRepository: IExtractionRepository) {}

  async listExtractions(): Promise<Extraction[]> {
    return await this.extractionRepository.findAll();
  }

  async getExtraction(id: string): Promise<Extraction | null> {
    return await this.extractionRepository.findById(id);
  }

  async createExtraction(owner: string, repoName: string): Promise<Extraction> {
    const repoIdentifier = new RepositoryIdentifier(owner, repoName);
    return await this.extractionRepository.create(repoIdentifier);
  }

  async pauseExtraction(id: string): Promise<void> {
    const extraction = await this.extractionRepository.findById(id);

    if (!extraction) {
      throw new Error("Extração não encontrada");
    }

    if (extraction.status !== "running") {
      throw new Error("Apenas extrações em execução podem ser pausadas");
    }

    await this.extractionRepository.updateStatus(id, "paused");
  }

  async startExtraction(id: string, token: string): Promise<void> {
    const extraction = await this.extractionRepository.findById(id);

    if (!extraction) {
      throw new Error("Extração não encontrada");
    }

    if (extraction.status === "running") {
      throw new Error("Extração já está em execução");
    }

    // Instanciar as dependências necessárias
    const repoExporter = new PostgresRepoExporter();
    const issueExporter = new PostgresIssueExporter();
    const pullRequestExporter = new PostgresPullRequestExporter();
    const commentExporter = new PostgresCommentExporter();
    const labelExporter = new PostgresLabelExporter();
    const commitExporter = new PostgresCommitExporter();
    const gitHubGraphqlRepository = new GitHubGraphqlRepository();

    // Criar a instância do caso de uso
    const extractDataFromRepo = new ExtractDataFromRepo(
      gitHubGraphqlRepository,
      this.extractionRepository,
      repoExporter,
      issueExporter,
      pullRequestExporter,
      commentExporter,
      labelExporter,
      commitExporter
    );

    // Executar a extração de forma assíncrona
    // Não esperamos o resultado para não bloquear a resposta da API
    this.executeExtractionAsync(extractDataFromRepo, extraction, token);
  }

  private async executeExtractionAsync(
    extractDataFromRepo: ExtractDataFromRepo,
    extraction: Extraction,
    token: string
  ): Promise<void> {
    try {
      await extractDataFromRepo.execute(extraction, token);
    } catch (error) {
      console.error(`Erro na extração ${extraction.id}:`, error);
      await this.extractionRepository.logError(
        extraction.id,
        error instanceof Error ? error : new Error("Erro desconhecido")
      );
    }
  }
}
