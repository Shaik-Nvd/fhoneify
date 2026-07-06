'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/lib/authStore';
import { useHydratedAuth } from '@/lib/useHydratedAuth';


import { BRAND_LOGOS, getBrandLogoStyle } from '@/lib/brands';
import config from '@/lib/pricingConfig.json';
import { SEED_DEVICES } from '@/lib/seed_devices';
import { calculateFhoneifyPrice, DiagnosticsType } from '@/lib/pricingCalculator';
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
  if (Array.isArray(obj.data)) return obj.data.filter(Boolean).map((row) => normalizeDevice(row as Record<string, unknown>));
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const inner = obj.data as Record<string, unknown>;
    if (Array.isArray(inner.devices)) return inner.devices.filter(Boolean).map((row) => normalizeDevice(row as Record<string, unknown>));
  }
  if (Array.isArray(payload)) return payload.filter(Boolean).map((row) => normalizeDevice(row as Record<string, unknown>));
  return [];
}

// Icons for the UI using basic SVGs
const ArrowRightIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;

export default function QuotePage() {
  const isWarrantyEligible = (brand: string, model: string) => {
    if (brand === 'Apple') {
      const lowerModel = model.toLowerCase();
      // Only iPhones 15, 16, 17, and iPhone Air are warranty eligible (released within 1-2 years)
      return (
        lowerModel.includes('15') ||
        lowerModel.includes('16') ||
        lowerModel.includes('17') ||
        lowerModel.includes('air')
      );
    }
    return true;
  };

  const isESimEligible = (brand: string, model: string) => {
    if (brand.toLowerCase() !== 'apple') return false;
    const lower = model.toLowerCase();
    // eSIM question is only asked for Pro and Pro Max variants of iPhone 13, 14, 15, 16, 17
    const isProOrProMax = lower.includes('pro') || lower.includes('max');
    const isRecentGeneration = 
      lower.includes('13') || 
      lower.includes('14') || 
      lower.includes('15') || 
      lower.includes('16') || 
      lower.includes('17');
    return isProOrProMax && isRecentGeneration;
  };

  const hasChargerInBox = (brand: string, model: string) => {
    if (brand.toLowerCase() !== 'apple') return true;
    const lower = model.toLowerCase();
    return !(
      lower.includes('12') ||
      lower.includes('13') ||
      lower.includes('14') ||
      lower.includes('15') ||
      lower.includes('16') ||
      lower.includes('17') ||
      lower.includes('air') ||
      lower.includes('se 2022') ||
      (lower.includes('se') && lower.includes('2022'))
    );
  };
  
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
  const [modelSearchQuery, setModelSearchQuery] = useState('');
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
    setSelectedSamsungSeries(null);
    setSelectedXiaomiSeries(null);
    setSelectedVivoSeries(null);
    setSelectedOppoSeries(null);
    setModelSearchQuery('');
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
  const [rawBasePrice, setRawBasePrice] = useState<number | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  const [diagnostics, setDiagnostics] = useState({
    calls: null as boolean | null,
    touch: null as boolean | null,
    originalScreen: null as boolean | null,
    defects: [] as string[],
    screenCondition: null as string | null,
    screenSpots: null as string | null,
    screenLines: null as string | null,
    screenDiscoloration: null as string | null,
    bodyScratches: null as string | null,
    bodyDents: null as string | null,
    bodyPanel: null as string | null,
    bodyBent: null as string | null,
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
  const [isScraping, setIsScraping] = useState(false);
  const [timerCount, setTimerCount] = useState(60);
  const [scrapingStatus, setScrapingStatus] = useState('Connecting to market...');
  const [timerError, setTimerError] = useState<string | null>(null);
  const [marketPriceFetched, setMarketPriceFetched] = useState(false);
  const [selectedSamsungSeries, setSelectedSamsungSeries] = useState<string | null>(null);
  const [selectedXiaomiSeries, setSelectedXiaomiSeries] = useState<string | null>(null);
  const [selectedVivoSeries, setSelectedVivoSeries] = useState<string | null>(null);
  const [selectedOppoSeries, setSelectedOppoSeries] = useState<string | null>(null);
  const [selectedRealmeSeries, setSelectedRealmeSeries] = useState<string | null>(null);
  const [selectedMotorolaSeries, setSelectedMotorolaSeries] = useState<string | null>(null);
  const [selectedLenovoSeries, setSelectedLenovoSeries] = useState<string | null>(null);
  const [selectedNokiaSeries, setSelectedNokiaSeries] = useState<string | null>(null);
  const [selectedHonorSeries, setSelectedHonorSeries] = useState<string | null>(null);
  const [selectedAsusSeries, setSelectedAsusSeries] = useState<string | null>(null);
  const [selectedGoogleSeries, setSelectedGoogleSeries] = useState<string | null>(null);
  const [selectedPocoSeries, setSelectedPocoSeries] = useState<string | null>(null);
  const [selectedHuaweiSeries, setSelectedHuaweiSeries] = useState<string | null>(null);
  const [selectedLgSeries, setSelectedLgSeries] = useState<string | null>(null);
  const [selectedInfinixSeries, setSelectedInfinixSeries] = useState<string | null>(null);
  const [selectedTecnoSeries, setSelectedTecnoSeries] = useState<string | null>(null);
  const [selectedIqooSeries, setSelectedIqooSeries] = useState<string | null>(null);
  
  // Coupon state
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(false);

  const getDisplayModelName = (brand: string, model: string) => {
    let clean = model.replace(/\s*\d+\s*[gG][bB]\s*\d+\s*[gG][bB]\s*$/i, '').trim();
    return clean.startsWith(brand) ? clean : `${brand} ${clean}`;
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  // Device fetch removed because it's now loaded statically and instantly from SEED_DEVICES

  const brands = useMemo(() => {
    const extracted = [...new Set(allDevices.map((d) => d.brand).filter(Boolean))];
    const allBrands = [...new Set([...Object.keys(BRAND_LOGOS), ...extracted])];
    return allBrands.sort();
  }, [allDevices]);
  const matchSamsungSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Galaxy Fold Series':
        return normalized.includes('fold');
      case 'Galaxy Z Flip Series':
        return normalized.includes('flip');
      case 'Galaxy A Series':
        return normalized.includes('galaxy a') && !normalized.includes('fold') && !normalized.includes('flip');
      case 'Galaxy J Series':
        return normalized.includes('galaxy j');
      case 'Galaxy Note Series':
        return normalized.includes('galaxy note');
      case 'Galaxy On Series':
        return normalized.includes('galaxy on');
      case 'Galaxy S Series':
        return normalized.includes('galaxy s') && !normalized.includes('fold') && !normalized.includes('flip');
      case 'Galaxy C Series':
        return normalized.includes('galaxy c');
      case 'Galaxy M Series':
        return normalized.includes('galaxy m');
      case 'Galaxy F Series':
        return normalized.includes('galaxy f');
      default:
        return false;
    }
  };

  const matchXiaomiSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    const isRedmiNote = normalized.includes('redmi note');
    
    switch (series) {
      case 'Mi Series':
        return normalized.includes(' mi ') || normalized.startsWith('mi ') || normalized.startsWith('xiaomi mi');
      case 'Redmi Note Series':
        return isRedmiNote;
      case 'Redmi 3 Series':
        return normalized.includes('redmi 3') && !isRedmiNote;
      case 'Redmi 4 Series':
        return (normalized.includes('redmi 4') || normalized.includes('redmi pro')) && !isRedmiNote;
      case 'Redmi 5 Series':
        return normalized.includes('redmi 5') && !isRedmiNote;
      case 'Redmi 6 Series':
        return normalized.includes('redmi 6') && !isRedmiNote;
      case 'Redmi 7 Series':
        return normalized.includes('redmi 7') && !isRedmiNote;
      case 'Redmi 8 Series':
        return normalized.includes('redmi 8') && !isRedmiNote;
      case 'Redmi 9 Series':
        return normalized.includes('redmi 9') && !isRedmiNote;
      case 'Redmi 10 Series':
        return normalized.includes('redmi 10') && !isRedmiNote;
      case 'Redmi Y Series':
        return normalized.includes('redmi y');
      case 'Redmi K Series':
        return normalized.includes('redmi k');
      case 'Redmi A Series':
        return normalized.includes('redmi a') && !isRedmiNote;
      case 'Redmi 14 Series':
        return normalized.includes('redmi 14') && !isRedmiNote;
      case 'Redmi 15 Series':
        return normalized.includes('redmi 15') && !isRedmiNote;
      case '11 Series':
        return normalized.includes('xiaomi 11');
      case '12 Series':
        return normalized.includes('xiaomi 12');
      case '13 Series':
        return normalized.includes('xiaomi 13');
      case '14 Series':
        return normalized.includes('xiaomi 14') && !normalized.includes('redmi');
      case '15 Series':
        return normalized.includes('xiaomi 15') && !normalized.includes('redmi');
      case '17 Series':
        return normalized.includes('xiaomi 17');
      case 'Other Xiaomi Smartphones':
        return ![' mi ', 'redmi 3', 'redmi 4', 'redmi pro', 'redmi 5', 'redmi 6', 'redmi 7', 'redmi 8', 'redmi 9', 'redmi 10', 'redmi 14', 'redmi 15', 'redmi note', 'redmi y', 'redmi k', 'redmi a', 'xiaomi 11', 'xiaomi 12', 'xiaomi 13', 'xiaomi 14', 'xiaomi 15', 'xiaomi 17'].some(key => normalized.includes(key)) && !normalized.startsWith('mi ') && !normalized.startsWith('xiaomi mi');
      default:
        return false;
    }
  };

  const matchVivoSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'V Series':
        return normalized.includes('vivo v');
      case 'X Series':
        return normalized.includes('vivo x');
      case 'Y Series':
        return normalized.includes('vivo y');
      case 'Nex Series':
        return normalized.includes('vivo nex');
      case 'Z Series':
        return normalized.includes('vivo z');
      case 'S Series':
        return normalized.includes('vivo s');
      case 'U Series':
        return normalized.includes('vivo u');
      case 'T Series':
        return normalized.includes('vivo t');
      default:
        return false;
    }
  };

  const matchOppoSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'F Series':
        return normalized.includes('oppo f');
      case 'R Series':
        return normalized.includes('oppo r') && !normalized.includes('reno');
      case 'A Series':
        return normalized.includes('oppo a');
      case 'K Series':
        return normalized.includes('oppo k');
      case 'Reno Series':
        return normalized.includes('reno');
      case 'Find Series':
        return normalized.includes('find');
      default:
        return false;
    }
  };

  const matchRealmeSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    
    // Exact matching for numbered series
    const matchNumber = (num: string) => {
      // e.g. "Realme 7", "Realme 7i", "Realme 7 Pro"
      return normalized.match(new RegExp(`realme\\s+${num}(?!\\d)`)) !== null;
    };

    switch (series) {
      case 'Realme 1 Series': return matchNumber('1');
      case 'Realme 2 Series': return matchNumber('2');
      case 'Realme 3 Series': return matchNumber('3');
      case 'Realme 5 Series': return matchNumber('5');
      case 'Realme 6 Series': return matchNumber('6');
      case 'Realme 7 Series': return matchNumber('7');
      case 'Realme 8 Series': return matchNumber('8');
      case 'Realme 9 Series': return matchNumber('9');
      case 'Realme 10 Series': return matchNumber('10');
      case 'Realme 11 Series': return matchNumber('11');
      case 'Realme 12 Series': return matchNumber('12');
      case 'Realme 13 Series': return matchNumber('13');
      case 'Realme 14 Series': return matchNumber('14');
      case 'Realme 15 Series': return matchNumber('15');
      case 'Realme 16 Series': return matchNumber('16');
      case 'Realme C Series': return normalized.includes('realme c');
      case 'Realme X Series': return normalized.includes('realme x');
      case 'Realme U Series': return normalized.includes('realme u');
      case 'Realme Narzo Series': return normalized.includes('narzo');
      case 'Realme GT Series': return normalized.includes('realme gt');
      case 'Realme P Series': return normalized.includes('realme p');
      default:
        return false;
    }
  };

  const matchMotorolaSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Moto E Series': return normalized.includes('moto e') || normalized.includes('motorola e');
      case 'Moto G Series': return normalized.includes('moto g') || normalized.includes('motorola g');
      case 'Moto Z Series': return normalized.includes('moto z') || normalized.includes('motorola z');
      case 'Moto M Series': return normalized.includes('moto m') || normalized.includes('motorola m');
      case 'Moto One Series': return normalized.includes('one');
      case 'Moto Edge Series': return normalized.includes('edge');
      case 'Moto Razr Series': return normalized.includes('razr');
      default:
        return false;
    }
  };

  const matchLenovoSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'A Series': return normalized.includes('lenovo a') || normalized.includes(' a5') || normalized.includes(' a6');
      case 'K Series': return normalized.includes('lenovo k') || normalized.includes(' k9') || normalized.includes(' k10');
      case 'Z Series': return normalized.includes('lenovo z') || normalized.includes(' z6');
      default:
        return false;
    }
  };

  const matchNokiaSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Nokia 2 Series': return normalized.includes('nokia 2');
      case 'Nokia 3 Series': return normalized.includes('nokia 3');
      case 'Nokia 5 Series': return normalized.includes('nokia 5');
      case 'Nokia 6 Series': return normalized.includes('nokia 6');
      case 'Nokia 7 Series': return normalized.includes('nokia 7');
      case 'Nokia 8 Series': return normalized.includes('nokia 8');
      case 'Nokia 4 Series': return normalized.includes('nokia 4');
      case 'Nokia C Series': return normalized.includes('nokia c');
      case 'Nokia G Series': return normalized.includes('nokia g');
      case 'Nokia X Series': return normalized.includes('nokia x');
      default:
        return false;
    }
  };

  const matchHonorSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Honor 7 Series': return normalized.includes('honor 7') || normalized.includes('honor 7s') || normalized.includes('honor 7a') || normalized.includes('honor 7c') || normalized.includes('honor 7x');
      case 'Honor 8 Series': return normalized.includes('honor 8');
      case 'Honor 9 Series': return normalized.includes('honor 9');
      case 'Honor Holly Series': return normalized.includes('holly');
      case 'Honor 10 Series': return normalized.includes('honor 10') || normalized.includes('view 10');
      case 'Honor 5 Series': return normalized.includes('honor 5');
      case 'Honor 6 Series': return normalized.includes('honor 6');
      case 'Honor Play Series': return normalized.includes('play');
      case 'Honor 20 Series': return normalized.includes('honor 20') || normalized.includes('view 20');
      case 'Honor 200 Series': return normalized.includes('honor 200');
      default:
        return false;
    }
  };

  const matchAsusSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Zenfone 5 Series': return normalized.includes('zenfone 5');
      case 'Zenfone Max Series': return normalized.includes('zenfone max');
      case 'ROG Series': return normalized.includes('rog');
      case '8 Series': return normalized.includes('8z') || normalized.includes('8');
      default:
        return false;
    }
  };

  const matchGoogleSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Pixel 3 Series': return normalized.includes('pixel 3');
      case 'Pixel 4 Series': return normalized.includes('pixel 4');
      case 'Pixel 6 Series': return normalized.includes('pixel 6');
      case 'Pixel 7 Series': return normalized.includes('pixel 7');
      case 'Pixel 8 Series': return normalized.includes('pixel 8');
      case 'Pixel 9 Series': return normalized.includes('pixel 9');
      case 'Pixel 10 Series': return normalized.includes('pixel 10');
      default:
        return false;
    }
  };

  const matchPocoSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'POCO X Series': return normalized.includes('poco x');
      case 'POCO F Series': return normalized.includes('poco f');
      case 'POCO M Series': return normalized.includes('poco m');
      case 'POCO C Series': return normalized.includes('poco c');
      default:
        return false;
    }
  };

  const matchHuaweiSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Huawei P Series': return normalized.includes('p') && !normalized.includes('plus') && !normalized.includes('pro');
      case 'Huawei Mate Series': return normalized.includes('mate');
      default:
        return false;
    }
  };

  const matchLgSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'G Series': return normalized.includes('g') && !normalized.includes('lg ');
      case 'V Series': return normalized.includes('v') && !normalized.includes('lg ');
      case 'W Series': return normalized.includes('w') && !normalized.includes('lg ');
      default:
        return false;
    }
  };

  const matchInfinixSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'S Series': return normalized.includes('s') && !normalized.includes('smart') && !normalized.includes('note') && !normalized.includes('hot') && !normalized.includes('zero') && !normalized.includes('gt');
      case 'Zero Series': return normalized.includes('zero');
      case 'Hot Series': return normalized.includes('hot');
      case 'Note Series': return normalized.includes('note');
      case 'GT Series': return normalized.includes('gt');
      default:
        return false;
    }
  };

  const matchTecnoSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'Camon Series': return normalized.includes('camon');
      case 'Spark Series': return normalized.includes('spark');
      case 'Phantom Series': return normalized.includes('phantom');
      case 'POVA Series': return normalized.includes('pova');
      case 'Pop Series': return normalized.includes('pop');
      default:
        return false;
    }
  };

  const matchIqooSeries = (modelName: string, series: string): boolean => {
    const normalized = modelName.toLowerCase();
    switch (series) {
      case 'iQOO Series': return normalized.includes('iqoo');
      default:
        return false;
    }
  };

  const models = useMemo(() => {
    if (!selectedBrand) return [];
    let brandModels = [...new Set(allDevices.filter((d) => d.brand === selectedBrand).map((d) => d.model).filter(Boolean))];
    
    if (modelSearchQuery) {
      brandModels = brandModels.filter((m) => m.toLowerCase().includes(modelSearchQuery.toLowerCase()));
    }
    
    if (selectedBrand === 'Samsung' && selectedSamsungSeries) {
      brandModels = brandModels.filter((m) => matchSamsungSeries(m, selectedSamsungSeries));
    }
    
    if (selectedBrand === 'Xiaomi' && selectedXiaomiSeries) {
      brandModels = brandModels.filter((m) => matchXiaomiSeries(m, selectedXiaomiSeries));
    }
    
    if (selectedBrand === 'Vivo' && selectedVivoSeries) {
      brandModels = brandModels.filter((m) => matchVivoSeries(m, selectedVivoSeries));
    }
    if (selectedBrand === 'OPPO' && selectedOppoSeries) {
      brandModels = brandModels.filter((m) => matchOppoSeries(m, selectedOppoSeries));
    }
    if (selectedBrand === 'Realme' && selectedRealmeSeries) {
      brandModels = brandModels.filter((m) => matchRealmeSeries(m, selectedRealmeSeries));
    }
    if (selectedBrand === 'Motorola' && selectedMotorolaSeries) {
      brandModels = brandModels.filter((m) => matchMotorolaSeries(m, selectedMotorolaSeries));
    }
    if (selectedBrand === 'Lenovo' && selectedLenovoSeries) {
      brandModels = brandModels.filter((m) => matchLenovoSeries(m, selectedLenovoSeries));
    }
    if (selectedBrand === 'Nokia' && selectedNokiaSeries) {
      brandModels = brandModels.filter((m) => matchNokiaSeries(m, selectedNokiaSeries));
    }
    if (selectedBrand === 'Honor' && selectedHonorSeries) {
      brandModels = brandModels.filter((m) => matchHonorSeries(m, selectedHonorSeries));
    }
    if (selectedBrand === 'Asus' && selectedAsusSeries) {
      brandModels = brandModels.filter((m) => matchAsusSeries(m, selectedAsusSeries));
    }
    if (selectedBrand === 'Google' && selectedGoogleSeries) {
      brandModels = brandModels.filter((m) => matchGoogleSeries(m, selectedGoogleSeries));
    }
    if (selectedBrand === 'POCO' && selectedPocoSeries) {
      brandModels = brandModels.filter((m) => matchPocoSeries(m, selectedPocoSeries));
    }
    if (selectedBrand === 'Huawei' && selectedHuaweiSeries) {
      brandModels = brandModels.filter((m) => matchHuaweiSeries(m, selectedHuaweiSeries));
    }
    if (selectedBrand === 'LG' && selectedLgSeries) {
      brandModels = brandModels.filter((m) => matchLgSeries(m, selectedLgSeries));
    }
    if (selectedBrand === 'Infinix' && selectedInfinixSeries) {
      brandModels = brandModels.filter((m) => matchInfinixSeries(m, selectedInfinixSeries));
    }
    if (selectedBrand === 'Tecno' && selectedTecnoSeries) {
      brandModels = brandModels.filter((m) => matchTecnoSeries(m, selectedTecnoSeries));
    }
    if (selectedBrand === 'iQOO' && selectedIqooSeries) {
      brandModels = brandModels.filter((m) => matchIqooSeries(m, selectedIqooSeries));
    }
    
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
  }, [allDevices, selectedBrand, modelSearchQuery, selectedSamsungSeries, selectedXiaomiSeries, selectedVivoSeries, selectedOppoSeries, selectedRealmeSeries, selectedMotorolaSeries, selectedLenovoSeries, selectedNokiaSeries, selectedHonorSeries, selectedAsusSeries, selectedGoogleSeries, selectedPocoSeries, selectedHuaweiSeries, selectedLgSeries, selectedInfinixSeries, selectedTecnoSeries, selectedIqooSeries]);
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

  const handleBrandSelect = (b: string) => { 
    setSelectedSamsungSeries(null);
    navigateToState(b, '', '', 'model', 1); 
  };
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
      let lookupKey = `${device.model}-${device.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (lookupKey.includes('iphone-air')) {
        lookupKey = lookupKey.replace('iphone-air', 'iphone-17-air');
      }
      const baseMarketPrice = (cashifyPrices as Record<string, number>)[lookupKey] || (device as any).basePrice || 1000;
      
      let upliftedBasePrice = baseMarketPrice;
      if (baseMarketPrice <= 20000) {
        upliftedBasePrice = baseMarketPrice * 1.08;
      } else if (baseMarketPrice <= 50000) {
        upliftedBasePrice = baseMarketPrice * 1.06;
      } else {
        upliftedBasePrice = baseMarketPrice * 1.04;
      }

      const realStartPrice = Math.round(upliftedBasePrice);
      // The "Get Upto" price displayed to the user follows the algorithm strictly
      setBasePrice(realStartPrice);
      setRawBasePrice(baseMarketPrice);
      navigateToState(selectedBrand, selectedModel, s, 'storage', 2);
    } catch {
      setError('Failed to fetch quote.');
    }
  };

  const toggleArrayItem = (key: 'defects' | 'hardware' | 'accessories', val: string) => {
    setDiagnostics(prev => {
      let arr = prev[key];
      
      // Enforce mutual exclusivity for battery options
      if (key === 'hardware' && !arr.includes(val)) {
        if (val === 'battery_service') arr = arr.filter(i => i !== 'battery_health');
        if (val === 'battery_health') arr = arr.filter(i => i !== 'battery_service');
      }

      return { ...prev, [key]: arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val] };
    });
  };

  const getFunctionalProblems = (brand: string, model: string) => {
    const lowerModel = model.toLowerCase();
    const isApple = brand.toLowerCase() === 'apple';
    
    // Determine Touch ID vs Face ID for Apple
    const hasFaceId = isApple && (
      lowerModel.includes('iphone x') ||
      lowerModel.includes('iphone 11') ||
      lowerModel.includes('iphone 12') ||
      lowerModel.includes('iphone 13') ||
      lowerModel.includes('iphone 14') ||
      lowerModel.includes('iphone 15') ||
      lowerModel.includes('iphone 16') ||
      lowerModel.includes('iphone 17') ||
      lowerModel.includes('air')
    ) && !lowerModel.includes('se'); // SE series models use Touch ID

    const hasFingerprint = !isApple || (
      lowerModel.includes('iphone 6') ||
      lowerModel.includes('iphone 7') ||
      lowerModel.includes('iphone 8') ||
      lowerModel.includes('se')
    );

    const hasActionButton = isApple && (
      (lowerModel.includes('15') && (lowerModel.includes('pro') || lowerModel.includes('max'))) ||
      lowerModel.includes('16') ||
      lowerModel.includes('17') ||
      lowerModel.includes('air')
    );

    const isSamsung = brand.toLowerCase() === 'samsung';
    const hasSPen = isSamsung && (
      lowerModel.includes('note') || 
      lowerModel.includes('s22 ultra') || 
      lowerModel.includes('s23 ultra') || 
      lowerModel.includes('s24 ultra')
    );

    const isFoldable = 
      lowerModel.includes('fold') || 
      lowerModel.includes('flip') || 
      lowerModel.includes('razr') || 
      lowerModel.includes('open');

    const baseList = [
      { id: 'front_camera', label: 'Front Camera not working', icon: '📸' },
      { id: 'back_camera', label: 'Back Camera not working', icon: '📷' },
      { id: 'volume', label: 'Volume Button not working', icon: '🔉' },
      ...(hasFingerprint ? [{ id: 'fingerprint', label: 'Finger Touch (Touch ID) not working', icon: '👆' }] : []),
      { id: 'wifi', label: 'WiFi not working', icon: '📶' },
      { id: 'speaker', label: 'Speaker Faulty', icon: '🔊' },
      { 
        id: 'silent', 
        label: hasActionButton ? 'Action Button not working' : 'Silent Button not working', 
        icon: '🔕' 
      },
      ...(hasFaceId ? [{ id: 'face', label: 'Face ID / Face Sensor not working', icon: '👱' }] : []),
      { id: 'power', label: 'Power Button not working', icon: '⏻' },
      { id: 'charging', label: 'Charging Port not working', icon: '🔌' },
      { id: 'audio_receiver', label: 'Audio Receiver not working', icon: '📞' },
      { id: 'camera_glass', label: 'Camera Glass Broken', icon: '🔍' },
      { id: 'microphone', label: 'Microphone not working', icon: '🎤' },
      { id: 'bluetooth', label: 'Bluetooth not working', icon: '🛜' },
      { id: 'vibrator', label: 'Vibrator is not working', icon: '📳' },
      { id: 'proximity', label: 'Proximity Sensor not working', icon: '🖐' },
      { id: 'battery_service', label: 'Battery in Service (< 80%)', icon: '🔋' },
      { id: 'battery_health', label: 'Battery Health 80-85%', icon: '🔋' },
      ...(hasSPen ? [{ id: 's_pen', label: 'S-Pen Faulty / Missing', icon: '🖊️' }] : []),
      ...(isFoldable ? [{ id: 'hinge', label: 'Hinge / Folding Mechanism Faulty', icon: '📱' }] : [])
    ];

    return baseList;
  };

  // Model params moved to lib/pricingCalculator.ts

  const calculateFinalPrice = (overrideDiagnostics?: typeof diagnostics) => {
    if (!basePrice) return;
    const diag = overrideDiagnostics || diagnostics;
    
    const floor_price = config.modelFloorPrice; // 1200
    const internal_base = basePrice;
    


  // applyGranularDefects moved to lib/pricingCalculator.ts

  // Android model params moved to lib/pricingCalculator.ts

    const calculated = calculateFhoneifyPrice(
      selectedBrand,
      selectedModel,
      rawBasePrice || internal_base,
      diag as DiagnosticsType
    );
      
    setFinalPrice(calculated);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone || userPhone.length < 10) { setAuthError('Enter a valid 10-digit phone number'); return; }
    try {
      setIsAuthLoading(true); setAuthError(null);
      
      const res = await api.post('/api/auth/otp/send', { phone: '+91' + userPhone });
      if (res.data.error) throw new Error(res.data.error);
      
      setShowOtpInput(true);
      
      if (res.data.bypassCode) {
        setOtp(res.data.bypassCode);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.response?.data?.error || err.message || 'Failed to send OTP');
    } finally { setIsAuthLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setAuthError('Enter a valid 6-digit OTP'); return; }
    try {
      setIsAuthLoading(true); setAuthError(null);
      
      const res = await api.post('/api/auth/otp/verify', { phone: '+91' + userPhone, code: otp, name: userName });
      if (res.data.error) throw new Error(res.data.error);
      
      const { accessToken, refreshToken, user, isNewUser } = res.data.data;
      
      // Save tokens so next request is authenticated
      setAuth({ id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email }, accessToken, refreshToken);
      
      if (isNewUser) {
        setIsFirstTimeUser(true);
        const code = 'NEW' + Math.floor(1000 + Math.random() * 9000);
        setGeneratedCoupon(code);
      } else {
        setIsFirstTimeUser(false);
        setGeneratedCoupon(null);
      }
      
      setShowOtpInput(false);
      calculateFinalPrice();
      setMarketPriceFetched(false);
      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 11);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.response?.data?.error || err.message || 'Verification failed');
    } finally { setIsAuthLoading(false); }
  };

  const handleGetMarketPrice = async () => {
    setIsScraping(true);
    setTimerCount(90);
    setTimerError(null);
    setScrapingStatus('Connecting to market...');
    
    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimerCount(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        // Update status text based on time remaining
        if (prev === 75) setScrapingStatus('Analyzing phone condition...');
        if (prev === 50) setScrapingStatus('Comparing market rates...');
        if (prev === 25) setScrapingStatus('Finalizing exact price...');
        return prev - 1;
      });
    }, 1000);

    try {
      // Add a 150s abort controller so fetch doesn't hang forever, but gives Render enough time to boot Chromium and scrape 
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 150000);
      
      const res = await api.post('/api/quote/cashify-price', {
        brand: selectedBrand,
        model: selectedModel,
        storage: selectedStorage,
        answers: diagnostics,
        fhoneifyPrice: finalPrice // Send for backend logging
      }, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.data && res.data.success) {
        setFinalPrice(res.data.data);
        setIsScraping(false);
        setMarketPriceFetched(true);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        throw new Error(res.data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error(error);
      const isTimeout = error.name === 'CanceledError' || error.message?.includes('timeout') || error.message?.includes('abort');
      
      const serverErrorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      setTimerError(
        isTimeout 
          ? 'Market price currently unavailable. Request timed out.' 
          : `Server Error: ${serverErrorMessage}`
      );
      
      // Keep overlay open for 3 seconds to show graceful error message
      setTimeout(() => {
        setIsScraping(false);
        setTimerError(null);
      }, 3500);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };


  const SidebarSummary = () => (
    <div className="w-full md:max-w-[300px] shrink-0 bg-[#111] border border-[#2a2a2a] rounded-xl p-6 md:sticky md:top-8 text-white mb-8 md:mb-0">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '40px', height: '60px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{getDisplayModelName(selectedBrand, selectedModel)} ({selectedStorage})</span>
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

  const isAppleTierA = selectedBrand === 'Apple' && /1[3-9]|[2-9]\d/i.test(selectedModel) && !/12|11|XR|XS|SE/i.test(selectedModel);
  const isSamsungTierA = selectedBrand === 'Samsung' && /(Galaxy S|Galaxy Z|Fold|Flip)/i.test(selectedModel);
  const isGoogleTierA = selectedBrand === 'Google';
  const isTierA = isAppleTierA || isSamsungTierA || isGoogleTierA;

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
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <h2 style={{ color: '#fff', fontWeight: 600, fontSize: '1.25rem' }}>Select Model</h2>
                <input 
                  type="text" 
                  placeholder="Search model..." 
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', maxWidth: '300px', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #2a2a2a', backgroundColor: '#111', color: '#fff', fontSize: '0.9rem' }}
                />
                <button onClick={() => navigateToState('', '', '', 'brand', 1)} style={{ color: '#4CD964', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Change Brand</button>
              </div>

              {selectedBrand === 'Samsung' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Galaxy A Series",
                      "Galaxy J Series",
                      "Galaxy Note Series",
                      "Galaxy On Series",
                      "Galaxy S Series",
                      "Galaxy C Series",
                      "Galaxy M Series",
                      "Galaxy Fold Series",
                      "Galaxy Z Flip Series",
                      "Galaxy F Series"
                    ].map((series) => {
                      const isSelected = selectedSamsungSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedSamsungSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Xiaomi' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Mi Series",
                      "Redmi 3 Series",
                      "Redmi 4 Series",
                      "Redmi 5 Series",
                      "Redmi 6 Series",
                      "Redmi Note Series",
                      "Redmi Y Series",
                      "Other Xiaomi Smartphones",
                      "Redmi 7 Series",
                      "Redmi K Series",
                      "Redmi 8 Series",
                      "Redmi 9 Series",
                      "Redmi 10 Series",
                      "11 Series",
                      "12 Series",
                      "Redmi A Series",
                      "13 Series",
                      "14 Series",
                      "Redmi 14 Series",
                      "15 Series",
                      "Redmi 15 Series",
                      "17 Series"
                    ].map((series) => {
                      const isSelected = selectedXiaomiSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedXiaomiSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'OPPO' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "F Series",
                      "R Series",
                      "A Series",
                      "K Series",
                      "Reno Series",
                      "Find Series"
                    ].map((series) => {
                      const isSelected = selectedOppoSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedOppoSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Realme' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Realme 2 Series",
                      "Realme 1 Series",
                      "Realme C Series",
                      "Realme 3 Series",
                      "Realme 5 Series",
                      "Realme 6 Series",
                      "Realme X Series",
                      "Realme U Series",
                      "Realme Narzo Series",
                      "Realme 7 Series",
                      "Realme 8 Series",
                      "Realme GT Series",
                      "Realme 9 Series",
                      "Realme 10 Series",
                      "Realme 11 Series",
                      "Realme 12 Series",
                      "Realme P Series",
                      "Realme 13 Series",
                      "Realme 14 Series",
                      "Realme 15 Series",
                      "Realme 16 Series"
                    ].map((series) => {
                      const isSelected = selectedRealmeSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedRealmeSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Motorola' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Moto E Series",
                      "Moto G Series",
                      "Moto Z Series",
                      "Moto M Series",
                      "Moto One Series",
                      "Moto Edge Series",
                      "Moto Razr Series"
                    ].map((series) => {
                      const isSelected = selectedMotorolaSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedMotorolaSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Lenovo' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "A Series",
                      "K Series",
                      "Z Series"
                    ].map((series) => {
                      const isSelected = selectedLenovoSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedLenovoSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Nokia' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Nokia 2 Series",
                      "Nokia 3 Series",
                      "Nokia 5 Series",
                      "Nokia 6 Series",
                      "Nokia 7 Series",
                      "Nokia 8 Series",
                      "Nokia 4 Series",
                      "Nokia C Series",
                      "Nokia G Series",
                      "Nokia X Series"
                    ].map((series) => {
                      const isSelected = selectedNokiaSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedNokiaSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Honor' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Honor 7 Series",
                      "Honor 8 Series",
                      "Honor 9 Series",
                      "Honor Holly Series",
                      "Honor 10 Series",
                      "Honor 5 Series",
                      "Honor 6 Series",
                      "Honor Play Series",
                      "Honor 20 Series",
                      "Honor 200 Series"
                    ].map((series) => {
                      const isSelected = selectedHonorSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedHonorSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Asus' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Zenfone 5 Series",
                      "Zenfone Max Series",
                      "ROG Series",
                      "8 Series"
                    ].map((series) => {
                      const isSelected = selectedAsusSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedAsusSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Google' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Pixel 3 Series",
                      "Pixel 4 Series",
                      "Pixel 6 Series",
                      "Pixel 7 Series",
                      "Pixel 8 Series",
                      "Pixel 9 Series",
                      "Pixel 10 Series"
                    ].map((series) => {
                      const isSelected = selectedGoogleSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedGoogleSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'POCO' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "POCO X Series",
                      "POCO F Series",
                      "POCO M Series",
                      "POCO C Series"
                    ].map((series) => {
                      const isSelected = selectedPocoSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedPocoSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Huawei' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Huawei P Series",
                      "Huawei Mate Series"
                    ].map((series) => {
                      const isSelected = selectedHuaweiSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedHuaweiSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'LG' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "G Series",
                      "V Series",
                      "W Series"
                    ].map((series) => {
                      const isSelected = selectedLgSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedLgSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Infinix' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "S Series",
                      "Zero Series",
                      "Hot Series",
                      "Note Series",
                      "GT Series"
                    ].map((series) => {
                      const isSelected = selectedInfinixSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedInfinixSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'Tecno' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "Camon Series",
                      "Spark Series",
                      "Phantom Series",
                      "POVA Series",
                      "Pop Series"
                    ].map((series) => {
                      const isSelected = selectedTecnoSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedTecnoSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrand === 'iQOO' && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#aaa', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Select Series</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {[
                      "iQOO Series"
                    ].map((series) => {
                      const isSelected = selectedIqooSeries === series;
                      return (
                        <button
                          key={series}
                          type="button"
                          onClick={() => setSelectedIqooSeries(isSelected ? null : series)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #4CD964' : '1px solid #2a2a2a',
                            backgroundColor: isSelected ? 'rgba(76,217,100,0.1)' : '#111',
                            color: isSelected ? '#4CD964' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'center',
                            transition: 'all 200ms'
                          }}
                        >
                          {series}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
            <h2 style={{ fontSize: '1.4rem', fontWeight: 500 }}>Sell Old {getDisplayModelName(selectedBrand, selectedModel)} ({selectedStorage})</h2>
            <p style={{ color: '#666', fontSize: '1rem', marginTop: '1rem' }}>Get Upto</p>
            <p style={{ fontSize: '3rem', fontWeight: 700, color: '#FF4C4C' }}>{formatCurrency(basePrice || 0)}</p>
            <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 3)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#4CD964', color: '#fff', fontWeight: 600, marginTop: '1.5rem', width: 'fit-content', padding: '1rem 2rem', borderRadius: '8px' }}>
              Get Exact Value <ArrowRightIcon />
            </button>
          </div>
        </div>
      )}      {/* STAGES 3-9: MULTI-STEP QUESTIONNAIRE (2 COLUMN LAYOUT) */}
      {((step >= 3 && step <= 9) || step === 13 || step === 14) && (
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
                  { id: 'originalScreen', title: 'Is your phone\'s screen original?', desc: 'Pick "Yes" if screen was never changed or was changed by Authorized Service Center. Pick "No" if screen was changed at local shop.' }
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
                
                {/* Newer model flow: Warranty and GST Bill Questions */}
                {isWarrantyEligible(selectedBrand, selectedModel) && (
                  <>
                    <div style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Is your device under manufacturer warranty?</h3>
                      <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>You can get a better price for your device if it&apos;s under manufacturer warranty with a GST valid bill.</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setDiagnostics({ ...diagnostics, warranty: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.warranty === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.warranty === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.warranty === true ? '#4CD964' : '#fff' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.warranty === true ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.warranty === true ? '#4CD964' : '#transparent' }} /> Yes
                        </button>
                        <button onClick={() => setDiagnostics({ ...diagnostics, warranty: false, mobileAge: 'above11' })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.warranty === false ? '1px solid #FF3B30' : '1px solid #2a2a2a', backgroundColor: diagnostics.warranty === false ? 'rgba(255,59,48,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.warranty === false ? '#FF3B30' : '#fff' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.warranty === false ? '1px solid #FF3B30' : '1px solid #444', backgroundColor: diagnostics.warranty === false ? '#FF3B30' : '#transparent' }} /> No
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Do you have GST valid bill with the same IMEI?</h3>
                      <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Make sure your bill has device IMEI mentioned on it.</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setDiagnostics({ ...diagnostics, validBill: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.validBill === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.validBill === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.validBill === true ? '#4CD964' : '#fff' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.validBill === true ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.validBill === true ? '#4CD964' : '#transparent' }} /> Yes
                        </button>
                        <button onClick={() => setDiagnostics({ ...diagnostics, validBill: false })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.validBill === false ? '1px solid #FF3B30' : '1px solid #2a2a2a', backgroundColor: diagnostics.validBill === false ? 'rgba(255,59,48,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.validBill === false ? '#FF3B30' : '#fff' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.validBill === false ? '1px solid #FF3B30' : '1px solid #444', backgroundColor: diagnostics.validBill === false ? '#FF3B30' : '#transparent' }} /> No
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* eSIM Question (if eligible) */}
                {isESimEligible(selectedBrand, selectedModel) && (
                  <div style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>How many eSIMs does your device support?</h3>
                    <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Please select &quot;Dual eSIM&quot; if your device supports dual eSIMs. Otherwise, select &quot;Single eSIM&quot;.</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => setDiagnostics({ ...diagnostics, eSim: 'Single eSIM' })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.eSim === 'Single eSIM' ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.eSim === 'Single eSIM' ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.eSim === 'Single eSIM' ? '#4CD964' : '#fff' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.eSim === 'Single eSIM' ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.eSim === 'Single eSIM' ? '#4CD964' : '#transparent' }} /> Single eSIM
                      </button>
                      <button onClick={() => setDiagnostics({ ...diagnostics, eSim: 'Dual eSIM' })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.eSim === 'Dual eSIM' ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.eSim === 'Dual eSIM' ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.eSim === 'Dual eSIM' ? '#4CD964' : '#fff' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.eSim === 'Dual eSIM' ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.eSim === 'Dual eSIM' ? '#4CD964' : '#transparent' }} /> Dual eSIM
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                  <button onClick={() => {
                    const finalDiag = { ...diagnostics };
                    if (!isWarrantyEligible(selectedBrand, selectedModel)) {
                      finalDiag.warranty = false;
                      finalDiag.validBill = false;
                      finalDiag.mobileAge = 'above11';
                    }
                    if (!isESimEligible(selectedBrand, selectedModel)) {
                      finalDiag.eSim = null;
                    }
                    setDiagnostics(finalDiag);
                    navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 4);
                  }} disabled={
                    diagnostics.calls === null || 
                    diagnostics.touch === null || 
                    diagnostics.originalScreen === null || 
                    (isWarrantyEligible(selectedBrand, selectedModel) && (diagnostics.warranty === null || diagnostics.validBill === null)) ||
                    (isESimEligible(selectedBrand, selectedModel) && diagnostics.eSim === null)
                  } className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (
                    diagnostics.calls !== null && 
                    diagnostics.touch !== null && 
                    diagnostics.originalScreen !== null && 
                    (!isWarrantyEligible(selectedBrand, selectedModel) || (diagnostics.warranty !== null && diagnostics.validBill !== null)) &&
                    (!isESimEligible(selectedBrand, selectedModel) || diagnostics.eSim !== null)
                  ) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 4: PHYSICAL DEFECTS */}
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
                  <button onClick={() => {
                    // Logic for sub-pages
                    if (diagnostics.defects.includes('screen_scratch')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 5);
                    } else if (diagnostics.defects.includes('screen_spot')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 14);
                    } else if (diagnostics.defects.includes('body_scratch')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6);
                    } else if (diagnostics.defects.includes('panel_missing')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 13);
                    } else {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7);
                    }
                  }} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px' }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 5: SCREEN DEFECT SUB-PAGE */}
            {step === 5 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device screen defects?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>(Because you selected screen defect)</p>
                
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Screen Physical Condition</h3>
                <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Check physical condition of Display Screen</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
                  {[
                    'Screen cracked/ glass broken',
                    'Chipped/cracked outside display area',
                    'More than 2 scratches on screen',
                    '1-2 scratches on screen'
                  ].map((opt) => (
                    <button key={opt} onClick={() => setDiagnostics({ ...diagnostics, screenCondition: opt })} style={{ textAlign: 'left', padding: '1rem 1.5rem', borderRadius: '8px', border: diagnostics.screenCondition === opt ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.screenCondition === opt ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.screenCondition === opt ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      {opt}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => {
                    if (diagnostics.defects.includes('screen_spot')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 14);
                    } else if (diagnostics.defects.includes('body_scratch')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6);
                    } else if (diagnostics.defects.includes('panel_missing')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 13);
                    } else {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7);
                    }
                  }} disabled={!diagnostics.screenCondition} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: diagnostics.screenCondition ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 6: BODY DEFECT SUB-PAGE */}
            {step === 6 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device&apos;s body defects?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>(Because you selected device&apos;s body defect)</p>
                
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>1. Scratches on device Body</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                  {[
                    'More than 2 scratches',
                    '1-2 scratches',
                    'No scratches'
                  ].map((opt) => (
                    <button key={opt} onClick={() => setDiagnostics({ ...diagnostics, bodyScratches: opt })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.bodyScratches === opt ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.bodyScratches === opt ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.bodyScratches === opt ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
                      {opt}
                    </button>
                  ))}
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>2. Dents on device Body</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    'Major dent(s) or more than 2',
                    '1-2 minor dents',
                    'No dents'
                  ].map((opt) => (
                    <button key={opt} onClick={() => setDiagnostics({ ...diagnostics, bodyDents: opt })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.bodyDents === opt ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.bodyDents === opt ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.bodyDents === opt ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
                      {opt}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => {
                    if (diagnostics.defects.includes('panel_missing')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 13);
                    } else {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7);
                    }
                  }} disabled={!diagnostics.bodyScratches || !diagnostics.bodyDents} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.bodyScratches && diagnostics.bodyDents) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 13: PANEL & BENT DEFECT SUB-PAGE */}
            {step === 13 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device&apos;s body defects?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>(Because you selected device&apos;s body defect)</p>
                
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>1. Device Side/Back Panel Condition</h3>
                <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Check your device&apos;s side & back panels</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                  {[
                    { id: 'Cracked/ broken side or back panel', label: 'Cracked/ broken side or back panel' },
                    { id: 'Missing side or back panel', label: 'Missing side or back panel' },
                    { id: 'No defect on side or back panel', label: 'No defect on side or back panel' }
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setDiagnostics({ ...diagnostics, bodyPanel: opt.id })} style={{ textAlign: 'left', padding: '1rem 1.5rem', borderRadius: '8px', border: diagnostics.bodyPanel === opt.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.bodyPanel === opt.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.bodyPanel === opt.id ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>2. Device Bent/Screen loose</h3>
                <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Check if your device is bent or display screen is loose</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'Bent/ curved panel', label: 'Bent/ curved panel' },
                    { id: 'Loose screen (Gap in screen and body)', label: 'Loose screen (Gap in screen and body)' },
                    { id: 'Phone not bent', label: 'Phone not bent' }
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setDiagnostics({ ...diagnostics, bodyBent: opt.id })} style={{ textAlign: 'left', padding: '1rem 1.5rem', borderRadius: '8px', border: diagnostics.bodyBent === opt.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.bodyBent === opt.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.bodyBent === opt.id ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7)} disabled={!diagnostics.bodyPanel || !diagnostics.bodyBent} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.bodyPanel && diagnostics.bodyBent) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 14: SCREEN SPOTS/LINES/DISCOLORATION DEFECT SUB-PAGE */}
            {step === 14 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device&apos;s screen defects?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>(because you selected defective screen)</p>
                
                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>1. Dead Pixels/Spots on Screen</h3>
                <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Check your device&apos;s screen for visible spots</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                  {[
                    { id: 'Large/ heavy visible spots on screen', label: 'Large/ heavy visible spots on screen' },
                    { id: '3 or more minor spots on screen', label: '3 or more minor spots on screen' },
                    { id: '1-2 minor spots on screen', label: '1-2 minor spots on screen' },
                    { id: 'No spots on screen', label: 'No spots on screen' }
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setDiagnostics({ ...diagnostics, screenSpots: opt.id })} style={{ textAlign: 'left', padding: '1rem 1.5rem', borderRadius: '8px', border: diagnostics.screenSpots === opt.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.screenSpots === opt.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.screenSpots === opt.id ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>2. Visible Lines on Screen</h3>
                <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Check your device&apos;s screen for visible lines</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                  {[
                    { id: 'Visible line(s) on display', label: 'Visible line(s) on display' },
                    { id: 'Display faded along edges', label: 'Display faded along edges' },
                    { id: 'No line(s) on Display', label: 'No line(s) on Display' }
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setDiagnostics({ ...diagnostics, screenLines: opt.id })} style={{ textAlign: 'left', padding: '1rem 1.5rem', borderRadius: '8px', border: diagnostics.screenLines === opt.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.screenLines === opt.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.screenLines === opt.id ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>3. Discoloration on Screen</h3>
                <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Check your device&apos;s screen for discoloration</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'Major Discoloration', label: 'Major Discoloration' },
                    { id: 'Minor Discoloration', label: 'Minor Discoloration' },
                    { id: 'No Discoloration', label: 'No Discoloration' }
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setDiagnostics({ ...diagnostics, screenDiscoloration: opt.id })} style={{ textAlign: 'left', padding: '1rem 1.5rem', borderRadius: '8px', border: diagnostics.screenDiscoloration === opt.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.screenDiscoloration === opt.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.screenDiscoloration === opt.id ? '#4CD964' : '#fff', cursor: 'pointer', fontWeight: 500 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => {
                    if (diagnostics.defects.includes('body_scratch')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6);
                    } else if (diagnostics.defects.includes('panel_missing')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 13);
                    } else {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7);
                    }
                  }} disabled={!diagnostics.screenSpots || !diagnostics.screenLines || !diagnostics.screenDiscoloration} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.screenSpots && diagnostics.screenLines && diagnostics.screenDiscoloration) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 7: HARDWARE / FUNCTIONAL */}
            {step === 7 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Functional or Physical Problems</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please choose appropriate condition to get accurate quote</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {getFunctionalProblems(selectedBrand, selectedModel).map((h) => (
                    <button key={h.id} onClick={() => toggleArrayItem('hardware', h.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0.5rem', borderRadius: '8px', border: diagnostics.hardware.includes(h.id) ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.hardware.includes(h.id) ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.hardware.includes(h.id) ? '#4CD964' : '#fff', cursor: 'pointer' }}>
                      <span style={{ fontSize: '2.5rem' }}>{h.icon}</span>
                      <span style={{ fontSize: '0.75rem', textAlign: 'center', fontWeight: 500 }}>{h.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 8)} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px' }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 8: ACCESSORIES */}
            {step === 8 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Do you have the following?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please select accessories which are available</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    {id: 'box', label: 'Original Box with same IMEI', icon: '📦'},
                    ...(hasChargerInBox(selectedBrand, selectedModel) ? [{ id: 'charger', label: 'Original Charger', icon: '🔌' }] : [])
                  ].map((a) => (
                    <button key={a.id} onClick={() => toggleArrayItem('accessories', a.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 1rem', borderRadius: '8px', border: diagnostics.accessories.includes(a.id) ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.accessories.includes(a.id) ? 'rgba(76,217,100,0.1)' : '#1a1a1a', color: diagnostics.accessories.includes(a.id) ? '#4CD964' : '#fff', cursor: 'pointer' }}>
                      <span style={{ fontSize: '4rem' }}>{a.icon}</span>
                      <span style={{ fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>{a.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => { 
                    const isEligible = isWarrantyEligible(selectedBrand, selectedModel);
                    const hasWarrantyAndBill = diagnostics.warranty === true && diagnostics.validBill === true;
                    if (isEligible && hasWarrantyAndBill) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 9);
                    } else {
                      const updatedDiag = {
                        ...diagnostics,
                        validBill: isEligible ? !!diagnostics.validBill : false,
                        warranty: isEligible ? !!diagnostics.warranty : false,
                        mobileAge: 'above11' as const
                      };
                      setDiagnostics(updatedDiag);
                      if (isAuthenticated) { 
                        calculateFinalPrice(updatedDiag); 
                        setMarketPriceFetched(false);
                        navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 11); 
                      } else { 
                        navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 10); 
                      }
                    }
                  }} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px' }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 9: MOBILE AGE */}
            {step === 9 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>What is your mobile age?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please select the age of your device from the purchase date.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                  {[
                    { id: 'below3', label: 'Below 3 months', sub: 'Valid bill mandatory' },
                    { id: '3to6', label: '3 months - 6 months', sub: 'Valid bill mandatory' },
                    { id: '6to11', label: '6 months - 11 months', sub: 'Valid bill mandatory' },
                    { id: 'above11', label: 'Above 11 months', sub: '' }
                  ].map((age) => (
                    <button key={age.id} onClick={() => setDiagnostics({ ...diagnostics, mobileAge: age.id as any })} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '8px', border: diagnostics.mobileAge === age.id ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.mobileAge === age.id ? 'rgba(76,217,100,0.1)' : '#1a1a1a', cursor: 'pointer', color: diagnostics.mobileAge === age.id ? '#4CD964' : '#fff', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: age.sub ? '0.25rem' : '0' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.mobileAge === age.id ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.mobileAge === age.id ? '#4CD964' : 'transparent', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, fontSize: '1rem' }}>{age.label}</span>
                      </div>
                      {age.sub && <span style={{ color: '#a0a0a0', fontSize: '0.75rem', paddingLeft: '1.5rem' }}>{age.sub}</span>}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => { 
                    const isUnderWarranty = diagnostics.mobileAge !== 'above11';
                    const updatedDiag = {
                      ...diagnostics,
                      warranty: isUnderWarranty,
                      validBill: isUnderWarranty
                    };
                    setDiagnostics(updatedDiag);
                    if (isAuthenticated) { 
                      calculateFinalPrice(updatedDiag); 
                      setMarketPriceFetched(false);
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 11); 
                    } else { 
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 10); 
                    } 
                  }} disabled={!diagnostics.mobileAge} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: diagnostics.mobileAge ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}
          </div>
          
          {/* RIGHT SIDEBAR */}
          <SidebarSummary />
        </div>
      )}

{/* STAGE 10: LEAD CAPTURE MODAL */}
      {step === 10 && (
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
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>{getDisplayModelName(selectedBrand, selectedModel)} ({selectedStorage})</p>
                    <p style={{ color: '#FF4C4C', fontSize: '1.75rem', fontWeight: 700 }}>₹ XX,XXX</p>
                  </div>
                </div>
                <button onClick={() => { 
                  const prevStep = isWarrantyEligible(selectedBrand, selectedModel) ? 9 : 8;
                  navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', prevStep); 
                  setShowOtpInput(false); 
                }} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', paddingLeft: '1rem', color: '#999', lineHeight: 1 }}>×</button>
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
                  <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#666' }}>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37', textDecoration: 'none' }}>Terms and Conditions</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#d4af37', textDecoration: 'none' }}>Privacy Policy</a></label>
                </div>

                <button type="submit" disabled={isAuthLoading} style={{ width: '100%', padding: '16px', backgroundColor: userPhone.length >= 10 ? '#d4af37' : '#e0e0e0', color: userPhone.length >= 10 ? '#000' : '#999', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem', cursor: userPhone.length >= 10 ? 'pointer' : 'not-allowed', transition: 'all 200ms', opacity: isAuthLoading ? 0.6 : 1 }}>
                  {isAuthLoading ? 'PROCESSING...' : (showOtpInput ? 'VERIFY & SEE PRICE' : 'GET EXACT PRICE')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 11: FINAL EXACT PRICE */}
      {step === 11 && finalPrice != null && (
        <div className="card flex flex-col gap-4 bg-[#111] border border-[#2a2a2a] p-6 md:p-8 rounded-xl max-w-[600px] mx-auto text-left">
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', borderBottom: '1px solid #2a2a2a', paddingBottom: '2rem', marginBottom: '1rem' }}>
            <img src={`/images/models/${selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} alt={selectedModel} style={{ width: '80px', height: 'auto', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = '/images/placeholder-phone.svg'; e.currentTarget.onerror = null; }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>{getDisplayModelName(selectedBrand, selectedModel)} ({selectedStorage})</h2>
              <p style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Selling price :</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#FF3B30', lineHeight: 1 }}>
                {formatCurrency((finalPrice || 0) - (finalPrice === 1200 ? 0 : 99) + (appliedCoupon ? 299 : 0))}
              </p>
            </div>
          </div>
          
          {!appliedCoupon && (
            <div style={{ 
              position: 'relative',
              padding: '1px',
              borderRadius: '12px',
              background: 'linear-gradient(45deg, #FFB800, #FF3B30, #9C27B0)',
              marginBottom: '1.5rem',
              boxShadow: '0 0 20px rgba(255, 184, 0, 0.3)'
            }}>
              <div style={{
                backgroundColor: '#111',
                padding: '1.5rem',
                borderRadius: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'linear-gradient(to bottom right, rgba(17,17,17,1), rgba(30,30,30,0.9))'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem', display: 'inline-block', animation: 'bounce 2s infinite' }}>🎁</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, background: 'linear-gradient(90deg, #FFD700, #FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Special Offer Available</h3>
                </div>
                
                {isFirstTimeUser && generatedCoupon ? (
                  <p style={{ color: '#ccc', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                    Unlock your first-time user bonus! Use code <strong style={{ color: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,215,0,0.3)', letterSpacing: '1px' }}>{generatedCoupon}</strong> for an extra ₹299 on your selling price.
                  </p>
                ) : (
                  <p style={{ color: '#ccc', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                    Got a promo code? Enter it below to boost your final selling price instantly!
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter promo code" 
                    style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none', fontSize: '1rem', transition: 'all 0.3s ease' }} 
                    onFocus={(e) => { e.currentTarget.style.border = '1px solid #FFD700'; e.currentTarget.style.backgroundColor = 'rgba(255,215,0,0.05)'; }}
                    onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                  />
                  <button 
                    onClick={() => {
                      if (couponInput === generatedCoupon || couponInput === 'WELCOME299' || couponInput === 'FHONEIFY299') {
                        setAppliedCoupon(true);
                      } else {
                        alert('Invalid coupon code');
                      }
                    }}
                    style={{ padding: '0 1.5rem', borderRadius: '8px', fontWeight: 700, background: 'linear-gradient(45deg, #FFB800, #FF8C00)', color: '#000', cursor: 'pointer', border: 'none', boxShadow: '0 4px 10px rgba(255,184,0,0.3)', transition: 'all 0.3s ease', textTransform: 'uppercase', letterSpacing: '1px' }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(255,184,0,0.4)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(255,184,0,0.3)'; }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {marketPriceFetched && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem' }}>Price Summary</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#ccc', fontSize: '0.9rem' }}>
                <span>Base Price</span>
                <span>{formatCurrency(finalPrice)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#ccc', fontSize: '0.9rem', ...(appliedCoupon ? {} : { borderBottom: '1px solid #2a2a2a', paddingBottom: '1.5rem' }) }}>
                <span>Processing Fee</span>
                <span>{finalPrice === 1200 ? '₹0' : '-₹99'}</span>
              </div>

              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#4CD964', fontSize: '0.9rem', borderBottom: '1px solid #2a2a2a', paddingBottom: '1.5rem' }}>
                  <span>First Time User Bonus</span>
                  <span>+₹299</span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                <span>Total Amount</span>
                <span>{formatCurrency((finalPrice || 0) - (finalPrice === 1200 ? 0 : 99) + (appliedCoupon ? 299 : 0))}</span>
              </div>
            </div>
          )}
          
          {(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <button 
                type="button" 
                onClick={handleGetMarketPrice}
                disabled={isScraping || marketPriceFetched}
                className="btn-outline" 
                style={{ 
                  padding: '10px 24px', 
                  fontSize: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  borderColor: '#d4af37',
                  color: '#d4af37',
                  borderRadius: '8px',
                  cursor: (isScraping || marketPriceFetched) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: marketPriceFetched ? 0.6 : 1
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>✨</span>
                {isScraping ? 'Generating...' : marketPriceFetched ? 'Market price fetched' : 'Ai generated market price'}
              </button>
            </div>
          )}
          <div style={{
            marginTop: '2.5rem',
            position: 'relative',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.02) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.08), inset 0 0 20px rgba(212, 175, 55, 0.03)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            overflow: 'hidden'
          }}>
            <style>{`
              @keyframes premiumGlow {
                0% { box-shadow: 0 0 10px rgba(212,175,55,0.2); }
                50% { box-shadow: 0 0 20px rgba(212,175,55,0.5); }
                100% { box-shadow: 0 0 10px rgba(212,175,55,0.2); }
              }
              @keyframes premiumShimmer {
                0% { transform: translateX(-150%) skewX(-15deg); }
                100% { transform: translateX(250%) skewX(-15deg); }
              }
            `}</style>
            
            <div style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '40%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.08), transparent)',
              animation: 'premiumShimmer 4s infinite cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none'
            }} />

            <div style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.05))',
              padding: '12px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'premiumGlow 3s infinite',
              flexShrink: 0,
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            
            <p style={{ color: '#e0e0e0', fontSize: '0.95rem', margin: 0, fontWeight: 400, letterSpacing: '0.3px', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
              <span style={{ 
                color: '#d4af37', 
                fontWeight: 700, 
                marginRight: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontSize: '0.8rem'
              }}>Note:</span> 
              Final pricing and verification will be confirmed following the physical inspection.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', width: '100%' }}>
            <button type="button" onClick={() => { navigateToState('', '', '', 'brand', 1); setFinalPrice(null); setMarketPriceFetched(false); setUserPhone(''); setOtp(''); setShowOtpInput(false); setDiagnostics({ calls: null, touch: null, originalScreen: null, defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: [], warranty: null, validBill: null, eSim: null, mobileAge: null }); }} className="btn-outline" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>Start Over</button>
            <button type="button" onClick={() => setStep(12)} className="btn-primary" style={{ flex: 2, padding: '16px', background: '#4CD964', color: '#fff', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}>Schedule Pickup</button>
          </div>
        </div>
      )}

      {/* STAGE 12: PICKUP DETAILS FORM */}
      {step === 12 && (
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

      {/* IMMERSIVE TIMER OVERLAY */}
      {isScraping && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'all 0.3s ease-in-out',
        }}>
          {timerError ? (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 59, 48, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>Price Unavailable</h2>
              <p style={{ color: '#FF3B30', fontSize: '1.1rem', maxWidth: '350px' }}>{timerError}</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 2rem auto' }}>
                {/* Background Track */}
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="75" cy="75" r="65" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  {/* Animated Progress */}
                  <circle 
                    cx="75" cy="75" r="65" fill="none" 
                    stroke="url(#gradient)" 
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="408" // 2 * PI * 65
                    strokeDashoffset={408 - (408 * timerCount) / 60}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4CD964" />
                      <stop offset="100%" stopColor="#34A853" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center Number */}
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', fontWeight: 700, color: '#fff'
                }}>
                  {timerCount}s
                </div>
              </div>
              <h2 style={{ 
                color: '#fff', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem',
                background: 'linear-gradient(90deg, #4CD964, #34A853)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: 'pulse 2s infinite'
              }}>
                {scrapingStatus}
              </h2>
              <p style={{ color: '#a0a0a0', fontSize: '1rem', maxWidth: '300px', margin: '0 auto' }}>
                Fetching real-time market data to give you the highest possible value.
              </p>
            </div>
          )}
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; text-shadow: 0 0 10px rgba(76, 217, 100, 0.4); } 100% { opacity: 0.8; } }
          `}} />
        </div>
      )}
    </div>
  );
}
