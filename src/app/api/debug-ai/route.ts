import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 DEBUG: API Key check');
    console.log('GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET');
    console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
    
    const body = await request.json();
    const { description } = body;

    console.log('🔧 DEBUG: Input description:', description);

    // Simple keyword matching fallback để test
    const desc = description.toLowerCase();
    let suggestedCategoryId = 'chi_phi_khac';
    let confidence = 0.6;

    if (desc.includes('ăn') || desc.includes('uống') || desc.includes('cơm') || 
        desc.includes('tối') || desc.includes('trưa') || desc.includes('sáng') ||
        desc.includes('quán') || desc.includes('nhà hàng')) {
      suggestedCategoryId = 'an_uong';
      confidence = 0.9;
      console.log('🔧 DEBUG: Matched "ăn uống" category');
    }
    
    if (desc.includes('xe') || desc.includes('taxi') || desc.includes('xăng')) {
      suggestedCategoryId = 'di_chuyen';
      confidence = 0.9;
      console.log('🔧 DEBUG: Matched "di chuyển" category');
    }

    const result = {
      suggestedCategoryId,
      confidence,
      debug: {
        description,
        hasApiKey: !!process.env.GOOGLE_AI_API_KEY || !!process.env.GEMINI_API_KEY,
      }
    };

    console.log('🔧 DEBUG: Final result:', result);
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('🔧 DEBUG ERROR:', error);
    return NextResponse.json({
      error: error.message,
      debug: {
        hasApiKey: !!process.env.GOOGLE_AI_API_KEY || !!process.env.GEMINI_API_KEY,
      }
    }, { status: 500 });
  }
} 