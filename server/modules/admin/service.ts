import { users, leads, listings, buy_orders, enrichListing, Listing, BuyOrder, User, Lead } from '../../data';
import prisma from '../../lib/prisma';

export function getAnalytics() {
  const paidOrders = buy_orders.filter((o) => o.status === 'paid');
  
  let revenue = 0;
  for (const o of paidOrders) {
    const ids = o.listingIds || [];
    for (const id of ids) {
      const listing = listings.find((l) => l.id === id);
      if (listing) {
        revenue += listing.price;
      }
    }
  }

  return {
    totalUsers: users.length,
    totalListings: listings.length,
    activeListings: listings.filter((l) => l.status === 'active').length,
    pendingListings: listings.filter((l) => l.status === 'pending').length,
    totalOrders: buy_orders.length,
    revenue,
    ordersByStatus: {
      pending: buy_orders.filter((o) => o.status === 'pending').length,
      paid: buy_orders.filter((o) => o.status === 'paid').length,
    },
  };
}

export function getListings(): Listing[] {
  return listings.map(enrichListing);
}

export function getOrders(): BuyOrder[] {
  return buy_orders;
}

export function getFraudListings(): Listing[] {
  return listings.filter((l) => l.status === 'rejected');
}

export function approveListing(id: string): Listing | null {
  const listing = listings.find((l) => l.id === id);
  if (!listing) return null;
  listing.status = 'active';
  return listing;
}

export function rejectListing(id: string): Listing | null {
  const listing = listings.find((l) => l.id === id);
  if (!listing) return null;
  listing.status = 'rejected';
  return listing;
}

export function getUsers(): User[] {
  return users;
}

import twilio from 'twilio';

export async function getLeads() {
  return await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateLeadStatus(id: string, status: string) {
  const lead = await prisma.lead.update({
    where: { id },
    data: { status }
  });

  // Automated SMS Notifications using Twilio
  try {
    if (status === 'processing' || status === 'email sent' || status === 'follow-up 1') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && fromPhone) {
        const client = twilio(accountSid, authToken);
        let messageBody = `Hi ${lead.name || 'there'}! Your Fhoneify device pickup is now: ${status.toUpperCase()}.`;
        
        if (status === 'processing') {
          messageBody = `Hi ${lead.name || 'there'}! We are currently processing your device pickup request for your ${lead.brand} ${lead.model}. Fhoneify team.`;
        } else if (status === 'email sent') {
          messageBody = `Hi ${lead.name || 'there'}, we've sent you an email regarding your Fhoneify pickup. Please check your inbox!`;
        }

        await client.messages.create({
          body: messageBody,
          from: fromPhone,
          // Assuming Indian phone numbers since currency is ₹ in the app
          to: lead.phone.startsWith('+') ? lead.phone : `+91${lead.phone}` 
        });
        console.log(`[Twilio] Sent SMS to ${lead.phone} for status ${status}`);
      } else {
        console.log(`[Twilio Mock] Would have sent SMS to ${lead.phone} for status ${status}. Missing Twilio credentials in .env`);
      }
    }
  } catch (err: any) {
    console.error('[Twilio Error] Failed to send SMS:', err.message);
  }

  return lead;
}
