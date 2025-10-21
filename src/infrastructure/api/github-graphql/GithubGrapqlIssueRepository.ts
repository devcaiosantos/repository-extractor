import { Issue, RepositoryInfo } from "../../../domain/entities/Issue";
import { IIssueRepository } from "../../../domain/repositories/IIssueRepository";
import { RepositoryIdentifier } from "../../../domain/value-objects/RepositoryIdentifier";
import {
  ApiRateLimitError,
  InvalidTokenError,
  RepositoryNotFoundError,
} from "../../errors/apiErrors";
import {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
} from "@apollo/client/core";
import * as cliProgress from "cli-progress";

interface GraphQLAuthor {
  login: string;
}

interface GraphQLLabel {
  name: string;
  color: string;
}

interface GraphQLAssignee {
  login: string;
  avatarUrl: string;
}

interface GraphQLIssueNode {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: "OPEN" | "CLOSED";
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  comments: {
    totalCount: number;
  };
  author: GraphQLAuthor | null;
  labels: {
    nodes: GraphQLLabel[];
  };
  assignees: {
    nodes: GraphQLAssignee[];
  };
  stateReason: "completed" | "not_planned" | "reopened" | null;
}

interface GraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GraphQLIssuesResponse {
  pageInfo: GraphQLPageInfo;
  nodes: GraphQLIssueNode[];
}

interface GraphQLRepositoryResponse {
  repository: {
    issues: GraphQLIssuesResponse;
  };
  rateLimit: {
    cost: number;
    remaining: number;
    resetAt: string;
  };
}

export class GitHubGraphqlIssueRepository implements IIssueRepository {
  private readonly apiUrl = "https://api.github.com/graphql";

  async findAll(
    identifier: RepositoryIdentifier,
    token: string,
    processPage: (issues: Issue[]) => Promise<void>
  ): Promise<void> {
    const httpLink = createHttpLink({
      uri: this.apiUrl,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const client = new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
    });

    // Primeiro, buscar informações do repositório para obter o total de issues
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

    const GET_ISSUES_QUERY = gql`
      query GetIssues($owner: String!, $repo: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          issues(
            first: 100
            after: $cursor
            states: [OPEN, CLOSED]
            orderBy: { field: CREATED_AT, direction: ASC }
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              number
              title
              body
              state
              url
              createdAt
              updatedAt
              closedAt
              comments {
                totalCount
              }
              author {
                login
              }
              labels(first: 20) {
                nodes {
                  name
                  color
                }
              }
              assignees(first: 10) {
                nodes {
                  login
                  avatarUrl
                }
              }
              stateReason
            }
          }
        }
        rateLimit {
          cost
          remaining
          resetAt
        }
      }
    `;

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
          this.mapGraphQLToDomain(node)
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

  findPage(
    identifier: RepositoryIdentifier,
    token: string,
    page: number,
    perPage: number
  ): Promise<Issue[]> {
    throw new Error("Method not implemented.");
  }

  findRepositoryInfo(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<RepositoryInfo> {
    throw new Error("Method not implemented.");
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

  private mapGraphQLToDomain(gqlIssue: GraphQLIssueNode): Issue {
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
