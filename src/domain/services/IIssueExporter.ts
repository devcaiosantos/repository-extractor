import { Issue } from "../entities/Issue";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

/**
 * Interface (Contrato) para um serviço que exporta issues.
 * Seguindo o Princípio da Inversão de Dependência, a camada de aplicação
 * dependerá desta abstração, não de uma implementação concreta de
 * escrita em CSV.
 */
export type ExportMode = "append" | "replace";

export interface IIssueExporter {
  /**
   * Exporta uma lista de issues.
   * @param issues O array de issues a ser exportado.
   * @param identifier O identificador do repositório, usado para nomear o arquivo.
   * @param mode O modo de exportação: 'append' para adicionar ao arquivo existente, 'replace' para substituir.
   * @returns Uma promessa que resolve para o caminho do arquivo salvo.
   */
  export(
    issues: Issue[],
    identifier: RepositoryIdentifier,
    mode: ExportMode
  ): Promise<void>;
}
