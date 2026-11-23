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
}

export const FEATURED_MODELS: FeaturedModel[] = [
  { id: 'iphone-16-pro', brand: 'Apple', name: 'iPhone 16 Pro', catalogModel: 'Apple iPhone 16 Pro', catalogStorage: '128GB', storageLabel: '128 GB' },
  { id: 'galaxy-s24-ultra', brand: 'Samsung', name: 'Galaxy S24 Ultra', catalogModel: 'Samsung Galaxy S24 Ultra 5G', catalogStorage: '256 GB', storageLabel: '256 GB' },
  { id: 'iphone-15', brand: 'Apple', name: 'iPhone 15', catalogModel: 'Apple iPhone 15', catalogStorage: '128GB', storageLabel: '128 GB' },
  { id: 'oneplus-12', brand: 'OnePlus', name: 'OnePlus 12', catalogModel: 'OnePlus 12', catalogStorage: '12 GB/256 GB', storageLabel: '12 GB · 256 GB' },
  { id: 'iphone-14-pro', brand: 'Apple', name: 'iPhone 14 Pro', catalogModel: 'Apple iPhone 14 Pro', catalogStorage: '128GB', storageLabel: '128 GB' },
  { id: 'pixel-8', brand: 'Google', name: 'Pixel 8', catalogModel: 'Google Pixel 8', catalogStorage: '8 GB/128 GB', storageLabel: '8 GB · 128 GB' },
  { id: 'iphone-13', brand: 'Apple', name: 'iPhone 13', catalogModel: 'Apple iPhone 13', catalogStorage: '128GB', storageLabel: '128 GB' },
  { id: 'galaxy-s23-ultra', brand: 'Samsung', name: 'Galaxy S23 Ultra', catalogModel: 'Samsung Galaxy S23 Ultra 5G', catalogStorage: '12 GB/256 GB', storageLabel: '12 GB · 256 GB' },
  { id: 'nothing-phone-2', brand: 'Nothing', name: 'Nothing Phone 2', catalogModel: 'Nothing Phone 2', catalogStorage: '8 GB/128 GB', storageLabel: '8 GB · 128 GB' },
  { id: 'iphone-15-pro', brand: 'Apple', name: 'iPhone 15 Pro', catalogModel: 'Apple iPhone 15 Pro', catalogStorage: '128GB', storageLabel: '128 GB' },
  { id: 'galaxy-z-flip5', brand: 'Samsung', name: 'Galaxy Z Flip5', catalogModel: 'Samsung Galaxy Z Flip5', catalogStorage: '8 GB/256 GB', storageLabel: '8 GB · 256 GB' },
  { id: 'iphone-16', brand: 'Apple', name: 'iPhone 16', catalogModel: 'Apple iPhone 16', catalogStorage: '128GB', storageLabel: '128 GB' },
];

/**
 * Opens the quote flow. With a storage it lands on the quote page's own
 * Get Upto screen for that variant (which re-fetches the signed price);
 * without one it opens the storage step for the model.
 */
export function quoteHref(brand: string, catalogModel: string, storage?: string) {
  const base = `/quote?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(catalogModel)}`;
  return storage ? `${base}&storage=${encodeURIComponent(storage)}&stage=storage&step=2` : base;
}

/** Same image path rule as the quote page; callers fall back to the placeholder on error. */
export function modelImage(catalogModel: string) {
  return `/images/models/${catalogModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
}

/** "Apple iPhone 15" -> "iPhone 15"; the brand is shown separately. */
export function shortModelName(brand: string, catalogModel: string) {
  return catalogModel.startsWith(`${brand} `) ? catalogModel.slice(brand.length + 1) : catalogModel;
}

/** "12 GB/256 GB" -> "12 GB · 256 GB"; "128GB" -> "128 GB". */
export function storageLabel(storage: string) {
  return storage
    .split('/')
    .map((part) => part.trim().replace(/(\d)(GB|TB|MB)$/i, '$1 $2'))
    .join(' · ');
}

export function formatInr(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
