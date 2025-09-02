import { IIssueRepository } from "../domain/repositories/IIssueRepository";
import { RepositoryIdentifier } from "../domain/value-objects/RepositoryIdentifier";
import { IIssueExporter } from "../domain/services/IIssueExporter";

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

  public async execute(input: ExportIssuesInput): Promise<string> {
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
    const issues = await this.issueRepository.findAll(
      repositoryIdentifier,
      input.token
    );
    console.log(
      `Extração concluída. Total de issues encontradas: ${issues.length}`
    );

    console.log("Iniciando exportação para arquivo CSV...");
    const outputPath = await this.issueExporter.export(
      issues,
      repositoryIdentifier
    );

    return outputPath;
  }
}
