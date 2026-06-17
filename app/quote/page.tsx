'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/lib/authStore';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

import { BRAND_LOGOS, getBrandLogoStyle } from '@/lib/brands';

export interface Device {
  id: string;
  brand: string;
  model: string;
  storage: string;
  ram?: string;
  color?: string;
}

function normalizeDevice(raw: Record<string, unknown>): Device {
  return {
    id: String(raw.id ?? ''),
    brand: String(raw.brand ?? ''),
    model: String(raw.model ?? ''),
    storage: String(raw.storage ?? ''),
    ram: raw.ram != null ? String(raw.ram) : undefined,
    color: raw.color != null ? String(raw.color) : undefined,
  };
}

function extractDevices(payload: unknown): Device[] {
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data.map((row) => normalizeDevice(row as Record<string, unknown>));
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const inner = obj.data as Record<string, unknown>;
    if (Array.isArray(inner.devices)) return inner.devices.map((row) => normalizeDevice(row as Record<string, unknown>));
  }
  if (Array.isArray(payload)) return payload.map((row) => normalizeDevice(row as Record<string, unknown>));
  return [];
}

// Icons for the UI using basic SVGs
const ArrowRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;

export default function QuotePage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { isAuthenticated } = useHydratedAuth();
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectionStage, setSelectionStage] = useState<'brand'|'model'|'storage'>('brand');
  
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const sBrand = params.get('brand') || '';
      const sModel = params.get('model') || '';
      const sStorage = params.get('storage') || '';
      const sStep = parseInt(params.get('step') || '1', 10);
      
      let stage = params.get('stage') as any;
      if (!stage) {
        if (sModel) stage = 'storage';
        else if (sBrand) stage = 'model';
        else stage = 'brand';
      }

      setSelectedBrand(sBrand);
      setSelectedModel(sModel);
      setSelectedStorage(sStorage);
      setStep(sStep);
      setSelectionStage(stage);
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToState = (newBrand: string, newModel: string, newStorage: string, newStage: string, newStep: number) => {
    const params = new URLSearchParams();
    if (newBrand) params.set('brand', newBrand);
    if (newModel) params.set('model', newModel);
    if (newStorage) params.set('storage', newStorage);
    if (newStage) params.set('stage', newStage);
    if (newStep > 1) params.set('step', newStep.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    
    // Pass existing history state so Next.js App Router doesn't break on back navigation
    window.history.pushState(window.history.state, '', newUrl);

    setSelectedBrand(newBrand);
    setSelectedModel(newModel);
    setSelectedStorage(newStorage);
    setSelectionStage(newStage as any);
    setStep(newStep);
  };

    if (selectedModel) {
      document.title = `Sell ${selectedBrand} ${selectedModel} | Fhoneify`;
    } else if (selectedBrand) {
      document.title = `Sell ${selectedBrand} | Fhoneify`;
    } else {
      document.title = 'Get a Quote | Fhoneify';
    }
  }, [selectedBrand, selectedModel]);

  // New 8-stage flow: 1: Select, 2: BasePrice, 3: BasicQ, 4: Defects, 5: Hardware, 6: Accessories, 7: LeadCapture, 8: FinalPrice
  const [step, setStep] = useState(1);
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState({
    calls: null as boolean | null,
    touch: null as boolean | null,
    originalScreen: null as boolean | null,
    defects: [] as string[],
    hardware: [] as string[],
    accessories: [] as string[]
  });

  // Lead Capture State
  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const cached = localStorage.getItem('fhoneify-devices-cache');
        const cacheTime = localStorage.getItem('fhoneify-devices-time');
        const now = Date.now();
        
        let hasValidCache = false;
        if (cached && cacheTime && now - parseInt(cacheTime) < 1000 * 60 * 60 * 24) {
          // Use cache immediately
          setAllDevices(extractDevices(JSON.parse(cached)));
          setLoading(false);
          hasValidCache = true;
        } else {
          setLoading(true);
        }
        
        setError(null);
        
        // Fetch fresh data
        const refreshData = async () => {
          const response = await api.get('/api/quote/devices');
          setAllDevices(extractDevices(response.data));
          try {
            localStorage.setItem('fhoneify-devices-cache', JSON.stringify(response.data));
            localStorage.setItem('fhoneify-devices-time', Date.now().toString());
          } catch (e) {
            // Ignore quota errors
          }
        };

        if (!hasValidCache) {
          await refreshData();
          setLoading(false);
        } else {
          // Refresh silently in background
          refreshData().catch(() => {});
        }
      } catch {
        setError('Failed to load devices.');
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

  const brands = useMemo(() => {
    const extracted = [...new Set(allDevices.map((d) => d.brand).filter(Boolean))];
    if (extracted.length === 0) return Object.keys(BRAND_LOGOS).sort();
    return extracted.sort();
  }, [allDevices]);
  const models = useMemo(() => {
    if (!selectedBrand) return [];
    const brandModels = [...new Set(allDevices.filter((d) => d.brand === selectedBrand).map((d) => d.model).filter(Boolean))];
    
    if (selectedBrand === 'Apple') {
      const appleOrder = [
        "Apple iPhone 6", "Apple iPhone 6 Plus", "Apple iPhone 6S", "Apple iPhone 6S Plus", "Apple iPhone SE 1st Generation",
        "Apple iPhone 7", "Apple iPhone 7 Plus", "Apple iPhone 8", "Apple iPhone 8 Plus", "Apple iPhone X", "Apple iPhone XR",
        "Apple iPhone XS", "Apple iPhone XS Max", "Apple iPhone 11", "Apple iPhone 11 Pro", "Apple iPhone 11 Pro Max",
        "Apple iPhone SE 2020", "Apple iPhone 12 Mini", "Apple iPhone 12", "Apple iPhone 12 Pro", "Apple iPhone 12 Pro Max",
        "Apple iPhone 13 Mini", "Apple iPhone 13", "Apple iPhone 13 Pro", "Apple iPhone 13 Pro Max", "Apple iPhone SE 2022",
        "Apple iPhone 14", "Apple iPhone 14 Plus", "Apple iPhone 14 Pro", "Apple iPhone 14 Pro Max", "Apple iPhone 15",
        "Apple iPhone 15 Plus", "Apple iPhone 15 Pro", "Apple iPhone 15 Pro Max", "Apple iPhone 16", "Apple iPhone 16 Plus",
        "Apple iPhone 16 Pro", "Apple iPhone 16 Pro Max", "Apple iPhone 16e", "Apple iPhone 17", "Apple iPhone Air",
        "Apple iPhone 17 Pro", "Apple iPhone 17 Pro Max", "Apple iPhone 17e"
      ];
      return brandModels.sort((a, b) => {
        const indexA = appleOrder.indexOf(a);
        const indexB = appleOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return brandModels.sort();
  }, [allDevices, selectedBrand]);
  const storageOptions = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    
    const availableVariants = allDevices.filter((d) => d.brand === selectedBrand && d.model === selectedModel);
    const storageList = Array.from(new Set(availableVariants.map((d) => d.storage).filter(Boolean)));
    
    const parseStorage = (s: string) => {
      // s might be "4GB / 128GB" or "128GB"
      const valStr = s.includes('/') ? s.split('/')[1].trim() : s;
      const val = parseFloat(valStr);
      if (isNaN(val)) return -1;
      if (valStr.includes('TB')) return val * 1024;
      if (valStr.includes('GB')) return val;
      if (valStr.includes('MB')) return val / 1024;
      return val;
    };
    
    return storageList.sort((a, b) => parseStorage(a) - parseStorage(b));
  }, [allDevices, selectedBrand, selectedModel]);

  const selectedDevice = useMemo(() => {
    if (!selectedBrand || !selectedModel || !selectedStorage) return null;
    return allDevices.find((d) => {
      const combinedStorage = d.storage;
      return d.brand === selectedBrand && d.model === selectedModel && combinedStorage === selectedStorage;
    }) ?? null;
  }, [allDevices, selectedBrand, selectedModel, selectedStorage]);

  const handleBrandSelect = (b: string) => { navigateToState(b, '', '', 'model', 1); };
  const handleModelSelect = (m: string) => { navigateToState(selectedBrand, m, '', 'storage', 1); };
  const handleStorageSelect = (s: string) => { navigateToState(selectedBrand, selectedModel, s, 'storage', 1); };

  const handleFetchBasePrice = async () => {
    if (!selectedDevice) return;
    try {
      setLoading(true);
      // Fetch base quote assuming flawless condition
      const response = await api.post('/api/quote', { deviceId: selectedDevice.id, condition: 'like_new', storage: selectedDevice.storage });
      const rawPrice = response.data?.data?.upliftedBasePrice ?? response.data?.data?.estimatedPrice ?? response.data?.data?.estimated_price;
      
      let computedBase = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);
      
      setBasePrice(Math.round(computedBase));
      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 2);
    } catch {
      setError('Failed to fetch quote.');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (key: 'defects' | 'hardware' | 'accessories', val: string) => {
    setDiagnostics(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val] };
    });
  };

  const calculateFinalPrice = () => {
    if (!basePrice) return;
    let price = basePrice;
    
    let multiplier = 1.0;
    
    // Evaluate condition tier based on diagnostics
    const hasSevereIssues = diagnostics.calls === false || diagnostics.touch === false || diagnostics.hardware.length > 1;
    const hasModerateIssues = diagnostics.originalScreen === false || diagnostics.defects.includes('Display broken') || diagnostics.defects.includes('Back glass broken');
    const hasMinorIssues = diagnostics.defects.length > 0 || diagnostics.hardware.length === 1;

    if (hasSevereIssues) {
      multiplier = 0.40; // Poor
    } else if (hasModerateIssues) {
      multiplier = 0.65; // Fair
    } else if (hasMinorIssues) {
      multiplier = 0.85; // Good
    } else {
      multiplier = 1.0; // Flawless / Like New
    }
    
    price *= multiplier;
    
    setFinalPrice(Math.max(Math.round(price), 500)); // Minimum ₹500
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone || userPhone.length < 10) { setAuthError('Enter a valid 10-digit phone number'); return; }
    try {
      setIsAuthLoading(true); setAuthError(null);
      const res = await api.post('/api/auth/otp/send', { phone: userPhone });
      if (res.data?.data?.otp) alert(`DEV MODE OTP: ${res.data.data.otp}`);
      setShowOtpInput(true);
    } catch (err: any) {
      setAuthError(err?.response?.data?.error || 'Failed to send OTP');
    } finally { setIsAuthLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4 && otp.length !== 6) { setAuthError('Enter a valid OTP'); return; }
    try {
      setIsAuthLoading(true); setAuthError(null);
      const res = await api.post('/api/auth/otp/verify', { phone: userPhone, otp });
      const { accessToken, refreshToken, user, isNewUser } = res.data.data;
      
      // Save tokens so next request is authenticated
      setAuth({ id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email }, accessToken, refreshToken);
      calculateFinalPrice();
      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 8);
    } catch (err: any) {
      setAuthError(err?.response?.data?.error || 'Invalid OTP');
    } finally { setIsAuthLoading(false); }
  };

  const SidebarSummary = () => (
    <div className="w-full md:max-w-[300px] shrink-0 bg-white border border-[#e0e0e0] rounded-xl p-6 md:sticky md:top-8 text-black mb-8 md:mb-0">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '40px', height: '60px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedModel.startsWith(selectedBrand) ? selectedModel : `${selectedBrand} ${selectedModel}`} ({selectedStorage})</span>
      </div>
      
      <h3 style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>Device Evaluation</h3>
      
      {diagnostics.calls !== null && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#999', fontSize: '0.75rem' }}>Make/Receive Calls</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.calls ? 'Yes' : 'No'}</p>
        </div>
      )}
      {diagnostics.touch !== null && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#999', fontSize: '0.75rem' }}>Touch Working</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.touch ? 'Yes' : 'No'}</p>
        </div>
      )}
      {diagnostics.originalScreen !== null && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#999', fontSize: '0.75rem' }}>Screen Original</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.originalScreen ? 'Yes' : 'No'}</p>
        </div>
      )}
      {diagnostics.defects.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#999', fontSize: '0.75rem' }}>Defects</p>
          <p style={{ color: '#FF3B30', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.defects.length} selected</p>
        </div>
      )}
      {diagnostics.hardware.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#999', fontSize: '0.75rem' }}>Hardware Issues</p>
          <p style={{ color: '#FF3B30', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.hardware.length} selected</p>
        </div>
      )}
      {diagnostics.accessories.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#999', fontSize: '0.75rem' }}>Accessories</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.accessories.length} available</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-animate" style={{ maxWidth: step > 2 ? '1000px' : '40rem', margin: '0 auto', padding: '3rem 1rem' }}>
      
      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* STAGE 1: DEVICE SELECTION */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h1 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 300, color: '#fff', marginBottom: '0.5rem' }}>Get Your Quote</h1>
          <p style={{ textAlign: 'center', color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '2rem' }}>Select your device to get an instant price estimate</p>

          {selectionStage === 'brand' && (
            <>
              <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>Select Brand</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                {brands.length === 0 ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="card skeleton" style={{ height: '110px', borderRadius: '12px', border: '1px solid #2a2a2a' }}></div>
                  ))
                ) : (
                  brands.map((b) => (
                    <button key={b} onClick={() => handleBrandSelect(b)} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem 1rem', border: '1px solid #2a2a2a', backgroundColor: '#111', borderRadius: '12px', cursor: 'pointer', transition: 'all 200ms' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4CD964'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                      <img src={BRAND_LOGOS[b] || '/images/placeholder-phone.svg'} alt={b} style={getBrandLogoStyle(b)} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff' }}>{b}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {selectionStage === 'model' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>Select Model</h2>
                <button onClick={() => navigateToState('', '', '', 'brand', 1)} style={{ color: '#4CD964', background: 'none', border: 'none', cursor: 'pointer' }}>Change Brand</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {models.map((m) => (
                  <button key={m} onClick={() => handleModelSelect(m)} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid #2a2a2a', backgroundColor: '#111', borderRadius: '12px', cursor: 'pointer' }}>
                    <img src={`/images/models/${m.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={m} style={{ width: '70px', height: '100px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
                    <span style={{ fontSize: '0.8rem', color: '#fff', textAlign: 'center' }}>{m}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {selectionStage === 'storage' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>Select Storage</h2>
                <button onClick={() => navigateToState(selectedBrand, '', '', 'model', 1)} style={{ color: '#4CD964', background: 'none', border: 'none', cursor: 'pointer' }}>Change Model</button>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #2a2a2a', backgroundColor: '#111' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '60px', height: '80px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
                  <div><p style={{ color: '#a0a0a0', fontSize: '0.8rem' }}>{selectedBrand}</p><h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{selectedModel}</h3></div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {storageOptions.map((s) => (
                    <button key={s} onClick={() => handleStorageSelect(s)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: selectedStorage === s ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: selectedStorage === s ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: selectedStorage === s ? '#4CD964' : '#fff', cursor: 'pointer' }}>{s}</button>
                  ))}
                </div>
                <button onClick={handleFetchBasePrice} disabled={!selectedDevice || loading} className="btn-primary" style={{ padding: '14px', marginTop: '1rem', background: '#4CD964', color: '#000', fontWeight: 600, opacity: selectedDevice && !loading ? 1 : 0.5 }}>{loading ? 'Loading...' : 'Get Exact Value'}</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STAGE 2: BASE PRICE SCREEN */}
      {step === 2 && (
        <div className="card flex flex-col md:flex-row items-center gap-6 md:gap-12 p-6 md:p-12 bg-white border border-[#e0e0e0] rounded-xl max-w-[700px] mx-auto text-center md:text-left">
          <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '120px', height: '180px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
          <div className="flex flex-col gap-2 flex-1 w-full text-black items-center md:items-start">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 500 }}>Sell Old {selectedModel.startsWith(selectedBrand) ? selectedModel : `${selectedBrand} ${selectedModel}`} ({selectedStorage})</h2>
            <p style={{ color: '#666', fontSize: '1rem', marginTop: '1rem' }}>Get Upto</p>
            <p style={{ fontSize: '3rem', fontWeight: 700, color: '#FF4C4C' }}>{formatCurrency(basePrice || 0)}</p>
            <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 3)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#4CD964', color: '#fff', fontWeight: 600, marginTop: '1.5rem', width: 'fit-content', padding: '1rem 2rem', borderRadius: '8px' }}>
              Get Exact Value <ArrowRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* STAGES 3-6: MULTI-STEP QUESTIONNAIRE (2 COLUMN LAYOUT) */}
      {step >= 2 && step <= 6 && (
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start w-full" style={{ marginTop: '2.5rem' }}>
          
          <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
            
            {/* STAGE 3: BASIC YES/NO */}
            {step === 3 && (
              <div className="card bg-white text-black p-6 md:p-12 rounded-lg border border-[#e0e0e0]">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tell us more about your device?</h2>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginBottom: '3rem' }}>Please answer a few questions about your device.</p>
                
                {[
                  { id: 'calls', title: 'Are you able to make and receive calls?', desc: 'Check your device for cellular network connectivity issues.' },
                  { id: 'touch', title: 'Is your device\'s touch screen working properly?', desc: 'Check the touch screen functionality of your phone.' },
                  { id: 'originalScreen', title: 'Is your phone\'s screen original?', desc: 'Pick "Yes" if screen was never changed. Pick "No" if screen was changed.' }
                ].map((q) => (
                  <div key={q.id} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{q.title}</h3>
                    <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1.25rem' }}>{q.desc}</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => setDiagnostics({ ...diagnostics, [q.id]: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === true ? '#e8f5e9' : '#fafafa', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === true ? '#4CD964' : 'transparent' }} /> Yes
                      </button>
                      <button onClick={() => setDiagnostics({ ...diagnostics, [q.id]: false })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === false ? '#ffebee' : '#fafafa', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === false ? '#FF3B30' : 'transparent' }} /> No
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 4)} disabled={diagnostics.calls === null || diagnostics.touch === null || diagnostics.originalScreen === null} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.calls !== null && diagnostics.touch !== null && diagnostics.originalScreen !== null) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 4: DEFECTS */}
            {step === 4 && (
              <div className="card bg-white text-black p-6 md:p-12 rounded-lg border border-[#e0e0e0]">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Select screen/body defects that are applicable!</h2>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginBottom: '3rem' }}>Please provide correct details</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'screen_scratch', label: 'Broken/scratch on device screen', icon: '📱' },
                    { id: 'screen_spot', label: 'Dead Spot/Visible line and Discoloration', icon: '📲' },
                    { id: 'body_scratch', label: 'Scratch/Dent on device body', icon: '📏' },
                    { id: 'panel_missing', label: 'Device panel missing/broken', icon: '🔧' }
                  ].map((d) => (
                    <button key={d.id} onClick={() => toggleArrayItem('defects', d.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 1rem', borderRadius: '8px', border: diagnostics.defects.includes(d.id) ? '2px solid #4CD964' : '1px solid #e0e0e0', backgroundColor: diagnostics.defects.includes(d.id) ? '#f0fdf4' : '#fafafa', cursor: 'pointer' }}>
                      <span style={{ fontSize: '3rem' }}>{d.icon}</span>
                      <span style={{ fontSize: '0.8rem', textAlign: 'center', fontWeight: 500, lineHeight: 1.4 }}>{d.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 5)} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px' }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 5: HARDWARE */}
            {step === 5 && (
              <div className="card bg-white text-black p-6 md:p-12 rounded-lg border border-[#e0e0e0]">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Functional or Physical Problems</h2>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginBottom: '3rem' }}>Please choose appropriate condition to get accurate quote</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'front_camera', label: 'Front Camera not working', icon: '📸' },
                    { id: 'back_camera', label: 'Back Camera not working', icon: '📷' },
                    { id: 'volume', label: 'Volume Button not working', icon: '🔉' },
                    { id: 'fingerprint', label: 'Finger Touch not working', icon: '👆' },
                    { id: 'wifi', label: 'WiFi not working', icon: '📶' },
                    { id: 'speaker', label: 'Speaker Faulty', icon: '🔊' },
                    { id: 'silent', label: 'Silent Button not working', icon: '🔕' },
                    { id: 'face', label: 'Face Sensor not working', icon: '👱' },
                    { id: 'power', label: 'Power Button not working', icon: '⏻' },
                    { id: 'charging', label: 'Charging Port not working', icon: '🔌' },
                    { id: 'audio_receiver', label: 'Audio Receiver not working', icon: '📞' },
                    { id: 'camera_glass', label: 'Camera Glass Broken', icon: '🔍' },
                    { id: 'microphone', label: 'Microphone not working', icon: '🎤' },
                    { id: 'bluetooth', label: 'Bluetooth not working', icon: '🦷' },
                    { id: 'vibrator', label: 'Vibrator is not working', icon: '📳' },
                    { id: 'proximity', label: 'Proximity Sensor not working', icon: '🖐' },
                    { id: 'battery_service', label: 'Battery in Service (< 80%)', icon: '🔋' }
                  ].map((h) => (
                    <button key={h.id} onClick={() => toggleArrayItem('hardware', h.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0.5rem', borderRadius: '8px', border: diagnostics.hardware.includes(h.id) ? '2px solid #4CD964' : '1px solid #e0e0e0', backgroundColor: diagnostics.hardware.includes(h.id) ? '#f0fdf4' : '#fafafa', cursor: 'pointer' }}>
                      <span style={{ fontSize: '2.5rem' }}>{h.icon}</span>
                      <span style={{ fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>{h.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6)} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px' }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 6: ACCESSORIES */}
            {step === 6 && (
              <div className="card bg-white text-black p-6 md:p-12 rounded-lg border border-[#e0e0e0]">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Do you have the following?</h2>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginBottom: '3rem' }}>Please select accessories which are available</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'box', label: 'Original Box with same IMEI', icon: '📦' },
                    { id: 'bill', label: 'Valid Bill', icon: '🧾' },
                    { id: 'charger', label: 'Original Charger', icon: '🔌' }
                  ].map((a) => (
                    <button key={a.id} onClick={() => toggleArrayItem('accessories', a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 1rem', borderRadius: '8px', border: diagnostics.accessories.includes(a.id) ? '2px solid #4CD964' : '1px solid #e0e0e0', backgroundColor: diagnostics.accessories.includes(a.id) ? '#f0fdf4' : '#fafafa', cursor: 'pointer' }}>
                      <span style={{ fontSize: '4rem' }}>{a.icon}</span>
                      <span style={{ fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>{a.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => { if (isAuthenticated) { calculateFinalPrice(); navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 8); } else { navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7); } }} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px' }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}
          </div>
          
          {/* RIGHT SIDEBAR */}
          <SidebarSummary />
        </div>
      )}

      {/* STAGE 7: LEAD CAPTURE MODAL */}
      {step === 7 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] backdrop-blur-sm p-4">
          <div className="bg-white text-black rounded-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex-1 bg-[#4CD964] p-8 md:p-12 flex flex-col justify-center items-center text-white text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Login/Signup</h2>
              <span className="text-6xl md:text-8xl">🔐</span>
              <p className="mt-6 font-medium text-lg md:text-xl">Unlock the best price for your device instantly.</p>
            </div>

            <div className="flex-[1.5] p-6 md:p-12">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #e0e0e0', padding: '1rem 1.5rem', borderRadius: '8px', width: '100%' }}>
                  <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '40px', height: '60px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>{selectedModel.startsWith(selectedBrand) ? selectedModel : `${selectedBrand} ${selectedModel}`} ({selectedStorage})</p>
                    <p style={{ color: '#FF4C4C', fontSize: '1.75rem', fontWeight: 700 }}>₹ XX,XXX</p>
                  </div>
                </div>
                <button onClick={() => { navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6); setShowOtpInput(false); }} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', paddingLeft: '1rem', color: '#999', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ backgroundColor: '#e8f5e9', color: '#4CD964', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontWeight: 600, marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid #c8e6c9' }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span> Login to unlock the best price
              </div>

              <form onSubmit={showOtpInput ? handleOtpVerify : handleSendOtp}>
                {authError && <div style={{ color: '#FF4C4C', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{authError}</div>}
                
                {!showOtpInput ? (
                  <>
                    <div style={{ marginBottom: '2.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Phone Number</label>
                      <div style={{ display: 'flex', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, marginRight: '0.5rem', fontSize: '1.2rem' }}>+91</span>
                        <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter your Mobile" required style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1.2rem', backgroundColor: 'transparent', color: '#000' }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: '2.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Enter OTP sent to {userPhone}</label>
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" required style={{ border: 'none', borderBottom: '2px solid #ccc', outline: 'none', width: '100%', fontSize: '2rem', paddingBottom: '0.5rem', textAlign: 'center', letterSpacing: '1rem', backgroundColor: 'transparent', color: '#000' }} />
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                      <button type="button" onClick={handleSendOtp} disabled={isAuthLoading} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: isAuthLoading ? 'not-allowed' : 'pointer' }}>Resend OTP</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                  <input type="checkbox" required id="terms" style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#666' }}>I agree to the <a href="#" style={{ color: '#4CD964', textDecoration: 'none' }}>Terms and Conditions</a> & <a href="#" style={{ color: '#4CD964', textDecoration: 'none' }}>Privacy Policy</a></label>
                </div>

                <button type="submit" disabled={isAuthLoading} style={{ width: '100%', padding: '16px', backgroundColor: userPhone.length >= 10 ? '#4CD964' : '#e0e0e0', color: userPhone.length >= 10 ? '#fff' : '#999', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem', cursor: userPhone.length >= 10 ? 'pointer' : 'not-allowed', transition: 'all 200ms', opacity: isAuthLoading ? 0.6 : 1 }}>
                  {isAuthLoading ? 'PROCESSING...' : (showOtpInput ? 'VERIFY & SEE PRICE' : 'GET EXACT PRICE')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 8: FINAL EXACT PRICE */}
      {step === 8 && finalPrice != null && (
        <div className="card flex flex-col gap-4 items-center bg-[#111] border border-[#4CD964] p-6 md:p-12 rounded-xl max-w-[600px] mx-auto text-center">
          <p className="eyebrow" style={{ color: '#4CD964', fontSize: '1rem', letterSpacing: '2px' }}>FINAL EXACT QUOTE</p>
          <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '100px', height: '140px', objectFit: 'contain', margin: '2rem 0' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
          <p style={{ fontSize: '4rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{formatCurrency(finalPrice)}</p>
          <p style={{ color: '#a0a0a0', fontSize: '1rem', marginTop: '0.5rem' }}>{selectedModel.startsWith(selectedBrand) ? selectedModel : `${selectedBrand} ${selectedModel}`} ({selectedStorage})</p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', width: '100%' }}>
            <button type="button" onClick={() => { navigateToState('', '', '', 'brand', 1); setFinalPrice(null); setUserPhone(''); setOtp(''); setShowOtpInput(false); setDiagnostics({ calls: null, touch: null, originalScreen: null, defects: [], hardware: [], accessories: [] }); }} className="btn-outline" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>Start Over</button>
            <button type="button" onClick={() => { alert("Scheduled for Pickup!"); router.push('/'); }} className="btn-primary" style={{ flex: 2, padding: '16px', background: '#4CD964', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Schedule Pickup</button>
          </div>
        </div>
      )}

    </div>
  );
}
