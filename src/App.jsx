import React, { useState } from 'react';
import { 
  Search, MapPin, ChevronDown, ShoppingBag, Smartphone, Laptop, 
  Tablet, Watch, ShieldCheck, Truck, RefreshCw, CheckCircle2, 
  Star, ArrowRight, Shield, Zap, HelpCircle, PhoneCall, Heart, 
  Menu, X, Sparkles, Award, ThumbsUp, DollarSign, PenTool, Check
} from 'lucide-react';

export default function App() {
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [showCityModal, setShowCityModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('sell'); // 'sell' | 'buy' | 'repair'
  
  // Interactive Sell Valuation State
  const [calcStep, setCalcStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState('Apple');
  const [selectedModel, setSelectedModel] = useState('iPhone 13 (128 GB)');
  const [deviceCondition, setDeviceCondition] = useState({
    powersOn: true,
    screenGood: true,
    bodyGood: true,
    hasBillBox: true
  });
  const [estimatedValue, setEstimatedValue] = useState(26500);
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  // Sample data
  const cities = ['Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];

  const services = [
    { id: 'phone', title: 'Sell Phone', icon: Smartphone, badge: 'Popular', desc: 'Highest value, instant cash' },
    { id: 'laptop', title: 'Sell Laptop', icon: Laptop, badge: '', desc: 'MacBooks, Windows & Gaming' },
    { id: 'tablet', title: 'Sell Tablet', icon: Tablet, badge: '', desc: 'iPads & Android tabs' },
    { id: 'watch', title: 'Sell Smartwatch', icon: Watch, badge: '', desc: 'Apple Watch & Galaxy' },
    { id: 'repair', title: 'Doorstep Repair', icon: PenTool, badge: 'Quick', desc: 'Screen, Battery & more' },
    { id: 'buy', title: 'Buy Refurbished', icon: ShoppingBag, badge: '32-Pt Check', desc: '6-12 Months Warranty' },
  ];

  const brands = [
    { name: 'Apple', logo: '' },
    { name: 'Samsung', logo: 'SAMSUNG' },
    { name: 'OnePlus', logo: '1+' },
    { name: 'Xiaomi', logo: 'mi' },
    { name: 'Vivo', logo: 'vivo' },
    { name: 'Oppo', logo: 'oppo' },
    { name: 'Realme', logo: 'realme' },
    { name: 'Google', logo: 'G' },
  ];

  const brandModels = {
    'Apple': ['iPhone 15 Pro (128 GB)', 'iPhone 14 (128 GB)', 'iPhone 13 (128 GB)', 'iPhone 12 (64 GB)', 'iPhone 11 (64 GB)'],
    'Samsung': ['Galaxy S23 Ultra (256 GB)', 'Galaxy S22 5G (128 GB)', 'Galaxy A54 5G', 'Galaxy Z Fold 4'],
    'OnePlus': ['OnePlus 11 5G (128 GB)', 'OnePlus 10 Pro', 'OnePlus Nord CE 3 Lite', 'OnePlus 9RT'],
    'Xiaomi': ['Redmi Note 12 Pro', 'Xiaomi 13 Pro', 'Redmi Note 11', 'POCO X5 Pro'],
    'Vivo': ['Vivo V29 5G', 'Vivo X90', 'Vivo T2x 5G', 'Vivo Y200'],
    'Oppo': ['Oppo Reno 10 5G', 'Oppo F23 5G', 'Oppo Find N3 Flip'],
    'Realme': ['Realme 11 Pro+ 5G', 'Realme Narzo 60', 'Realme GT Neo 3'],
    'Google': ['Pixel 8 Pro (128 GB)', 'Pixel 7a', 'Pixel 6', 'Pixel 7 Pro']
  };

  const refurbishedPhones = [
    {
      name: 'Apple iPhone 13 (128 GB) - Midnight',
      condition: 'Superb',
      price: '₹34,999',
      originalPrice: '₹59,900',
      discount: '41% OFF',
      rating: 4.8,
      reviews: 412,
      tag: 'Best Seller',
      warranty: '6 Months Warranty'
    },
    {
      name: 'Samsung Galaxy S22 5G (128 GB) - Phantom Black',
      condition: 'Superb',
      price: '₹27,499',
      originalPrice: '₹72,999',
      discount: '62% OFF',
      rating: 4.7,
      reviews: 289,
      tag: 'Trending',
      warranty: '6 Months Warranty'
    },
    {
      name: 'OnePlus 10 Pro 5G (128 GB) - Emerald Forest',
      condition: 'Good',
      price: '₹23,999',
      originalPrice: '₹66,999',
      discount: '64% OFF',
      rating: 4.6,
      reviews: 195,
      tag: 'Hot Deal',
      warranty: '6 Months Warranty'
    },
    {
      name: 'Apple iPhone 14 (128 GB) - Starlight',
      condition: 'Flawless',
      price: '₹42,999',
      originalPrice: '₹69,900',
      discount: '38% OFF',
      rating: 4.9,
      reviews: 520,
      tag: 'Premium Refurb',
      warranty: '1 Year Warranty'
    }
  ];

  const repairServices = [
    { name: 'Screen Replacement', price: 'Starts ₹1,499', time: '30 Mins Doorstep', icon: '📱' },
    { name: 'Battery Replacement', price: 'Starts ₹899', time: '20 Mins Doorstep', icon: '🔋' },
    { name: 'Charging Jack Repair', price: 'Starts ₹599', time: '30 Mins Doorstep', icon: '🔌' },
    { name: 'Camera & Lens Fix', price: 'Starts ₹999', time: '45 Mins Doorstep', icon: '📷' },
  ];

  const handleRecalculate = (brand, model, cond) => {
    let base = 20000;
    if (brand === 'Apple') base = 28000;
    if (brand === 'Samsung') base = 22000;
    if (brand === 'OnePlus') base = 18000;
    if (model.includes('15') || model.includes('Ultra') || model.includes('Fold')) base += 14000;
    if (model.includes('14') || model.includes('S22')) base += 7000;

    let multiplier = 1.0;
    if (!cond.powersOn) multiplier *= 0.35;
    if (!cond.screenGood) multiplier *= 0.65;
    if (!cond.bodyGood) multiplier *= 0.85;
    if (cond.hasBillBox) multiplier *= 1.08;

    setEstimatedValue(Math.round(base * multiplier));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FA] text-[#212121]">
      
      {/* Top Banner / Announcement */}
      <div className="bg-[#0e6468] text-white text-xs sm:text-sm py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-[#f8c12d]" />
        <span>India&apos;s #1 Re-commerce Platform: Get Extra ₹1,500 Bonus on Selling Your Old Phone Today!</span>
        <span className="bg-[#f8c12d] text-[#0e6468] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-2">Code: CASHIFYMAX</span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-8">
              <a href="#" className="flex items-center gap-2 text-decoration-none">
                <div className="w-10 h-10 rounded-xl bg-[#128085] flex items-center justify-center shadow-md">
                  <span className="text-white font-extrabold text-2xl tracking-tighter">C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tight text-[#128085] flex items-center">
                    cashify<span className="text-[#2ecc71] text-3xl leading-none">.</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold -mt-1">
                    Sell • Buy • Repair
                  </span>
                </div>
              </a>

              {/* City Selector */}
              <div 
                onClick={() => setShowCityModal(true)}
                className="hidden md:flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 hover:border-[#128085] px-3 py-2 rounded-lg cursor-pointer transition"
              >
                <MapPin className="w-3.5 h-3.5 text-[#128085]" />
                <span className="font-semibold">{selectedCity}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="flex-1 max-w-xl hidden lg:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for mobiles, laptops, accessories or repair..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f1f5f7] border-0 rounded-full pl-11 pr-24 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#128085] transition"
                />
                <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
                <button className="absolute right-1.5 top-1.5 bg-[#128085] hover:bg-[#0e6468] text-white text-xs font-semibold px-4 py-1.5 rounded-full transition">
                  Search
                </button>
              </div>
            </div>

            {/* Navigation CTA / Links */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => {
                  const el = document.getElementById('sell-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#2ecc71] hover:bg-[#27ae60] text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition transform hover:-translate-y-0.5"
              >
                <Zap className="w-4 h-4 fill-white" />
                Sell Now
              </button>

              <button 
                onClick={() => {
                  const el = document.getElementById('buy-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hidden md:inline-flex items-center gap-1.5 text-gray-700 hover:text-[#128085] text-sm font-semibold px-3 py-2 transition"
              >
                Buy Refurbished
              </button>

              <button 
                onClick={() => {
                  const el = document.getElementById('repair-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hidden md:inline-flex items-center gap-1.5 text-gray-700 hover:text-[#128085] text-sm font-semibold px-3 py-2 transition"
              >
                Repair Phone
              </button>

              <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

              <button className="bg-[#e6f6f6] hover:bg-[#d0f0f0] text-[#128085] text-xs sm:text-sm font-bold px-4 py-2 rounded-lg transition">
                Login / Register
              </button>
            </div>
          </div>
        </div>

        {/* Quick Category Bar */}
        <div className="bg-[#fafbfc] border-t border-gray-100 py-2.5 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6 text-xs font-semibold text-gray-600 min-w-max">
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1 text-[#128085]">
              <Smartphone className="w-3.5 h-3.5" /> Sell Phone
            </span>
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> Buy Phone
            </span>
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5" /> Repair Phone
            </span>
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5" /> Sell Laptop
            </span>
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1">
              <Tablet className="w-3.5 h-3.5" /> Sell Smartwatch
            </span>
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Recycle Device
            </span>
            <span className="hover:text-[#128085] cursor-pointer flex items-center gap-1 text-[#f37021]">
              <Sparkles className="w-3.5 h-3.5" /> Partner with Us
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#eaf6f7] to-[#f7f9fa] pt-8 pb-12 sm:pb-16 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Heading & Value Props */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-teal-100 shadow-sm text-xs font-semibold text-[#128085]">
                <ShieldCheck className="w-4 h-4 text-[#2ecc71]" />
                India&apos;s Most Trusted Device Buyback &amp; Repair Network
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Sell Old Phone. <br />
                <span className="text-[#128085]">Get Instant Cash</span> at Doorstep.
              </h1>

              <p className="text-gray-600 text-sm sm:text-base max-w-lg leading-relaxed">
                Free pickup in 60 minutes across {selectedCity}. Get maximum value for your used smartphone, guaranteed data wipeout, and spot UPI payment!
              </p>

              {/* Service Grid Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {services.map((srv) => {
                  const Icon = srv.icon;
                  return (
                    <div 
                      key={srv.id}
                      onClick={() => {
                        if (srv.id === 'phone' || srv.id === 'laptop') {
                          document.getElementById('sell-section')?.scrollIntoView({ behavior: 'smooth' });
                        } else if (srv.id === 'buy') {
                          document.getElementById('buy-section')?.scrollIntoView({ behavior: 'smooth' });
                        } else if (srv.id === 'repair') {
                          document.getElementById('repair-section')?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs hover:border-[#128085] hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                      {srv.badge && (
                        <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase bg-[#e6f6f6] text-[#128085] px-1.5 py-0.5 rounded">
                          {srv.badge}
                        </span>
                      )}
                      <div className="w-10 h-10 rounded-lg bg-[#eaf6f7] group-hover:bg-[#128085] text-[#128085] group-hover:text-white flex items-center justify-center transition mb-2">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#128085] transition">{srv.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{srv.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-gray-600 border-t border-gray-200/60">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2ecc71]" />
                  <span>Instant UPI / Cash Transfer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#128085]" />
                  <span>Free Doorstep Pickup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#128085]" />
                  <span>100% Safe Data Erasure</span>
                </div>
              </div>
            </div>

            {/* Right Column: Instant Price Calculator Widget (Cashify Special) */}
            <div id="sell-section" className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-xl border border-teal-100/70 p-6 relative">
                
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#128085]">Instant Valuation</span>
                    <h3 className="text-lg font-bold text-gray-900">Calculate Exact Value</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Step {calcStep} of 2</span>
                  </div>
                </div>

                {calcStep === 1 ? (
                  <div className="space-y-4">
                    {/* Brand Selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Brand</label>
                      <div className="grid grid-cols-4 gap-2">
                        {brands.map((b) => (
                          <button
                            key={b.name}
                            onClick={() => {
                              setSelectedBrand(b.name);
                              const defaultMod = brandModels[b.name]?.[0] || 'Base Model';
                              setSelectedModel(defaultMod);
                              handleRecalculate(b.name, defaultMod, deviceCondition);
                            }}
                            className={`p-2 rounded-xl text-center border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                              selectedBrand === b.name
                                ? 'border-[#128085] bg-[#e6f6f6] text-[#128085] shadow-xs'
                                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="text-sm">{b.logo}</span>
                            <span>{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Model Selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Phone Model</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          handleRecalculate(selectedBrand, e.target.value, deviceCondition);
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#128085]"
                      >
                        {(brandModels[selectedBrand] || []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Condition Checkboxes */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-bold text-gray-700">Quick Condition Check</label>
                      
                      <label className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                        <span className="font-medium text-gray-700">Does phone turn on &amp; function properly?</span>
                        <input
                          type="checkbox"
                          checked={deviceCondition.powersOn}
                          onChange={(e) => {
                            const updated = { ...deviceCondition, powersOn: e.target.checked };
                            setDeviceCondition(updated);
                            handleRecalculate(selectedBrand, selectedModel, updated);
                          }}
                          className="w-4 h-4 accent-[#128085] rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                        <span className="font-medium text-gray-700">Screen is scratch-free &amp; fully working?</span>
                        <input
                          type="checkbox"
                          checked={deviceCondition.screenGood}
                          onChange={(e) => {
                            const updated = { ...deviceCondition, screenGood: e.target.checked };
                            setDeviceCondition(updated);
                            handleRecalculate(selectedBrand, selectedModel, updated);
                          }}
                          className="w-4 h-4 accent-[#128085] rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                        <span className="font-medium text-gray-700">Original bill and box available? (+₹800)</span>
                        <input
                          type="checkbox"
                          checked={deviceCondition.hasBillBox}
                          onChange={(e) => {
                            const updated = { ...deviceCondition, hasBillBox: e.target.checked };
                            setDeviceCondition(updated);
                            handleRecalculate(selectedBrand, selectedModel, updated);
                          }}
                          className="w-4 h-4 accent-[#128085] rounded"
                        />
                      </label>
                    </div>

                    {/* Valuation Display */}
                    <div className="bg-[#f0f9f9] border border-[#128085]/20 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-gray-500 font-medium">Estimated Pickup Price</span>
                        <div className="text-2xl font-black text-[#128085]">
                          ₹{estimatedValue.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button
                        onClick={() => setCalcStep(2)}
                        className="bg-[#128085] hover:bg-[#0e6468] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition shadow"
                      >
                        Book Pickup <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quoteSuccess ? (
                      <div className="text-center py-6 space-y-3">
                        <div className="w-14 h-14 bg-green-100 text-[#2ecc71] rounded-full flex items-center justify-center mx-auto">
                          <Check className="w-8 h-8 stroke-[3]" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Pickup Scheduled Successfully!</h4>
                        <p className="text-xs text-gray-600 max-w-xs mx-auto">
                          Our Cashify executive will arrive at your address in {selectedCity} within 60 minutes for device verification &amp; spot UPI payment of <strong>₹{estimatedValue.toLocaleString('en-IN')}</strong>.
                        </p>
                        <button
                          onClick={() => {
                            setQuoteSuccess(false);
                            setCalcStep(1);
                          }}
                          className="bg-[#128085] text-white text-xs font-bold px-5 py-2 rounded-lg"
                        >
                          Check Another Device
                        </button>
                      </div>
                    ) : (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          setQuoteSuccess(true);
                        }} 
                        className="space-y-3"
                      >
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-700 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900">{selectedModel}</span>
                            <p className="text-gray-500 text-[10px]">{selectedCity} pickup</p>
                          </div>
                          <span className="font-bold text-[#128085] text-sm">₹{estimatedValue.toLocaleString('en-IN')}</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Your Full Name</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="e.g. Rahul Sharma" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#128085]" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (For UPI &amp; OTP)</label>
                          <input 
                            required 
                            type="tel" 
                            placeholder="+91 98765 43210" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#128085]" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Pickup Address &amp; Pin Code</label>
                          <textarea 
                            required 
                            rows={2} 
                            placeholder="Flat/House No., Street, Landmark..." 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#128085]" 
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setCalcStep(1)}
                            className="w-1/3 border border-gray-300 text-gray-700 text-xs font-bold py-2 rounded-lg hover:bg-gray-50"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            className="w-2/3 bg-[#2ecc71] hover:bg-[#27ae60] text-white text-xs font-bold py-2 rounded-lg shadow transition"
                          >
                            Confirm Free Pickup
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Why Choose Cashify / Core Value Props */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#128085]">Why Cashify</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Smartest Way to Buy, Sell &amp; Repair
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              Over 40 Lakh+ happy customers across 1,500+ cities in India
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#f7fbfb] border border-[#e6f3f3] text-center space-y-2.5">
              <div className="w-12 h-12 bg-[#128085] text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Best Value Guaranteed</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Our AI-driven price engine ensures you get the absolute top-tier market price for your used electronics.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f7fbfb] border border-[#e6f3f3] text-center space-y-2.5">
              <div className="w-12 h-12 bg-[#2ecc71] text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Free Doorstep Pickup</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Zero hassle. We dispatch verified pickup technicians directly to your home or office at your preferred hour.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f7fbfb] border border-[#e6f3f3] text-center space-y-2.5">
              <div className="w-12 h-12 bg-[#128085] text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">100% Data Security</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Military-grade data destruction certificate provided with every device sold. Complete privacy protection.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f7fbfb] border border-[#e6f3f3] text-center space-y-2.5">
              <div className="w-12 h-12 bg-[#f37021] text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Instant Payment</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Money credited instantly via UPI, IMPS, or Cash right in front of you before our agent leaves your premises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Buy Refurbished Phones Section */}
      <section id="buy-section" className="py-14 bg-[#f8fafc] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#128085]">Refurbished Store</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                Refurbished Phones with Cashify Warranty
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Rigorous 32-Point Quality Inspection • 6 to 12 Months Warranty • 7 Days Replacement
              </p>
            </div>
            <button className="text-sm font-bold text-[#128085] hover:text-[#0e6468] flex items-center gap-1">
              View All 150+ Models <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {refurbishedPhones.map((phone, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-gray-200 hover:border-[#128085] hover:shadow-lg transition overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-[#e6f6f6] text-[#128085] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                      {phone.tag}
                    </span>
                    <button className="text-gray-300 hover:text-red-500 transition">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Device Illustration / Preview */}
                  <div className="h-44 bg-gradient-to-tr from-gray-50 to-gray-100 rounded-xl flex items-center justify-center p-4 mb-4 relative">
                    <div className="w-24 h-36 bg-gray-900 rounded-2xl border-4 border-gray-700 shadow-md flex flex-col items-center justify-between p-2">
                      <div className="w-8 h-1 bg-gray-600 rounded-full mt-1"></div>
                      <span className="text-[10px] font-bold text-teal-400">Cashify Cert</span>
                      <div className="w-3 h-3 rounded-full border border-gray-600 mb-1"></div>
                    </div>
                    <span className="absolute bottom-2 right-2 text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-xs font-semibold text-gray-600">
                      Condition: {phone.condition}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1">{phone.name}</h4>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center bg-green-50 px-1.5 py-0.5 rounded text-[11px] font-bold text-green-700">
                      <Star className="w-3 h-3 fill-green-600 text-green-600 mr-0.5" />
                      {phone.rating}
                    </div>
                    <span className="text-[11px] text-gray-400">({phone.reviews} ratings)</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-black text-gray-900">{phone.price}</span>
                    <span className="text-xs text-gray-400 line-through">{phone.originalPrice}</span>
                    <span className="text-xs font-bold text-[#2ecc71]">{phone.discount}</span>
                  </div>

                  <p className="text-[11px] text-[#128085] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {phone.warranty}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <button className="flex-1 bg-[#128085] hover:bg-[#0e6468] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-xs">
                    Buy Now
                  </button>
                  <button className="border border-gray-200 hover:border-gray-300 text-gray-700 p-2.5 rounded-xl transition">
                    <ShoppingBag className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Doorstep Phone Repair Section */}
      <section id="repair-section" className="py-14 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-r from-[#128085] to-[#0a4f52] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-lg">
            <div className="max-w-xl space-y-4 relative z-10">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                Doorstep Repair
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Phone Broken? We Fix It At Your Doorstep in 30 Mins.
              </h2>
              <p className="text-teal-100 text-xs sm:text-sm leading-relaxed">
                Certified technicians, genuine OEM-grade parts, and up to 6 months warranty. No need to leave your couch!
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {repairServices.map((rep, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                    <span className="text-xl">{rep.icon}</span>
                    <h5 className="font-bold text-xs mt-1">{rep.name}</h5>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-teal-200">
                      <span>{rep.price}</span>
                      <span>• {rep.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button className="bg-[#2ecc71] hover:bg-[#27ae60] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow transition">
                  Book Doorstep Repair
                </button>
                <button className="bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl border border-white/20 transition">
                  Check Repair Rates
                </button>
              </div>
            </div>

            {/* Decorative background circle */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/5 rounded-full pointer-events-none"></div>
          </div>

        </div>
      </section>

      {/* How it Works / 3-Step Process */}
      <section className="py-14 bg-[#f8fafc] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#128085]">Simple Process</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              How Selling on Cashify Works
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              From price check to cash in hand in 3 easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center relative shadow-xs">
              <div className="w-12 h-12 bg-[#e6f6f6] text-[#128085] rounded-full flex items-center justify-center font-black text-lg mx-auto mb-4 border border-[#128085]/20">
                1
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1.5">Check Price Online</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Select your device brand, model, and answer simple questions regarding its operational state.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center relative shadow-xs">
              <div className="w-12 h-12 bg-[#e6f6f6] text-[#128085] rounded-full flex items-center justify-center font-black text-lg mx-auto mb-4 border border-[#128085]/20">
                2
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1.5">Free Doorstep Pickup</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Choose your convenient time slot and home/office location. Our pickup hero arrives right on time.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center relative shadow-xs">
              <div className="w-12 h-12 bg-[#2ecc71]/15 text-[#2ecc71] rounded-full flex items-center justify-center font-black text-lg mx-auto mb-4 border border-[#2ecc71]/30">
                3
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1.5">Instant Payment</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Receive instant UPI or Bank Transfer the moment the phone is verified. 100% transparent and safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials / Trust */}
      <section className="py-14 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#128085]">Testimonials</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[#f7f9fa] rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                  &quot;Sold my iPhone 12 within 2 hours of booking! The agent came to my Whitefield office, checked the phone, and transferred ₹22,000 to my GPay right away.&quot;
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60">
                <h5 className="font-bold text-xs text-gray-900">Ananya Deshmukh</h5>
                <span className="text-[10px] text-gray-400">Bengaluru • Sold iPhone 12</span>
              </div>
            </div>

            <div className="p-6 bg-[#f7f9fa] rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                  &quot;Bought a refurbished Galaxy S22. Looks completely untouched, battery health is 96%, and got a full 6 months warranty card with it.&quot;
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60">
                <h5 className="font-bold text-xs text-gray-900">Karthik Reddy</h5>
                <span className="text-[10px] text-gray-400">Hyderabad • Bought Galaxy S22</span>
              </div>
            </div>

            <div className="p-6 bg-[#f7f9fa] rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                  &quot;Screen repair at home was a lifesaver. The technician replaced my cracked OnePlus screen in 25 minutes while I was on my work call.&quot;
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60">
                <h5 className="font-bold text-xs text-gray-900">Vikram Malhotra</h5>
                <span className="text-[10px] text-gray-400">Delhi NCR • Screen Replacement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#192428] text-gray-300 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 pb-10 border-b border-gray-800 text-xs">
            
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#128085] flex items-center justify-center">
                  <span className="text-white font-black text-xl">C</span>
                </div>
                <span className="text-xl font-black text-white">
                  cashify<span className="text-[#2ecc71]">.</span>
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                Cashify (formerly Fhoneify services) is India&apos;s largest and most trusted re-commerce platform for selling old phones, purchasing certified refurbished gadgets, and scheduling instant doorstep repairs.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-[11px] text-gray-400">Toll Free: 1800-123-8989 (9 AM - 9 PM)</span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-white mb-3 text-sm">Sell Services</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Sell Old Phone</a></li>
                <li><a href="#" className="hover:text-white transition">Sell Used Laptop</a></li>
                <li><a href="#" className="hover:text-white transition">Sell Smartwatch</a></li>
                <li><a href="#" className="hover:text-white transition">Sell Tablet / iPad</a></li>
                <li><a href="#" className="hover:text-white transition">Sell Gaming Console</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white mb-3 text-sm">Buy &amp; Repair</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Buy Refurbished Mobiles</a></li>
                <li><a href="#" className="hover:text-white transition">Buy Refurbished Laptops</a></li>
                <li><a href="#" className="hover:text-white transition">Mobile Screen Repair</a></li>
                <li><a href="#" className="hover:text-white transition">Battery Replacement</a></li>
                <li><a href="#" className="hover:text-white transition">Find Cashify Store</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white mb-3 text-sm">Company</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms &amp; Conditions</a></li>
                <li><a href="#" className="hover:text-white transition">E-Waste Policy</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4">
            <p>© {new Date().getFullYear()} Cashify Technologies Pvt. Ltd. All Rights Reserved. Cloned &amp; Branded as Cashify.</p>
            <div className="flex gap-4">
              <span>Security Verified SSL</span>
              <span>•</span>
              <span>100% Genuine Buyback</span>
            </div>
          </div>
        </div>
      </footer>

      {/* City Selector Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowCityModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Select Your City</h3>
            <p className="text-xs text-gray-500 mb-4">Choose your city for instant doorstep pickup availability</p>
            
            <div className="grid grid-cols-2 gap-2.5">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setShowCityModal(false);
                  }}
                  className={`p-3 rounded-xl text-left border text-xs font-bold transition flex items-center gap-2 ${
                    selectedCity === city 
                      ? 'border-[#128085] bg-[#e6f6f6] text-[#128085]' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-[#128085]" />
                  <span>{city}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
