import { Request, Response } from "express";
import { ExtractionService } from "./extraction.service";
import { PostgresExtractionExporter } from "../../infrastructure/exporters/PostgresExtractionExporter";
import { GitHubGraphqlRepository } from "../../infrastructure/api/github-graphql/GithubGraphqlRepository";

export class ExtractionController {
  private extractionService: ExtractionService;

  constructor() {
    const extractionRepository = new PostgresExtractionExporter();
    const repoRepository = new GitHubGraphqlRepository();
    this.extractionService = new ExtractionService(
      extractionRepository,
      repoRepository
    );
  }

  async listExtractions(req: Request, res: Response): Promise<void> {
    try {
      const extractions = await this.extractionService.listExtractions();
      res.json({
        success: true,
        data: extractions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  async getExtraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const extraction = await this.extractionService.getExtraction(id);

      if (!extraction) {
        res.status(404).json({
          success: false,
          error: "Extração não encontrada",
        });
        return;
      }

      res.json({
        success: true,
        data: extraction,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  async createExtraction(req: Request, res: Response): Promise<void> {
    try {
      const { owner, repoName, token } = req.body;

      if (!owner || !repoName) {
        res.status(400).json({
          success: false,
          error: "owner e repoName são obrigatórios",
        });
        return;
      }

      const extraction = await this.extractionService.createExtraction(
        owner,
        repoName,
        token
      );

      res.status(201).json({
        success: true,
        data: extraction,
        message:
          "Extração criada com sucesso. Use POST /extractions/:id/start para iniciar.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  async pauseExtraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.extractionService.pauseExtraction(id);

      res.json({
        success: true,
        message: "Extração pausada com sucesso",
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("não encontrada")
          ? 404
          : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  async startExtraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const token = req.body.token || process.env.GITHUB_TOKEN;

      if (!token) {
        res.status(400).json({
          success: false,
          error: "Token do GitHub é obrigatório (no body ou no .env)",
        });
        return;
      }

      await this.extractionService.startExtraction(id, token);

      res.json({
        success: true,
        message: "Extração iniciada com sucesso",
        data: { id },
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("não encontrada")
          ? 404
          : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  async deleteExtraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.extractionService.deleteExtraction(id);

      res.json({
        success: true,
        message: "Extração deletada com sucesso",
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("não encontrada")
          ? 404
          : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
}
