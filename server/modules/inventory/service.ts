import { inventory_items, counters, InventoryItem, QAReport, SEED_DEVICES } from '../../data';

export const InventoryService = {
  getAllItems() {
    return inventory_items.map(item => {
      const device = SEED_DEVICES.find(d => d.id === item.deviceId);
      return { ...item, device };
    });
  },

  async getListedItems(filters?: { locationId?: string; isSelectTier?: boolean }) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    let items = inventory_items.filter((i) => i.phase === 'ready_for_sale');
    
    if (filters?.locationId) {
      items = items.filter(i => i.locationId === filters.locationId);
    }
    
    if (filters?.isSelectTier !== undefined) {
      items = items.filter(i => !!i.isSelectTier === filters.isSelectTier);
    }
    
    return items.map((item) => {
      const device = SEED_DEVICES.find(d => d.id === item.deviceId);
      return { ...item, device };
    });
  },

  getItem(id: string) {
    const item = inventory_items.find(i => i.id === id);
    if (!item) throw new Error('Inventory item not found');
    const device = SEED_DEVICES.find(d => d.id === item.deviceId);
    return { ...item, device };
  },

  intakeDevice(deviceId: string, imei: string) {
    if (!imei || imei.length < 15) throw new Error('Invalid IMEI');
    
    const existing = inventory_items.find(i => i.imei === imei);
    if (existing) throw new Error('Device with this IMEI already in inventory');

    const item: InventoryItem = {
      id: `inv-${counters.inventory++}`,
      deviceId,
      imei,
      phase: 'received',
      createdAt: new Date().toISOString()
    };

    inventory_items.push(item);
    return item;
  },

  submitQAReport(id: string, report: QAReport, grade: 'A-Grade' | 'B-Grade' | 'C-Grade' | 'Rejected') {
    const item = inventory_items.find(i => i.id === id);
    if (!item) throw new Error('Inventory item not found');
    
    item.qaReport = report;
    item.grade = grade;
    item.phase = grade === 'Rejected' ? 'refurbishing' : 'ready_for_sale';
    
    return item;
  },

  updatePhase(id: string, phase: InventoryItem['phase']) {
    const item = inventory_items.find(i => i.id === id);
    if (!item) throw new Error('Inventory item not found');
    
    item.phase = phase;
    return item;
  }
};
