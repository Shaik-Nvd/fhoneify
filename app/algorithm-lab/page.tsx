'use client';

import React, { useState, useEffect } from 'react';
import { calculateFhoneifyPrice, DiagnosticsType } from '@/lib/pricingCalculator';
import { SEED_DEVICES } from '@/lib/seed_devices';
import { sortBrands } from '@/lib/brands';

interface TestLog {
  id: string;
  timestamp: string;
  brand: string;
  model: string;
  storage: string;
  fhoneifyPrice: number;
  cashifyPrice: number;
  diff: number;
  diffPercent: string;
  diagnostics: DiagnosticsType;
}

export default function AlgorithmLab() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const [history, setHistory] = useState<TestLog[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('fhoneify_algo_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveToHistory = (log: Omit<TestLog, 'id' | 'timestamp'>) => {
    const newLog: TestLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString()
    };
    const updated = [newLog, ...history];
    setHistory(updated);
    localStorage.setItem('fhoneify_algo_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('fhoneify_algo_history');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🧪 Algorithm Benchmark Lab</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setActiveTab('calculator')}
              style={{ padding: '0.5rem 1rem', background: activeTab === 'calculator' ? '#333' : 'transparent', border: '1px solid #333', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
            >
              Calculator
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ padding: '0.5rem 1rem', background: activeTab === 'history' ? '#333' : 'transparent', border: '1px solid #333', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
            >
              History ({history.length})
            </button>
          </div>
        </div>

        {activeTab === 'calculator' ? (
          <CalculatorTab onSave={saveToHistory} />
        ) : (
          <HistoryTab history={history} onClear={clearHistory} />
        )}
      </div>
    </div>
  );
}

function CalculatorTab({ onSave }: { onSave: (log: any) => void }) {
  // We'll extract unique brands
  const brands = sortBrands(Array.from(new Set(SEED_DEVICES.map(d => d.brand).filter(Boolean))) as string[]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  
  let models = SEED_DEVICES.filter(d => d.brand === selectedBrand).map(d => d.name || d.model).filter((v, i, a) => a.indexOf(v) === i);
  if (selectedBrand !== 'Xiaomi' && selectedBrand !== 'Samsung') {
    models = models.sort();
  }
  
  const variants = SEED_DEVICES.filter(d => d.brand === selectedBrand && (d.name === selectedModel || d.model === selectedModel));
  // If the data structure is flat (each object is a variant)
  const storageOptions = variants.map(v => v.storage).filter((v, i, a) => a.indexOf(v) === i);
  
  const selectedDevice = variants.find(v => v.storage === selectedStorage);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsType>({
    calls: true,
    touch: true,
    originalScreen: true,
    defects: [],
    screenCondition: 'flawless',
    screenSpots: null,
    screenLines: null,
    screenDiscoloration: null,
    bodyScratches: 'flawless',
    bodyDents: 'flawless',
    bodyPanel: 'flawless',
    bodyBent: 'flawless',
    hardware: [],
    accessories: ['box', 'charger'],
    warranty: false,
    validBill: true,
    eSim: null,
    mobileAge: '3to6'
  });

  const [cashifyPrice, setCashifyPrice] = useState<string>('');

  const toggleArrayItem = (key: 'defects' | 'hardware' | 'accessories', val: string) => {
    setDiagnostics(prev => {
      let arr = prev[key] as string[];
      if (arr.includes(val)) return { ...prev, [key]: arr.filter(i => i !== val) };
      return { ...prev, [key]: [...arr, val] };
    });
  };

  const fhoneifyPrice = selectedDevice ? calculateFhoneifyPrice(selectedDevice.brand, selectedDevice.name || selectedDevice.model, selectedDevice.basePrice || selectedDevice.price || 0, diagnostics) : 0;
  
  const cPrice = parseInt(cashifyPrice) || 0;
  const diff = fhoneifyPrice - cPrice;
  const diffPercent = cPrice > 0 ? ((diff / cPrice) * 100).toFixed(2) : '0.00';

  const isProfitable = diff > 0;

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #222' }}>
          <h2 style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>1. Device Selection</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <select value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setSelectedModel(''); setSelectedStorage(''); }} style={{ padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}>
              <option value="">Select Brand</option>
              {brands.map(b => <option key={b as string} value={b as string}>{b as string}</option>)}
            </select>
            <select value={selectedModel} onChange={e => { setSelectedModel(e.target.value); setSelectedStorage(''); }} disabled={!selectedBrand} style={{ padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}>
              <option value="">Select Model</option>
              {models.map(m => <option key={m as string} value={m as string}>{m as string}</option>)}
            </select>
            <select value={selectedStorage} onChange={e => setSelectedStorage(e.target.value)} disabled={!selectedModel} style={{ padding: '0.8rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}>
              <option value="">Select Storage</option>
              {storageOptions.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #222' }}>
          <h2 style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>2. Diagnostics Config (10-Stage)</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Stage 1 */}
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 1: Tell us more about your device?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>Able to make/receive calls?</span>
                  <select value={diagnostics.calls ? 'yes' : 'no'} onChange={e => setDiagnostics({...diagnostics, calls: e.target.value === 'yes'})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.3rem', borderRadius: '4px' }}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>Touch screen working properly?</span>
                  <select value={diagnostics.touch ? 'yes' : 'no'} onChange={e => setDiagnostics({...diagnostics, touch: e.target.value === 'yes'})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.3rem', borderRadius: '4px' }}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>Phone&apos;s screen original?</span>
                  <select value={diagnostics.originalScreen ? 'yes' : 'no'} onChange={e => setDiagnostics({...diagnostics, originalScreen: e.target.value === 'yes'})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.3rem', borderRadius: '4px' }}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>Under manufacturer warranty?</span>
                  <select value={diagnostics.warranty ? 'yes' : 'no'} onChange={e => setDiagnostics({...diagnostics, warranty: e.target.value === 'yes'})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.3rem', borderRadius: '4px' }}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>GST valid bill with IMEI?</span>
                  <select value={diagnostics.validBill ? 'yes' : 'no'} onChange={e => setDiagnostics({...diagnostics, validBill: e.target.value === 'yes'})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.3rem', borderRadius: '4px' }}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>How many eSIMs does your device support?</span>
                  <select value={diagnostics.eSim || 'Single eSIM'} onChange={e => setDiagnostics({...diagnostics, eSim: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.3rem', borderRadius: '4px' }}>
                    <option value="Single eSIM">Single eSIM</option>
                    <option value="Dual eSIM">Dual eSIM</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Stage 2 */}
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 2: Select screen/body defects</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { id: 'screen_scratch', label: 'Broken/scratch on screen' },
                  { id: 'screen_spot', label: 'Dead Spot/Visible line/Discoloration' },
                  { id: 'body_scratch', label: 'Scratch/Dent on body' },
                  { id: 'panel_missing', label: 'Panel missing/broken' },
                ].map(d => (
                  <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#222', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={diagnostics.defects.includes(d.id)} onChange={() => toggleArrayItem('defects', d.id)} /> {d.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Stage 3 */}
            {diagnostics.defects.includes('screen_scratch') && (
              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 3: Screen Physical Condition</h3>
                <select value={diagnostics.screenCondition || ''} onChange={e => setDiagnostics({...diagnostics, screenCondition: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}>
                  <option value="">Select Condition...</option>
                  <option value="Screen cracked/ glass broken">Screen cracked/ glass broken</option>
                  <option value="Chipped/cracked outside display area">Chipped/cracked outside display area</option>
                  <option value="More than 2 scratches on screen">More than 2 scratches on screen</option>
                  <option value="1-2 scratches on screen">1-2 scratches on screen</option>
                </select>
              </div>
            )}

            {/* Stage 4 */}
            {diagnostics.defects.includes('screen_spot') && (
              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 4: Screen Spots/Lines</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  <select value={diagnostics.screenSpots || ''} onChange={e => setDiagnostics({...diagnostics, screenSpots: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Spots on Screen...</option>
                    <option value="Large/ heavy visible spots on screen">Large/ heavy visible spots</option>
                    <option value="3 or more minor spots on screen">3 or more minor spots</option>
                    <option value="1-2 minor spots on screen">1-2 minor spots</option>
                    <option value="No spots on screen">No spots on screen</option>
                  </select>
                  <select value={diagnostics.screenLines || ''} onChange={e => setDiagnostics({...diagnostics, screenLines: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Lines on Screen...</option>
                    <option value="Visible line(s) on display">Visible line(s) on display</option>
                    <option value="Display faded along edges">Display faded along edges</option>
                    <option value="No line(s) on Display">No line(s) on Display</option>
                  </select>
                  <select value={diagnostics.screenDiscoloration || ''} onChange={e => setDiagnostics({...diagnostics, screenDiscoloration: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Discoloration on Screen...</option>
                    <option value="Major Discoloration">Major Discoloration</option>
                    <option value="Minor Discoloration">Minor Discoloration</option>
                    <option value="No Discoloration">No Discoloration</option>
                  </select>
                </div>
              </div>
            )}

            {/* Stage 5 */}
            {diagnostics.defects.includes('body_scratch') && (
              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 5: Scratches & Dents</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  <select value={diagnostics.bodyScratches || ''} onChange={e => setDiagnostics({...diagnostics, bodyScratches: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Scratches on Body...</option>
                    <option value="More than 2 scratches">More than 2 scratches</option>
                    <option value="1-2 scratches">1-2 scratches</option>
                    <option value="No scratches">No scratches</option>
                  </select>
                  <select value={diagnostics.bodyDents || ''} onChange={e => setDiagnostics({...diagnostics, bodyDents: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Dents on Body...</option>
                    <option value="Major dent(s) or more than 2">Major dent(s) or more than 2</option>
                    <option value="1-2 minor dents">1-2 minor dents</option>
                    <option value="No dents">No dents</option>
                  </select>
                </div>
              </div>
            )}

            {/* Stage 6 */}
            {diagnostics.defects.includes('panel_missing') && (
              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 6: Panel & Bent</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  <select value={diagnostics.bodyPanel || ''} onChange={e => setDiagnostics({...diagnostics, bodyPanel: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Panel Condition...</option>
                    <option value="Cracked/ broken side or back panel">Cracked/ broken side or back panel</option>
                    <option value="Missing side or back panel">Missing side or back panel</option>
                    <option value="No defect on side or back panel">No defect on side or back panel</option>
                  </select>
                  <select value={diagnostics.bodyBent || ''} onChange={e => setDiagnostics({...diagnostics, bodyBent: e.target.value})} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Bent/Screen Loose...</option>
                    <option value="Bent/ curved panel">Bent/ curved panel</option>
                    <option value="Loose screen (Gap in screen and body)">Loose screen (Gap in screen and body)</option>
                    <option value="Phone not bent">Phone not bent</option>
                  </select>
                </div>
              </div>
            )}

            {/* Stage 7 */}
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 7: Hardware/Physical Problems</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { id: 'front_camera', label: 'Front Camera' },
                  { id: 'back_camera', label: 'Back Camera' },
                  { id: 'volume', label: 'Volume Button' },
                  { id: 'fingerprint', label: 'Finger Touch' },
                  { id: 'wifi', label: 'WiFi' },
                  { id: 'speaker', label: 'Speaker' },
                  { id: 'silent', label: 'Silent Button' },
                  { id: 'face', label: 'Face Sensor' },
                  { id: 'power', label: 'Power Button' },
                  { id: 'charging', label: 'Charging Port' },
                  { id: 'audio_receiver', label: 'Audio Receiver' },
                  { id: 'camera_glass', label: 'Camera Glass' },
                  { id: 'microphone', label: 'Microphone' },
                  { id: 'bluetooth', label: 'Bluetooth' },
                  { id: 'vibrator', label: 'Vibrator' },
                  { id: 'proximity', label: 'Proximity Sensor' },
                  ...(selectedBrand.toLowerCase() === 'apple' 
                    ? [
                        { id: 'battery_service', label: 'Battery < 80%' },
                        { id: 'battery_health', label: 'Battery 80-85%' },
                      ]
                    : [
                        { id: 'battery_service', label: 'Battery Faulty' }
                      ]
                  )
                ].map(hw => (
                  <label key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#222', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="checkbox" checked={diagnostics.hardware.includes(hw.id)} onChange={() => toggleArrayItem('hardware', hw.id)} /> {hw.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Stage 8 & 9 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 8: Accessories</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#222', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={diagnostics.accessories.includes('box')} onChange={() => toggleArrayItem('accessories', 'box')} /> Original Box (same IMEI)
                </label>
              </div>
              <div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>Stage 9: Mobile Age</h3>
                <select 
                  value={diagnostics.mobileAge || ''} 
                  onChange={e => setDiagnostics({...diagnostics, mobileAge: e.target.value as any})}
                  style={{ padding: '0.5rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="below3">Below 3 months</option>
                  <option value="3to6">3 months - 6 months</option>
                  <option value="6to11">6 months - 11 months</option>
                  <option value="above11">Above 11 months</option>
                </select>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #222', position: 'sticky', top: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>3. Evaluation</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa', fontSize: '0.9rem' }}>Base Price (Internal)</label>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{selectedDevice?.basePrice || selectedDevice?.price || 0}</div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4CD964', fontSize: '0.9rem' }}>Fhoneify Algorithm Quote</label>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4CD964' }}>₹{fhoneifyPrice}</div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FF9500', fontSize: '0.9rem' }}>Cashify&apos;s Real Quote</label>
            <input 
              type="number" 
              value={cashifyPrice} 
              onChange={e => setCashifyPrice(e.target.value)} 
              placeholder="Enter amount..."
              style={{ padding: '1rem', fontSize: '1.5rem', background: '#222', border: '1px solid #FF9500', color: '#FF9500', borderRadius: '8px', width: '100%', outline: 'none' }}
            />
          </div>

          {cPrice > 0 && (
            <div style={{ padding: '1rem', background: isProfitable ? 'rgba(76,217,100,0.1)' : 'rgba(255,59,48,0.1)', borderRadius: '8px', border: `1px solid ${isProfitable ? '#4CD964' : '#FF3B30'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Difference</span>
                <span style={{ fontWeight: 'bold', color: isProfitable ? '#4CD964' : '#FF3B30' }}>
                  {isProfitable ? '+' : ''}₹{diff}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Margin</span>
                <span style={{ fontWeight: 'bold', color: isProfitable ? '#4CD964' : '#FF3B30' }}>
                  {isProfitable ? '+' : ''}{diffPercent}%
                </span>
              </div>
            </div>
          )}

          <button 
            disabled={!selectedDevice || cPrice === 0}
            onClick={() => {
              if (selectedDevice) {
                onSave({
                  brand: selectedDevice.brand,
                  model: selectedDevice.name || selectedDevice.model,
                  storage: selectedStorage,
                  fhoneifyPrice,
                  cashifyPrice: cPrice,
                  diff,
                  diffPercent,
                  diagnostics
                });
                setCashifyPrice('');
                alert('Saved to History!');
              }
            }}
            style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: selectedDevice && cPrice > 0 ? '#007AFF' : '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: selectedDevice && cPrice > 0 ? 'pointer' : 'not-allowed' }}
          >
            Save to Log
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ history, onClear }: { history: TestLog[], onClear: () => void }) {
  if (history.length === 0) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>No tests logged yet.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={onClear} style={{ padding: '0.5rem 1rem', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.3)', borderRadius: '4px', cursor: 'pointer' }}>Clear History</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333', color: '#aaa', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Date</th>
              <th style={{ padding: '1rem' }}>Device</th>
              <th style={{ padding: '1rem' }}>Fhoneify</th>
              <th style={{ padding: '1rem' }}>Cashify</th>
              <th style={{ padding: '1rem' }}>Diff</th>
              <th style={{ padding: '1rem' }}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {history.map(log => {
              const isProfitable = log.diff > 0;
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '1rem', color: '#888' }}>{log.timestamp}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{log.model}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{log.storage}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#4CD964' }}>₹{log.fhoneifyPrice}</td>
                  <td style={{ padding: '1rem', color: '#FF9500' }}>₹{log.cashifyPrice}</td>
                  <td style={{ padding: '1rem', color: isProfitable ? '#4CD964' : '#FF3B30' }}>{isProfitable ? '+' : ''}₹{log.diff}</td>
                  <td style={{ padding: '1rem', color: isProfitable ? '#4CD964' : '#FF3B30' }}>{isProfitable ? '+' : ''}{log.diffPercent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
