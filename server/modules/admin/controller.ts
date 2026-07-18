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

import { chromium } from 'playwright';

let browserInstance: any = null;
async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch();
  }
  return browserInstance;
}

export async function generateLeadPdf(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const lead = await adminService.getLeadById(id);
    
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const answers: any = lead.answers || {};
    
    const getVal = (v: any) => {
      if (v === true) return 'Yes';
      if (v === false) return 'No';
      if (v === null || v === undefined) return 'N/A';
      return String(v);
    };

    const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #1a202c; padding: 20px; }
          h2 { text-align: center; color: #000; margin-bottom: 5px; }
          .subtitle { text-align: center; font-size: 14px; margin-bottom: 20px; color: #4a5568; }
          .details { margin-bottom: 20px; font-size: 14px; line-height: 1.5; }
          
          .matrix-container {
            border: 1px solid #cbd5e0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 30px;
          }
          
          .matrix-header {
            background-color: #e2e8f0;
            padding: 12px 15px;
            font-weight: bold;
            font-size: 16px;
            color: #2d3748;
            border-bottom: 1px solid #cbd5e0;
          }
          
          .section-title {
            padding: 12px 15px;
            font-weight: bold;
            font-size: 15px;
            color: #1a202c;
            border-bottom: 1px solid #cbd5e0;
            background-color: #f7fafc;
          }
          
          .grid-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .grid-table td {
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            font-size: 13px;
          }
          
          .grid-table td:last-child {
            border-right: none;
          }
          
          .label {
            color: #4a5568;
            font-weight: 600;
            width: 25%;
          }
          
          .value {
            color: #2b6cb0;
            font-weight: 500;
            width: 25%;
          }
          
          .defects-list {
            padding: 15px;
            font-size: 13px;
            color: #2b6cb0;
          }
          .defects-list ul {
            margin: 0;
            padding-left: 20px;
          }
          
          .final-output {
            margin-top: 30px;
            padding: 15px;
            background-color: #f0fff4;
            border: 1px solid #c6f6d5;
            border-radius: 4px;
          }
          .final-price {
            font-size: 18px;
            font-weight: bold;
            color: #2f855a;
          }
        </style>
      </head>
      <body>
        <h2>Fhoneify Comprehensive Accuracy Verification Report</h2>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        
        <div class="details">
          <strong>Target Variant Identity:</strong> ${lead.brand} ${lead.model} (${lead.storage})<br/>
          <strong>Customer Name:</strong> ${lead.name || 'N/A'}<br/>
          <strong>Phone:</strong> ${lead.phone}<br/>
          <strong>Pickup Scheduled:</strong> ${lead.pickupDate || 'N/A'} at ${lead.pickupTime || 'N/A'}
        </div>
        
        <div class="matrix-container">
          <div class="matrix-header">Diagnostic Details & Selection Matrix</div>
          
          <div class="section-title">Stage 1: Basic Device Condition</div>
          <table class="grid-table">
            <tr>
              <td class="label">Calls Functional:</td>
              <td class="value">${getVal(answers.calls)}</td>
              <td class="label">Screen Original:</td>
              <td class="value">${getVal(answers.originalScreen)}</td>
            </tr>
            <tr>
              <td class="label">Touch Screen Working:</td>
              <td class="value">${getVal(answers.touch)}</td>
              <td class="label">Under Warranty:</td>
              <td class="value">${getVal(answers.warranty)}</td>
            </tr>
            <tr>
              <td class="label">Has GST Bill Invoice:</td>
              <td class="value">${getVal(answers.validBill)}</td>
              <td class="label">Stated Device Age:</td>
              <td class="value">${getVal(answers.mobileAge)}</td>
            </tr>
          </table>

          <div class="section-title">Stage 2: Hardware & Screen Integrity</div>
          <table class="grid-table">
            <tr>
              <td class="label">Screen Condition:</td>
              <td class="value">${getVal(answers.screenCondition)}</td>
              <td class="label">Screen Spots:</td>
              <td class="value">${getVal(answers.screenSpots)}</td>
            </tr>
            <tr>
              <td class="label">Screen Lines:</td>
              <td class="value">${getVal(answers.screenLines)}</td>
              <td class="label">Discoloration:</td>
              <td class="value">${getVal(answers.screenDiscoloration)}</td>
            </tr>
          </table>

          <div class="section-title">Stage 3: Body & Panel Condition</div>
          <table class="grid-table">
            <tr>
              <td class="label">Body Scratches:</td>
              <td class="value">${getVal(answers.bodyScratches)}</td>
              <td class="label">Body Dents:</td>
              <td class="value">${getVal(answers.bodyDents)}</td>
            </tr>
            <tr>
              <td class="label">Panel Condition:</td>
              <td class="value">${getVal(answers.bodyPanel)}</td>
              <td class="label">Bent/Loose:</td>
              <td class="value">${getVal(answers.bodyBent)}</td>
            </tr>
          </table>
          
          <div class="section-title">Stage 4: Other Defects & Accessories</div>
          <table class="grid-table">
            <tr>
              <td class="label" style="width: 25%;">Hardware Issues:</td>
              <td class="value" colspan="3">${(answers.hardware || []).length > 0 ? (answers.hardware || []).join(', ') : 'None reported'}</td>
            </tr>
            <tr>
              <td class="label" style="width: 25%;">General Defects:</td>
              <td class="value" colspan="3">${(answers.defects || []).length > 0 ? (answers.defects || []).join(', ') : 'None reported'}</td>
            </tr>
            <tr>
              <td class="label" style="width: 25%;">Accessories Included:</td>
              <td class="value" colspan="3">${(answers.accessories || []).length > 0 ? (answers.accessories || []).join(', ') : 'None reported'}</td>
            </tr>
          </table>
        </div>
        
        <div class="final-output">
          <div><strong>Final Evaluated Output:</strong></div>
          <div style="margin-top: 5px;">${lead.brand} ${lead.model} (${lead.storage})</div>
          <div class="final-price">Selling Price Match Value: Rs. ${lead.quotedPrice}</div>
        </div>
      </body>
    </html>
    `;

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await page.close(); // Close only the page to prevent memory leaks

    const safeName = (lead.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_${lead.phone}_Report.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    res.send(pdfBuffer);
    
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in generateLeadPdf controller');
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
