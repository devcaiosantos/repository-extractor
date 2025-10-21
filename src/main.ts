import { GitHubIssueRepository } from "./infrastructure/api/github-restapi/GitHubIssueRepository";
import {
  ApiRateLimitError,
  InvalidTokenError,
  RepositoryNotFoundError,
} from "./infrastructure/errors/apiErrors";
import { ExportIssuesToCsvUseCase } from "./application/ExportIssuesToCsvUseCase";
import { CsvIssueExporter } from "./infrastructure/exporters/CsvIssueExporter";
import * as dotenv from "dotenv";
import { GitHubGraphqlIssueRepository } from "./infrastructure/api/github-graphql/GithubGrapqlIssueRepository";
import { PostgresIssueExporter } from "./infrastructure/exporters/PostgresIssueExporter";
dotenv.config();

function getEnvVariable(name: string): string | undefined {
  return process.env[name];
}

function parseArgs(args: string[]): { [key: string]: string } {
  const parsedArgs: { [key: string]: string } = {};
  args.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      if (key && value) {
        parsedArgs[key] = value;
      }
    }
  });
  return parsedArgs;
}

async function main() {
  const cliArgs = parseArgs(process.argv);

  const input = {
    owner: cliArgs.owner || getEnvVariable("OWNER_REPO") || "",
    repoName: cliArgs.repo || getEnvVariable("NAME_REPO") || "",
    token: cliArgs.token || getEnvVariable("GITHUB_TOKEN") || "",
    startPage:
      Number(cliArgs.start_page) || Number(getEnvVariable("START_PAGE")) || 1,
  };

  if (!input.owner || !input.repoName || !input.token || !input.startPage) {
    console.error(
      "❌ Informações necessárias não fornecidas. Use as flags (--owner, --repo, --token, --start_page) ou defina as variáveis de ambiente no arquivo .env."
    );
    process.exit(1);
  }

  const csvExporter = new CsvIssueExporter();
  const postgresExporter = new PostgresIssueExporter();

  const gitHubGraphqlRepository = new GitHubGraphqlIssueRepository();
  const exportIssuesUseCase = new ExportIssuesToCsvUseCase(
    gitHubGraphqlRepository,
    csvExporter
  );

  const exportIssues2UseCase = new ExportIssuesToCsvUseCase(
    gitHubGraphqlRepository,
    postgresExporter
  );

  try {
    await exportIssuesUseCase.execute(input);
    await exportIssues2UseCase.execute(input);
    console.log(`\n✅ Processo concluído com sucesso!`);
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
