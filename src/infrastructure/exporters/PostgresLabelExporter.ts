import { Pool } from "pg";
import { DomainLabel, Issue, PullRequest } from "../../domain/entities/main";
import { ILabelExporter } from "../../domain/services/ILabelExporter";

export class PostgresLabelExporter implements ILabelExporter {
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

  async exportFromIssues(issues: Issue[]): Promise<void> {
    const allLabels = this.collectLabels(issues);
    if (allLabels.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await this.saveLabels(client, allLabels);

      for (const issue of issues) {
        if (issue.labels.length > 0) {
          await this.linkLabels(client, issue.id, issue.labels, "issue");
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar labels de issues:", error);
      throw new Error("Falha na transação de labels de issues.");
    } finally {
      client.release();
    }
  }

  async exportFromPullRequests(pullRequests: PullRequest[]): Promise<void> {
    const allLabels = this.collectLabels(pullRequests);
    if (allLabels.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await this.saveLabels(client, allLabels);

      for (const pr of pullRequests) {
        if (pr.labels.length > 0) {
          await this.linkLabels(client, pr.id, pr.labels, "pull_request");
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar labels de pull requests:", error);
      throw new Error("Falha na transação de labels de pull requests.");
    } finally {
      client.release();
    }
  }

  private collectLabels(items: (Issue | PullRequest)[]): DomainLabel[] {
    const labelMap = new Map<string, DomainLabel>();
    for (const item of items) {
      for (const label of item.labels) {
        if (!labelMap.has(label.name)) {
          labelMap.set(label.name, label);
        }
      }
    }
    return Array.from(labelMap.values());
  }

  private async saveLabels(client: any, labels: DomainLabel[]): Promise<void> {
    const query = `
      INSERT INTO labels (name, color)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;
    `;
    for (const label of labels) {
      await client.query(query, [label.name, label.color]);
    }
  }

  private async linkLabels(
    client: any,
    parentId: string | number,
    labels: DomainLabel[],
    type: "issue" | "pull_request"
  ): Promise<void> {
    const tableName = type === "issue" ? "issue_labels" : "pull_request_labels";
    const columnName = type === "issue" ? "issue_id" : "pull_request_id";

    await client.query(`DELETE FROM ${tableName} WHERE ${columnName} = $1`, [
      parentId,
    ]);

    const query = `
      INSERT INTO ${tableName} (${columnName}, label_name)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `;
    for (const label of labels) {
      await client.query(query, [parentId, label.name]);
    }
  }
}
