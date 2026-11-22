// Popular devices shown in the hero and the price ticker. catalogModel and
// catalogStorage must match the device catalog exactly: they are sent to
// POST /api/quote/get-upto, which returns the server's "Get upto" price.
// No price is ever stored or computed here.
export interface FeaturedModel {
  id: string;
  brand: string;
  name: string;
  catalogModel: string;
  catalogStorage: string;
  storageLabel: string;
  image: string;
}

export const FEATURED_MODELS: FeaturedModel[] = [
  { id: 'iphone-16-pro', brand: 'Apple', name: 'iPhone 16 Pro', catalogModel: 'Apple iPhone 16 Pro', catalogStorage: '128GB', storageLabel: '128 GB', image: '/images/models/apple-iphone-16-pro.png' },
  { id: 'galaxy-s24-ultra', brand: 'Samsung', name: 'Galaxy S24 Ultra', catalogModel: 'Samsung Galaxy S24 Ultra 5G', catalogStorage: '256 GB', storageLabel: '256 GB', image: '/images/models/samsung-galaxy-s24-ultra.png' },
  { id: 'iphone-15', brand: 'Apple', name: 'iPhone 15', catalogModel: 'Apple iPhone 15', catalogStorage: '128GB', storageLabel: '128 GB', image: '/images/models/apple-iphone-15.png' },
  { id: 'oneplus-12', brand: 'OnePlus', name: 'OnePlus 12', catalogModel: 'OnePlus 12', catalogStorage: '12 GB/256 GB', storageLabel: '12 GB · 256 GB', image: '/images/models/oneplus-12.png' },
  { id: 'iphone-14-pro', brand: 'Apple', name: 'iPhone 14 Pro', catalogModel: 'Apple iPhone 14 Pro', catalogStorage: '128GB', storageLabel: '128 GB', image: '/images/models/apple-iphone-14-pro.png' },
  { id: 'pixel-8', brand: 'Google', name: 'Pixel 8', catalogModel: 'Google Pixel 8', catalogStorage: '8 GB/128 GB', storageLabel: '8 GB · 128 GB', image: '/images/models/google-pixel-8.png' },
  { id: 'iphone-13', brand: 'Apple', name: 'iPhone 13', catalogModel: 'Apple iPhone 13', catalogStorage: '128GB', storageLabel: '128 GB', image: '/images/models/apple-iphone-13.png' },
  { id: 'galaxy-s23-ultra', brand: 'Samsung', name: 'Galaxy S23 Ultra', catalogModel: 'Samsung Galaxy S23 Ultra 5G', catalogStorage: '12 GB/256 GB', storageLabel: '12 GB · 256 GB', image: '/images/models/samsung-galaxy-s23-ultra.png' },
  { id: 'nothing-phone-2', brand: 'Nothing', name: 'Phone (2)', catalogModel: 'Nothing Phone 2', catalogStorage: '8 GB/128 GB', storageLabel: '8 GB · 128 GB', image: '/images/models/nothing-phone-2.png' },
  { id: 'iphone-15-pro', brand: 'Apple', name: 'iPhone 15 Pro', catalogModel: 'Apple iPhone 15 Pro', catalogStorage: '128GB', storageLabel: '128 GB', image: '/images/models/apple-iphone-15-pro.png' },
  { id: 'galaxy-z-flip5', brand: 'Samsung', name: 'Galaxy Z Flip5', catalogModel: 'Samsung Galaxy Z Flip5', catalogStorage: '8 GB/256 GB', storageLabel: '8 GB · 256 GB', image: '/images/models/samsung-galaxy-z-flip5.png' },
  { id: 'iphone-16', brand: 'Apple', name: 'iPhone 16', catalogModel: 'Apple iPhone 16', catalogStorage: '128GB', storageLabel: '128 GB', image: '/images/models/apple-iphone-16.png' },
];

/** The hero phone cycles through these. */
export const HERO_SCREEN_MODELS = FEATURED_MODELS.filter((m) =>
  ['iphone-16-pro', 'galaxy-s24-ultra', 'iphone-15', 'oneplus-12'].includes(m.id),
);

/** Opens the quote flow at the storage step for this model. */
export function quoteHref(m: Pick<FeaturedModel, 'brand' | 'catalogModel'>) {
  return `/quote?brand=${encodeURIComponent(m.brand)}&model=${encodeURIComponent(m.catalogModel)}`;
}

export function formatInr(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
