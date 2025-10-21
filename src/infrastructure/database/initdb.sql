use database repository_extractor;

-- Primeiro, criamos tipos ENUM para campos com valores fixos, o que é mais eficiente.
CREATE TYPE issue_state AS ENUM ('open', 'closed');
CREATE TYPE issue_state_reason AS ENUM ('completed', 'not_planned', 'reopened');

-- Tabela principal para as Issues
CREATE TABLE issues (
    id VARCHAR(255) PRIMARY KEY, -- Usando VARCHAR para ser compatível com IDs do GraphQL (string) e REST (number)
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    author VARCHAR(255),
    state issue_state NOT NULL,
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    comments_count INTEGER NOT NULL DEFAULT 0,
    closed_by VARCHAR(255),
    state_reason issue_state_reason,
    repository_name VARCHAR(255) NOT NULL -- Adicionado para saber a qual repositório a issue pertence
);

-- Tabela para armazenar todas as labels unicamente
CREATE TABLE labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7)
);

-- Tabela para armazenar todos os assignees unicamente
CREATE TABLE assignees (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) NOT NULL UNIQUE,
    avatar_url TEXT
);

-- Tabela de junção para a relação muitos-para-muitos entre issues e labels
CREATE TABLE issue_labels (
    issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

-- Tabela de junção para a relação muitos-para-muitos entre issues e assignees
CREATE TABLE issue_assignees (
    issue_id VARCHAR(255) REFERENCES issues(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES assignees(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, assignee_id)
);

-- Índices para otimizar consultas comuns
CREATE INDEX idx_issues_number ON issues(number);
CREATE INDEX idx_issues_state ON issues(state);
CREATE INDEX idx_issues_author ON issues(author);
