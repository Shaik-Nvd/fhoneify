export const BRANDS = [
  'Apple', 'Xiaomi', 'Samsung', 'Vivo', 'OnePlus', 'OPPO', 'Realme', 
  'Motorola', 'Lenovo', 'Nokia', 'Honor', 'Asus', 'Google', 'POCO', 
  'LG', 'Infinix', 'Tecno', 'iQOO', 'Nothing'
];

const svgs: Record<string, string> = {
  Honor: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='#FF00FF'/><stop offset='50%' stop-color='#00A2FF'/><stop offset='100%' stop-color='#00E5FF'/></linearGradient></defs><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='45' fill='url(#g)' letter-spacing='2'>HONOR</text></svg>`,
  Infinix: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='45' fill='#000000' letter-spacing='1'>Infinix</text></svg>`,
  Motorola: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='40' fill='#001489'>motorola</text></svg>`,
  Nothing: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Courier New, monospace' font-weight='900' font-size='40' fill='#000000' stroke='#000' stroke-width='1' stroke-dasharray='3,3'>NOTHING</text></svg>`,
  OnePlus: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='40' fill='#E50012'>ONEPLUS</text></svg>`,
  OPPO: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='45' fill='#00755E' letter-spacing='2'>OPPO</text></svg>`,
  POCO: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Impact, Arial Black, sans-serif' font-weight='900' font-size='50' fill='#FFC900' letter-spacing='1'>POCO</text></svg>`,
  Realme: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><rect x='10' y='5' width='180' height='50' fill='#FFC915'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='bold' font-size='35' fill='#333333' letter-spacing='1'>realme</text></svg>`,
  Tecno: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial Black, sans-serif' font-weight='900' font-size='45' fill='#0066CC' letter-spacing='2'>TECNO</text></svg>`,
  Vivo: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='400' font-size='50' fill='#415FFF' letter-spacing='1'>vivo</text></svg>`,
  iQOO: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='45' fill='#F7A700' letter-spacing='1'>iQOO</text></svg>`
};

const getSvgUrl = (name: string) => {
  if (typeof window !== 'undefined') {
    // Basic encoding for browser environments
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgs[name]);
  }
  // Base64 encoding for SSR to avoid escaping issues
  if (svgs[name]) {
    const buffer = Buffer.from(svgs[name]);
    return `data:image/svg+xml;base64,${buffer.toString('base64')}`;
  }
  return '';
};

export const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://cdn.simpleicons.org/apple/000000',
  Xiaomi: 'https://cdn.simpleicons.org/xiaomi/FF6900',
  Samsung: 'https://cdn.simpleicons.org/samsung/1428A0',
  Vivo: getSvgUrl('Vivo'),
  OnePlus: getSvgUrl('OnePlus'),
  OPPO: getSvgUrl('OPPO'),
  Realme: getSvgUrl('Realme'),
  Motorola: getSvgUrl('Motorola'),
  Lenovo: 'https://cdn.simpleicons.org/lenovo/E2231A',
  Nokia: 'https://cdn.simpleicons.org/nokia/124191',
  Honor: getSvgUrl('Honor'),
  Asus: 'https://cdn.simpleicons.org/asus/00539B',
  Google: 'https://cdn.simpleicons.org/google',
  POCO: getSvgUrl('POCO'),
  LG: 'https://cdn.simpleicons.org/lg/A50034',
  Infinix: getSvgUrl('Infinix'),
  Tecno: getSvgUrl('Tecno'),
  iQOO: getSvgUrl('iQOO'),
  Nothing: getSvgUrl('Nothing')
};

export const getBrandLogoStyle = (brand: string) => {
  const baseStyle: React.CSSProperties = {
    height: '48px',
    width: '72px',
    objectFit: 'contain',
    backgroundColor: '#ffffff',
    padding: '4px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  return baseStyle;
};
