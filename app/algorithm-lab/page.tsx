'use client';

import React, { useState, useEffect } from 'react';
import { calculateFhoneifyPrice, DiagnosticsType } from '@/lib/pricingCalculator';
import { SEED_DEVICES } from '@/lib/seed_devices';

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
  const brands = Array.from(new Set(SEED_DEVICES.map(d => d.brand).filter(Boolean))).sort();
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  
  const models = SEED_DEVICES.filter(d => d.brand === selectedBrand).map(d => d.name || d.model).filter((v, i, a) => a.indexOf(v) === i).sort();
  
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
          <h2 style={{ marginBottom: '1rem', color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>2. Diagnostics Config</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Basic Checks</h3>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.calls === true} onChange={e => setDiagnostics({...diagnostics, calls: e.target.checked})} /> Calls Working
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.touch === true} onChange={e => setDiagnostics({...diagnostics, touch: e.target.checked})} /> Touch Working
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.originalScreen === true} onChange={e => setDiagnostics({...diagnostics, originalScreen: e.target.checked})} /> Original Screen
              </label>
              
              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Physical</h3>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.defects.includes('broken_screen')} onChange={() => toggleArrayItem('defects', 'broken_screen')} /> Broken Screen
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.defects.includes('broken_body')} onChange={() => toggleArrayItem('defects', 'broken_body')} /> Broken Body/Panel
              </label>
            </div>
            
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Hardware Issues</h3>
              {['front_camera', 'back_camera', 'wifi', 'battery_service', 'face_id', 'speaker'].map(hw => (
                <label key={hw} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={diagnostics.hardware.includes(hw)} onChange={() => toggleArrayItem('hardware', hw)} /> {hw}
                </label>
              ))}
              
              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Accessories & Age</h3>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.accessories.includes('box')} onChange={() => toggleArrayItem('accessories', 'box')} /> Box
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={diagnostics.accessories.includes('charger')} onChange={() => toggleArrayItem('accessories', 'charger')} /> Charger
              </label>
              <select 
                value={diagnostics.mobileAge || ''} 
                onChange={e => setDiagnostics({...diagnostics, mobileAge: e.target.value as any})}
                style={{ padding: '0.5rem', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '4px', width: '100%', marginTop: '0.5rem' }}
              >
                <option value="below3">0-3 Months</option>
                <option value="3to6">3-6 Months</option>
                <option value="6to11">6-11 Months</option>
                <option value="above11">Above 11 Months</option>
              </select>
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
