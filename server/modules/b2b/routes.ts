import { Router } from 'express';
import { B2BController } from './controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Auction/lead browsing is read-only market info, kept public like listing
// browse elsewhere in the app. Anything identity-bound (wallet, claiming a
// lead, placing a bid) requires auth - previously these had no auth check
// at all and silently defaulted to a hardcoded 'partner-1' identity for
// every caller (see PRODUCTION_READINESS_AUDIT.md P1-9).
router.get('/auctions', B2BController.getAuctions);
router.get('/leads', B2BController.getLeads);
router.get('/wallet', requireAuth, B2BController.getWallet);
router.post('/leads/claim', requireAuth, B2BController.claimLead);
router.post('/auctions/bid', requireAuth, B2BController.placeBid);

export { router as b2bRouter };
