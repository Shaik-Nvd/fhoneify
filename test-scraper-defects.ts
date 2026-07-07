import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';

async function test() {
  const result = await scrapeCashifyPrice({
    brand: 'Apple',
    model: 'Apple iPhone 14',
    storage: '128GB',
    answers: {
      calls: true,
      touch: true,
      originalScreen: true,
      warranty: false,
      validBill: false,
      defects: ['broken_screen', 'screen_spot', 'body_scratch', 'panel_missing'],
      screenCondition: '1-2 scratches on screen',
      screenSpots: '1-2 minor spots on screen',
      screenLines: 'Visible line(s) on display',
      screenDiscoloration: 'Minor Discoloration',
      bodyScratches: '1-2 scratches',
      bodyDents: 'No dents',
      bodyPanel: 'Missing side or back panel',
      bodyBent: 'Phone not bent',
      hardware: ['battery_service', 'wifi'],
      accessories: ['box']
    }
  });
  console.log(result);
}

test();
