export const B2BService = {
  // Simulate fetching wholesale auction lots
  async getAuctions() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 'AUC-1001',
        title: 'Mixed Apple Lot (50 Units)',
        condition: 'As-Is / Un-refurbished',
        currentBid: 450000,
        endsIn: '2h 15m',
        bids: 12
      },
      {
        id: 'AUC-1002',
        title: 'Samsung Galaxy Assorted (25 Units)',
        condition: 'Screen Damage / Parts Only',
        currentBid: 120000,
        endsIn: '5h 30m',
        bids: 8
      }
    ];
  },

  // Simulate fetching consumer leads for local dealers
  async getLeads(partnerLocation: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 'LEAD-901',
        device: 'iPhone 13 Pro (128GB)',
        location: 'Kalyan Nagar, Bengaluru',
        customerQuote: 42000,
        leadCost: 250, // Wallet deduction to claim this lead
        status: 'available'
      },
      {
        id: 'LEAD-902',
        device: 'OnePlus 11R',
        location: 'HBR Layout, Bengaluru',
        customerQuote: 28000,
        leadCost: 150,
        status: 'available'
      }
    ];
  },

  // Simulate dealer wallet
  async getWallet(partnerId: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      partnerId,
      balance: 15500, // Pre-paid security deposit / lead credit
      totalLeadsClaimed: 45,
      totalLotsWon: 3
    };
  },

  async claimLead(partnerId: string, leadId: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: 'Lead claimed successfully. ₹250 deducted from wallet.' };
  },

  async placeBid(partnerId: string, auctionId: string, bidAmount: number) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: `Bid of ₹${bidAmount} placed successfully.` };
  }
};
