import type { Request, Response } from "express";
import app from "../server.ts";

export default function handler(req: Request, res: Response) {
  // Normalize req.url if Vercel serverless rewrite stripped the /api prefix
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  return app(req, res);
}
