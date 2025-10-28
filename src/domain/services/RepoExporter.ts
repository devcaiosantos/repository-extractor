import { RepositoryInfo } from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";

export interface IRepoExporter {
  export(
    repoInfo: RepositoryInfo,
    identifier: RepositoryIdentifier
  ): Promise<void>;
}
