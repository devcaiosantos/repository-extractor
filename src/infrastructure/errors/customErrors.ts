/**
 * Erro customizado para quando uma extração é pausada pelo usuário
 */
export class ExtractionPausedError extends Error {
  constructor(message: string = "Extração pausada pelo usuário") {
    super(message);
    this.name = "ExtractionPausedError";
  }
}

/**
 * Erro customizado para problemas na API do GitHub
 */
export class GitHubApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/**
 * Erro customizado para problemas no banco de dados
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = "DatabaseError";
  }
}
