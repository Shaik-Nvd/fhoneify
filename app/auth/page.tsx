'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('+91 ');
  const [code, setCode] = useState('');
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const apiPost = async (route: string, body: object) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const r = await fetch(`${baseUrl}/api/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: 'Sending WhatsApp OTP...', isError: false });
    
    // Remove spaces before sending to API
    const formattedPhone = phone.replace(/\s+/g, '');
    const data = await apiPost('auth/otp/send', { phone: formattedPhone });
    
    if (data.bypassCode) {
       setMsg({ text: `WhatsApp failed! Use this temporary bypass code: ${data.bypassCode}`, isError: true });
       setIsCodeStep(true);
    } else if (data.error) {
       setMsg({ text: data.error, isError: true });
    } else {
       setMsg({ text: 'Check your WhatsApp for the code!', isError: false });
       setIsCodeStep(true);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove spaces before verifying
    const formattedPhone = phone.replace(/\s+/g, '');
    const result = await apiPost('auth/otp/verify', { phone: formattedPhone, code });
    if (result.error) return setMsg({ text: result.error, isError: true });
    
    if (result.success && result.data) {
      const { accessToken, refreshToken, user } = result.data;
      setAuth({ id: user.id, phone: user.phone, role: user.role, email: user.email }, accessToken, refreshToken);
      setMsg({ text: 'Access granted! Redirecting...', isError: false });
      router.push(user.role === 'admin' ? '/admin' : '/');
    } else {
      setMsg({ text: 'Invalid code. Please try again.', isError: true });
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0a]">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] p-8 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden"
      >
        <div className="text-center mb-10 relative z-10">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/25 border border-amber-300/30"
          >
            <svg className="w-8 h-8 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Secure Login</h1>
          <p className="text-gray-400 mt-3 text-sm font-medium">Verify your identity with WhatsApp</p>
        </div>

        <AnimatePresence mode="wait">
          {msg.text && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={`mb-8 p-4 rounded-xl text-sm font-medium border relative z-10 flex items-center gap-3 ${msg.isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}
            >
              {msg.isError ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {!isCodeStep ? (
            <motion.form 
              key="phone-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleRequest} 
              className="space-y-6 relative z-10"
            >
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 ml-1">Phone Number</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="+1 (234) 567-8900" 
                    className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner" 
                    required 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-4 rounded-xl hover:from-emerald-400 hover:to-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 group"
              >
                <span>Send WhatsApp OTP</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="code-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleVerify} 
              className="space-y-6 relative z-10"
            >
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 ml-1">Verification Code</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  value={code} 
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))} 
                  placeholder="000000" 
                  className="w-full py-5 bg-black/40 border border-white/10 rounded-xl text-white text-center tracking-[1em] text-3xl font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner placeholder-gray-700/50" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-[#0a0a0a] font-bold py-4 rounded-xl hover:from-amber-400 hover:to-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]"
              >
                Confirm Code
              </button>
              <button 
                type="button" 
                onClick={() => { setIsCodeStep(false); setMsg({text: '', isError: false}); }} 
                className="block w-full text-sm text-center text-gray-500 hover:text-gray-300 transition-colors pt-2"
              >
                Entered wrong number? <span className="underline decoration-gray-600 underline-offset-4">Change it</span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
