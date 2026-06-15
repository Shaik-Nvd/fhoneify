import { getWalletBalance, wallet_ledger, WalletLedgerEntry, users, coupons, Coupon, User } from '../../data';

export function getBalance(userId: string): number {
  return getWalletBalance(userId);
}

export function getHistory(userId: string): WalletLedgerEntry[] {
  return wallet_ledger.filter((entry) => entry.userId === userId).reverse();
}

export function getActiveCoupons(): Coupon[] {
  return coupons.filter(c => c.isActive);
}

export function getUserData(userId: string): User | undefined {
  return users.find(u => u.id === userId);
}
