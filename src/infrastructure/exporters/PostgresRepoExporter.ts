import { Pool } from "pg";
import { RepositoryInfo } from "../../domain/entities/main";
import { IRepoExporter } from "../../domain/services/RepoExporter";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";

/**
 * Implementação do IRepoExporter que salva as informações do repositório
 * em um banco de dados PostgreSQL.
 */
export class PostgresRepoExporter implements IRepoExporter {
  private pool: Pool;

  constructor() {
    // A configuração do pool deve vir de variáveis de ambiente para segurança
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
    });
  }

  public async export(
    repoInfo: RepositoryInfo,
    identifier: RepositoryIdentifier
  ): Promise<void> {
    if (!repoInfo) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
          INSERT INTO repositories (owner, name, description, url, license, language, stars, forks, open_issues_count, total_issues_count, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (owner, name) DO UPDATE SET
            description = EXCLUDED.description,
            url = EXCLUDED.url,
            license = EXCLUDED.license,
            language = EXCLUDED.language,
            stars = EXCLUDED.stars,
            forks = EXCLUDED.forks,
            open_issues_count = EXCLUDED.open_issues_count,
            total_issues_count = EXCLUDED.total_issues_count,
            updated_at = EXCLUDED.updated_at;
        `;

      await client.query(query, [
        repoInfo.owner,
        repoInfo.name,
        repoInfo.description,
        repoInfo.url,
        repoInfo.license,
        repoInfo.language,
        repoInfo.stars,
        repoInfo.forks,
        repoInfo.openIssuesCount,
        repoInfo.totalIssuesCount,
        repoInfo.createdAt,
        repoInfo.updatedAt,
      ]);

      await client.query("COMMIT");

      console.log(
        `Informações do repositório '${identifier.toString()}' salvas com sucesso no banco de dados.`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        `Erro ao salvar informações do repositório '${identifier.toString()}' no banco de dados:`,
        error
      );
      throw new Error("Falha na transação com o banco de dados.");
    } finally {
      client.release();
    }
  }
}
