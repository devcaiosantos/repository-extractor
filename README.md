# Extrator de Issues do GitHub

![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-green?style=for-the-badge)

## 📄 Resumo

Este projeto é uma ferramenta de linha de comando desenvolvida em TypeScript e Node.js para extrair **todas** as issues (abertas e fechadas) de um repositório público ou privado do GitHub e salvá-las em um arquivo `.csv` local.

A arquitetura do projeto foi construída seguindo princípios de **SOLID** e **Domain-Driven Design (DDD)**, resultando em um código limpo, testável e de fácil manutenção, com uma clara separação entre a lógica de negócio, a aplicação e a infraestrutura.

### ✨ Funcionalidades

- Conecta-se à API do GitHub de forma autenticada.
- Lida com a paginação da API para extrair milhares de issues.
- Modela os dados de forma robusta, separando a resposta da API das entidades de domínio.
- Exporta os dados extraídos para um arquivo `.csv` na pasta `./data`.
- Gerenciamento seguro de chaves de API através de variáveis de ambiente com `.env`.

---

## 🚀 Começando

Siga estas instruções para obter uma cópia do projeto e executá-lo em sua máquina local.

### Pré-requisitos

Para executar este projeto, você precisará ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (versão 18.x ou superior)
- [yarn](https://yarnpkg.com/) 
- [Git](https://git-scm.com/)

### ⚙️ Instalação e Configuração

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/devcaiosantos/repository-extractor.git
    cd repository-extractor
    ```

2.  **Instale as dependências:**

    ```bash
    yarn add
    ```

3.  **Configure as Variáveis de Ambiente:**
    Este projeto requer um Token de Acesso Pessoal (Personal Access Token) do GitHub para se comunicar com a API.

    - Copie o arquivo de exemplo `env.example` para um novo arquivo chamado `.env`:
      ```bash
      cp env.example .env
      ```
    - Abra o arquivo `.env` e preencha o valor de cada variável, em especial, o token do github.
      ```ini
      # .env
      GITHUB_TOKEN=ghp_SEU_TOKEN_AQUI
      ```
    - **Como gerar um token?** Siga as [instruções oficiais do GitHub](https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). O token precisa ter, no mínimo, a permissão `repo` (para repositórios privados) ou `public_repo` (para repositórios públicos).

---

## 💻 Executando a Aplicação

### Modo de Desenvolvimento

Para executar a aplicação em modo de desenvolvimento com compilação em tempo real:

```bash
yarn dev
```

### Modo de Produção

Para um ambiente de produção, o ideal é primeiro compilar o código para JavaScript e depois executá-lo.

1.  **Compile o projeto:**

    ```bash
    yarn build
    ```

    Este comando criará uma pasta `./dist` com o código JavaScript otimizado.

2.  **Execute a versão compilada:**
    ```bash
    yarn start
    ```

### ✅ Resultado

Após a execução, você verá logs no console indicando o progresso. Ao final, um arquivo `.csv` com o nome `owner-repo.csv` será gerado dentro de uma pasta `data` na raiz do projeto.

```
/projeto
|-- /data/
|   `-- microsoft-vscode.csv  <-- Arquivo de resultado
|-- /src/
|-- package.json
`-- README.md
```

---

## 🏗️ Estrutura do Projeto

O código-fonte está organizado em uma arquitetura de 3 camadas para garantir a separação de responsabilidades:

- `src/domain`: Contém a lógica de negócio e as entidades principais (`Issue`, `RepositoryIdentifier`) e as interfaces (contratos) para os serviços externos. Não tem conhecimento de detalhes de infraestrutura.
- `src/application`: Orquestra os casos de uso da aplicação, atuando como uma ponte entre o domínio e a infraestrutura.
- `src/infrastructure`: Contém as implementações concretas dos serviços externos, como o cliente da API do GitHub (`GitHubIssueRepository`) e o exportador de arquivos (`CsvIssueExporter`).

---

## 📜 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
