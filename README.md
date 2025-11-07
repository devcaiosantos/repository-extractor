# Extrator de Dados de Repositórios GitHub

![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue?style=for-the-badge&logo=postgresql)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-green?style=for-the-badge)

## 📄 Resumo

Este projeto é uma ferramenta de linha de comando desenvolvida em TypeScript e Node.js para realizar uma extração completa de dados de um repositório do GitHub e salvá-los em um banco de dados **PostgreSQL**.

O objetivo é criar uma base de dados local e relacional, contendo Issues, Pull Requests, Commits, Comentários e mais, que servirá como fonte de conhecimento para treinar e alimentar um modelo de linguagem grande (LLM), capacitando-o a atuar como um assistente para novos contribuidores do repositório.

A arquitetura do projeto segue princípios de **SOLID** e **Domain-Driven Design (DDD)**, garantindo um código limpo, testável e de fácil manutenção.

### ✨ Funcionalidades

- Conecta-se à API GraphQL do GitHub de forma autenticada.
- Extrai dados de Repositórios, Issues, Pull Requests, Commits, Comentários e Labels.
- Lida com a paginação da API para extrair milhares de registros.
- Salva os dados de forma estruturada em um banco de dados PostgreSQL.
- Gerencia as relações entre as entidades (ex: comentários de uma issue, commits de um PR).
- Gerenciamento seguro de chaves de API e senhas de banco de dados através de variáveis de ambiente com `.env`.

---

## 🚀 Começando

Siga estas instruções para obter uma cópia do projeto e executá-lo em sua máquina local.

### Pré-requisitos

Para executar este projeto, você precisará ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (versão 18.x ou superior)
- [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/) (versão 14 ou superior)

### ⚙️ Instalação e Configuração

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/devcaiosantos/repository-extractor.git
    cd repository-extractor
    ```

2.  **Instale as dependências:**

    ```bash
    yarn
    ```

3.  **Configure o Banco de Dados:**

    - Certifique-se de que seu serviço PostgreSQL está em execução.
    - Execute o script de inicialização para criar o banco de dados e todas as tabelas necessárias. Você pode usar uma ferramenta como o pgAdmin ou a linha de comando `psql`.
      ```bash
      # Exemplo de execução via psql
      psql -U postgres -f src/infrastructure/database/initdb.sql
      ```

4.  **Configure as Variáveis de Ambiente:**

    - Copie o arquivo de exemplo `env.example` para um novo arquivo chamado `.env`:
      ```bash
      cp env.example .env
      ```
    - Abra o arquivo `.env` e preencha **todas** as variáveis com suas informações do GitHub e do banco de dados.

      ```ini
      # .env

      # GitHub API Configuration
      GITHUB_TOKEN=ghp_SEU_TOKEN_AQUI
      GITHUB_BASE_URL=https://api.github.com/graphql

      # Repository to Extract
      OWNER_REPO=microsoft
      NAME_REPO=vscode

      # Database Connection
      DB_HOST=localhost
      DB_PORT=5432
      DB_USER=postgres
      DB_PASSWORD=sua_senha_secreta
      DB_NAME=repository_extractor_db
      ```

    - **Como gerar um token do GitHub?** Siga as [instruções oficiais](https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). O token precisa ter, no mínimo, a permissão `repo`.

---

## 💻 Executando a Aplicação

Você pode executar a aplicação de duas formas: usando as variáveis de ambiente (método principal) ou passando parâmetros via linha de comando para sobrescrever os valores do `.env`.

### 1. Via Variáveis de Ambiente (Recomendado)

Este é o método padrão. Certifique-se de que seu arquivo `.env` está corretamente configurado com o repositório alvo e as credenciais.

```bash
# A aplicação buscará todas as informações no arquivo .env
yarn dev
```

### 2. Via Linha de Comando (Sobrescreve o .env)

Você pode passar o dono do repositório, o nome e o token como flags. Este método tem prioridade sobre os valores definidos no arquivo `.env`.

```bash
# Formato
yarn dev --owner=<DONO> --repo=<REPOSITORIO> --token=<SEU_TOKEN>

# Exemplo prático
yarn dev --owner=facebook --repo=react --token=ghp_xxxxxxxxxxxx
```

Para a versão compilada, use `yarn start`:

```bash
yarn start --owner=facebook --repo=react
```

### ✅ Resultado

Após a execução, você verá logs no console indicando o progresso da extração para cada tipo de dado (Repositório, Issues, Pull Requests, etc.). Ao final do processo, todos os dados extraídos estarão populados nas tabelas do seu banco de dados `repository_extractor_db`.

Você pode então conectar-se ao banco com o pgAdmin ou outra ferramenta para explorar os dados nas tabelas:

- `repositories`
- `issues`
- `pull_requests`
- `commits`
- `comments`
- `labels`
- e outras.

---

## 🏗️ Estrutura do Projeto

O código-fonte está organizado em uma arquitetura de 3 camadas para garantir a separação de responsabilidades:

- `src/domain`: Contém a lógica de negócio, as entidades (`Issue`, `Commit`, etc.) e as interfaces (contratos) para os serviços externos.
- `src/application`: Orquestra os casos de uso, atuando como uma ponte entre o domínio e a infraestrutura.
- `src/infrastructure`: Contém as implementações concretas dos serviços externos, como o cliente da API do GitHub (`GitHubGraphqlRepository`) e os exportadores para o banco de dados (`PostgresIssueExporter`, `PostgresCommitExporter`, etc.).

---

## 📜 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
