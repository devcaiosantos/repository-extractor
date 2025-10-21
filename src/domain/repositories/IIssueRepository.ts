import { Issue, RepositoryInfo } from "../entities/Issue";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

/**
 * Interface (Contrato) para um repositório de Issues.
 * Este é um exemplo do Princípio da Inversão de Dependência (D do SOLID).
 * Nossas camadas de domínio e aplicação dependerão desta abstração,
 * não de uma implementação concreta (como uma classe que fala com a API do GitHub).
 * Isso nos permite trocar a fonte de dados (GitHub, GitLab, banco de dados)
 * sem alterar a lógica de negócios.
 */
export interface IIssueRepository {
  /**
   * Busca todas as issues de um determinado repositório.
   * @param identifier O identificador do repositório.
   * @param token O token de autenticação para acessar a API.
   * @returns Uma promessa que resolve para um array de Issues.
   */
  findAll(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (issues: Issue[]) => Promise<void>
  ): Promise<void>;
  findPage(
    identifier: RepositoryIdentifier,
    token: string,
    page: number,
    perPage: number
  ): Promise<Issue[]>;
  findRepositoryInfo(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<RepositoryInfo>;
}
