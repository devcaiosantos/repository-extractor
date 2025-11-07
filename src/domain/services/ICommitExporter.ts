import { Commit } from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

/**
 * Interface para um serviço que exporta commits e seus arquivos.
 */
export interface ICommitExporter {
  /**
   * Exporta uma lista de commits.
   * @param commits O array de commits a ser exportado.
   * @param identifier O identificador do repositório.
   */
  export(commits: Commit[], identifier: RepositoryIdentifier): Promise<void>;
}
