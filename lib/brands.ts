export const BRANDS = [
  'Apple', 'Xiaomi', 'Samsung', 'Vivo', 'OnePlus', 'OPPO', 'Realme', 
  'Motorola', 'Lenovo', 'Nokia', 'Honor', 'Asus', 'Google', 'POCO', 
  'LG', 'Infinix', 'Tecno', 'iQOO', 'Nothing'
];

export const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://cdn.simpleicons.org/apple/000000',
  Xiaomi: 'https://cdn.simpleicons.org/xiaomi/FF6900',
  Samsung: 'https://cdn.simpleicons.org/samsung/1428A0',
  Vivo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.svg',
  OnePlus: 'https://cdn.simpleicons.org/oneplus/F50100',
  OPPO: 'https://cdn.simpleicons.org/oppo/00755E',
  Realme: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Realme_logo.svg',
  Motorola: 'https://cdn.simpleicons.org/motorola/001489',
  Lenovo: 'https://cdn.simpleicons.org/lenovo/E2231A',
  Nokia: 'https://cdn.simpleicons.org/nokia/124191',
  Honor: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Honor_Logo_%282019%29.svg',
  Asus: 'https://cdn.simpleicons.org/asus/00539B',
  Google: 'https://cdn.simpleicons.org/google',
  POCO: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/POCO_Logo.svg',
  LG: 'https://cdn.simpleicons.org/lg/A50034',
  Infinix: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Infinix_Logo.svg',
  Tecno: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Tecno_Mobile_logo.svg',
  iQOO: 'https://upload.wikimedia.org/wikipedia/commons/0/05/IQOO_logo.svg',
  Nothing: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Nothing_Logo.svg'
};

export const getBrandLogoStyle = (brand: string) => {
  const baseStyle: React.CSSProperties = {
    height: '48px',
    width: '48px',
    objectFit: 'contain',
    backgroundColor: '#ffffff',
    padding: '4px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  return baseStyle;
};
