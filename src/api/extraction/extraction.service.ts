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
import { IRepoExporter } from "../../domain/services/RepoExporter";
import { IRepoRepository } from "../../domain/repositories/IRepoRepository";
import { ExtractionPausedError } from "../../infrastructure/errors/customErrors";

export class ExtractionService {
  constructor(
    private readonly extractionRepository: IExtractionRepository,
    private readonly repoRepository: IRepoRepository
  ) {}

  async listExtractions(): Promise<Extraction[]> {
    return await this.extractionRepository.findAll();
  }

  async getExtraction(id: string): Promise<Extraction | null> {
    return await this.extractionRepository.findById(id);
  }

  async createExtraction(
    owner: string,
    repoName: string,
    token: string
  ): Promise<Extraction> {
    const repoIdentifier = new RepositoryIdentifier(owner, repoName);

    const repoInfo = await this.repoRepository.findRepositoryInfo(
      repoIdentifier,
      token
    );

    const repoExporter: IRepoExporter = new PostgresRepoExporter();
    await repoExporter.export(repoInfo, repoIdentifier);

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

    if (extraction.status === "completed") {
      throw new Error(
        "Extração já foi concluída. Crie uma nova extração se necessário."
      );
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

    const repoIdentifier = new RepositoryIdentifier(
      extraction.repository_owner,
      extraction.repository_name
    );

    // Executar a extração de forma assíncrona
    // Não esperamos o resultado para não bloquear a resposta da API
    this.executeExtractionAsync(
      extractDataFromRepo,
      extraction,
      repoIdentifier,
      token
    );
  }

  private async executeExtractionAsync(
    extractDataFromRepo: ExtractDataFromRepo,
    extraction: Extraction,
    repoIdentifier: RepositoryIdentifier,
    token: string
  ): Promise<void> {
    try {
      await extractDataFromRepo.execute(repoIdentifier, token, extraction);
      console.log(`✅ Extração ${extraction.id} concluída com sucesso`);
    } catch (error) {
      // Verificar se é um erro de pausa (não é um erro real)
      if (
        error instanceof ExtractionPausedError ||
        (error instanceof Error && error.name === "ExtractionPausedError")
      ) {
        console.log(`⏸️ Extração ${extraction.id} foi pausada pelo usuário`);
        // Não fazer nada, o status já foi atualizado para "paused"
        return;
      }

      // Para outros erros, logar e atualizar status
      console.error(`❌ Erro na extração ${extraction.id}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`Mensagem do erro: ${errorMessage}`);

      // Atualizar status para falha no banco de dados
      try {
        await this.extractionRepository.updateStatus(extraction.id, "failed");
        console.log(
          `📝 Status da extração ${extraction.id} atualizado para 'failed'`
        );
      } catch (updateError) {
        console.error(
          `❌ Erro ao atualizar status da extração ${extraction.id}:`,
          updateError
        );
      }
    }
  }
}
