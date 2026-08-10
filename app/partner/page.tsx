'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';

export default function PartnerDashboard() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [aucRes, leadRes, walletRes] = await Promise.all([
          api.get('/api/b2b/auctions'),
          api.get('/api/b2b/leads'),
          api.get('/api/b2b/wallet')
        ]);
        setAuctions(aucRes.data.data);
        setLeads(leadRes.data.data);
        setWallet(walletRes.data.data);
      } catch (err) {
        console.error('Failed to fetch B2B data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleClaimLead = async (leadId: string) => {
    try {
      await api.post('/api/b2b/leads/claim', { leadId });
      alert('Lead claimed successfully!');
      // Optimistic update
      setLeads(leads.filter(l => l.id !== leadId));
      setWallet((prev: any) => ({ ...prev, balance: prev.balance - 250 }));
    } catch (err) {
      alert('Failed to claim lead');
    }
  };

  const handlePlaceBid = async (auctionId: string, currentBid: number) => {
    try {
      const bidAmount = currentBid + 10000;
      await api.post('/api/b2b/auctions/bid', { auctionId, amount: bidAmount });
      alert(`Bid of ${formatCurrency(bidAmount)} placed successfully!`);
      // Optimistic update
      setAuctions(auctions.map(a => a.id === auctionId ? { ...a, currentBid: bidAmount, bids: a.bids + 1 } : a));
    } catch (err) {
      alert('Failed to place bid');
    }
  };

  if (loading) {
    return <div className="page-animate" style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem' }}>Loading B2B Data...</div>;
  }

  return (
    <div className="page-animate" style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Consumer Leads Engine */}
          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '1.5rem', color: 'var(--foreground)' }}>Local Buyback Leads</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {leads.map(lead => (
                <div key={lead.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: 'var(--foreground)', fontSize: '1.1rem', fontWeight: 600 }}>{lead.device}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>📍 {lead.location} · Expected Quote: {formatCurrency(lead.customerQuote)}</p>
                  </div>
                  <button onClick={() => handleClaimLead(lead.id)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    Claim ({formatCurrency(lead.leadCost)})
                  </button>
                </div>
              ))}
              {leads.length === 0 && <p style={{ color: 'var(--muted)' }}>No local leads available right now.</p>}
            </div>
          </section>

          {/* Bulk Auctions */}
          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '1.5rem', color: 'var(--foreground)' }}>Wholesale Auctions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {auctions.map(auction => (
                <div key={auction.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ color: 'var(--foreground)', fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3 }}>{auction.title}</h3>
                      <span className="badge badge-info">{auction.bids} Bids</span>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Condition: {auction.condition}</p>
                  </div>
                  
                  <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Current Bid</p>
                    <p style={{ fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 700 }}>{formatCurrency(auction.currentBid)}</p>
                    <p style={{ fontSize: '0.8rem', color: '#FF3B30', marginTop: '0.5rem' }}>Ends in {auction.endsIn}</p>
                  </div>

                  <button onClick={() => handlePlaceBid(auction.id, auction.currentBid)} className="btn-secondary" style={{ width: '100%', padding: '10px' }}>
                    Place Bid
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Dealer Wallet Sidebar */}
        <aside>
          <div className="card" style={{ position: 'sticky', top: '2rem', border: '1px solid rgba(212,175,55,0.3)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dealer Wallet</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Available Balance</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>{formatCurrency(wallet?.balance || 0)}</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Leads Claimed</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{wallet?.totalLeadsClaimed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Lots Won</span>
                <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{wallet?.totalLotsWon}</span>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '12px' }}>
              Top-up Balance
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}
