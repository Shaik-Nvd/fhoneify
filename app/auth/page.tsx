'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    try {
      setLoading(true); setError(null);
      const formattedPhone = '+91' + phone;
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  useEffect(() => {
    if (step === 'otp') inputRefs.current[0]?.focus();
  }, [step]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    try {
      setLoading(true); setError(null);
      if (!confirmationResult) throw new Error("Please request OTP again");
      
      const result = await confirmationResult.confirm(otpStr);
      const firebaseToken = await result.user.getIdToken();
      
      const res = await api.post('/api/auth/otp/verify', { phone, firebaseToken });
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth({ id: user.id, phone: user.phone, role: user.role, email: user.email }, accessToken, refreshToken);
      router.push(user.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || 'Invalid OTP';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="page-animate" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d4af37', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>FHONEIFY</p>
          <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>{step === 'phone' ? 'Enter your phone to get started' : 'Enter the 6-digit code'}</p>
        </div>

        <div id="recaptcha-container"></div>

        {error && <div className="alert-error">{error}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0a0a0', fontSize: '0.875rem', fontWeight: 500, borderRight: '1px solid #2a2a2a', paddingRight: '10px' }}>+91</span>
                <input
                  id="phone" type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210" style={{ width: '100%', paddingLeft: '4.5rem' }}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', opacity: loading ? 0.4 : 1 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#666' }}>OTP is printed in the backend terminal (dev mode)</p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>OTP sent to <strong style={{ color: '#fff' }}>{phone}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{
                    width: '48px', height: '56px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 700,
                    borderRadius: '10px', border: digit ? '2px solid #d4af37' : '2px solid #2a2a2a',
                    backgroundColor: digit ? 'rgba(212,175,55,0.08)' : '#0a0a0a', color: '#fff',
                    outline: 'none', transition: 'all 200ms',
                  }}
                />
              ))}
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', opacity: loading ? 0.4 : 1 }}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button type="button" onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(null); }} className="text-link" style={{ fontSize: '0.85rem', background: 'none', border: 'none' }}>
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
