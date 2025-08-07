import { NextRequest, NextResponse } from 'next/server';

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

    console.log('Processing bill image with mock data...');
    
    // Use mock data for demonstration since AI processing is temporarily disabled
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
      warning: 'Using mock data for demonstration. Real AI processing temporarily disabled.',
    });

  } catch (error: any) {
    console.error('Error processing bill image:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process bill image',
    }, { status: 500 });
  }
}