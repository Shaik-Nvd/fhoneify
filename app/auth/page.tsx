'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const apiPost = async (route: string, body: object) => {
    const r = await fetch(`http://localhost:4000/api/${route}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await apiPost('auth/otp/send', { phone });
    if (data.error) return setMsg({ text: data.error, isError: true });
    setIsCodeStep(true);
    setMsg({ text: 'Check your WhatsApp!', isError: false });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiPost('auth/otp/verify', { phone, code });
    if (result.error) return setMsg({ text: result.error, isError: true });
    
    if (result.success && result.data) {
      const { accessToken, refreshToken, user } = result.data;
      setAuth({ id: user.id, phone: user.phone, role: user.role, email: user.email }, accessToken, refreshToken);
      setMsg({ text: 'Login verified completely! Redirecting...', isError: false });
      router.push(user.role === 'admin' ? '/admin' : '/');
    } else {
      setMsg({ text: 'Failed to verify login.', isError: true });
    }
  };

  return (
    <div className="p-8 max-w-sm mx-auto border rounded mt-12 bg-white text-black shadow-md">
      <h1 className="text-xl font-semibold mb-4">Secure Gateway</h1>
      {msg.text && <p className={`mb-3 p-2 rounded text-sm ${msg.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{msg.text}</p>}
      
      {!isCodeStep ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" className="w-full p-2 border rounded" required />
          <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700">Send WhatsApp OTP</button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value)} placeholder="000000" className="w-full p-2 border text-center tracking-widest text-lg rounded font-mono" required />
          <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Confirm Code</button>
          <button type="button" onClick={() => setIsCodeStep(false)} className="block text-xs text-center text-gray-500 mx-auto underline">Change Number</button>
        </form>
      )}
    </div>
  );
}
