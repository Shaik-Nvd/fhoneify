import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Profile',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
