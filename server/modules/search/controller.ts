import { Request, Response } from 'express';
import { z } from 'zod';
import * as searchService from './service';
import logger from '../../lib/logger';

const SearchQuerySchema = z.object({
  q: z.string().optional(),
});

export function search(req: Request, res: Response) {
  try {
    const result = SearchQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const queryStr = result.data.q || '';
    const results = searchService.searchDevices(queryStr);
    return res.json({ success: true, data: results });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in search controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
