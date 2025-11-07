export interface GraphQLCommitFileNode {
  path: string;
  changeType: "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED";
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface GraphQLCommitNode {
  commit: {
    oid: string;
    message: string;
    author: {
      name: string;
      date: string;
    } | null;
    committer: {
      name: string;
      date: string;
    } | null;
    url: string;
    additions: number;
    deletions: number;
    changedFiles: number;
  };
}
