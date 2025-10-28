import * as path from "path";
import * as fs from "fs/promises";
import {
  IIssueExporter,
  ExportMode,
} from "../../domain/services/IIssueExporter";
import { Issue } from "../../domain/entities/main";
import { RepositoryIdentifier } from "../../domain/value-objects/RepositoryIdentifier";

/**
 * Implementação NATIVA do IIssueExporter para gerar arquivos CSV.
 * Esta versão não depende de bibliotecas externas para a criação do CSV,
 * usando apenas os módulos nativos do Node.js.
 */
export class CsvIssueExporter implements IIssueExporter {
  private readonly outputDir = path.resolve(process.cwd(), "data");

  public async export(
    issues: Issue[],
    identifier: RepositoryIdentifier,
    mode: ExportMode = "replace"
  ): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const safeFileName = `${identifier.toString().replace("/", "-")}.csv`;
    const filePath = path.join(this.outputDir, safeFileName);

    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    // 1. Definir os cabeçalhos das colunas
    const headers = [
      "ID",
      "NUMBER",
      "TITLE",
      "STATE",
      "AUTHOR",
      "ASSIGNEES",
      "LABELS",
      "CREATED_AT",
      "UPDATED_AT",
      "CLOSED_AT",
      "COMMENTS",
      "URL",
    ];

    // 2. Converter cada issue em uma linha CSV (array de strings)
    const rows = issues.map((issue) => [
      issue.id,
      issue.number,
      this.sanitizeField(issue.title),
      issue.state,
      issue.author,
      issue.assignees.map((a) => a.login).join("; "),
      issue.labels.map((l) => l.name).join("; "),
      issue.createdAt.toISOString(),
      issue.updatedAt.toISOString(),
      issue.closedAt ? issue.closedAt.toISOString() : "",
      issue.commentsCount,
      issue.url,
    ]);

    const dataRows = rows.map((row) =>
      row.map((field) => this.sanitizeField(field)).join(",")
    );

    if (mode === "append" && fileExists) {
      const newCsvContent = dataRows.join("\n");
      await fs.appendFile(filePath, "\n" + newCsvContent, "utf-8");
    } else {
      // 3. Montar o conteúdo final do CSV
      const headerRow = headers.map((h) => this.sanitizeField(h)).join(",");
      const csvContent = [headerRow, ...dataRows].join("\n");

      // 4. Escrever o conteúdo no arquivo de forma assíncrona
      await fs.writeFile(filePath, csvContent, "utf-8");
    }

    console.log(filePath);
  }

  /**
   * Sanitiza um campo para o formato CSV, lidando com caracteres especiais.
   * Regra do CSV: se um campo contém vírgula, aspas duplas ou quebra de linha,
   * ele deve ser envolto por aspas duplas. Aspas duplas existentes dentro
   * do campo devem ser duplicadas ("").
   * @param field O dado a ser sanitizado.
   * @returns Uma string segura para ser inserida em uma célula de CSV.
   */
  private sanitizeField(field: any): string {
    if (field === null || field === undefined) {
      return "";
    }

    const str = String(field);

    // Verifica se a sanitização é necessária
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      // Duplica quaisquer aspas duplas existentes e envolve o campo todo em aspas duplas
      const sanitized = str.replace(/"/g, '""');
      return `"${sanitized}"`;
    }

    return str;
  }
}
