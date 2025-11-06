import { Comment } from "../entities/main";
import { RepositoryIdentifier } from "../value-objects/RepositoryIdentifier";
import { ExportMode } from "./IIssueExporter";

export interface ICommentExporter {
  export(
    comments: Comment[],
    identifier: RepositoryIdentifier,
    mode: ExportMode
  ): Promise<void>;
}
