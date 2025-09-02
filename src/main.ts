import { GitHubIssueRepository } from "./infrastructure/api/GitHubIssueRepository";
import {
  ApiRateLimitError,
  InvalidTokenError,
  RepositoryNotFoundError,
} from "./infrastructure/errors/apiErrors";
import { ExportIssuesToCsvUseCase } from "./application/ExportIssuesToCsvUseCase";
import { CsvIssueExporter } from "./infrastructure/exporters/CsvIssueExporter";
import * as dotenv from "dotenv";
dotenv.config();

function getEnvVariable(name: string): string | undefined {
  return process.env[name];
}

const githubToken = getEnvVariable("GITHUB_TOKEN");
const githubBaseUrl = getEnvVariable("GITHUB_BASE_URL");
const ownerRepo = getEnvVariable("OWNER_REPO");
const nameRepo = getEnvVariable("NAME_REPO");

async function main() {
  if (!githubToken || !githubBaseUrl || !ownerRepo || !nameRepo) {
    console.error(
      "❌ Variáveis de ambiente necessárias não estão definidas. Por favor, verifique o arquivo .env."
    );
    process.exit(1);
  }

  const input = {
    owner: process.env.OWNER_REPO || "",
    repoName: process.env.NAME_REPO || "",
    token: process.env.GITHUB_TOKEN || "",
  };

  const gitHubRepository = new GitHubIssueRepository();
  const csvExporter = new CsvIssueExporter();

  const exportIssuesUseCase = new ExportIssuesToCsvUseCase(
    gitHubRepository,
    csvExporter
  );

  try {
    const resultPath = await exportIssuesUseCase.execute(input);

    console.log(`\n✅ Processo concluído com sucesso!`);
    console.log(`Arquivo salvo em: ${resultPath}`);
  } catch (error) {
    console.error(`\n❌ Falha no processo.`);
    if (
      error instanceof RepositoryNotFoundError ||
      error instanceof InvalidTokenError ||
      error instanceof ApiRateLimitError
    ) {
      console.error(`Erro conhecido: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Erro na aplicação: ${error.message}`);
    } else {
      console.error("Um erro completamente inesperado aconteceu:", error);
    }
    process.exit(1);
  }
}

main();
