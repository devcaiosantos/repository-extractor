import { IIssueRepository } from "../domain/repositories/IIssueRepository";
import { RepositoryIdentifier } from "../domain/value-objects/RepositoryIdentifier";
import { IIssueExporter } from "../domain/services/IIssueExporter";
import { Issue } from "../domain/entities/main";

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
export class ExportIssuesToCsvUseCase {
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

    console.log(
      `Buscando issues para o repositório: ${repositoryIdentifier.toString()}...`
    );

    const outputPath = await this.issueExporter.export(
      [], // Array vazio para apenas criar o arquivo com cabeçalho
      repositoryIdentifier,
      "replace" // Garante que o arquivo seja novo
    );

    // Define a função de callback que será executada para cada página de issues
    const processPage = async (issues: Issue[]): Promise<void> => {
      if (issues.length > 0) {
        await this.issueExporter.export(
          issues,
          repositoryIdentifier,
          "append" // Adiciona os dados ao arquivo existente
        );
      }
    };

    await this.issueRepository.findAll(
      repositoryIdentifier,
      input.token,
      processPage
    );

    console.log(outputPath);
  }
}
