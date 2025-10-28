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