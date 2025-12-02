import { Router } from "express";
import { ExtractionController } from "./extraction.controller";

const router = Router();
const controller = new ExtractionController();

// Listar todas as extrações
router.get("/", (req, res) => controller.listExtractions(req, res));

// Buscar uma extração específica
router.get("/:id", (req, res) => controller.getExtraction(req, res));

// Criar nova extração
router.post("/", (req, res) => controller.createExtraction(req, res));

// Pausar extração
router.post("/:id/pause", (req, res) => controller.pauseExtraction(req, res));

// Iniciar/Retomar extração
router.post("/:id/start", (req, res) => controller.startExtraction(req, res));

export default router;
