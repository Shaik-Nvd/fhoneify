import { Response } from 'express';
import * as adminService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';
import { resolveReference, computeFhoneifyGetUpto } from '../../../lib/pricing/engine';

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

export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await adminService.deleteLead(id);
    return res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in deleteLead controller');
    return res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
}

export async function deleteLeadsBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }
    const result = await adminService.deleteLeadsBatch(ids);
    return res.json({ success: true, count: result.count, message: `${result.count} leads deleted successfully` });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in deleteLeadsBatch controller');
    return res.status(500).json({ success: false, error: 'Failed to delete leads' });
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

    const deviceDisplayName = lead.model.toLowerCase().startsWith(lead.brand.toLowerCase())
      ? lead.model
      : `${lead.brand} ${lead.model}`;

    // 1. Resolve Fhoneify Get Upto
    let getUptoFormatted = 'N/A';
    try {
      const ref = resolveReference({
        device: {
          model: lead.model,
          storage: lead.storage,
          basePrice: 0,
        },
      });
      if (ref && ref.cashifyGetUptoReference) {
        const upto = computeFhoneifyGetUpto(ref.cashifyGetUptoReference);
        getUptoFormatted = `₹${upto.toLocaleString('en-IN')}`;
      }
    } catch {
      if (lead.quotedPrice) {
        getUptoFormatted = `₹${Math.round(lead.quotedPrice * 1.15).toLocaleString('en-IN')}`;
      }
    }

    const lowerModel = lead.model.toLowerCase();
    const isApple = lead.brand.toLowerCase() === 'apple';
    const isSamsung = lead.brand.toLowerCase() === 'samsung';
    const hasSPen = isSamsung && (
      lowerModel.includes('note') || 
      lowerModel.includes('s22 ultra') || 
      lowerModel.includes('s23 ultra') || 
      lowerModel.includes('s24 ultra')
    );
    const isFoldable = lowerModel.includes('fold') || lowerModel.includes('flip') || lowerModel.includes('razr') || lowerModel.includes('open');
    const hasFingerprint = !isApple || lowerModel.includes('iphone 6') || lowerModel.includes('iphone 7') || lowerModel.includes('iphone 8') || lowerModel.includes('se');
    const hasFaceId = !isApple || ((
      lowerModel.includes('iphone x') ||
      lowerModel.includes('iphone 11') ||
      lowerModel.includes('iphone 12') ||
      lowerModel.includes('iphone 13') ||
      lowerModel.includes('iphone 14') ||
      lowerModel.includes('iphone 15') ||
      lowerModel.includes('iphone 16') ||
      lowerModel.includes('iphone 17') ||
      lowerModel.includes('air')
    ) && !lowerModel.includes('se'));
    const hasActionButton = isApple && (
      (lowerModel.includes('15') && (lowerModel.includes('pro') || lowerModel.includes('max'))) ||
      lowerModel.includes('16') ||
      lowerModel.includes('17') ||
      lowerModel.includes('air')
    );

    // Full catalog of hardware components
    const fullHardwareCatalog: Array<{ id: string; label: string }> = [
      { id: 'front_camera', label: 'Front Camera' },
      { id: 'back_camera', label: 'Back Camera' },
      { id: 'volume', label: 'Volume Buttons' },
      ...(hasFingerprint ? [{ id: 'fingerprint', label: isApple ? 'Finger Touch (Touch ID)' : 'Finger Touch' }] : []),
      { id: 'wifi', label: 'Wi-Fi' },
      { id: 'speaker', label: 'Speaker' },
      ...(isFoldable ? [{ id: 'hinge', label: 'Hinge' }] : []),
      { id: 'silent', label: hasActionButton ? 'Action Button' : 'Silent Button / Switch' },
      ...(hasFaceId ? [{ id: 'face', label: isApple ? 'Face ID / Face Sensor' : 'Face Sensor' }] : []),
      { id: 'power', label: 'Power Button' },
      { id: 'charging', label: 'Charging Port' },
      { id: 'audio_receiver', label: 'Audio Receiver / Earpiece' },
      { id: 'camera_glass', label: 'Camera Glass' },
      { id: 'microphone', label: 'Microphone' },
      { id: 'bluetooth', label: 'Bluetooth' },
      { id: 'vibrator', label: 'Vibrator / Vibration' },
      { id: 'proximity', label: 'Proximity Sensor' },
      ...(hasSPen ? [{ id: 's_pen', label: 'S-Pen' }] : []),
      ...(isApple
        ? [
            { id: 'battery_service', label: 'Battery Health < 80% (In Service)' },
            { id: 'battery_health', label: 'Battery Health 80-85%' },
          ]
        : [{ id: 'battery_service', label: 'Battery Functional Condition' }]),
    ];

    const reportedHardware = (answers.hardware || []).map((h: string) => String(h).toLowerCase().trim());
    const isHardwareReported = (id: string) => {
      if (id === 'face') return reportedHardware.includes('face') || reportedHardware.includes('face_sensor');
      if (id === 'microphone') return reportedHardware.includes('microphone') || reportedHardware.includes('mic');
      if (id === 'audio_receiver') return reportedHardware.includes('audio_receiver') || reportedHardware.includes('receiver');
      if (id === 'vibrator') return reportedHardware.includes('vibrator') || reportedHardware.includes('silent_vibrator');
      if (id === 'proximity') return reportedHardware.includes('proximity') || reportedHardware.includes('proximity_sensor');
      return reportedHardware.includes(id);
    };

    // Age label mapping
    const ageMap: Record<string, string> = {
      below3: 'Below 3 months (Valid bill mandatory)',
      '3to6': '3 months - 6 months (Valid bill mandatory)',
      '6to11': '6 months - 11 months (Valid bill mandatory)',
      above11: 'Above 11 months / Out of warranty',
    };

    // Primary defects categories
    const rawDefects: string[] = answers.defects || [];
    const hasScreenScratchCategory = rawDefects.includes('screen_scratch') || rawDefects.includes('broken_scratch') || (answers.screenCondition && answers.screenCondition !== 'none' && answers.screenCondition !== 'n/a');
    const hasScreenSpotCategory = rawDefects.includes('screen_spot') || (answers.screenSpots && answers.screenSpots !== 'No spots on screen' && answers.screenSpots !== 'none') || (answers.screenLines && answers.screenLines !== 'No line(s) on Display' && answers.screenLines !== 'none') || (answers.screenDiscoloration && answers.screenDiscoloration !== 'No Discoloration' && answers.screenDiscoloration !== 'none');
    const hasBodyScratchCategory = rawDefects.includes('body_scratch') || (answers.bodyScratches && answers.bodyScratches !== 'No scratches' && answers.bodyScratches !== 'none') || (answers.bodyDents && answers.bodyDents !== 'No dents' && answers.bodyDents !== 'none');
    const hasBodyPanelCategory = rawDefects.includes('panel_missing') || (answers.bodyPanel && answers.bodyPanel !== 'No defect on side or back panel' && answers.bodyPanel !== 'none') || (answers.bodyBent && answers.bodyBent !== 'Phone not bent' && answers.bodyBent !== 'none');

    // Accessories
    const hasBox = answers.box === true || (answers.accessories || []).includes('box');
    const hasCharger = answers.charger === true || (answers.accessories || []).includes('charger');
    const hasBill = answers.validBill === true || (answers.accessories || []).includes('bill');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Fhoneify Inspection Report - ${deviceDisplayName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 9mm 12mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.4;
            font-size: 13px;
          }

          .report-wrap {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          /* Top Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 1.5px solid #e2e8f0;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .brand-title span { color: #d97706; }
          .doc-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            color: #475569;
            padding: 3px 8px;
            border-radius: 4px;
            margin-top: 3px;
          }

          .customer-pill-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 12px;
            text-align: right;
            color: #475569;
            line-height: 1.45;
          }
          .customer-pill-box strong { color: #0f172a; }

          /* Meta Row */
          .meta-strip {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 11px;
            color: #64748b;
          }
          .meta-strip strong { color: #334155; }

          /* Get Upto Banner */
          .upto-banner {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border: 1px solid #fde68a;
            border-left: 5px solid #d97706;
            border-radius: 8px;
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .banner-info .sub-tag {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: #b45309;
          }
          .banner-info .model-name {
            font-size: 18px;
            font-weight: 800;
            color: #1e293b;
            margin-top: 2px;
          }
          .banner-price {
            text-align: right;
          }
          .banner-price .label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #92400e;
          }
          .banner-price .amount {
            font-size: 26px;
            font-weight: 900;
            color: #d97706;
            line-height: 1.1;
          }

          /* Section Cards */
          .section-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .section-header {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 6px 14px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #475569;
          }
          .section-body {
            padding: 8px 14px;
          }

          /* Q&A Rows */
          .qa-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            border-bottom: 1px dashed #f1f5f9;
          }
          .qa-row:last-child { border-bottom: none; }
          .qa-title {
            font-size: 12.5px;
            font-weight: 600;
            color: #1e293b;
          }
          .qa-desc {
            font-size: 11px;
            color: #64748b;
            margin-top: 1px;
          }
          .pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.3px;
          }
          .pill-yes { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .pill-no { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
          .pill-none { background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; }
          .pill-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .pill-warn { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

          .grid-2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 16px;
          }
          .sub-section-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #334155;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
            margin: 6px 0 4px 0;
          }

          /* Defects tags */
          .defect-tag {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 11.5px;
            font-weight: 700;
            margin-right: 6px;
            margin-bottom: 4px;
          }

          /* Final Valuation Box */
          .final-box {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 1px solid #bbf7d0;
            border-left: 5px solid #16a34a;
            border-radius: 8px;
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2px;
            page-break-inside: avoid;
          }
          .final-left .final-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
            padding: 2px 8px;
            border-radius: 4px;
            margin-bottom: 2px;
          }
          .final-left .final-model {
            font-size: 17px;
            font-weight: 800;
            color: #0f172a;
          }
          .final-price-wrap {
            text-align: right;
          }
          .final-price-wrap .final-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #166534;
          }
          .final-price-wrap .final-num {
            font-size: 30px;
            font-weight: 900;
            color: #15803d;
            line-height: 1.1;
          }
        </style>
      </head>
      <body>
        <div class="report-wrap">
          <!-- Header -->
          <div class="header">
            <div>
              <div class="brand-title">FHONE<span>IFY</span></div>
              <div class="doc-badge">Official Lead Inspection Report</div>
            </div>
            <div class="customer-pill-box">
              <div><strong>Customer:</strong> ${lead.name || 'Unknown'}</div>
              <div><strong>Phone:</strong> ${lead.phone}</div>
              <div><strong>Pickup:</strong> ${lead.pickupDate || 'Pending'} ${lead.pickupTime ? 'at ' + lead.pickupTime : ''}</div>
            </div>
          </div>

          <!-- Meta -->
          <div class="meta-strip">
            <div><strong>Address:</strong> ${[lead.address, lead.city].filter(Boolean).join(', ') || 'N/A'}${lead.pincode ? ' - ' + lead.pincode : ''}</div>
            <div><strong>Lead ID:</strong> #${lead.id.slice(0, 8)} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>

          <!-- Get Upto -->
          <div class="upto-banner">
            <div class="banner-info">
              <div class="sub-tag">Device Quotation Evaluation</div>
              <div class="model-name">Sell Old ${deviceDisplayName} (${lead.storage})</div>
            </div>
            <div class="banner-price">
              <div class="label">Fhoneify's Get Upto</div>
              <div class="amount">${getUptoFormatted}</div>
            </div>
          </div>

          <!-- Card 1: Core Condition & Warranty Checks -->
          <div class="section-card">
            <div class="section-header">1. Device Verification & Basic Functionality</div>
            <div class="section-body">
              <div class="qa-row">
                <div>
                  <div class="qa-title">Are you able to make and receive calls?</div>
                  <div class="qa-desc">Check your device for cellular network connectivity issues</div>
                </div>
                <span class="pill ${answers.calls === false ? 'pill-no' : 'pill-yes'}">${answers.calls === false ? '✕ NO' : '✓ YES'}</span>
              </div>
              <div class="qa-row">
                <div>
                  <div class="qa-title">Is your device's touch screen working properly?</div>
                  <div class="qa-desc">Check the touch screen functionality of your phone</div>
                </div>
                <span class="pill ${answers.touch === false ? 'pill-no' : 'pill-yes'}">${answers.touch === false ? '✕ NO' : '✓ YES'}</span>
              </div>
              <div class="qa-row">
                <div>
                  <div class="qa-title">Is your phone's screen original?</div>
                  <div class="qa-desc">Original or replaced by Authorized Service Center</div>
                </div>
                <span class="pill ${answers.originalScreen === false ? 'pill-no' : 'pill-yes'}">${answers.originalScreen === false ? '✕ NO' : '✓ YES'}</span>
              </div>
              <div class="qa-row">
                <div>
                  <div class="qa-title">Is your device under manufacturer warranty?</div>
                  <div class="qa-desc">Valid manufacturer brand warranty</div>
                </div>
                <span class="pill ${answers.warranty === true ? 'pill-yes' : 'pill-no'}">${answers.warranty === true ? '✓ YES' : '✕ NO'}</span>
              </div>
              <div class="qa-row">
                <div>
                  <div class="qa-title">Do you have GST valid bill with the same IMEI?</div>
                  <div class="qa-desc">Make sure your bill has device IMEI mentioned on it</div>
                </div>
                <span class="pill ${hasBill ? 'pill-yes' : 'pill-no'}">${hasBill ? '✓ YES' : '✕ NO'}</span>
              </div>
              ${answers.eSim ? `
              <div class="qa-row">
                <div>
                  <div class="qa-title">How many eSIMs does your device support?</div>
                  <div class="qa-desc">Carrier eSIM profile support configuration</div>
                </div>
                <span class="pill pill-info">${answers.eSim}</span>
              </div>
              ` : ''}
              ${answers.mobileAge ? `
              <div class="qa-row">
                <div>
                  <div class="qa-title">What is your mobile age?</div>
                  <div class="qa-desc">Device age based on original purchase date</div>
                </div>
                <span class="pill ${answers.mobileAge === 'above11' ? 'pill-warn' : 'pill-yes'}">${ageMap[answers.mobileAge] || answers.mobileAge}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Card 2: Screen & Body Defects Breakdown -->
          <div class="section-card">
            <div class="section-header">2. Screen & Body Physical Defects Evaluation</div>
            <div class="section-body">
              <div class="sub-section-title">Primary Defect Categories</div>
              <div class="qa-row">
                <span class="qa-title">Broken/scratch on device screen</span>
                <span class="pill ${hasScreenScratchCategory ? 'pill-no' : 'pill-yes'}">${hasScreenScratchCategory ? '⚠ Selected' : '✓ Not selected'}</span>
              </div>
              <div class="qa-row">
                <span class="qa-title">Dead Spot / Visible line and Discoloration on screen</span>
                <span class="pill ${hasScreenSpotCategory ? 'pill-no' : 'pill-yes'}">${hasScreenSpotCategory ? '⚠ Selected' : '✓ Not selected'}</span>
              </div>
              <div class="qa-row">
                <span class="qa-title">Scratch / Dent on device body</span>
                <span class="pill ${hasBodyScratchCategory ? 'pill-no' : 'pill-yes'}">${hasBodyScratchCategory ? '⚠ Selected' : '✓ Not selected'}</span>
              </div>
              <div class="qa-row">
                <span class="qa-title">Device panel missing / broken / bent</span>
                <span class="pill ${hasBodyPanelCategory ? 'pill-no' : 'pill-yes'}">${hasBodyPanelCategory ? '⚠ Selected' : '✓ Not selected'}</span>
              </div>

              <div class="sub-section-title" style="margin-top: 8px;">Detailed Inspection Breakdown</div>
              <div class="grid-2col">
                <div class="qa-row">
                  <span class="qa-title">Screen Physical Condition</span>
                  <span class="pill ${answers.screenCondition && answers.screenCondition !== 'none' ? 'pill-no' : 'pill-none'}">${answers.screenCondition || 'Flawless / None'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Dead Pixels / Spots</span>
                  <span class="pill ${answers.screenSpots && answers.screenSpots !== 'No spots on screen' ? 'pill-no' : 'pill-yes'}">${answers.screenSpots || 'No spots on screen'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Visible Lines</span>
                  <span class="pill ${answers.screenLines && answers.screenLines !== 'No line(s) on Display' ? 'pill-no' : 'pill-yes'}">${answers.screenLines || 'No line(s) on Display'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Screen Discoloration</span>
                  <span class="pill ${answers.screenDiscoloration && answers.screenDiscoloration !== 'No Discoloration' ? 'pill-no' : 'pill-yes'}">${answers.screenDiscoloration || 'No Discoloration'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Body Scratches</span>
                  <span class="pill ${answers.bodyScratches && answers.bodyScratches !== 'No scratches' ? 'pill-no' : 'pill-yes'}">${answers.bodyScratches || 'No scratches'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Body Dents</span>
                  <span class="pill ${answers.bodyDents && answers.bodyDents !== 'No dents' ? 'pill-no' : 'pill-yes'}">${answers.bodyDents || 'No dents'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Side / Back Panel</span>
                  <span class="pill ${answers.bodyPanel && answers.bodyPanel !== 'No defect on side or back panel' ? 'pill-no' : 'pill-yes'}">${answers.bodyPanel || 'No defect'}</span>
                </div>
                <div class="qa-row">
                  <span class="qa-title">Device Bent / Loose</span>
                  <span class="pill ${answers.bodyBent && answers.bodyBent !== 'Phone not bent' ? 'pill-no' : 'pill-yes'}">${answers.bodyBent || 'Phone not bent'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Functional / Hardware Problems Checklist -->
          <div class="section-card">
            <div class="section-header">3. Functional & Hardware Components Checklist (${fullHardwareCatalog.length} Inspected)</div>
            <div class="section-body">
              <div class="grid-2col">
                ${fullHardwareCatalog.map((hw) => {
                  const faulty = isHardwareReported(hw.id);
                  return `
                    <div class="qa-row">
                      <span class="qa-title">${hw.label}</span>
                      <span class="pill ${faulty ? 'pill-no' : 'pill-yes'}">${faulty ? '⚠ Faulty / Selected' : '✓ Working / Not Selected'}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Card 4: Accessories & Invoice -->
          <div class="section-card">
            <div class="section-header">4. Original Accessories & Purchase Invoice</div>
            <div class="section-body">
              <div class="qa-row">
                <div>
                  <div class="qa-title">Original Box with same IMEI</div>
                  <div class="qa-desc">Valid matching serial/IMEI packaging box</div>
                </div>
                <span class="pill ${hasBox ? 'pill-yes' : 'pill-no'}">${hasBox ? '✓ YES' : '✕ NO'}</span>
              </div>
              <div class="qa-row">
                <div>
                  <div class="qa-title">Original Charger of Device</div>
                  <div class="qa-desc">Original authentic power adapter / cable</div>
                </div>
                <span class="pill ${hasCharger ? 'pill-yes' : 'pill-no'}">${hasCharger ? '✓ YES' : '✕ NO'}</span>
              </div>
              <div class="qa-row">
                <div>
                  <div class="qa-title">Valid Bill / Invoice Available</div>
                  <div class="qa-desc">Original purchase tax invoice with IMEI</div>
                </div>
                <span class="pill ${hasBill ? 'pill-yes' : 'pill-no'}">${hasBill ? '✓ YES' : '✕ NO'}</span>
              </div>
            </div>
          </div>

          <!-- Final Evaluated Payout -->
          <div class="final-box">
            <div class="final-left">
              <div class="final-badge">Verified Valuation Offer</div>
              <div class="final-model">${deviceDisplayName} (${lead.storage})</div>
            </div>
            <div class="final-price-wrap">
              <div class="final-title">Fhoneify's Estimated Value</div>
              <div class="final-num">₹${Math.round(lead.quotedPrice).toLocaleString('en-IN')}</div>
            </div>
          </div>
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
