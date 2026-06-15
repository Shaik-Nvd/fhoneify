import { Router } from 'express';
import { B2BController } from './controller';

// For the demo, we won't strictly enforce requirePartner middleware, 
// to make testing the UI easier without setting up a partner login flow.
// In a real app, we would add: router.use(requirePartner);

const router = Router();

router.get('/auctions', B2BController.getAuctions);
router.get('/leads', B2BController.getLeads);
router.get('/wallet', B2BController.getWallet);
router.post('/leads/claim', B2BController.claimLead);
router.post('/auctions/bid', B2BController.placeBid);

export { router as b2bRouter };
