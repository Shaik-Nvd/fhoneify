const fs = require('fs');

const path = './app/quote/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block to replace starts around line 613: {/* STAGES 3-6: MULTI-STEP QUESTIONNAIRE (2 COLUMN LAYOUT) */}
// and ends where {/* STAGE 7: LEAD CAPTURE MODAL */} starts.

const startIndex = content.indexOf('{/* STAGES 3-6: MULTI-STEP QUESTIONNAIRE');
const endIndex = content.indexOf('{/* STAGE 7: LEAD CAPTURE MODAL */}');

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find boundaries');
  process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

// Define the new steps block
const newSteps = `{/* STAGES 3-9: MULTI-STEP QUESTIONNAIRE (2 COLUMN LAYOUT) */}
      {step >= 3 && step <= 9 && (
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start w-full" style={{ marginTop: '2.5rem' }}>
          
          <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
            
            {/* STAGE 3: BASIC YES/NO */}
            {step === 3 && (
              <div className="card p-6 md:p-12 rounded-lg border border-[#2a2a2a] bg-[#111] text-white">
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>Please answer a few questions about your device.</p>
                
                {[
                  { id: 'calls', title: 'Are you able to make and receive calls?', desc: 'Check your device for cellular network connectivity issues.' },
                  { id: 'touch', title: 'Is your device\\'s touch screen working properly?', desc: 'Check the touch screen functionality of your phone.' },
                  { id: 'originalScreen', title: 'Is your phone\\'s screen original?', desc: 'Pick "Yes" if screen was never changed. Pick "No" if screen was changed.' }
                ].map((q) => (
                  <div key={q.id} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>{q.title}</h3>
                    <p style={{ color: '#cccccc', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{q.desc}</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => setDiagnostics({ ...diagnostics, [q.id]: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics[q.id] === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics[q.id] === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics[q.id] === true ? '#4CD964' : '#fff' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics[q.id] === true ? '1px solid #4CD964' : '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: diagnostics[q.id] === true ? '#4CD964' : 'transparent' }} /> Yes
                      </button>
                      <button onClick={() => setDiagnostics({ ...diagnostics, [q.id]: false })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics[q.id] === false ? '1px solid #FF3B30' : '1px solid #2a2a2a', backgroundColor: diagnostics[q.id] === false ? 'rgba(255,59,48,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics[q.id] === false ? '#FF3B30' : '#fff' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics[q.id] === false ? '1px solid #FF3B30' : '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: diagnostics[q.id] === false ? '#FF3B30' : 'transparent' }} /> No
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Warranty Question */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#ffffff' }}>Is your device under manufacturer warranty?</h3>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setDiagnostics({ ...diagnostics, warranty: true })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.warranty === true ? '1px solid #4CD964' : '1px solid #2a2a2a', backgroundColor: diagnostics.warranty === true ? 'rgba(76,217,100,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.warranty === true ? '#4CD964' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.warranty === true ? '1px solid #4CD964' : '1px solid #444', backgroundColor: diagnostics.warranty === true ? '#4CD964' : 'transparent' }} /> Yes
                    </button>
                    <button onClick={() => setDiagnostics({ ...diagnostics, warranty: false, mobileAge: null })} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: diagnostics.warranty === false ? '1px solid #FF3B30' : '1px solid #2a2a2a', backgroundColor: diagnostics.warranty === false ? 'rgba(255,59,48,0.1)' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: diagnostics.warranty === false ? '#FF3B30' : '#fff' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: diagnostics.warranty === false ? '1px solid #FF3B30' : '1px solid #444', backgroundColor: diagnostics.warranty === false ? '#FF3B30' : 'transparent' }} /> No
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 4)} disabled={diagnostics.calls === null || diagnostics.touch === null || diagnostics.originalScreen === null || diagnostics.warranty === null} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.calls !== null && diagnostics.touch !== null && diagnostics.originalScreen !== null && diagnostics.warranty !== null) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
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
                    } else if (diagnostics.defects.includes('body_scratch')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6);
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
                    if (diagnostics.defects.includes('body_scratch')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 6);
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
                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>Tell us more about your device's body defects?</h2>
                <p style={{ textAlign: 'center', color: '#cccccc', fontSize: '0.85rem', marginBottom: '3rem' }}>(Because you selected device's body defect)</p>
                
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
                  <button onClick={() => navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 7)} disabled={!diagnostics.bodyScratches || !diagnostics.bodyDents} className="btn-primary" style={{ background: '#4CD964', color: '#fff', fontWeight: 600, padding: '1rem 4rem', borderRadius: '8px', opacity: (diagnostics.bodyScratches && diagnostics.bodyDents) ? 1 : 0.5 }}>Continue <ArrowRightIcon /></button>
                </div>
              </div>
            )}

            {/* STAGE 7: HARDWARE / FUNCTIONAL */}
            {step === 7 && (
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
                  <button onClick={() => { 
                    if (diagnostics.warranty || diagnostics.accessories.includes('bill')) {
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 9);
                    } else if (isAuthenticated) { 
                      calculateFinalPrice(); navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 11); 
                    } else { 
                      navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 10); 
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
                    if (isAuthenticated) { 
                      calculateFinalPrice(); navigateToState(selectedBrand, selectedModel, selectedStorage, 'storage', 11); 
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
`;

fs.writeFileSync(path, before + newSteps + '\n' + after, 'utf8');
console.log('Successfully updated page.tsx structure');
