import type { Request, Response } from 'express';
import app from '../src/server/app.ts';
import { initDb } from '../src/server/db.ts';

let initialized = false;

export default async function handler(req: Request, res: Response) {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return app(req, res);
}
