require('dotenv').config();

async function testWhatsApp() {
  console.log("Phone Number ID:", process.env.WHATSAPP_PHONE_NUMBER_ID);
  console.log("Template:", process.env.WHATSAPP_OTP_TEMPLATE_NAME);
  
  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '918553627474',
        type: 'template',
        template: {
          name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
          language: { code: 'en' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] }
          ]
        }
      })
    });
    
    const data = await res.json();
    console.log("WhatsApp API Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testWhatsApp();
