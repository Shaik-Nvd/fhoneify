import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell Your Phone',
};

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
