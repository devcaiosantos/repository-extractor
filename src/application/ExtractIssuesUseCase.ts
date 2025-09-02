import { IIssueRepository } from "../domain/repositories/IIssueRepository";
import { Issue } from "../domain/entities/Issue";
import { RepositoryIdentifier } from "../domain/value-objects/RepositoryIdentifier";

// DTO (Data Transfer Object) para a entrada do caso de uso.
// Define um contrato claro para os dados de entrada.
export interface ExtractIssuesInput {
  owner: string;
  repoName: string;
  token: string;
}

/**
 * Caso de Uso (Use Case) para extrair issues de um repositório.
 * Sua única responsabilidade (Princípio da Responsabilidade Única - S do SOLID)
 * é orquestrar os passos para executar esta ação:
 * 1. Validar a entrada.
 * 2. Criar os objetos de domínio.
 * 3. Chamar o repositório para buscar os dados.
 * 4. Retornar os dados.
 */
export class ExtractIssuesUseCase {
  constructor(private readonly issueRepository: IIssueRepository) {}

  public async execute(input: ExtractIssuesInput): Promise<Issue[]> {
    // Validação de entrada simples.
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

    return issues;
  }
}
