/** Inspection next step when no binding instant price is available. Uses the
 * same WhatsApp support number as components/WhatsAppFloatingBtn.tsx and the
 * support mailbox. Browser-safe: no imports, no customer data beyond the
 * device the customer selected. */
export const SUPPORT_WHATSAPP_NUMBER = '919187448347';
export const SUPPORT_EMAIL = 'support@fhoneify.in';

export function inspectionRequestLinks(device: { brand: string; model: string; storage: string }) {
  const name = [device.model || device.brand, device.storage ? `(${device.storage})` : ''].filter(Boolean).join(' ');
  const text = `Hi Fhoneify, I'd like a free inspection quote to sell my ${name}. The website asked for an inspection for my answers.`;
  return {
    whatsapp: `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
    email: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Inspection quote: ${name}`)}&body=${encodeURIComponent(text)}`,
  };
}
