import { gql } from "@apollo/client";

const query = gql`
  # Variáveis que você passaria para a query
  # $owner: "nome-do-dono"
  # $repo: "nome-do-repo"
  # $issuesCursor, $prsCursor, $branchesCursor, etc: cursores para paginação

  query GetFullRepositoryData(
    $owner: String!
    $repo: String!
    $issuesCursor: String
    $prsCursor: String
    $branchesCursor: String
  ) {
    # Ponto de entrada: o repositório
    repository(owner: $owner, name: $repo) {
      # --- Mapeamento para a tabela "repositories" ---
      databaseId # Corresponde ao "id" BIGINT
      name
      nameWithOwner # Corresponde ao "fullName"
      owner {
        login # Corresponde ao "ownerLogin"
      }
      url # Corresponde ao "htmlUrl"
      description
      createdAt
      updatedAt
      pushedAt
      stargazerCount # Corresponde ao "stargazersCount"
      watchers {
        totalCount # Corresponde ao "watchersCount"
      }
      primaryLanguage {
        name # Corresponde ao "language"
      }
      forkCount # Corresponde ao "forksCount"
      openIssues: issues(states: OPEN) {
        totalCount # Corresponde ao "openIssuesCount"
      }
      licenseInfo {
        name # Corresponde ao "licenseName"
      }
      repositoryTopics(first: 20) {
        nodes {
          topic {
            name # Corresponde ao "topics" (precisa ser processado para JSONB)
          }
        }
      }
      defaultBranchRef {
        name # Corresponde ao "defaultBranch"
      }

      # --- Mapeamento para a tabela "issues" e relacionadas ---
      issues(
        first: 50
        after: $issuesCursor
        orderBy: { field: CREATED_AT, direction: ASC }
        states: [OPEN, CLOSED]
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
        nodes {
          # -> Tabela "issues"
          databaseId # "id"
          number
          title
          body
          state
          author {
            # -> Tabela "users" (parcial)
            ... on User {
              databaseId # "authorId"
              login
            }
          }
          createdAt
          closedAt
          locked
          isDraft # "draft"
          # -> Tabela "issueLabels"
          labels(first: 20) {
            nodes {
              name
            }
          }

          # -> Tabela "issueAssignees"
          assignees(first: 10) {
            nodes {
              databaseId # "userId"
            }
          }

          # -> Tabela "issueComments"
          comments(first: 100) {
            # Paginação necessária aqui também
            nodes {
              databaseId # "id"
              author {
                ... on User {
                  databaseId # "authorId"
                }
              }
              body
              createdAt
              updatedAt
            }
          }

          # -> Tabela "issueEvents"
          timelineItems(
            first: 100
            itemTypes: [
              CLOSED_EVENT
              REOPENED_EVENT
              LABELED_EVENT
              UNLABELED_EVENT
            ]
          ) {
            # Paginação necessária aqui também
            nodes {
              __typename # "event"
              ... on ClosedEvent {
                actor {
                  ... on User {
                    databaseId # "actorId"
                  }
                }
                createdAt
              }
              # Adicionar outros tipos de evento conforme necessário
            }
          }
        }
      }

      # --- Mapeamento para a tabela "pullRequests" ---
      pullRequests(
        first: 50
        after: $prsCursor
        orderBy: { field: CREATED_AT, direction: ASC }
        states: [OPEN, CLOSED, MERGED]
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
        nodes {
          # -> Tabela "pullRequests"
          databaseId # "id"
          number
          title
          body
          state
          mergedAt
          createdAt
          updatedAt
          author {
            ... on User {
              databaseId # "authorId"
            }
          }
          isDraft # "draft"
          merged
          mergeable
          mergeStateStatus # "mergeableState"
          reviews {
            totalCount # "reviewCommentsCount"
          }
          commits {
            totalCount # "commitsCount"
          }
        }
      }

      # --- Mapeamento para as tabelas "branches" e "commits" ---
      # Acessamos branches e commits através de "refs" (referências Git)
      refs(
        refPrefix: "refs/heads/"
        first: 100
        after: $branchesCursor
        orderBy: { field: ALPHABETICAL, direction: ASC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          # -> Tabela "branches"
          name
          target {
            ... on Commit {
              oid # "commitOid"
              # -> Tabela "commits"
              history(first: 100) {
                # Paginação MUITO importante aqui para cada branch
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  oid # "oid"
                  author {
                    user {
                      databaseId # "authorId"
                    }
                  }
                  committer {
                    user {
                      databaseId # "committerId"
                    }
                  }
                  message
                  committedDate
                  url
                  parents(first: 5) {
                    nodes {
                      oid # "parentOids" (precisa ser processado para JSONB)
                    }
                  }
                  # "stats" não está diretamente disponível, requer outra chamada ou API REST
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default query;
