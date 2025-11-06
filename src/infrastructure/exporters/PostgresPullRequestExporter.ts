import { Pool } from "pg";
import { PullRequest } from "../../domain/entities/main";
import { IPullRequestExporter } from "../../domain/services/IPullRequestExporter";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";
import { ExportMode } from "../../domain/services/IIssueExporter";

/**
 * Implementação do IPullRequestExporter que salva os pull requests
 * em um banco de dados PostgreSQL.
 */
export class PostgresPullRequestExporter implements IPullRequestExporter {
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
    pullRequests: PullRequest[],
    identifier: RepositoryIdentifier,
    mode: ExportMode
  ): Promise<void> {
    if (pullRequests.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (mode === "replace") {
        const deleteQuery = `DELETE FROM pull_requests WHERE repository_owner = $1 AND repository_name = $2`;
        await client.query(deleteQuery, [
          identifier.owner,
          identifier.repoName,
        ]);
      }

      if (pullRequests.length === 0) {
        await client.query("COMMIT");
        return;
      }

      for (const pr of pullRequests) {
        const query = `
          INSERT INTO pull_requests (
            id, number, title, body, author, state, url, is_draft, 
            created_at, updated_at, closed_at, merged_at, 
            repository_owner, repository_name, commits_count, additions, 
            deletions, changed_files, base_ref_name, head_ref_name, associated_issue_id
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
            $14, $15, $16, $17, $18, $19, $20, $21
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            state = EXCLUDED.state,
            is_draft = EXCLUDED.is_draft,
            updated_at = EXCLUDED.updated_at,
            closed_at = EXCLUDED.closed_at,
            merged_at = EXCLUDED.merged_at,
            commits_count = EXCLUDED.commits_count,
            additions = EXCLUDED.additions,
            deletions = EXCLUDED.deletions,
            changed_files = EXCLUDED.changed_files,
            associated_issue_id = EXCLUDED.associated_issue_id;
        `;

        await client.query(query, [
          pr.id,
          pr.number,
          pr.title,
          pr.body,
          pr.author,
          pr.state,
          pr.url,
          pr.isDraft,
          pr.createdAt,
          pr.updatedAt,
          pr.closedAt,
          pr.mergedAt,
          pr.repositoryOwner,
          pr.repositoryName,
          pr.commitsCount,
          pr.additions,
          pr.deletions,
          pr.changedFiles,
          pr.baseRefName,
          pr.headRefName,
          pr.associatedIssueId,
        ]);
      }

      await client.query("COMMIT");

      console.log(
        `Lote de Pull Requests para '${identifier.toString()}' salvo com sucesso no banco de dados.`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        `Erro ao salvar pull requests para '${identifier.toString()}' no banco de dados:`,
        error
      );
      throw new Error("Falha na transação com o banco de dados.");
    } finally {
      client.release();
    }
  }
}
