import { gql } from "@apollo/client";

/**
 * Query para buscar as informações principais de um repositório.
 */
export const GetRepositoryInfo = gql`
  query GetRepositoryInfo($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      # --- Mapeamento para a tabela "repositories" ---
      databaseId
      name
      nameWithOwner
      owner {
        login
      }
      url
      description
      createdAt
      updatedAt
      pushedAt
      stargazerCount
      watchers {
        totalCount
      }
      primaryLanguage {
        name
      }
      forkCount
      openIssues: issues(states: OPEN) {
        totalCount
      }
      totalIssues: issues(states: [OPEN, CLOSED]) {
        totalCount
      }
      licenseInfo {
        name
      }
      repositoryTopics(first: 20) {
        nodes {
          topic {
            name
          }
        }
      }
      defaultBranchRef {
        name
      }
    }
  }
`;

/**
 * Query para buscar uma página de issues de um repositório.
 */
export const GetRepositoryIssues = gql`
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
          comments(first: 100) {
            totalCount
            nodes {
              id
              body
              author {
                login
              }
              url
              createdAt
              updatedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
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
          timelineItems(itemTypes: [CLOSED_EVENT], last: 1) {
            nodes {
              ... on ClosedEvent {
                actor {
                  login
                }
              }
            }
          }
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

export const GetRepositoryPullRequests = gql`
  query GetRepositoryPullRequests(
    $owner: String!
    $repo: String!
    $cursor: String
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: 50
        after: $cursor
        orderBy: { field: CREATED_AT, direction: ASC }
        states: [OPEN, CLOSED, MERGED]
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
        nodes {
          id
          number
          title
          body
          state
          url
          isDraft
          createdAt
          updatedAt
          closedAt
          mergedAt
          comments(first: 100) {
            totalCount
            nodes {
              id
              body
              author {
                login
              }
              url
              createdAt
              updatedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          author {
            ... on User {
              login
            }
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
          commits {
            totalCount
          }
          additions
          deletions
          changedFiles
          baseRefName
          headRefName
          closingIssuesReferences(first: 1) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`;
