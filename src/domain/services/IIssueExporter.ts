import { Issue } from "../entities/Issue";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

/**
 * Interface (Contrato) para um serviço que exporta issues.
 * Seguindo o Princípio da Inversão de Dependência, a camada de aplicação
 * dependerá desta abstração, não de uma implementação concreta de
 * escrita em CSV.
 */
export interface IIssueExporter {
  /**
   * Exporta uma lista de issues.
   * @param issues O array de issues a ser exportado.
   * @param identifier O identificador do repositório, usado para nomear o arquivo.
   * @returns Uma promessa que resolve para o caminho do arquivo salvo.
   */
  export(issues: Issue[], identifier: RepositoryIdentifier): Promise<string>;
}
