import { Pool } from "pg";
import { Commit } from "../../domain/entities/main";
import { ICommitExporter } from "../../domain/services/ICommitExporter";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";

export class PostgresCommitExporter implements ICommitExporter {
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
    commits: Commit[],
    identifier: RepositoryIdentifier
  ): Promise<void> {
    if (commits.length === 0) {
      return;
    }

    const client = await this.getPool().connect();

    try {
      await client.query("BEGIN");

      for (const commit of commits) {
        const commitQuery = `
          INSERT INTO commits (
            sha, message, author_name, authored_date, committer_name, committed_date,
            url, additions, deletions, total_changed_files, pull_request_id,
            repository_owner, repository_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (sha) DO UPDATE SET
            message = EXCLUDED.message,
            additions = EXCLUDED.additions,
            deletions = EXCLUDED.deletions,
            total_changed_files = EXCLUDED.total_changed_files;
        `;
        await client.query(commitQuery, [
          commit.sha,
          commit.message,
          commit.authorName,
          commit.authoredDate,
          commit.committerName,
          commit.committedDate,
          commit.url,
          commit.additions,
          commit.deletions,
          commit.totalChangedFiles,
          commit.pullRequestId,
          commit.repositoryOwner,
          commit.repositoryName,
        ]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar commits no banco de dados:", error);
      throw new Error("Falha na transação de commits com o banco de dados.");
    } finally {
      client.release();
    }
  }
}
