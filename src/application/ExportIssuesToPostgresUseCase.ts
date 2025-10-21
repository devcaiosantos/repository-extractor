import { IIssueRepository } from "../domain/repositories/IIssueRepository";
import { RepositoryIdentifier } from "../domain/value-objects/RepositoryIdentifier";
import { IIssueExporter } from "../domain/services/IIssueExporter";
import { Issue } from "../domain/entities/Issue";

export interface ExportIssuesToDbInput {
  owner: string;
  repoName: string;
  token: string;
}

/**
 * Caso de Uso para extrair issues e salvá-las em um banco de dados,
 * reutilizando a interface IIssueExporter.
 */
export class ExportIssuesToPostgresUseCase {
  constructor(
    private readonly issueRepository: IIssueRepository,
    private readonly dbExporter: IIssueExporter // Injetando a abstração
  ) {}

  public async execute(input: ExportIssuesToDbInput): Promise<void> {
    const repositoryIdentifier = new RepositoryIdentifier(
      input.owner,
      input.repoName
    );

    // 1. Prepara o banco de dados usando o modo 'replace' com um array vazio.
    await this.dbExporter.export([], repositoryIdentifier, "replace");

    // 2. Define o "consumidor" que usará o modo 'append' para cada lote.
    const issueConsumer = async (issues: Issue[]): Promise<void> => {
      if (issues.length > 0) {
        await this.dbExporter.export(issues, repositoryIdentifier, "append");
      }
    };

    console.log(
      "Iniciando extração e salvamento incremental no banco de dados..."
    );

    // 3. Executa a busca, passando a lógica de persistência.
    await this.issueRepository.findAll(
      repositoryIdentifier,
      input.token,
      issueConsumer
    );

    console.log("\n✅ Processo de salvamento no banco de dados concluído!");
  }
}
