export const BRANDS = [
  'Apple', 'Xiaomi', 'Samsung', 'Vivo', 'OnePlus', 'OPPO', 'Realme', 
  'Motorola', 'Lenovo', 'Nokia', 'Honor', 'Asus', 'Google', 'POCO', 
  'LG', 'Infinix', 'Tecno', 'iQOO', 'Nothing'
];

export const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://cdn.simpleicons.org/apple/white',
  Xiaomi: 'https://cdn.simpleicons.org/xiaomi/ff6900',
  Samsung: 'https://cdn.simpleicons.org/samsung/0C185A',
  Vivo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.svg',
  OnePlus: 'https://cdn.simpleicons.org/oneplus/f50100',
  OPPO: 'https://cdn.simpleicons.org/oppo/white',
  Realme: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Realme_logo.svg',
  Motorola: 'https://cdn.simpleicons.org/motorola/white',
  Lenovo: 'https://cdn.simpleicons.org/lenovo/e2231a',
  Nokia: 'https://cdn.simpleicons.org/nokia/white',
  Honor: 'https://www.google.com/s2/favicons?domain=hihonor.com&sz=128',
  Asus: 'https://cdn.simpleicons.org/asus/003366',
  Google: 'https://cdn.simpleicons.org/google',
  POCO: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/POCO_Logo.svg',
  LG: 'https://cdn.simpleicons.org/lg/a50034',
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

  if (['Nothing', 'Realme'].includes(brand)) {
    baseStyle.filter = 'invert(1)';
  } else if (brand === 'Samsung') {
    baseStyle.filter = 'brightness(0.5)';
    baseStyle.transform = 'scale(1.3)';
  }

  return baseStyle;
};
