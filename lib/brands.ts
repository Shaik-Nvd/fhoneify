export const BRANDS = [
  'Apple', 'Xiaomi', 'Samsung', 'Vivo', 'OnePlus', 'OPPO', 'Realme', 
  'Motorola', 'Lenovo', 'Nokia', 'Honor', 'Asus', 'Google', 'POCO', 
  'LG', 'Infinix', 'Tecno', 'iQOO', 'Nothing'
];

export const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://commons.wikimedia.org/wiki/Special:FilePath/Apple_logo_black.svg',
  Xiaomi: 'https://commons.wikimedia.org/wiki/Special:FilePath/Xiaomi_logo_(2021-).svg',
  Samsung: 'https://commons.wikimedia.org/wiki/Special:FilePath/Samsung_Logo.svg',
  Vivo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Vivo_mobile_logo.svg',
  OnePlus: 'https://commons.wikimedia.org/wiki/Special:FilePath/OnePlus_logo.svg',
  OPPO: 'https://commons.wikimedia.org/wiki/Special:FilePath/OPPO_Logo.svg',
  Realme: 'https://commons.wikimedia.org/wiki/Special:FilePath/Realme_logo.svg',
  Motorola: 'https://commons.wikimedia.org/wiki/Special:FilePath/Motorola_Logo_(blue).svg',
  Lenovo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lenovo_logo_2015.svg',
  Nokia: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nokia_wordmark.svg',
  Honor: 'https://commons.wikimedia.org/wiki/Special:FilePath/Honor_Logo_(2019).svg',
  Asus: 'https://commons.wikimedia.org/wiki/Special:FilePath/ASUS_Logo.svg',
  Google: 'https://commons.wikimedia.org/wiki/Special:FilePath/Google_%22G%22_logo.svg',
  POCO: 'https://commons.wikimedia.org/wiki/Special:FilePath/POCO_Logo.svg',
  LG: 'https://commons.wikimedia.org/wiki/Special:FilePath/LG_logo_(2015).svg',
  Infinix: 'https://commons.wikimedia.org/wiki/Special:FilePath/Infinix_Logo.svg',
  Tecno: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tecno_Mobile_logo.svg',
  iQOO: 'https://commons.wikimedia.org/wiki/Special:FilePath/IQOO_logo.svg',
  Nothing: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nothing_Logo.svg'
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
