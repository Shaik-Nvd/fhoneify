'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { useCartStore } from '@/lib/cartStore';
import { formatCurrency } from '@/lib/format';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, removeItem, clearCart, totalPrice } = useCartStore();
  
  const [address, setAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/api/wallet/dashboard').then(res => {
        if (res.data?.data?.coupons) {
          setActiveCoupons(res.data.data.coupons);
        }
      }).catch(console.error);
    }
  }, [isAuthenticated]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!address) {
      setError('Please provide a delivery address.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/api/buy/orders', {
        address,
        couponCode: couponCode || undefined
      });
      clearCart();
      setSuccess(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', maxWidth: '40rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 className="page-title" style={{ marginBottom: '1rem' }}>Order Placed!</h1>
          <p style={{ color: '#a0a0a0', marginBottom: '1rem' }}>
            Your order has been placed successfully. Order ID: <strong>{success.id}</strong>
          </p>
          <div style={{ backgroundColor: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'inline-block' }}>
            <span style={{ color: '#34C759', fontWeight: 600 }}>Earned 2% Cashback!</span><br/>
            <span style={{ fontSize: '0.9rem', color: '#a0a0a0' }}>Check your wallet to view your rewards.</span>
          </div>
          <br/>
          <Link href="/wallet" className="btn-primary" style={{ display: 'inline-block', padding: '14px 24px', marginRight: '1rem' }}>
            Go to Wallet
          </Link>
          <Link href="/buy" className="btn-outline" style={{ display: 'inline-block', padding: '14px 24px' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '64rem' }}>
      <h1 className="page-title" style={{ marginBottom: '2rem' }}>Your Cart</h1>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</p>
          <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>Your cart is empty.</p>
          <Link href="/buy" className="btn-primary" style={{ padding: '12px 24px' }}>Browse Phones</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map(item => (
              <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '2rem' }}>📱</div>
                  <div>
                    <h3 style={{ fontWeight: 600, color: '#fff' }}>{item.brand} {item.model}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>{item.storage} · {item.condition}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="price-gold" style={{ fontSize: '1.25rem' }}>{formatCurrency(item.price)}</p>
                  <button onClick={() => removeItem(item.id)} style={{ color: '#FF3B30', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: '1 1 35%', minWidth: '300px' }}>
            <form onSubmit={handleCheckout} className="card" style={{ position: 'sticky', top: '5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#fff', borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem' }}>Order Summary</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0a0a0' }}>
                <span>Subtotal ({items.length} items)</span>
                <span>{formatCurrency(totalPrice())}</span>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: '#d4af37', fontWeight: 600, marginBottom: '0.5rem' }}>Margin GST Breakdown</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>
                  <span>Estimated Buyback Cost (70%)</span>
                  <span>{formatCurrency(totalPrice() * 0.7)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>
                  <span>Taxable Margin (30%)</span>
                  <span>{formatCurrency(totalPrice() * 0.3)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a0a0a0' }}>
                  <span>GST (18% on Margin)*</span>
                  <span>{formatCurrency(totalPrice() * 0.3 * 0.18)}</span>
                </div>
                <p style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.5rem' }}>*Taxes are already included in the final price.</p>
              </div>

              {isAuthenticated && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Have a Promo Code?</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      style={{ flex: 1 }}
                    />
                  </div>
                  {activeCoupons.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>Available Coupons:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {activeCoupons.map(c => (
                          <span 
                            key={c.code} 
                            onClick={() => setCouponCode(c.code)}
                            style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px dashed #d4af37', cursor: 'pointer' }}
                          >
                            {c.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 700, fontSize: '1.25rem', borderTop: '1px solid #2a2a2a', paddingTop: '1rem' }}>
                <span>Total</span>
                <span className="price-gold">{formatCurrency(totalPrice())}</span>
              </div>

              {error && <div className="alert-error">{error}</div>}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Delivery Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter complete shipping address"
                  rows={3}
                  style={{ width: '100%', resize: 'none' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', opacity: (loading || items.length === 0) ? 0.5 : 1 }}
              >
                {loading ? 'Processing...' : (isAuthenticated ? 'Place Order' : 'Login to Checkout')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
