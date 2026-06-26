import { Response } from 'express';
import * as adminService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

export function getAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const data = adminService.getAnalytics();
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getAnalytics controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getListings(req: AuthenticatedRequest, res: Response) {
  try {
    const data = adminService.getListings();
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getListings controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const data = adminService.getOrders();
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getOrders controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getFraudListings(req: AuthenticatedRequest, res: Response) {
  try {
    const data = adminService.getFraudListings();
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getFraudListings controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function approveListing(req: AuthenticatedRequest, res: Response) {
  try {
    const listing = adminService.approveListing(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    return res.json({ success: true, data: listing, message: 'Listing approved' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in approveListing controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function rejectListing(req: AuthenticatedRequest, res: Response) {
  try {
    const listing = adminService.rejectListing(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    return res.json({ success: true, data: listing, message: 'Listing rejected' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in rejectListing controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const data = adminService.getUsers();
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getUsers controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const data = await adminService.getLeads();
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getLeads controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function updateLeadStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    const lead = await adminService.updateLeadStatus(id, status);
    return res.json({ success: true, data: lead, message: 'Lead status updated' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in updateLeadStatus controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
