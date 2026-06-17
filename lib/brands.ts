export const BRANDS = [
  'Apple', 'Xiaomi', 'Samsung', 'Vivo', 'OnePlus', 'OPPO', 'Realme', 
  'Motorola', 'Lenovo', 'Nokia', 'Honor', 'Asus', 'Google', 'POCO', 
  'LG', 'Infinix', 'Tecno', 'iQOO', 'Nothing'
];

export const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  Xiaomi: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg',
  Samsung: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
  Vivo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.svg',
  OnePlus: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/OnePlus_logo.svg',
  OPPO: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg',
  Realme: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Realme_logo.svg',
  Motorola: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Motorola_Logo_%28blue%29.svg',
  Lenovo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg',
  Nokia: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg',
  Honor: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Honor_Logo.svg',
  Asus: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg',
  Google: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
  POCO: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/POCO_Logo.svg',
  LG: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/LG_logo_%282015%29.svg',
  Infinix: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Infinix_Logo.svg',
  Tecno: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Tecno_Mobile_logo.svg',
  iQOO: 'https://upload.wikimedia.org/wikipedia/commons/0/05/IQOO_logo.svg',
  Nothing: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Nothing_Logo.svg'
};

export const getBrandLogoStyle = (brand: string) => {
  const baseStyle: React.CSSProperties = {
    height: '48px',
    width: '48px',
    objectFit: 'contain'
  };

  // Black logos that need inversion on a dark background
  if (['Apple', 'Nothing'].includes(brand)) {
    baseStyle.filter = 'invert(1)';
  }

  return baseStyle;
};
