import { stores, store_appointments, counters, Appointment } from '../../data';

export const StoresService = {
  getStores(city?: string) {
    if (city) {
      return stores.filter(s => s.city.toLowerCase() === city.toLowerCase());
    }
    return stores;
  },

  bookAppointment(userId: string, storeId: string, date: string, time: string, purpose: 'sell' | 'buy' | 'repair') {
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    const appointment: Appointment = {
      id: `apt-${counters.appointment++}`,
      userId,
      storeId,
      date,
      time,
      purpose,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    store_appointments.push(appointment);
    return appointment;
  },

  getUserAppointments(userId: string) {
    return store_appointments
      .filter(a => a.userId === userId)
      .map(a => {
        const store = stores.find(s => s.id === a.storeId);
        return {
          ...a,
          store
        };
      });
  }
};
