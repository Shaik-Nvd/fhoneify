import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Cart',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
