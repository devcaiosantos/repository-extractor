import { Pool } from "pg";
import { Issue } from "../../domain/entities/main";
import {
  IIssueExporter,
  ExportMode,
} from "../../domain/services/IIssueExporter";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";

/**
 * Implementação do IIssueExporter que salva as issues em um banco de dados PostgreSQL.
 */
export class PostgresIssueExporter implements IIssueExporter {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
    });
  }

  public async export(
    issues: Issue[],
    identifier: RepositoryIdentifier,
    mode: ExportMode
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (mode === "replace" && issues.length === 0) {
        await client.query("DELETE FROM issues WHERE repository_name = $1", [
          identifier.toString(),
        ]);
      }

      if (issues.length > 0) {
        for (const issue of issues) {
          const query = `
            INSERT INTO issues (id, number, title, body, author, state, url, created_at, updated_at, closed_at, comments_count, repository_owner, repository_name, closed_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              state = EXCLUDED.state,
              updated_at = EXCLUDED.updated_at,
              closed_at = EXCLUDED.closed_at,
              closed_by = EXCLUDED.closed_by;
          `;
          await client.query(query, [
            issue.id,
            issue.number,
            issue.title,
            issue.body,
            issue.author,
            issue.state,
            issue.url,
            issue.createdAt,
            issue.updatedAt,
            issue.closedAt,
            issue.commentsCount,
            issue.repositoryOwner,
            issue.repositoryName,
            issue.closedBy,
          ]);
        }
      }

      await client.query("COMMIT");

      console.log(
        `Operação no banco de dados para '${identifier.toString()}' concluída com sucesso.`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar no banco de dados:", error);
      throw new Error("Falha na transação com o banco de dados.");
    } finally {
      client.release();
    }
  }
}
