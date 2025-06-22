'use server';

import { NextRequest, NextResponse } from 'next/server';
import { suggestExpenseCategories } from '@/ai/flows/suggest-expense-categories';

export async function POST(request: NextRequest) {
  // Smart fallback function with keyword matching
  function smartCategoryFallback(description: string, type: 'income' | 'expense'): string {
    const desc = description.toLowerCase();
    
    console.log('🔧 [SMART FALLBACK] Analyzing:', desc, 'Type:', type);
    
    if (type === 'income') {
      if (desc.includes('lương') || desc.includes('salary')) {
        console.log('🔧 [SMART FALLBACK] Matched: lương');
        return 'thu_nhap_luong';
      }
      if (desc.includes('thưởng') || desc.includes('bonus')) {
        console.log('🔧 [SMART FALLBACK] Matched: thưởng');
        return 'thu_nhap_thuong';
      }
      console.log('🔧 [SMART FALLBACK] Default income: thu_nhap_khac');
      return 'thu_nhap_khac';
    }
    
    // Expense categories with Vietnamese keywords
    if (desc.includes('ăn') || desc.includes('uống') || desc.includes('cơm') || 
        desc.includes('tối') || desc.includes('trưa') || desc.includes('sáng') ||
        desc.includes('quán') || desc.includes('nhà hàng') || desc.includes('food')) {
      console.log('🔧 [SMART FALLBACK] Matched: ăn uống');
      return 'an_uong';
    }
    
    if (desc.includes('xe') || desc.includes('bus') || desc.includes('taxi') || 
        desc.includes('xăng') || desc.includes('gas') || desc.includes('di chuyển')) {
      console.log('🔧 [SMART FALLBACK] Matched: di chuyển');
      return 'di_chuyen';
    }
    
    if (desc.includes('mua') || desc.includes('shop') || desc.includes('shopping') ||
        desc.includes('quần áo') || desc.includes('giày')) {
      console.log('🔧 [SMART FALLBACK] Matched: mua sắm');
      return 'mua_sam';
    }
    
    if (desc.includes('phim') || desc.includes('movie') || desc.includes('game') ||
        desc.includes('giải trí') || desc.includes('vui chơi')) {
      console.log('🔧 [SMART FALLBACK] Matched: giải trí');
      return 'giai_tri';
    }
    
    if (desc.includes('điện') || desc.includes('nước') || desc.includes('internet') ||
        desc.includes('bill') || desc.includes('hóa đơn')) {
      console.log('🔧 [SMART FALLBACK] Matched: hóa đơn');
      return 'hoa_don';
    }
    
    if (desc.includes('bác sĩ') || desc.includes('thuốc') || desc.includes('khám') ||
        desc.includes('health') || desc.includes('sức khỏe')) {
      console.log('🔧 [SMART FALLBACK] Matched: sức khỏe');
      return 'suc_khoe';
    }
    
    if (desc.includes('học') || desc.includes('sách') || desc.includes('education') ||
        desc.includes('trường') || desc.includes('giáo dục')) {
      console.log('🔧 [SMART FALLBACK] Matched: giáo dục');
      return 'giao_duc';
    }
    
    if (desc.includes('nhà') || desc.includes('house') || desc.includes('home') ||
        desc.includes('thuê') || desc.includes('rent')) {
      console.log('🔧 [SMART FALLBACK] Matched: nhà cửa');
      return 'nha_cua';
    }
    
    console.log('🔧 [SMART FALLBACK] No match, defaulting to chi_phi_khac');
    return 'chi_phi_khac';
  }

  try {
    const body = await request.json();
    const { description, type } = body;

    console.log('🔧 [AI SUGGEST] Input:', { description, type });

    if (!description || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: description and type' },
        { status: 400 }
      );
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "income" or "expense"' },
        { status: 400 }
      );
    }

    // Try real AI first, fallback to smart matching if fails
    try {
      console.log('🤖 [GEMINI AI] Trying real AI...');
      const aiResult = await suggestExpenseCategories({
        description,
        type,
      });
      
      console.log('🤖 [GEMINI AI] Success:', aiResult);
      return NextResponse.json(aiResult);
      
    } catch (aiError: any) {
      console.log('🤖 [GEMINI AI] Failed, using smart fallback:', aiError.message);
      
      // Fallback to smart matching
      const suggestedCategoryId = smartCategoryFallback(description, type);
      const confidence = suggestedCategoryId === 'chi_phi_khac' ? 0.3 : 0.75;

      const result = {
        suggestedCategoryId,
        confidence,
        debug: 'fallback after AI error: ' + aiError.message
      };

      console.log('🔧 [SMART FALLBACK] Result:', result);
      return NextResponse.json(result);
    }
    
  } catch (error: any) {
    console.error('🔧 [AI SUGGEST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI suggestions' },
      { status: 500 }
    );
  }
}

