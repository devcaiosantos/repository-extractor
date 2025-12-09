import { Pool } from "pg";
import { Extraction, ExtractionStatus } from "../../domain/entities/main";
import { IExtractionRepository } from "../../domain/repositories/IExtractionRepository";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";
import { ExtractionPausedError } from "../errors/customErrors";

export class PostgresExtractionExporter implements IExtractionRepository {
  private pool: Pool | null = null;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
    }
    return this.pool;
  }

  async findById(id: string): Promise<Extraction | null> {
    const result = await this.getPool().query(
      "SELECT * FROM extractions WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  async findOrCreate(
    repoIdentifier: RepositoryIdentifier
  ): Promise<Extraction> {
    const findResult = await this.getPool().query(
      "SELECT * FROM extractions WHERE repository_owner = $1 AND repository_name = $2 ORDER BY created_at DESC LIMIT 1",
      [repoIdentifier.owner, repoIdentifier.repoName]
    );

    const lastExtraction = findResult.rows[0];
    // Re-run if last one was completed or failed. Otherwise, create a new one.
    if (
      lastExtraction &&
      (lastExtraction.status === "pending" ||
        lastExtraction.status === "paused" ||
        lastExtraction.status === "running")
    ) {
      return lastExtraction;
    }

    return this.create(repoIdentifier);
  }

  async findAll(): Promise<Extraction[]> {
    const result = await this.getPool().query(
      "SELECT * FROM extractions ORDER BY created_at DESC"
    );
    return result.rows;
  }

  async create(repoIdentifier: RepositoryIdentifier): Promise<Extraction> {
    const query = `
      INSERT INTO extractions (repository_owner, repository_name, status)
      VALUES ($1, $2, 'pending')
      RETURNING *;
    `;
    const result = await this.getPool().query(query, [
      repoIdentifier.owner,
      repoIdentifier.repoName,
    ]);
    return result.rows[0];
  }

  async updateStatus(id: string, status: ExtractionStatus): Promise<void> {
    const setClauses: string[] = ["status = $1"];
    const values: any[] = [status];
    let paramIndex = 2;

    // Se o status for 'running' e started_at ainda não foi definido
    if (status === "running") {
      setClauses.push(`started_at = COALESCE(started_at, NOW())`);
    }

    // Se o status for 'completed' ou 'failed', define finished_at
    if (status === "completed" || status === "failed") {
      setClauses.push(`finished_at = NOW()`);
    }

    const query = `
      UPDATE extractions 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
    `;

    values.push(id);

    await this.getPool().query(query, values);
  }
  async updateProgress(
    id: string,
    updates: Partial<Extraction>
  ): Promise<void> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");

    const query = `UPDATE extractions SET ${setClause} WHERE id = $${
      fields.length + 1
    }`;
    await this.getPool().query(query, [...values, id]);
  }

  async logError(id: string, error: Error): Promise<void> {
    // Se for ExtractionPausedError, não fazer nada pois o status já foi atualizado para 'paused'
    if (
      error instanceof ExtractionPausedError ||
      error.name === "ExtractionPausedError"
    ) {
      return;
    }

    const query =
      "UPDATE extractions SET status = 'failed', error_message = $1, finished_at = NOW() WHERE id = $2";
    await this.getPool().query(query, [error.message, id]);
  }
}
