import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";
import extractionRoutes from "./api/extraction/router";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Rotas
app.use("/api/extractions", extractionRoutes);

// Rota de healthcheck
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Rota raiz - redireciona para o frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
  });
});

// Middleware de tratamento de erros global
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("❌ Erro não tratado:", err);

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      message: err.message,
    });
  }
);

// Tratamento de erros não capturados (uncaught exceptions)
process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  // Não encerra o processo para manter o servidor rodando
});

// Tratamento de promises rejeitadas não capturadas (unhandled rejections)
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("❌ Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  // Não encerra o processo para manter o servidor rodando
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor API rodando na porta ${PORT}`);
  console.log(`🌐 Frontend disponível em http://localhost:${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api/extractions`);
  console.log(`💚 Health check em http://localhost:${PORT}/health`);
  console.log(`\n📝 Variáveis de ambiente carregadas:`);
  console.log(`   - DB_HOST: ${process.env.DB_HOST}`);
  console.log(`   - DB_PORT: ${process.env.DB_PORT}`);
  console.log(`   - DB_NAME: ${process.env.DB_NAME}`);
  console.log(`   - DB_USER: ${process.env.DB_USER}`);
  console.log(`   - DB_PASSWORD: ${process.env.DB_PASSWORD}`);
});
