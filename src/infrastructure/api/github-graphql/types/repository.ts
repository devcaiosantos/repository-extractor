export interface IGetRepositoryInfoResponse {
  repository: {
    owner: {
      login: string;
    };
    name: string;
    description: string | null;
    url: string;
    licenseInfo: {
      name: string;
    } | null;
    primaryLanguage: {
      name: string;
    } | null;
    stargazerCount: number;
    forkCount: number;
    openIssues: {
      totalCount: number;
    };
    totalIssues: {
      totalCount: number;
    };
    totalPullRequests: {
      totalCount: number;
    };
    createdAt: string;
    updatedAt: string;
  };
}
