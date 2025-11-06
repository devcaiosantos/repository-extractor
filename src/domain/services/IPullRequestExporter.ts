import { PullRequest } from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

/**
 * Interface (Contrato) para um serviço que exporta pull requests.
 */
export interface IPullRequestExporter {
  /**
   * Exporta uma lista de pull requests.
   * @param pullRequests O array de pull requests a ser exportado.
   * @param identifier O identificador do repositório.
   * @returns Uma promessa que resolve quando a exportação está completa.
   */
  export(
    pullRequests: PullRequest[],
    identifier: RepositoryIdentifier,
    mode: "append" | "replace"
  ): Promise<void>;
}
