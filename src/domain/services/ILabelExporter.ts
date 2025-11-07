import { Issue, PullRequest } from "../entities/main";

/**
 * Interface para um serviço que exporta as labels de issues e pull requests.
 */
export interface ILabelExporter {
  /**
   * Extrai e salva as labels de uma lista de issues.
   * @param issues A lista de issues das quais extrair as labels.
   */
  exportFromIssues(issues: Issue[]): Promise<void>;

  /**
   * Extrai e salva as labels de uma lista de pull requests.
   * @param pullRequests A lista de pull requests dos quais extrair as labels.
   */
  exportFromPullRequests(pullRequests: PullRequest[]): Promise<void>;
}
