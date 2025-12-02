import { Pool } from "pg";
import { Comment } from "../../domain/entities/main";
import { ICommentExporter } from "../../domain/services/ICommentExporter";
import { ExportMode } from "../../domain/services/IIssueExporter";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";

export class PostgresCommentExporter implements ICommentExporter {
  private pool: Pool | null = null;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
      });
    }
    return this.pool;
  }

  public async export(
    comments: Comment[],
    identifier: RepositoryIdentifier,
    mode: ExportMode
  ): Promise<void> {
    if (comments.length === 0) {
      return;
    }

    const client = await this.getPool().connect();

    try {
      await client.query("BEGIN");

      for (const comment of comments) {
        const query = `
          INSERT INTO comments (id, body, author, url, created_at, updated_at, issue_id, pull_request_id, repository_owner, repository_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            body = EXCLUDED.body,
            updated_at = EXCLUDED.updated_at;
        `;
        await client.query(query, [
          comment.id,
          comment.body,
          comment.author,
          comment.url,
          comment.createdAt,
          comment.updatedAt,
          comment.issueId,
          comment.pullRequestId,
          comment.repositoryOwner,
          comment.repositoryName,
        ]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar comentários no banco de dados:", error);
      throw new Error(
        "Falha na transação de comentários com o banco de dados."
      );
    } finally {
      client.release();
    }
  }
}
