'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/lib/authStore';
import { useHydratedAuth } from '@/lib/useHydratedAuth';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

import { BRAND_LOGOS, getBrandLogoStyle } from '@/lib/brands';
import config from '@/lib/pricingConfig.json';
import { SEED_DEVICES } from '@/lib/seed_devices';
import cashifyPrices from '@/lib/cashify_prices.json';

export interface Device {
  id: string;
  brand: string;
  model: string;
  storage: string;
  ram?: string;
  color?: string;
  basePrice?: number;
}

function normalizeDevice(raw: Record<string, unknown>): Device {
  return {
    id: String(raw.id || ''),
    brand: String(raw.brand || ''),
    model: String(raw.model || ''),
    storage: String(raw.storage || ''),
    ram: raw.ram ? String(raw.ram) : undefined,
    color: raw.color ? String(raw.color) : undefined,
    basePrice: typeof raw.basePrice === 'number' ? raw.basePrice : undefined,
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
  const { isAuthenticated, user } = useHydratedAuth();
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize data on mount to avoid hydration mismatch if needed, 
  // or just set it statically. Since SEED_DEVICES is a constant:
  useEffect(() => {
    setAllDevices(extractDevices(SEED_DEVICES));
  }, []);
  
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

  useEffect(() => {
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
    accessories: [] as string[],
    warranty: null as boolean | null,
    validBill: null as boolean | null,
    eSim: null as 'Single eSIM' | 'Dual eSIM' | null,
    mobileAge: null as 'below3' | '3to6' | '6to11' | 'above11' | null
  });

  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn('Recaptcha clear error:', e);
        }
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'quote-recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    }
  }, []);

  // Device fetch removed because it's now loaded statically and instantly from SEED_DEVICES

  const brands = useMemo(() => {
    const extracted = [...new Set(allDevices.map((d) => d.brand).filter(Boolean))];
    const allBrands = [...new Set([...Object.keys(BRAND_LOGOS), ...extracted])];
    return allBrands.sort();
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
    
    const availableVariants = allDevices.filter((d) => 
      d.brand === selectedBrand && 
      (d.model === selectedModel || d.model === `${selectedBrand} ${selectedModel}` || selectedModel === `${selectedBrand} ${d.model}`)
    );
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
  const handleStorageSelect = async (s: string) => { 
    navigateToState(selectedBrand, selectedModel, s, 'storage', 1); 
    
    const device = allDevices.find(d => 
      d.brand.toLowerCase() === selectedBrand.toLowerCase() && 
      d.model.toLowerCase() === selectedModel.toLowerCase() && 
      d.storage === s
    );

    if (!device) return;

    try {
      // INSTANT CALCULATION INSTEAD OF API CALL TO AVOID 40S DELAY
      const lookupKey = `${device.model}-${device.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const baseMarketPrice = (cashifyPrices as Record<string, number>)[lookupKey] || (device as any).basePrice || 1000;
      
      let upliftedBasePrice = baseMarketPrice;
      if (baseMarketPrice <= 20000) {
        upliftedBasePrice = baseMarketPrice * 1.08;
      } else if (baseMarketPrice <= 50000) {
        upliftedBasePrice = baseMarketPrice * 1.06;
      } else {
        upliftedBasePrice = baseMarketPrice * 1.04;
      }

      setBasePrice(Math.round(upliftedBasePrice));
      navigateToState(selectedBrand, selectedModel, s, 'storage', 2);
    } catch {
      setError('Failed to fetch quote.');
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
    
    // 1. Base Price
    let price = basePrice;
    
    // 2. Binary Multipliers
    if (diagnostics.calls === false) price *= config.multipliers.calls_no;
    if (diagnostics.touch === false) price *= config.multipliers.touch_no;
    if (diagnostics.originalScreen === false) price *= config.multipliers.originalScreen_no;
    
    if (diagnostics.warranty) {
      // Age Bonus applies ONLY if under warranty AND GST Bill is valid
      if (diagnostics.validBill && diagnostics.mobileAge) {
        let age_multiplier = config.ageBonus[diagnostics.mobileAge as keyof typeof config.ageBonus] || 1.0;
        price *= age_multiplier;
      }
    } else {
      // Penalty for no warranty
      price *= config.multipliers.warranty_no;
    }
    
    // GST Bill penalty (applies independently if no bill, even if warranty is expired)
    if (diagnostics.validBill === false) price *= config.multipliers.gstBill_no;
    
    // 3. Screen / Body Defects (Additive within group)
    let screenBodyPenaltySum = 0;
    diagnostics.defects.forEach(d => { 
      if (d in config.defects_screen_body) {
        screenBodyPenaltySum += config.defects_screen_body[d as keyof typeof config.defects_screen_body];
      }
    });
    price *= (1 - Math.min(screenBodyPenaltySum, 1));
    
    // 4. Functional Defects (Additive within group)
    let functionalPenaltySum = 0;
    diagnostics.hardware.forEach(h => { 
      if (h in config.defects_functional) {
        functionalPenaltySum += config.defects_functional[h as keyof typeof config.defects_functional];
      }
    });
    price *= (1 - Math.min(functionalPenaltySum, 1));
    
    // 5. Accessories Bonus
    if (diagnostics.accessories.includes('box')) price += config.bonuses.box;

    setFinalPrice(Math.max(Math.round(price), config.modelFloorPrice));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone || userPhone.length < 10) { setAuthError('Enter a valid 10-digit phone number'); return; }
    try {
      setIsAuthLoading(true); setAuthError(null);
      
      const formattedPhone = '+91' + userPhone;
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      
      setShowOtpInput(true);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to send OTP');
    } finally { setIsAuthLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setAuthError('Enter a valid 6-digit OTP'); return; }
    try {
      setIsAuthLoading(true); setAuthError(null);
      if (!confirmationResult) throw new Error("Please request OTP again");
      
      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken();
      
      const res = await api.post('/api/auth/otp/verify', { phone: userPhone, firebaseToken, name: userName });
      const { accessToken, refreshToken, user, isNewUser } = res.data.data;
      
      // Save tokens so next request is authenticated
      setAuth({ id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email }, accessToken, refreshToken);
      calculateFinalPrice();
      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 8);
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.response?.data?.error || err.message || 'Invalid OTP');
    } finally { setIsAuthLoading(false); }
  };

  const SidebarSummary = () => (
    <div className="w-full md:max-w-[300px] shrink-0 bg-[#111] border border-[#2a2a2a] rounded-xl p-6 md:sticky md:top-8 text-white mb-8 md:mb-0">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '40px', height: '60px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedModel.startsWith(selectedBrand) ? selectedModel : `${selectedBrand} ${selectedModel}`} ({selectedStorage})</span>
      </div>
      
      <h3 style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>Device Evaluation</h3>
      
      {diagnostics.calls !== null && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#888', fontSize: '0.75rem' }}>Make/Receive Calls</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.calls ? 'Yes' : 'No'}</p>
        </div>
      )}
      {diagnostics.touch !== null && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#888', fontSize: '0.75rem' }}>Touch Working</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.touch ? 'Yes' : 'No'}</p>
        </div>
      )}
      {diagnostics.originalScreen !== null && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#888', fontSize: '0.75rem' }}>Screen Original</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.originalScreen ? 'Yes' : 'No'}</p>
        </div>
      )}
      {diagnostics.defects.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#888', fontSize: '0.75rem' }}>Defects</p>
          <p style={{ color: '#FF3B30', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.defects.length} selected</p>
        </div>
      )}
      {diagnostics.hardware.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#888', fontSize: '0.75rem' }}>Hardware Issues</p>
          <p style={{ color: '#FF3B30', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.hardware.length} selected</p>
        </div>
      )}
      {diagnostics.accessories.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: '#888', fontSize: '0.75rem' }}>Accessories</p>
          <p style={{ color: '#4CD964', fontSize: '0.85rem', fontWeight: 600 }}>• {diagnostics.accessories.length} available</p>
        </div>
      )}
    </div>
  );

  const isTierA = selectedBrand === 'Apple' && /1[3-9]|[2-9]\d/i.test(selectedModel) && !/12|11|XR|XS|SE/i.test(selectedModel);

  return (
    <div className="page-animate" style={{ maxWidth: step > 2 ? '1000px' : '40rem', margin: '0 auto', padding: '3rem 1rem' }}>
      
      <div id="quote-recaptcha-container"></div>
      
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
              
              {models.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#a0a0a0' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🚧</span>
                  <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem' }}>Coming Soon</h3>
                  <p>We are coming soon! Mobile phones for this brand are under processing and uploading.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                  {models.map((m) => (
                    <button key={m} onClick={() => handleModelSelect(m)} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid #2a2a2a', backgroundColor: '#111', borderRadius: '12px', cursor: 'pointer' }}>
                      <img src={`/images/models/${m.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={m} style={{ width: '70px', height: '100px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
                      <span style={{ fontSize: '0.8rem', color: '#fff', textAlign: 'center' }}>{m}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectionStage === 'storage' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>Choose a variant</h2>
                <button onClick={() => navigateToState(selectedBrand, '', '', 'model', 1)} style={{ color: '#4CD964', background: 'none', border: 'none', cursor: 'pointer' }}>Change Model</button>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #2a2a2a', backgroundColor: '#111' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '60px', height: '80px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
                  <div><p style={{ color: '#a0a0a0', fontSize: '0.8rem' }}>{selectedBrand}</p><h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{selectedModel}</h3></div>
                </div>
                
                {storageOptions.length === 0 && !loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#a0a0a0' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📱</span>
                    <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Model configuration not found</h3>
                    <p style={{ fontSize: '0.9rem' }}>We couldn&apos;t find the storage variants for this model. It might be under process.</p>
                    <button onClick={() => navigateToState(selectedBrand, '', '', 'model', 1)} style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', backgroundColor: '#d4af37', color: '#000', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>View All {selectedBrand} Models</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {storageOptions.map((s) => (
                      <button key={s} onClick={() => handleStorageSelect(s)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: selectedStorage === s ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: selectedStorage === s ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: selectedStorage === s ? '#4CD964' : '#fff', cursor: 'pointer' }}>{s}</button>
                    ))}
                  </div>
                )}
                {loading && <p style={{ color: '#4CD964', textAlign: 'center', marginTop: '1rem', fontWeight: 600 }}>Loading...</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* STAGE 2: BASE PRICE SCREEN */}
      {step === 2 && (
        <div className="card flex flex-col md:flex-row items-center gap-6 md:gap-12 p-6 md:p-12 bg-[#111] border border-[#2a2a2a] rounded-xl max-w-[700px] mx-auto text-center md:text-left">
          <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '120px', height: '180px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
          <div className="flex flex-col gap-2 flex-1 w-full text-white items-center md:items-start">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 500 }}>Sell Old {selectedModel.startsWith(selectedBrand) ? selectedModel : `${selectedBrand} ${selectedModel}`} ({selectedStorage})</h2>
            <p style={{ color: '#666', fontSize: '1rem', marginTop: '1rem' }}>Get Upto</p>
            <p style={{ fontSize: '3rem', fontWeight: 700, color: '#FF4C4C' }}>{formatCurrency(basePrice || 0)}</p>
            <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 3)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#4CD964', color: '#fff', fontWeight: 600, marginTop: '1.5rem', width: 'fit-content', padding: '1rem 2rem', borderRadius: '8px' }}>
              Get Exact Value <ArrowRightIcon />
            </button>
          </div>
        </div>
      )}      {/* STAGES 3-6: MULTI-STEP QUESTIONNAIRE (2 COLUMN LAYOUT) */}
      {((step >= 2 && step <= 6) || step === 10) && (
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start w-full" style={{ marginTop: '2.5rem' }}>
          
          <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
            
            {/* STAGE 3: BASIC YES/NO */}
            {step === 3 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please answer a few questions about your device.</p>
                
                {[
                  { id: 'calls', title: 'Are you able to make and receive calls?', desc: 'Check your device for cellular network connectivity issues.' },
                  { id: 'touch', title: 'Is your device\'s touch screen working properly?', desc: 'Check the touch screen functionality of your phone.' },
                  { id: 'originalScreen', title: 'Is your phone\'s screen original?', desc: 'Pick "Yes" if screen was never changed. Pick "No" if screen was changed.' }
                ].map((q) => (
                  <div key={q.id} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>{q.title}</h3>
                    <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{q.desc}</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => setDiagnostics({ ...diagnostics, [q.id]: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics[q.id as keyof typeof diagnostics] === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics[q.id as keyof typeof diagnostics] === true ? '#4CD964' : '#fff' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics[q.id as keyof typeof diagnostics] === true ? '1px solid #4CD964' : '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === true ? '#4CD964' : 'transparent' }} /> Yes
                      </button>
                      <button onClick={() => setDiagnostics({ ...diagnostics, [q.id]: false })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics[q.id as keyof typeof diagnostics] === false ? '1px solid #FF3B30' : '1px solid #2a2a2a', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === false ? 'rgba(255,59,48,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics[q.id as keyof typeof diagnostics] === false ? '#FF3B30' : '#fff' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics[q.id as keyof typeof diagnostics] === false ? '1px solid #FF3B30' : '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: diagnostics[q.id as keyof typeof diagnostics] === false ? '#FF3B30' : 'transparent' }} /> No
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', isTierA ? 10 : 4)} disabled={diagnostics.calls === null || diagnostics.touch === null || diagnostics.originalScreen === null} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.calls !== null && diagnostics.touch !== null && diagnostics.originalScreen !== null) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 10: TIER A ADVANCED QUESTIONS */}
            {step === 10 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Device Condition & Warranty</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Help us offer you the best price</p>
                
                {/* Warranty Question */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Is your device under manufacturer warranty?</h3>
                  <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>You can get a better price for your device if it&apos;s under manufacturer warranty with a GST valid bill.</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setDiagnostics({ ...diagnostics, warranty: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.warranty === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.warranty === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.warranty === true ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.warranty === true ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.warranty === true ? '#4CD964' : 'transparent' }} /> Yes
                    </button>
                    <button onClick={() => {
                      setDiagnostics({ ...diagnostics, warranty: false, mobileAge: null });
                    }} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.warranty === false ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.warranty === false ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.warranty === false ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.warranty === false ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.warranty === false ? '#4CD964' : 'transparent' }} /> No
                    </button>
                  </div>
                </div>

                {/* GST Bill Question */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Do you have GST valid bill with the same IMEI?</h3>
                  <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Make sure your bill has device IMEI mentioned on it.</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setDiagnostics({ ...diagnostics, validBill: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.validBill === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.validBill === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.validBill === true ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.validBill === true ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.validBill === true ? '#4CD964' : 'transparent' }} /> Yes
                    </button>
                    <button onClick={() => setDiagnostics({ ...diagnostics, validBill: false })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.validBill === false ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.validBill === false ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.validBill === false ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.validBill === false ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.validBill === false ? '#4CD964' : 'transparent' }} /> No
                    </button>
                  </div>
                </div>

                {/* eSIM Question */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>How many eSIMs does your device support?</h3>
                  <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Please select &quot;Dual eSIM&quot; if your device supports dual eSIMs. Otherwise, select &quot;Single eSIM&quot;.</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setDiagnostics({ ...diagnostics, eSim: 'Single eSIM' })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.eSim === 'Single eSIM' ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.eSim === 'Single eSIM' ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.eSim === 'Single eSIM' ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.eSim === 'Single eSIM' ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.eSim === 'Single eSIM' ? '#4CD964' : 'transparent' }} /> Single eSIM
                    </button>
                    <button onClick={() => setDiagnostics({ ...diagnostics, eSim: 'Dual eSIM' })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.eSim === 'Dual eSIM' ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.eSim === 'Dual eSIM' ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.eSim === 'Dual eSIM' ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.eSim === 'Dual eSIM' ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.eSim === 'Dual eSIM' ? '#4CD964' : 'transparent' }} /> Dual eSIM
                    </button>
                  </div>
                </div>

                {/* Mobile Age Question (Conditional) */}
                {diagnostics.warranty === true && (
                  <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ textAlign: 'center', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.25rem', color: '#ffffff' }}>What is your mobile age?</h3>
                    <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '1.5rem' }}>(Because you chose your device is under brand&apos;s warranty)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {[
                        { id: 'below3', label: 'Below 3 months', sub: 'Valid bill mandatory' },
                        { id: '3to6', label: '3 months - 6 months', sub: 'Valid bill mandatory' },
                        { id: '6to11', label: '6 months - 11 months', sub: 'Valid bill mandatory' },
                        { id: 'above11', label: 'Above 11 months', sub: '' }
                      ].map((age) => (
                        <button key={age.id} onClick={() => setDiagnostics({ ...diagnostics, mobileAge: age.id as any })} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', borderRadius: '8px', border: diagnostics.mobileAge === age.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.mobileAge === age.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', cursor: 'pointer', color: diagnostics.mobileAge === age.id ? '#4CD964' : '#fff', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: age.sub ? '0.25rem' : '0' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.mobileAge === age.id ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.mobileAge === age.id ? '#4CD964' : 'transparent', flexShrink: 0 }} />
                            <span style={{ fontWeight: 500, fontSize: '1rem' }}>{age.label}</span>
                          </div>
                          {age.sub && <span style={{ color: '#a0a0a0', fontSize: '0.75rem', paddingLeft: '1.5rem' }}>{age.sub}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                  <button 
                    onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 4)} 
                    disabled={
                      diagnostics.warranty === null || 
                      diagnostics.validBill === null || 
                      diagnostics.eSim === null || 
                      (diagnostics.warranty && !diagnostics.mobileAge) ||
                      (diagnostics.warranty && diagnostics.mobileAge !== 'above11' && diagnostics.validBill === false)
                    } 
                    className="btn-primary" 
                    style={{ 
                      background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', 
                      opacity: (diagnostics.warranty !== null && diagnostics.validBill !== null && diagnostics.eSim !== null && (!diagnostics.warranty || diagnostics.mobileAge) && !(diagnostics.warranty && diagnostics.mobileAge !== 'above11' && diagnostics.validBill === false)) ? 1 : 0.5 
                    }}
                  >
                    Continue <ArrowRightIcon />
                  </button>
                </div>
                {diagnostics.warranty && diagnostics.mobileAge && diagnostics.mobileAge !== 'above11' && diagnostics.validBill === false && (
                  <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>A valid GST bill is mandatory for devices under 11 months old.</p>
                )}
              </div>
            )}

            {/* STAGE 4: DEFECTS */}
            {step === 4 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Select screen/body defects that are applicable!</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please provide correct details</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'screen_scratch', label: 'Broken/scratch on device screen', icon: '📱' },
                    { id: 'screen_spot', label: 'Dead Spot/Visible line and Discoloration', icon: '📲' },
                    { id: 'body_scratch', label: 'Scratch/Dent on device body', icon: '📏' },
                    { id: 'panel_missing', label: 'Device panel missing/broken', icon: '🔧' }
                  ].map((d) => (
                    <button key={d.id} onClick={() => toggleArrayItem('defects', d.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 1rem', borderRadius: '8px', border: diagnostics.defects.includes(d.id) ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.defects.includes(d.id) ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.defects.includes(d.id) ? '#4CD964' : '#fff', cursor: 'pointer' }}>
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
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Functional or Physical Problems</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please choose appropriate condition to get accurate quote</p>
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
                    { id: 'bluetooth', label: 'Bluetooth not working', icon: '🛜' },
                    { id: 'vibrator', label: 'Vibrator is not working', icon: '📳' },
                    { id: 'proximity', label: 'Proximity Sensor not working', icon: '🖐' },
                    { id: 'battery_service', label: 'Battery in Service (< 80%)', icon: '🔋' }
                  ].map((h) => (
                    <button key={h.id} onClick={() => toggleArrayItem('hardware', h.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0.5rem', borderRadius: '8px', border: diagnostics.hardware.includes(h.id) ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.hardware.includes(h.id) ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.hardware.includes(h.id) ? '#4CD964' : '#fff', cursor: 'pointer' }}>
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
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Do you have the following?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please select accessories which are available</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'box', label: 'Original Box with same IMEI', icon: '📦' },
                    { id: 'bill', label: 'Valid Bill', icon: '🧾' },
                    { id: 'charger', label: 'Original Charger', icon: '🔌' }
                  ].map((a) => (
                    <button key={a.id} onClick={() => toggleArrayItem('accessories', a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 1rem', borderRadius: '8px', border: diagnostics.accessories.includes(a.id) ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.accessories.includes(a.id) ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.accessories.includes(a.id) ? '#4CD964' : '#fff', cursor: 'pointer' }}>
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
            
            <div className="flex-1 bg-[#d4af37] p-8 md:p-12 flex flex-col justify-center items-center text-[#000] text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#000]">Login/Signup</h2>
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

              <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontWeight: 600, marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span> Login to unlock the best price
              </div>

              <form onSubmit={showOtpInput ? handleOtpVerify : handleSendOtp}>
                {authError && <div style={{ color: '#FF4C4C', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{authError}</div>}
                
                {!showOtpInput ? (
                  <>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Phone Number</label>
                      <div style={{ display: 'flex', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, marginRight: '0.5rem', fontSize: '1.2rem' }}>+91</span>
                        <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter your Mobile" required style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1.2rem', backgroundColor: 'transparent', color: '#000' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '2.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Your Name (Optional)</label>
                      <div style={{ display: 'flex', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem' }}>
                        <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Enter your Name" style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1.2rem', backgroundColor: 'transparent', color: '#000' }} />
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
                  <input type="checkbox" required id="terms" style={{ width: '16px', height: '16px', accentColor: '#d4af37' }} />
                  <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#666' }}>I agree to the <a href="#" style={{ color: '#d4af37', textDecoration: 'none' }}>Terms and Conditions</a> & <a href="#" style={{ color: '#d4af37', textDecoration: 'none' }}>Privacy Policy</a></label>
                </div>

                <button type="submit" disabled={isAuthLoading} style={{ width: '100%', padding: '16px', backgroundColor: userPhone.length >= 10 ? '#d4af37' : '#e0e0e0', color: userPhone.length >= 10 ? '#000' : '#999', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem', cursor: userPhone.length >= 10 ? 'pointer' : 'not-allowed', transition: 'all 200ms', opacity: isAuthLoading ? 0.6 : 1 }}>
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
            <button type="button" onClick={() => { navigateToState('', '', '', 'brand', 1); setFinalPrice(null); setUserPhone(''); setOtp(''); setShowOtpInput(false); setDiagnostics({ calls: null, touch: null, originalScreen: null, defects: [], hardware: [], accessories: [], warranty: null, validBill: null, eSim: null, mobileAge: null }); }} className="btn-outline" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>Start Over</button>
            <button type="button" onClick={() => setStep(9)} className="btn-primary" style={{ flex: 2, padding: '16px', background: '#4CD964', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Schedule Pickup</button>
          </div>
        </div>
      )}

      {/* STAGE 9: PICKUP DETAILS FORM */}
      {step === 9 && (
        <div className="card flex flex-col gap-4 bg-[#111] border border-[#333] p-6 md:p-8 rounded-xl max-w-[600px] mx-auto text-left">
          <p className="eyebrow" style={{ color: '#d4af37', fontSize: '1rem', letterSpacing: '2px', textAlign: 'center', marginBottom: '1.5rem' }}>SCHEDULE PICKUP</p>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const token = localStorage.getItem('accessToken');
              const headers: any = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;
              
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quote/leads`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  name: userName || user?.name || '',
                  phone: userPhone || user?.phone || '',
                  brand: selectedBrand || '',
                  model: selectedModel || '',
                  storage: selectedStorage || '',
                  quotedPrice: finalPrice || 0,
                  pickupDate: pickupDate || '',
                  pickupTime: pickupTime || '',
                  address: address || '',
                  pincode: pincode || '',
                  city: city || ''
                })
              });
              
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to schedule pickup');
              }
              
              alert("Scheduled for Pickup! Our executive will contact you shortly.");
              router.push('/');
            } catch (err: any) {
              console.error("Failed to schedule pickup", err);
              alert("Something went wrong: " + (err.message || "Please try again."));
            }
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Preferred Date</label>
                <input type="date" required value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Preferred Time</label>
                <select required value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }}>
                  <option value="">Select Time Slot</option>
                  <option value="10:00 AM - 1:00 PM">10:00 AM - 1:00 PM</option>
                  <option value="1:00 PM - 4:00 PM">1:00 PM - 4:00 PM</option>
                  <option value="4:00 PM - 7:00 PM">4:00 PM - 7:00 PM</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Flat / House No / Building Name</label>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 101, Fhoneify Apartments" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Pincode</label>
                <input type="text" required value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 Digit Pincode" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>City</label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button type="button" onClick={() => setStep(8)} className="btn-outline" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>Back</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, padding: '16px', background: '#4CD964', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Confirm Pickup</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
