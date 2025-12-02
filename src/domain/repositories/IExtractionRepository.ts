import { Extraction, ExtractionStatus } from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

export interface IExtractionRepository {
  create(repoIdentifier: RepositoryIdentifier): Promise<Extraction>;
  findById(id: string): Promise<Extraction | null>;
  findOrCreate(repoIdentifier: RepositoryIdentifier): Promise<Extraction>;
  findAll(): Promise<Extraction[]>;
  updateStatus(id: string, status: ExtractionStatus): Promise<void>;
  updateProgress(id: string, updates: Partial<Extraction>): Promise<void>;
  logError(id: string, error: Error): Promise<void>;
}
