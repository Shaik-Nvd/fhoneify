export const BRANDS = [
  'Apple', 'Xiaomi', 'Samsung', 'Vivo', 'OnePlus', 'OPPO', 'Realme', 
  'Motorola', 'Lenovo', 'Nokia', 'Honor', 'Asus', 'Google', 'POCO', 
  'LG', 'Infinix', 'Tecno', 'iQOO', 'Nothing'
];

const svgs: Record<string, string> = {
  Honor: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M2.601 9.753v1.823H.807V9.753H0v4.498h.807v-1.874h1.794v1.874h.807V9.753zm18.671.801h.898c.369 0 .667.297.667.662a.665.665 0 0 1-.667.663h-.898zm-.806-.801v4.498h.806v-2.002l1.68 2.002H24l-1.376-1.64a1.462 1.462 0 0 0-.444-2.858h-1.716zm-7.63-.014v2.807l-1.959-2.807h-.644v4.498h.807v-2.82l1.968 2.82h.633V9.739zm-7.532 2.26c0-.832.68-1.506 1.517-1.506A1.51 1.51 0 0 1 8.337 12c0 .832-.679 1.506-1.516 1.506c-.403 0-.789-.159-1.073-.441A1.5 1.5 0 0 1 5.304 12zM4.497 12c0 .933.566 1.774 1.434 2.132c.869.357 1.868.16 2.533-.5s.863-1.653.503-2.515a2.32 2.32 0 0 0-2.146-1.425a2.316 2.316 0 0 0-2.323 2.307zm11.04-.001a1.513 1.513 0 0 1 1.518-1.506c.838 0 1.516.675 1.516 1.507a1.513 1.513 0 0 1-1.518 1.506c-.402 0-.788-.159-1.072-.441a1.5 1.5 0 0 1-.444-1.066M14.73 12c0 .933.566 1.774 1.434 2.132c.868.357 1.868.16 2.532-.5c.665-.66.864-1.653.504-2.515a2.325 2.325 0 0 0-2.147-1.425a2.316 2.316 0 0 0-2.323 2.307z"/></svg>`,
  Infinix: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='45' fill='#000000' letter-spacing='1'>Infinix</text></svg>`,
  Motorola: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#001489" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12s12-5.373 12-12C24.002 5.375 18.632.002 12.007 0zm7.327 18.065s-.581-2.627-1.528-4.197c-.514-.857-1.308-1.553-2.368-1.532c-.745 0-1.399.423-2.2 1.553q-.704 1.156-1.235 2.403s-.29-.675-.63-1.343a8 8 0 0 0-.605-1.049c-.804-1.13-1.455-1.539-2.2-1.553c-1.049-.021-1.854.675-2.364 1.528c-.948 1.574-1.528 4.197-1.528 4.197h-.864l4.606-15.12l3.56 11.804l.024.021l.024-.021l3.56-11.804l4.61 15.113z"/></svg>`,
  Nothing: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Courier New, monospace' font-weight='900' font-size='40' fill='#000000' stroke='#000' stroke-width='1' stroke-dasharray='3,3'>NOTHING</text></svg>`,
  OnePlus: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='40' fill='#E50012'>ONEPLUS</text></svg>`,
  OPPO: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#00755E' d='M2.85 12.786C1.639 12.774.858 12.2.858 11.321s.781-1.452 1.99-1.465c1.21.013 1.992.588 1.992 1.465s-.782 1.453-1.99 1.465m.034-3.638h-.073C1.156 9.175 0 10.068 0 11.32s1.156 2.147 2.811 2.174h.073c1.655-.027 2.811-.921 2.811-2.174S4.54 9.175 2.885 9.148zm18.27 3.638c-1.21-.012-1.992-.587-1.992-1.465s.782-1.452 1.991-1.465c1.21.013 1.991.588 1.991 1.465s-.781 1.453-1.99 1.465m.035-3.638h-.073c-1.655.027-2.811.92-2.811 2.173s1.156 2.147 2.81 2.174h.074C22.844 13.468 24 12.574 24 11.32s-1.156-2.146-2.811-2.173zm-6.126 3.638c-1.21-.012-1.99-.587-1.99-1.465s.78-1.452 1.99-1.465c1.21.013 1.991.588 1.991 1.465s-.781 1.453-1.99 1.465zm.036-3.638h-.073c-.789.013-1.464.222-1.955.574v-.37h-.857v5.5h.857v-1.931c.49.351 1.166.56 1.954.574h.074c1.655-.027 2.81-.921 2.81-2.174s-1.155-2.146-2.81-2.173m-6.144 3.638c-1.21-.012-1.99-.587-1.99-1.465s.78-1.452 1.99-1.465c1.21.013 1.991.588 1.991 1.465s-.781 1.453-1.99 1.465zm.037-3.638H8.92c-.789.013-1.464.222-1.955.574v-.37h-.856v5.5h.856v-1.931c.491.351 1.166.56 1.955.574h.073c1.655-.027 2.811-.921 2.811-2.174s-1.156-2.146-2.81-2.173z'/></svg>`,
  POCO: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Impact, Arial Black, sans-serif' font-weight='900' font-size='50' fill='#FFC900' letter-spacing='1'>POCO</text></svg>`,
  Vivo: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#415FFF" d="M19.604 14.101c-1.159 0-1.262-.95-1.262-1.24s.103-1.242 1.262-1.242h2.062c1.16 0 1.263.951 1.263 1.242c0 .29-.104 1.24-1.263 1.24m-2.062-3.527c-2.142 0-2.333 1.752-2.333 2.287s.19 2.286 2.333 2.286h2.062c2.143 0 2.334-1.751 2.334-2.286s-.19-2.287-2.334-2.287m-5.477.107c-.286 0-.345.05-.456.213c-.11.164-2.022 3.082-2.022 3.082c-.06.09-.126.126-.206.126s-.145-.036-.206-.126c0 0-1.912-2.918-2.022-3.082s-.17-.213-.456-.213h-.668c-.154 0-.224.12-.127.267l2.283 3.467c.354.521.614.732 1.196.732s.842-.21 1.196-.732l2.284-3.467c.096-.146.026-.267-.128-.267m-8.876.284c0-.203.08-.284.283-.284h.505c.203 0 .283.08.283.283v3.9c0 .202-.08.283-.283.283h-.505c-.203 0-.283-.08-.283-.283zm-1.769-.285c-.287 0-.346.05-.456.213c-.11.164-2.022 3.082-2.022 3.082c-.061.09-.126.126-.206.126s-.145-.036-.206-.126c0 0-1.912-2.918-2.023-3.082c-.11-.164-.169-.213-.455-.213H.175c-.171 0-.224.12-.127.267l2.283 3.467c.355.521.615.732 1.197.732s.842-.21 1.196-.732l2.283-3.467c.097-.146.044-.267-.127-.267m1.055-.893c-.165-.164-.165-.295 0-.46l.351-.351c.165-.165.296-.165.46 0l.352.351c.165.165.165.296 0 .46l-.352.352c-.164.165-.295.165-.46 0z"/></svg>`
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
  Realme: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Realme_logo.svg',
  Motorola: getSvgUrl('Motorola'),
  Lenovo: 'https://cdn.simpleicons.org/lenovo/E2231A',
  Nokia: 'https://cdn.simpleicons.org/nokia/124191',
  Honor: getSvgUrl('Honor'),
  Asus: 'https://cdn.simpleicons.org/asus/00539B',
  Google: 'https://cdn.simpleicons.org/google',
  POCO: getSvgUrl('POCO'),
  LG: 'https://cdn.simpleicons.org/lg/A50034',
  Infinix: getSvgUrl('Infinix'),
  Tecno: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Tecno_Mobile_logo.svg',
  iQOO: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/IQOO_logo.svg',
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
