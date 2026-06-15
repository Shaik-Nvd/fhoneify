import { techFloats, activePickups } from '../../data';

export const LogisticsService = {
  getTechFloat(techId: string) {
    return techFloats[techId] || { cash: 0, upi: 0 };
  },

  getAssignedPickups(techId: string) {
    return activePickups.filter(p => p.techId === techId);
  },

  async requestRequote(pickupId: string, newCondition: string, newQuote: number) {
    const pickup = activePickups.find(p => p.id === pickupId);
    if (!pickup) return null;

    // Simulate OTP generation
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    pickup.status = 'requoted';
    
    // In a real system, we'd SMS this OTP. For demo, we return it to the frontend to autofill/display.
    return {
      pickupId: pickup.id,
      newQuote,
      otp,
      message: 'OTP sent to customer'
    };
  },

  async verifyRequoteOtp(pickupId: string, otp: string) {
    const pickup = activePickups.find(p => p.id === pickupId);
    if (!pickup) return false;
    
    // Accept any 4 digit OTP for demo
    if (otp.length === 4) {
      pickup.status = 'completed';
      return true;
    }
    return false;
  }
};
