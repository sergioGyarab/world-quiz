import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err);

  if (err.message.includes('already exists') || err.message.includes('already taken')) {
    return res.status(409).json({ error: err.message });
  }

  if (err.message.includes('Invalid') || err.message.includes('not found')) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
};
