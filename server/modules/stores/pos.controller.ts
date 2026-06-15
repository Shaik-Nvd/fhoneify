import { Request, Response } from 'express';
// We should import inventory service, but since this is a monolith demo we'll just mock the behavior here.

export const POSController = {
  async checkout(req: Request, res: Response) {
    try {
      const { storeId, inventoryId, paymentMethod, amountPaid } = req.body;
      
      // Simulate POS checking out
      await new Promise(resolve => setTimeout(resolve, 600));

      // In a real app, we would mark the inventory item as 'sold' and create an Order record.
      // For demo, we just return success.
      res.json({ 
        success: true, 
        data: { 
          transactionId: 'POS-' + Math.floor(Math.random() * 100000),
          receiptUrl: '/api/stores/pos/receipt/demo',
          message: 'POS Transaction Successful. Inventory deducted.'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
