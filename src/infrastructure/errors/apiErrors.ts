/**
 * Erros personalizados para um tratamento mais granular na aplicação.
 * Isso permite que a camada que consome o serviço saiba exatamente o que deu errado,
 * em vez de tratar um `Error` genérico.
 */

// Erro para quando o repositório não é encontrado (HTTP 404).
export class RepositoryNotFoundError extends Error {
  constructor(repoIdentifier: string) {
    super(
      `O repositório "${repoIdentifier}" não foi encontrado ou você não tem permissão para acessá-lo.`
    );
    this.name = "RepositoryNotFoundError";
  }
}

// Erro para quando o token é inválido ou expirou (HTTP 401).
export class InvalidTokenError extends Error {
  constructor() {
    super("O token de autenticação fornecido é inválido ou expirou.");
    this.name = "InvalidTokenError";
  }
}

// Erro para quando o limite de requisições da API é atingido (HTTP 403).
export class ApiRateLimitError extends Error {
  constructor(resetTime: Date | null) {
    const timeString = resetTime
      ? `Tente novamente após ${resetTime.toLocaleTimeString()}`
      : "Tente novamente mais tarde.";
    super(`Limite de requisições da API do GitHub atingido. ${timeString}`);
    this.name = "ApiRateLimitError";
  }
}
