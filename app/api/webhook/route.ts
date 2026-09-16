import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode && token) {
    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook received from Meta:', JSON.stringify(body, null, 2));
    
    // Optionally, forward this payload to your Express backend
    // const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    // await fetch(`${backendUrl}/api/webhook`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(body)
    // });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    return new NextResponse('Error parsing webhook', { status: 400 });
  }
}
