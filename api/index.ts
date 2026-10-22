import type { Request, Response } from 'express';
import app from '../src/server/app.ts';
import { initDb } from '../src/server/db.ts';

let initialized = false;

export default async function handler(req: Request, res: Response) {
  if (!initialized) {
    await initDb();
    initialized = true;
  }

  // Normalize request URL for Express routing
  // Vercel rewrites send captured subpath as `path` query param: /api/index?path=$1
  const rawPath = req.query?.path;
  if (rawPath) {
    const subpath = Array.isArray(rawPath) ? rawPath[0] : rawPath;
    const cleanSubpath = String(subpath).replace(/^\/+/, '');

    // Remove path from req.query so downstream controllers don't receive unwanted param
    delete req.query.path;

    // Preserve any remaining query parameters
    const queryKeys = Object.keys(req.query || {});
    let queryString = '';
    if (queryKeys.length > 0) {
      const searchParams = new URLSearchParams();
      for (const key of queryKeys) {
        const val = req.query[key];
        if (Array.isArray(val)) {
          val.forEach((v) => searchParams.append(key, String(v)));
        } else if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        queryString = `?${qs}`;
      }
    }

    req.url = `/api/${cleanSubpath}${queryString}`;
  } else if (req.url) {
    // If request reached /api/index directly without path param, normalize /api/index to /api
    if (req.url.startsWith('/api/index')) {
      req.url = req.url.replace(/^\/api\/index/, '/api');
    }
  }

  return app(req, res);
}

