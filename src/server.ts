import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import extractionRoutes from "./api/extraction/router";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use("/api/extractions", extractionRoutes);

// Rota de healthcheck
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    message: "Repository Extractor API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      extractions: "/api/extractions",
    },
  });
});

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor API rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api/extractions`);
  console.log(`💚 Health check em http://localhost:${PORT}/health`);
  console.log(`\n📝 Variáveis de ambiente carregadas:`);
  console.log(`   - DB_HOST: ${process.env.DB_HOST}`);
  console.log(`   - DB_PORT: ${process.env.DB_PORT}`);
  console.log(`   - DB_NAME: ${process.env.DB_NAME}`);
  console.log(`   - DB_USER: ${process.env.DB_USER}`);
  console.log(`   - DB_PASSWORD: ${process.env.DB_PASSWORD}`);
});
