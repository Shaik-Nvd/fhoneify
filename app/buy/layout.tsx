import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buy Refurbished Phones',
};

export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
