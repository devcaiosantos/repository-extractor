// /src/infrastructure/api/GitHubIssueRepository.ts

import axios, { AxiosError } from "axios";
import { IIssueRepository } from "../../../domain/repositories/IIssueRepository";
import {
  Issue,
  DomainLabel,
  DomainAssignee,
  RepositoryInfo,
} from "../../../domain/entities/main";
import { RepositoryIdentifier } from "../../../domain/value-objects/RepositoryIdentifier";
import {
  ApiRateLimitError,
  InvalidTokenError,
  RepositoryNotFoundError,
} from "../../errors/apiErrors";
import { GitHubApiIssue, GraphQLSearchResponse } from "../types/GitHubApi";

export class GitHubIssueRepository implements IIssueRepository {
  private readonly baseUrl = process.env.GITHUB_BASE_URL;

  public async findRepositoryInfo(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<RepositoryInfo> {
    try {
      const repoResponse = await axios.get(
        `${this.baseUrl}/repos/${identifier.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      const searchResponse = await axios.get(
        `${
          this.baseUrl
        }/search/issues?q=repo:${identifier.toString()}+type:issue`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      const repoData = repoResponse.data;
      const searchData = searchResponse.data;

      return {
        owner: repoData.owner.login,
        name: repoData.name,
        description: repoData.description,
        url: repoData.html_url,
        license: repoData.license ? repoData.license.name : null,
        language: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssuesCount: repoData.open_issues_count,
        totalIssuesCount: searchData.total_count,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.handleAxiosError(error, identifier);
      }
      throw new Error(
        `Ocorreu um erro inesperado ao buscar as informações do repositório: ${error}`
      );
    }
  }

  public async findAll(
    identifier: RepositoryIdentifier,
    token: string
  ): Promise<Issue[]> {
    let allIssues: Issue[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const response = await axios.get<GitHubApiIssue[]>(
          `${this.baseUrl}/repos/${identifier.toString()}/issues`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
            params: {
              state: "all",
              per_page: 100,
              page: page,
            },
          }
        );

        if (response.data.length === 0) {
          hasMorePages = false;
        } else {
          const issuesFromPage = response.data.map(this.mapToDomain);
          allIssues = [...allIssues, ...issuesFromPage];
          page++;
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          this.handleAxiosError(error, identifier);
        }
        throw new Error(
          `Ocorreu um erro inesperado ao buscar as issues: ${error}`
        );
      }
    }
    return allIssues;
  }

  public async findPage(
    identifier: RepositoryIdentifier,
    token: string,
    page: number,
    perPage: number
  ): Promise<Issue[]> {
    try {
      const response = await axios.get<GitHubApiIssue[]>(
        `${this.baseUrl}/repos/${identifier.toString()}/issues`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
          params: {
            state: "all",
            per_page: perPage, // Número máximo permitido pela API do GitHub (100)
            page: page,
          },
        }
      );

      return response.data.map(this.mapToDomain);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(error.response?.headers);
        this.handleAxiosError(error, identifier);
      }
      throw new Error(
        `Ocorreu um erro inesperado ao buscar as issues: ${error}`
      );
    }
  }

  /**
   * Função de mapeamento ATUALIZADA.
   * Transforma a resposta complexa da API na nossa entidade de domínio limpa e focada.
   *
   * @param apiIssue Objeto da issue vindo da API do GitHub, agora fortemente tipado.
   * @returns Uma entidade `Issue` do nosso domínio.
   */
  private mapToDomain(apiIssue: GitHubApiIssue): Issue {
    return {
      id: apiIssue.id,
      number: apiIssue.number,
      title: apiIssue.title,
      body: apiIssue.body,
      author: apiIssue.user.login,
      state: apiIssue.state,
      url: apiIssue.html_url,
      createdAt: new Date(apiIssue.created_at),
      updatedAt: new Date(apiIssue.updated_at),
      closedAt: apiIssue.closed_at ? new Date(apiIssue.closed_at) : null,
      commentsCount: apiIssue.comments,
      labels: apiIssue.labels.map(
        (label): DomainLabel => ({
          name: label.name,
          color: label.color,
        })
      ),
      assignees: apiIssue.assignees.map(
        (assignee): DomainAssignee => ({
          login: assignee.login,
          avatarUrl: assignee.avatar_url,
        })
      ),
      closedBy: apiIssue.closed_by ? apiIssue.closed_by.login : null,
      stateReason: apiIssue.state_reason ?? null,
      pullRequest: apiIssue.pull_request ? apiIssue.pull_request : undefined,
    };
  }

  private handleAxiosError(
    error: AxiosError,
    identifier: RepositoryIdentifier
  ): void {
    if (!error.response) {
      throw new Error(
        `Erro de rede ou sem resposta do servidor: ${error.message}`
      );
    }

    switch (error.response.status) {
      case 401:
        throw new InvalidTokenError();
      case 403:
        const resetTimestamp = error.response.headers["x-ratelimit-reset"];
        const resetTime = resetTimestamp
          ? new Date(Number(resetTimestamp) * 1000)
          : null;
        throw new ApiRateLimitError(resetTime);
      case 404:
        throw new RepositoryNotFoundError(identifier.toString());
      default:
        throw new Error(
          `Erro da API do GitHub: ${error.response.status} ${error.response.statusText}`
        );
    }
  }
}
