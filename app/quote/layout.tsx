import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get a Quote',
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
