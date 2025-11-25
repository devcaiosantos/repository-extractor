# Estágio 1: Build
# Usa uma imagem com todas as ferramentas de build
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Copia apenas os arquivos de manifesto de pacote e instala as dependências
# Isso aproveita o cache do Docker se os pacotes não mudarem
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copia o resto do código-fonte
COPY . .

# Compila o TypeScript
RUN yarn build

# Estágio 2: Produção
# Usa uma imagem limpa e leve do Node
FROM node:18-alpine
WORKDIR /usr/src/app

# Copia apenas as dependências de produção do estágio de build
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copia os arquivos compilados do estágio de build
COPY --from=builder /usr/src/app/dist ./dist
# Copia o package.json para referência
COPY package.json .

# Define o comando para iniciar a aplicação, apontando para o caminho correto
CMD ["node", "dist/main.js"]