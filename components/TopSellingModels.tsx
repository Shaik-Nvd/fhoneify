'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface TopModel {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  price: number;
  image: string;
}

const TOP_MODELS: TopModel[] = [
  { id: '1', brand: 'Apple', model: 'iPhone 14 Pro', ram: '6 GB', storage: '128 GB', price: 41150, image: 'https://m.media-amazon.com/images/I/61HHS0HrjpL._SX679_.jpg' },
  { id: '2', brand: 'Apple', model: 'iPhone 15', ram: '6 GB', storage: '128 GB', price: 38040, image: 'https://m.media-amazon.com/images/I/71d7rfSl0wL._SX679_.jpg' },
  { id: '3', brand: 'Apple', model: 'iPhone 13 Pro', ram: '6 GB', storage: '128 GB', price: 33100, image: 'https://m.media-amazon.com/images/I/61jLiCovxVL._SX679_.jpg' },
  { id: '4', brand: 'Apple', model: 'iPhone 14', ram: '6 GB', storage: '128 GB', price: 26730, image: 'https://m.media-amazon.com/images/I/61bK6PMOC3L._SX679_.jpg' },
  { id: '5', brand: 'Apple', model: 'iPhone 13', ram: '4 GB', storage: '128 GB', price: 23950, image: 'https://m.media-amazon.com/images/I/71xb2xkN5qL._SX679_.jpg' },
  { id: '6', brand: 'Apple', model: 'iPhone 12', ram: '4 GB', storage: '128 GB', price: 17580, image: 'https://m.media-amazon.com/images/I/711wsjBtWeL._SX679_.jpg' },
  { id: '7', brand: 'Apple', model: 'iPhone 12', ram: '4 GB', storage: '64 GB', price: 16850, image: 'https://m.media-amazon.com/images/I/711wsjBtWeL._SX679_.jpg' },
  { id: '8', brand: 'Apple', model: 'iPhone 11', ram: '4 GB', storage: '128 GB', price: 14020, image: 'https://m.media-amazon.com/images/I/71tpxtLD0aL._SX679_.jpg' },
  { id: '9', brand: 'Motorola', model: 'Moto Edge 50 Fusion', ram: '8 GB', storage: '128 GB', price: 13960, image: 'https://m.media-amazon.com/images/I/71yY-5t98DL._SX679_.jpg' },
  { id: '10', brand: 'Apple', model: 'iPhone 11', ram: '4 GB', storage: '64 GB', price: 13220, image: 'https://m.media-amazon.com/images/I/71tpxtLD0aL._SX679_.jpg' },
];

const calculateFhoneifyPrice = (basePrice: number) => {
  if (basePrice <= 20000) return Math.round(basePrice * 1.08); // +8%
  if (basePrice <= 50000) return Math.round(basePrice * 1.06); // +6%
  return Math.round(basePrice * 1.04); // +4%
};

export default function TopSellingModels() {
  const router = useRouter();

  const handleSellClick = (brand: string, model: string) => {
    // Navigate to quote page with pre-filled brand and model
    router.push(`/quote?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Top Selling Mobile Phones</h2>
      
      {/* Desktop/Tablet View */}
      <div className="hidden md:block w-full bg-[#0d0d0d] rounded-2xl border border-[#2a2a2a] overflow-hidden">
        <div className="grid grid-cols-[3fr_2fr_1fr] p-4 bg-[#151515] border-b border-[#2a2a2a] text-sm font-semibold text-[#a0a0a0]">
          <div>Top Selling Mobile Phones</div>
          <div>Price</div>
          <div className="text-right pr-4">Action</div>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {TOP_MODELS.map((item) => (
            <div key={item.id} className="grid grid-cols-[3fr_2fr_1fr] p-4 items-center hover:bg-[#111] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                  <img src={item.image} alt={item.model} className="max-h-full max-w-full object-contain" />
                </div>
                <div>
                  <div className="text-white font-medium text-base">{item.brand} {item.model}</div>
                  <div className="text-[#a0a0a0] text-sm">({item.ram}/{item.storage})</div>
                </div>
              </div>
              <div>
                <div className="text-[#a0a0a0] text-sm mb-1">Get Upto</div>
                <div className="text-[#d4af37] font-bold text-xl">₹{calculateFhoneifyPrice(item.price).toLocaleString('en-IN')}</div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => handleSellClick(item.brand, item.model)}
                  className="bg-[#38b2ac] hover:bg-[#319795] text-white font-medium py-2 px-6 rounded transition-colors text-sm"
                >
                  Sell Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-3">
        {TOP_MODELS.map((item) => (
          <div key={item.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3 flex gap-3 items-center">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <img src={item.image} alt={item.model} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm line-clamp-1">{item.brand} {item.model}</div>
              <div className="text-[#a0a0a0] text-xs mb-1">({item.ram}/{item.storage})</div>
              <div className="text-[#d4af37] font-bold">₹{calculateFhoneifyPrice(item.price).toLocaleString('en-IN')}</div>
            </div>
            <button 
              onClick={() => handleSellClick(item.brand, item.model)}
              className="bg-[#38b2ac] hover:bg-[#319795] text-white font-medium py-1.5 px-4 rounded text-xs whitespace-nowrap"
            >
              Sell Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
