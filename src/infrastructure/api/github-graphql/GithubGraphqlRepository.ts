import {
  ApolloClient,
  createHttpLink,
  gql,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { Issue, RepositoryInfo } from "../../../domain/entities/main";
import { RepositoryIdentifier } from "../../../domain/value-objects/RepositoryIdentifier";
import { GetRepositoryInfo, GetRepositoryIssues } from "./querys";
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

export class GitHubGraphqlRepository implements IRepoRepository {
  async findAllIssues(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (issues: Issue[]) => Promise<void>
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

        const issuesFromPage = issuesNode.nodes.map((node: GraphQLIssueNode) =>
          this.mapIssueGraphQLToDomain(identifier, node)
        );
        await processPage(issuesFromPage);

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

  findAllPullRequests(
    identifier: RepositoryIdentifier,
    token: string
    //processPage:
  ): Promise<void> {
    throw new Error("Method not implemented.");
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
      closedBy: null,
      stateReason: gqlIssue.stateReason,
      pullRequest: undefined,
      repositoryName: identifier.repoName,
      repositoryOwner: identifier.owner,
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

    // Para outros tipos de erro
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro inesperado ao buscar issues: ${errorMessage}`);
  }
}
