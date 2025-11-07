import {
  ApolloClient,
  createHttpLink,
  gql,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import {
  Issue,
  PullRequest,
  RepositoryInfo,
  Comment,
  Commit,
  CommitFile,
} from "../../../domain/entities/main";
import { RepositoryIdentifier } from "../../../domain/value-objects/RepositoryIdentifier";
import {
  GetRepositoryInfo,
  GetRepositoryIssues,
  GetRepositoryPullRequests,
} from "./querys";
import { IGetRepositoryInfoResponse } from "./types/repository";
import { IRepoRepository } from "../../../domain/repositories/IRepoRepository";
import * as cliProgress from "cli-progress";
import {
  GraphQLAssignee,
  GraphQLIssueNode,
  GraphQLIssuesResponse,
  GraphQLLabel,
  GraphQLPageInfo,
  GraphQLRepositoryResponse,
} from "./types/issue";
import {
  ApiRateLimitError,
  InvalidTokenError,
  RepositoryNotFoundError,
} from "../../errors/apiErrors";
import {
  GraphQLPullRequestNode,
  GraphQLPullRequestRepoResponse,
} from "./types/pullRequest";
import { GraphQLCommentNode } from "./types/comment";
import { GraphQLCommitFileNode, GraphQLCommitNode } from "./types/commit";

export class GitHubGraphqlRepository implements IRepoRepository {
  async findAllIssues(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (issues: Issue[]) => Promise<void>,
    processCommentsPage: (comments: Comment[]) => Promise<void>
  ): Promise<void> {
    const client = this.createApolloClient(token);

    console.log(
      `Buscando informações do repositório ${identifier.toString()}...`
    );
    const totalIssues = await this.getTotalIssuesCount(client, identifier);

    console.log(`Total de issues encontradas: ${totalIssues}`);
    console.log("Iniciando extração com GraphQL...\n");

    const progressBar = new cliProgress.SingleBar(
      {
        format:
          "Progresso GraphQL |{bar}| {percentage}% || {value}/{total} Issues || Página: {page}",
      },
      cliProgress.Presets.shades_classic
    );

    progressBar.start(totalIssues, 0, { page: 1 });

    let processedIssuesCount = 0;
    let hasNextPage = true;
    let endCursor: string | null = null;
    let currentPage = 1;

    const GET_ISSUES_QUERY = GetRepositoryIssues;

    while (hasNextPage) {
      try {
        const result = await client.query<GraphQLRepositoryResponse>({
          query: GET_ISSUES_QUERY,
          variables: {
            owner: identifier.owner,
            repo: identifier.repoName,
            cursor: endCursor,
          },
          fetchPolicy: "no-cache",
        });

        if (!result.data || !result.data.repository) {
          hasNextPage = false;
          continue;
        }

        const issuesNode: GraphQLIssuesResponse = result.data.repository.issues;
        const pageInfo: GraphQLPageInfo = issuesNode.pageInfo;

        const issuesFromPage: Issue[] = [];
        const commentsFromPage: Comment[] = [];

        for (const node of issuesNode.nodes) {
          issuesFromPage.push(this.mapIssueGraphQLToDomain(identifier, node));
          if (node.comments.nodes.length > 0) {
            const comments = node.comments.nodes.map((commentNode) =>
              this.mapCommentGraphQLToDomain(identifier, commentNode, {
                issueId: node.id,
              })
            );
            commentsFromPage.push(...comments);
          }
        }

        await processPage(issuesFromPage);
        if (commentsFromPage.length > 0) {
          await processCommentsPage(commentsFromPage);
        }

        processedIssuesCount += issuesFromPage.length;
        progressBar.update(processedIssuesCount, { page: currentPage });

        hasNextPage = pageInfo.hasNextPage;
        endCursor = pageInfo.endCursor;
        currentPage++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: unknown) {
        progressBar.stop();
        this.handleError(error, identifier);
      }
    }

    progressBar.stop();
    console.log("\n✅ Extração GraphQL concluída com sucesso!");
    console.log(`Total de issues coletadas: ${processedIssuesCount}`);
  }

  async findAllPullRequests(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (pullRequests: PullRequest[]) => Promise<void>,
    processCommentsPage: (comments: Comment[]) => Promise<void>,
    processCommitsPage: (commits: Commit[]) => Promise<void>
  ): Promise<void> {
    const client = this.createApolloClient(token);

    console.log(
      `\nBuscando total de Pull Requests para ${identifier.toString()}...`
    );
    const totalPullRequests = await this.getTotalPullRequestsCount(
      client,
      identifier
    );

    console.log(`Total de Pull Requests encontrados: ${totalPullRequests}`);
    console.log("Iniciando extração com GraphQL...\n");

    const progressBar = new cliProgress.SingleBar(
      {
        format:
          "Progresso GraphQL |{bar}| {percentage}% || {value}/{total} PRs || Página: {page}",
      },
      cliProgress.Presets.shades_classic
    );

    progressBar.start(totalPullRequests, 0, { page: 1 });

    let processedCount = 0;
    let hasNextPage = true;
    let endCursor: string | null = null;
    let currentPage = 1;

    while (hasNextPage) {
      try {
        const result = await client.query<GraphQLPullRequestRepoResponse>({
          query: GetRepositoryPullRequests,
          variables: {
            owner: identifier.owner,
            repo: identifier.repoName,
            cursor: endCursor,
          },
          fetchPolicy: "no-cache",
        });

        if (!result.data || !result.data.repository) {
          hasNextPage = false;
          continue;
        }

        const prsNode = result.data.repository.pullRequests;
        const pageInfo: GraphQLPageInfo = prsNode.pageInfo;
        const commitsFromPage: Commit[] = [];
        const prsFromPage: PullRequest[] = [];
        const commentsFromPage: Comment[] = [];

        for (const node of prsNode.nodes) {
          prsFromPage.push(
            this.mapPullRequestGraphQLToDomain(identifier, node)
          );
          if (node.comments.nodes.length > 0) {
            const comments = node.comments.nodes.map((commentNode) =>
              this.mapCommentGraphQLToDomain(identifier, commentNode, {
                pullRequestId: node.id,
              })
            );
            commentsFromPage.push(...comments);
          }

          if (node.commits.nodes.length > 0) {
            const commits = node.commits.nodes.map((commitNode) =>
              this.mapCommitGraphQLToDomain(identifier, commitNode, node.id)
            );
            commitsFromPage.push(...commits);
          }
        }

        await processPage(prsFromPage);
        if (commentsFromPage.length > 0) {
          await processCommentsPage(commentsFromPage);
        }
        if (commitsFromPage.length > 0) {
          await processCommitsPage(commitsFromPage);
        }

        processedCount += prsFromPage.length;
        progressBar.update(processedCount, { page: currentPage });

        hasNextPage = pageInfo.hasNextPage;
        endCursor = pageInfo.endCursor;
        currentPage++;

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: unknown) {
        progressBar.stop();
        this.handleError(error, identifier);
      }
    }

    progressBar.stop();
    console.log("\n✅ Extração de Pull Requests concluída com sucesso!");
    console.log(`Total de PRs coletados: ${processedCount}`);
  }
  async findRepositoryInfo(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<RepositoryInfo> {
    const apolloClient = this.createApolloClient(token);

    const { data } = await apolloClient.query<IGetRepositoryInfoResponse>({
      query: GetRepositoryInfo,
      variables: {
        owner: identifier.owner,
        repo: identifier.repoName,
      },
      fetchPolicy: "no-cache",
    });

    if (!data || !data.repository) {
      throw new Error(
        `Repositório ${identifier.toString()} não encontrado ou inacessível.`
      );
    }

    const repo = data.repository;

    return {
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description,
      url: repo.url,
      license: repo.licenseInfo?.name ?? null,
      language: repo.primaryLanguage?.name ?? null,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      openIssuesCount: repo.openIssues.totalCount,
      totalIssuesCount: repo.totalIssues.totalCount,
      createdAt: new Date(repo.createdAt),
      updatedAt: new Date(repo.updatedAt),
    };
  }

  private async getTotalIssuesCount(
    client: ApolloClient,
    identifier: RepositoryIdentifier
  ): Promise<number> {
    const REPO_INFO_QUERY = gql`
      query GetRepositoryInfo($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          issues(states: [OPEN, CLOSED]) {
            totalCount
          }
        }
      }
    `;

    try {
      const result = await client.query<{
        repository: {
          issues: {
            totalCount: number;
          };
        };
      }>({
        query: REPO_INFO_QUERY,
        variables: {
          owner: identifier.owner,
          repo: identifier.repoName,
        },
        fetchPolicy: "no-cache",
      });

      return result.data?.repository?.issues?.totalCount || 0;
    } catch (error) {
      console.warn(
        "Não foi possível obter o total de issues. Continuando sem barra de progresso precisa..."
      );
      return 1000;
    }
  }

  private createApolloClient(token: string): ApolloClient {
    const httpLink = new HttpLink({
      uri: `${process.env.GITHUB_BASE_URL}/graphql`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const client = new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
    });
    return client;
  }

  private mapIssueGraphQLToDomain(
    identifier: RepositoryIdentifier,
    gqlIssue: GraphQLIssueNode
  ): Issue {
    const convertedState = gqlIssue.state === "OPEN" ? "open" : "closed";
    const closedByActor =
      gqlIssue.timelineItems.nodes[0] &&
      "actor" in gqlIssue.timelineItems.nodes[0]
        ? gqlIssue.timelineItems.nodes[0].actor
        : null;

    return {
      id: gqlIssue.id,
      number: gqlIssue.number,
      title: gqlIssue.title,
      body: gqlIssue.body || "",
      author: gqlIssue.author ? gqlIssue.author.login : "ghost",
      state: convertedState as "open" | "closed",
      url: gqlIssue.url,
      createdAt: new Date(gqlIssue.createdAt),
      updatedAt: new Date(gqlIssue.updatedAt),
      closedAt: gqlIssue.closedAt ? new Date(gqlIssue.closedAt) : null,
      commentsCount: gqlIssue.comments.totalCount,
      labels: gqlIssue.labels.nodes.map((label: GraphQLLabel) => ({
        name: label.name,
        color: label.color,
      })),
      assignees: gqlIssue.assignees.nodes.map((assignee: GraphQLAssignee) => ({
        login: assignee.login,
        avatarUrl: assignee.avatarUrl,
      })),
      closedBy: closedByActor?.login ?? null,
      stateReason: gqlIssue.stateReason,
      pullRequest: undefined,
      repositoryName: identifier.repoName,
      repositoryOwner: identifier.owner,
    };
  }

  private async getTotalPullRequestsCount(
    client: ApolloClient,
    identifier: RepositoryIdentifier
  ): Promise<number> {
    const query = gql`
      query GetTotalPRs($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          pullRequests(states: [OPEN, CLOSED, MERGED]) {
            totalCount
          }
        }
      }
    `;
    try {
      const result = await client.query<{
        repository: {
          pullRequests: {
            totalCount: number;
          };
        };
      }>({
        query,
        variables: { owner: identifier.owner, repo: identifier.repoName },
      });
      return result.data?.repository?.pullRequests?.totalCount || 0;
    } catch (error) {
      console.warn(
        "Não foi possível obter o total de PRs. Continuando sem barra de progresso precisa."
      );
      return 1000;
    }
  }

  private mapPullRequestGraphQLToDomain(
    identifier: RepositoryIdentifier,
    gqlPR: GraphQLPullRequestNode
  ): PullRequest {
    return {
      id: gqlPR.id,
      number: gqlPR.number,
      title: gqlPR.title,
      body: gqlPR.body,
      author: gqlPR.author?.login ?? "ghost",
      state: gqlPR.state,
      url: gqlPR.url,
      isDraft: gqlPR.isDraft,
      createdAt: new Date(gqlPR.createdAt),
      updatedAt: new Date(gqlPR.updatedAt),
      closedAt: gqlPR.closedAt ? new Date(gqlPR.closedAt) : null,
      mergedAt: gqlPR.mergedAt ? new Date(gqlPR.mergedAt) : null,
      labels: gqlPR.labels.nodes,
      assignees: gqlPR.assignees.nodes,
      repositoryName: identifier.repoName,
      repositoryOwner: identifier.owner,
      commitsCount: gqlPR.commits.totalCount,
      additions: gqlPR.additions,
      deletions: gqlPR.deletions,
      changedFiles: gqlPR.changedFiles,
      baseRefName: gqlPR.baseRefName,
      headRefName: gqlPR.headRefName,
      associatedIssueId: gqlPR.closingIssuesReferences?.nodes[0]?.id ?? null,
    };
  }

  private mapCommentGraphQLToDomain(
    identifier: RepositoryIdentifier,
    gqlComment: GraphQLCommentNode,
    parent: { issueId?: string; pullRequestId?: string }
  ): Comment {
    return {
      id: gqlComment.id,
      body: gqlComment.body,
      author: gqlComment.author?.login ?? "ghost",
      url: gqlComment.url,
      createdAt: new Date(gqlComment.createdAt),
      updatedAt: new Date(gqlComment.updatedAt),
      repositoryOwner: identifier.owner,
      repositoryName: identifier.repoName,
      issueId: parent.issueId,
      pullRequestId: parent.pullRequestId,
    };
  }

  private mapCommitGraphQLToDomain(
    identifier: RepositoryIdentifier,
    gqlCommit: GraphQLCommitNode,
    pullRequestId: string
  ): Commit {
    const commitData = gqlCommit.commit;
    return {
      sha: commitData.oid,
      message: commitData.message,
      authorName: commitData.author?.name ?? null,
      authoredDate: commitData.author?.date
        ? new Date(commitData.author.date)
        : null,
      committerName: commitData.committer?.name ?? null,
      committedDate: commitData.committer?.date
        ? new Date(commitData.committer.date)
        : null,
      url: commitData.url,
      additions: commitData.additions,
      deletions: commitData.deletions,
      totalChangedFiles: commitData.changedFiles,
      pullRequestId: pullRequestId,
      repositoryOwner: identifier.owner,
      repositoryName: identifier.repoName,
    };
  }

  private mapCommitFileGraphQLToDomain(
    gqlFile: GraphQLCommitFileNode
  ): CommitFile {
    return {
      filePath: gqlFile.path,
      status: gqlFile.changeType.toLowerCase() as CommitFile["status"],
      additions: gqlFile.additions,
      deletions: gqlFile.deletions,
      patch: gqlFile.patch,
    };
  }

  private handleError(error: unknown, identifier: RepositoryIdentifier): never {
    if (error && typeof error === "object" && "networkError" in error) {
      const apolloError = error as any;

      if (apolloError.networkError) {
        const networkError = apolloError.networkError as any;

        if (networkError.statusCode === 401) {
          throw new InvalidTokenError();
        }
        if (networkError.statusCode === 404) {
          throw new RepositoryNotFoundError(identifier.toString());
        }
        if (networkError.statusCode === 403) {
          throw new ApiRateLimitError(null);
        }
      }

      if (
        apolloError.graphQLErrors &&
        Array.isArray(apolloError.graphQLErrors)
      ) {
        const messages = apolloError.graphQLErrors
          .map((e: any) => e.message)
          .join(", ");
        throw new Error(`Erro GraphQL: ${messages}`);
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro inesperado ao buscar issues: ${errorMessage}`);
  }
}
