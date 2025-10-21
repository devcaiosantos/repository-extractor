import { Pool } from "pg";
import { Issue } from "../../domain/entities/Issue";
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
    issues: Issue[],
    identifier: RepositoryIdentifier,
    mode: ExportMode
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (mode === "replace" && issues.length === 0) {
        // Modo especial para limpar o repositório antes de começar a inserção incremental
        await client.query("DELETE FROM issues WHERE repository_name = $1", [
          identifier.toString(),
        ]);
      }

      if (issues.length > 0) {
        // A implementação real da inserção em lote seria mais complexa,
        // envolvendo a inserção de labels, assignees e as tabelas de junção.
        // Este é um exemplo simplificado para a tabela 'issues'.
        for (const issue of issues) {
          const query = `
            INSERT INTO issues (id, number, title, body, author, state, url, created_at, updated_at, closed_at, comments_count, repository_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              state = EXCLUDED.state,
              updated_at = EXCLUDED.updated_at,
              closed_at = EXCLUDED.closed_at;
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
            identifier.toString(),
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
