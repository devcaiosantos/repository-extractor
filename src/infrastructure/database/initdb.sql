-- =================================================================
-- Script de Inicialização do Banco de Dados
-- Cria as tabelas 'repositories' e 'issues', com seus tipos e índices.
-- O script é idempotente e pode ser executado com segurança.
-- =================================================================

-- Definição dos tipos ENUM para a tabela 'issues'
-- Isso garante que os valores nas colunas 'state' e 'state_reason' sejam consistentes.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_state') THEN
        CREATE TYPE issue_state AS ENUM ('open', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_state_reason') THEN
        CREATE TYPE issue_state_reason AS ENUM ('completed', 'not_planned', 'reopened');
    END IF;
END$$;


-- Tabela: public.repositories
-- Armazena informações gerais e métricas sobre os repositórios.
-- A chave primária (owner, name) garante a unicidade de cada repositório.

CREATE TABLE IF NOT EXISTS public.repositories
(
    owner             VARCHAR(255) NOT NULL,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    url               TEXT,
    license           VARCHAR(100),
    language          VARCHAR(100),
    stars             INTEGER NOT NULL DEFAULT 0,
    forks             INTEGER NOT NULL DEFAULT 0,
    open_issues_count INTEGER NOT NULL DEFAULT 0,
    total_issues_count INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ,
    
    CONSTRAINT repositories_pkey PRIMARY KEY (owner, name)
);

COMMENT ON TABLE public.repositories IS 'Armazena informações gerais e métricas sobre repositórios do GitHub.';


-- Tabela: public.issues
-- Armazena as issues de um repositório.
-- Possui uma chave estrangeira que a conecta à tabela 'repositories'.

CREATE TABLE IF NOT EXISTS public.issues
(
    id                 VARCHAR(255) NOT NULL,
    "number"           INTEGER NOT NULL,
    title              TEXT NOT NULL,
    body               TEXT,
    author             VARCHAR(255),
    state              issue_state NOT NULL,
    url                TEXT,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL,
    closed_at          TIMESTAMPTZ,
    comments_count     INTEGER NOT NULL DEFAULT 0,
    closed_by          VARCHAR(255),
    state_reason       issue_state_reason,
    
    -- Colunas para a Chave Estrangeira
    repository_owner   VARCHAR(255) NOT NULL,
    repository_name    VARCHAR(255) NOT NULL,
    
    -- Constraints
    CONSTRAINT issues_pkey PRIMARY KEY (id),
    CONSTRAINT fk_issues_to_repositories 
        FOREIGN KEY (repository_owner, repository_name)
        REFERENCES public.repositories (owner, name)
        ON DELETE CASCADE -- Se um repositório for deletado, suas issues também serão.
);

COMMENT ON TABLE public.issues IS 'Armazena as issues de repositórios do GitHub.';
COMMENT ON COLUMN public.issues.id IS 'ID global da issue no GitHub (Node ID).';
COMMENT ON CONSTRAINT fk_issues_to_repositories ON public.issues IS 'Garante que cada issue pertence a um repositório válido na tabela repositories.';


-- Índices para otimização de consultas
-- Melhoram a performance de buscas por repositório, autor e estado.

CREATE INDEX IF NOT EXISTS idx_issues_repository ON public.issues (repository_owner, repository_name);
CREATE INDEX IF NOT EXISTS idx_issues_author ON public.issues (author);
CREATE INDEX IF NOT EXISTS idx_issues_state ON public.issues (state);


-- =================================================================
-- Tabela: public.pull_requests
-- =================================================================

-- =================================================================
-- Tabela: public.pull_requests
-- =================================================================

-- Definição do tipo ENUM para o estado do Pull Request
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pull_request_state') THEN
        CREATE TYPE pull_request_state AS ENUM ('OPEN', 'CLOSED', 'MERGED');
    END IF;
END$$;

-- Tabela: public.pull_requests
-- Armazena os pull requests de um repositório.
CREATE TABLE IF NOT EXISTS public.pull_requests
(
    id                  VARCHAR(255) PRIMARY KEY,
    "number"            INTEGER NOT NULL,
    title               TEXT NOT NULL,
    body                TEXT,
    author              VARCHAR(255),
    state               pull_request_state NOT NULL,
    url                 VARCHAR(2048) NOT NULL,
    is_draft            BOOLEAN NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL,
    closed_at           TIMESTAMPTZ,
    merged_at           TIMESTAMPTZ,
    commits_count       INTEGER NOT NULL,
    additions           INTEGER NOT NULL,
    deletions           INTEGER NOT NULL,
    changed_files       INTEGER NOT NULL,
    base_ref_name       VARCHAR(255),
    head_ref_name       VARCHAR(255),
    associated_issue_id VARCHAR(255),

    -- Colunas para a Chave Estrangeira
    repository_owner    VARCHAR(255) NOT NULL,
    repository_name     VARCHAR(255) NOT NULL,

    -- Constraints
    CONSTRAINT fk_pull_requests_to_repositories
        FOREIGN KEY (repository_owner, repository_name)
        REFERENCES public.repositories (owner, name)
        ON DELETE CASCADE,
    CONSTRAINT fk_pull_requests_to_issues
        FOREIGN KEY (associated_issue_id)
        REFERENCES public.issues (id)
        ON DELETE SET NULL
);

COMMENT ON TABLE public.pull_requests IS 'Armazena os pull requests de repositórios do GitHub.';
COMMENT ON COLUMN public.pull_requests.id IS 'ID global do Pull Request no GitHub (Node ID).';
COMMENT ON CONSTRAINT fk_pull_requests_to_repositories ON public.pull_requests IS 'Garante que cada pull request pertence a um repositório válido na tabela repositories.';
COMMENT ON CONSTRAINT fk_pull_requests_to_issues ON public.pull_requests IS 'Linka o pull request à issue que ele fecha, se houver.';


-- =================================================================
-- Tabela: public.labels
-- Armazena todas as labels únicas para issues e pull requests.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.labels
(
    name  VARCHAR(255) PRIMARY KEY,
    color VARCHAR(7) NOT NULL
);

COMMENT ON TABLE public.labels IS 'Armazena labels únicas para issues e pull requests.';


-- =================================================================
-- Tabela: public.issue_labels
-- Tabela de junção para a relação N:M entre issues e labels.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.issue_labels
(
    issue_id  VARCHAR(255) NOT NULL,
    label_name VARCHAR(255) NOT NULL,
    CONSTRAINT pk_issue_labels PRIMARY KEY (issue_id, label_name),
    CONSTRAINT fk_issue_labels_to_issues
        FOREIGN KEY (issue_id)
        REFERENCES public.issues (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_issue_labels_to_labels
        FOREIGN KEY (label_name)
        REFERENCES public.labels (name)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.issue_labels IS 'Tabela de junção para a relação N:M entre issues e labels.';


-- =================================================================
-- Tabela: public.pull_request_labels
-- Tabela de junção para a relação N:M entre pull_requests e labels.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.pull_request_labels
(
    pull_request_id  VARCHAR(255) NOT NULL,
    label_name VARCHAR(255) NOT NULL,
    CONSTRAINT pk_pull_request_labels PRIMARY KEY (pull_request_id, label_name),
    CONSTRAINT fk_pull_request_labels_to_pull_requests
        FOREIGN KEY (pull_request_id)
        REFERENCES public.pull_requests (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pull_request_labels_to_labels
        FOREIGN KEY (label_name)
        REFERENCES public.labels (name)
        ON DELETE CASCADE
);

-- =================================================================
-- Tabela: public.comments
-- =================================================================
CREATE TABLE IF NOT EXISTS public.comments
(
    id                  VARCHAR(255) PRIMARY KEY,
    body                TEXT,
    author              VARCHAR(255),
    url                 VARCHAR(2048),
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    issue_id            VARCHAR(255),
    pull_request_id     VARCHAR(255),
    repository_owner    VARCHAR(255) NOT NULL,
    repository_name     VARCHAR(255) NOT NULL,
    CONSTRAINT fk_comments_to_issues
        FOREIGN KEY (issue_id)
        REFERENCES public.issues (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comments_to_pull_requests
        FOREIGN KEY (pull_request_id)
        REFERENCES public.pull_requests (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_comment_parent
        CHECK ((issue_id IS NOT NULL AND pull_request_id IS NULL) OR (issue_id IS NULL AND pull_request_id IS NOT NULL))
);
COMMENT ON TABLE public.comments IS 'Armazena comentários de issues ou pull requests.';


COMMENT ON TABLE public.pull_request_labels IS 'Tabela de junção para a relação N:M entre pull_requests e labels.';

-- =================================================================
-- Tabela: public.commits
-- Armazena os commits, idealmente associados a pull requests.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.commits
(
    sha                VARCHAR(40) PRIMARY KEY,
    message            TEXT NOT NULL,
    author_name        VARCHAR(255),
    authored_date      TIMESTAMPTZ NOT NULL,
    committer_name     VARCHAR(255),
    committed_date     TIMESTAMPTZ NOT NULL,
    url                VARCHAR(2048),
    additions          INTEGER NOT NULL,
    deletions          INTEGER NOT NULL,
    total_changed_files INTEGER NOT NULL,

    -- Chave estrangeira para o pull request (pode ser nula)
    pull_request_id    VARCHAR(255),

    -- Colunas para identificar o repositório
    repository_owner   VARCHAR(255) NOT NULL,
    repository_name    VARCHAR(255) NOT NULL,

    -- Constraints
    CONSTRAINT fk_commits_to_pull_requests
        FOREIGN KEY (pull_request_id)
        REFERENCES public.pull_requests (id)
        ON DELETE SET NULL, -- Um commit pode existir sem um PR, então apenas setamos a FK para nulo

    CONSTRAINT fk_commits_to_repositories
        FOREIGN KEY (repository_owner, repository_name)
        REFERENCES public.repositories (owner, name)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.commits IS 'Armazena informações sobre cada commit de um repositório.';
COMMENT ON COLUMN public.commits.sha IS 'O hash SHA-1 completo do commit.';
COMMENT ON CONSTRAINT fk_commits_to_pull_requests ON public.commits IS 'Linka o commit ao pull request que o introduziu.';


-- Índices para otimização de consultas na tabela de commits
CREATE INDEX IF NOT EXISTS idx_commits_repo ON public.commits(repository_owner, repository_name);
CREATE INDEX IF NOT EXISTS idx_commits_pull_request_id ON public.commits(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_commits_author_name ON public.commits(author_name);


-- =================================================================
-- Tabela: public.extractions
-- Armazena o estado e o progresso de cada processo de extração.
-- =================================================================

-- Definição do tipo ENUM para o estado da extração
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
        CREATE TYPE extraction_status AS ENUM ('pending', 'running', 'completed', 'failed', 'paused');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.extractions
(
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_owner        VARCHAR(255) NOT NULL,
    repository_name         VARCHAR(255) NOT NULL,
    
    status                  extraction_status NOT NULL DEFAULT 'pending',
    
    -- Cursors para paginação (a chave para pausar/retomar)
    last_issue_cursor       VARCHAR(255),
    last_pr_cursor          VARCHAR(255),

    -- Métricas e Logs
    total_issues_fetched    INTEGER NOT NULL DEFAULT 0,
    total_prs_fetched       INTEGER NOT NULL DEFAULT 0,
    error_message           TEXT,
    
    started_at              TIMESTAMPTZ,
    finished_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint para garantir que a extração está ligada a um repositório válido
    CONSTRAINT fk_extractions_to_repositories
        FOREIGN KEY (repository_owner, repository_name)
        REFERENCES public.repositories (owner, name)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.extractions IS 'Gerencia o estado e o progresso de cada job de extração de dados.';
COMMENT ON COLUMN public.extractions.last_issue_cursor IS 'Armazena o cursor da última issue buscada na API do GitHub para permitir a retomada.';

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.extractions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
