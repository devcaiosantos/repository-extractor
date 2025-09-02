/**
 * Value Object para representar o identificador único de um repositório.
 * Usar um Value Object em vez de strings simples garante que sempre tenhamos
 * um identificador válido e consistente em todo o domínio.
 */
export class RepositoryIdentifier {
  public readonly owner: string;
  public readonly repoName: string;

  constructor(owner: string, repoName: string) {
    if (!owner || owner.trim() === "") {
      throw new Error("O nome do proprietário (owner) não pode ser vazio.");
    }
    if (!repoName || repoName.trim() === "") {
      throw new Error("O nome do repositório (repoName) não pode ser vazio.");
    }

    this.owner = owner;
    this.repoName = repoName;
  }

  /**
   * Método utilitário para obter a representação em string.
   */
  public toString(): string {
    return `${this.owner}/${this.repoName}`;
  }
}
