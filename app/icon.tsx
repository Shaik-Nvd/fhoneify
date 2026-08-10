import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold)',
          fontWeight: 800,
          borderRadius: '20%',
          border: '1px solid var(--gold)',
          fontFamily: 'sans-serif',
        }}
      >
        F
      </div>
    ),
    { ...size }
  );
}
