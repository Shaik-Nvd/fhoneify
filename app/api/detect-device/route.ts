import { NextRequest, NextResponse } from 'next/server';
import { detectDeviceFromInput } from '@/lib/deviceDetection';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ua = body?.userAgent || req.headers.get('user-agent') || '';
    
    // Client Hints if available from browser
    const chModelHeader = req.headers.get('sec-ch-ua-model');
    const chModel = body?.clientHintsModel || (chModelHeader ? chModelHeader.replace(/^"|"$/g, '') : '');
    
    const chPlatformHeader = req.headers.get('sec-ch-ua-platform');
    const chPlatform = body?.clientHintsPlatform || (chPlatformHeader ? chPlatformHeader.replace(/^"|"$/g, '') : '');
    
    const screen = body?.screen;

    const detected = detectDeviceFromInput({
      userAgent: ua,
      clientHintsModel: chModel,
      clientHintsPlatform: chPlatform,
      screen,
    });

    if (!detected) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: detected,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Detection failed' }, { status: 500 });
  }
}
