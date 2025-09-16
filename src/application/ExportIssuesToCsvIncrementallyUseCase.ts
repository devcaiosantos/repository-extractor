import { IIssueRepository } from "../domain/repositories/IIssueRepository";
import { RepositoryIdentifier } from "../domain/value-objects/RepositoryIdentifier";
import { IIssueExporter } from "../domain/services/IIssueExporter";
import * as cliProgress from "cli-progress";

export interface ExportIssuesInput {
  owner: string;
  repoName: string;
  token: string;
}

/**
 * Caso de Uso para extrair issues de um repositório E exportá-las para um arquivo.
 * Sua responsabilidade é orquestrar as dependências (repositório e exportador)
 * para cumprir a tarefa.
 */
export class ExportIssuesToCsvIncrementallyUseCase {
  constructor(
    private readonly issueRepository: IIssueRepository,
    private readonly issueExporter: IIssueExporter
  ) {}

  public async execute(input: ExportIssuesInput): Promise<void> {
    if (!input.token || input.token.trim() === "") {
      throw new Error("O token não pode ser vazio.");
    }
    const repositoryIdentifier = new RepositoryIdentifier(
      input.owner,
      input.repoName
    );

    const repositoryInfo = await this.issueRepository.findRepositoryInfo(
      repositoryIdentifier,
      input.token
    );

    console.log("\nIniciando a exportação das issues...\n");
    let currentPage = 1;
    let totalExported = 0;
    const progressBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );
    progressBar.start(repositoryInfo.totalIssuesCount, 0);
    while (true) {
      const issues = await this.issueRepository.findPage(
        repositoryIdentifier,
        input.token,
        currentPage,
        5
      );

      if (issues.length === 0) {
        break;
      }

      totalExported += issues.length;
      progressBar.update(totalExported);

      currentPage++;
      await this.issueExporter.export(issues, repositoryIdentifier, "append");
      setTimeout(() => {}, 1000); // Aguardar 1 segundo entre as páginas para evitar rate limiting
    }
  }
}
