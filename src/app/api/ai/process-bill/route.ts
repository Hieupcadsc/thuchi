import { NextRequest, NextResponse } from 'next/server';
import { extractBillInfo } from '@/ai/flows/extract-bill-info-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageDataUri } = body;

    if (!imageDataUri) {
      return NextResponse.json(
        { error: 'Missing required field: imageDataUri' },
        { status: 400 }
      );
    }

    if (!imageDataUri.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data provided' },
        { status: 400 }
      );
    }

    console.log('Processing bill image with AI...');
    
    try {
      // Use real AI to extract bill information
      const result = await extractBillInfo({ imageDataUri });
      
      console.log('AI extraction result:', result);
      
      // Validate that we got some useful data
      if (!result.totalAmount && !result.description && !result.transactionDate && !result.note) {
        console.warn('AI could not extract any meaningful data from the image');
        return NextResponse.json({
          success: false,
          error: 'Could not extract bill information from the image. Please ensure the image is clear and contains a valid receipt.',
        }, { status: 422 });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          totalAmount: result.totalAmount || 0,
          transactionDate: result.transactionDate || new Date().toISOString().split('T')[0],
          description: result.description || 'Unknown transaction',
          note: result.note || '',
        },
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      
      // Fall back to mock data if AI fails
      console.log('Falling back to mock data due to AI error');
      
      const mockData = [
        {
          totalAmount: 45000,
          transactionDate: new Date().toISOString().split('T')[0],
          description: 'Circle K - Cửa hàng tiện lợi',
          note: 'Nước suối 12k, Bánh mì 15k, Café lon 18k'
        },
        {
          totalAmount: 125000,
          transactionDate: new Date().toISOString().split('T')[0],
          description: 'Vinmart+ - Siêu thị',
          note: 'Thịt ba chỉ 85k, Rau xanh 25k, Nước mắm 15k'
        },
        {
          totalAmount: 350000,
          transactionDate: new Date().toISOString().split('T')[0],
          description: 'Highlands Coffee',
          note: 'Cappuccino size L 89k, Bánh croissant 45k, Nước suối 25k, Phí service 15%'
        }
      ];
      
      const randomIndex = Math.floor(Math.random() * mockData.length);
      const fallback = mockData[randomIndex];
      
      return NextResponse.json({
        success: true,
        data: fallback,
        warning: 'AI processing failed, using fallback data. Please try again or manually enter the transaction.',
      });
    }
  } catch (error: any) {
    console.error('Error processing bill image:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process bill image',
    }, { status: 500 });
  }
} 