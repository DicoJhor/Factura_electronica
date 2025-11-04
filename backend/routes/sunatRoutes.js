// backend/routes/sunatRoutes.js
import express from "express";
import { reenviarASunat } from "../controllers/sunatController.js";

const router = express.Router();

router.post("/reenviar", reenviarASunat);

export default router;
