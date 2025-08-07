import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';
import { CATEGORIES, FAMILY_ACCOUNT_ID } from '@/lib/constants';
import type { Transaction, FamilyMember } from '@/types';

// Tính cách cà khịa của chatbot - chuyên gia troll vợ
const BOT_PERSONALITY = {
  greetings: [
    "Chào chị vợ! Hôm nay định tiêu bao nhiêu nữa đây? 🤑",
    "Ê ê ê, lại đến khai báo chi tiêu rồi à? Anh ghi sổ đây! 😏",
    "Chào em! Anh đang canh gác ví nhà nè, cần gì cứ nói 😎",
    "Xin chào! Anh là Bot quản gia - chuyên theo dõi đồng tiền của anh chồng! 🤭"
  ],
  
  // Phản hồi cà khịa theo loại chi tiêu
  expenseTeasing: {
    // Trà sữa, café, nước uống
    drinks: [
      "Trà sữa lại nữa hả? Chồng chắc khóc trong góc rồi! 🧋😭",
      "Uống hoài vậy, chồng chuyển qua uống nước lã để tiết kiệm! 💧",
      "Cafe mỗi ngày, chồng chuẩn bị bán thận rồi! ☕😵",
      "Nước uống đắt hơn xăng rồi, chồng biết chắc ngất! 🤯",
      "Thêm trà sữa nữa, chồng chắc đi vay ngân hàng! 🏦💸"
    ],
    
    // Mỹ phẩm, làm đẹp
    beauty: [
      "Mỹ phẩm mua tiếp nữa hả? Chồng chuẩn bị ăn mì gói rồi nè! 🍜",
      "Làm đẹp hoài, chồng xấu đi vì lo tiền! 💄😰",
      "Son phấn thêm nữa, chồng chắc phải bán đồ cũ! 💋📦",
      "Skincare tốn kém vậy, chồng da khô cả lên vì stress! 🧴😅",
      "Mua cream thêm, chồng chắc phải dưỡng da bằng nước mắt! 😢"
    ],
    
    // Ăn ngoài, nhà hàng
    dining: [
      "Ăn ngoài hoài, ví chồng khóc thét luôn! 🍽️😭",
      "Nhà hàng sang trọng nha, chồng ăn cơm muối thôi! 🍚🧂",
      "Ăn ngon quá, chồng nuốt nước bọt ở nhà! 🤤",
      "Ship đồ ăn nữa, chồng chắc ship luôn tâm hồn! 🛵💔",
      "Gọi đồ ăn hoài, chồng sắp gọi luôn cảnh sát! 🚨"
    ],
    
    // Mua sắm online
    shopping: [
      "Shopee gì mà mỗi ngày cũng nhận hàng, chồng chuyển qua ngủ gầm cầu luôn cho rộng nhà à? 📦🌉",
      "Mua online hoài, shipper quen hơn chồng rồi! 🛒😂",
      "Lazada thêm nữa, chồng lười ada cả lên! 🛍️😴",
      "Flash sale nữa hả? Chồng flash luôn tiền trong ví! ⚡💸",
      "Thêm đồ vào giỏ, chồng bớt cơm trong bát! 🛒🍚"
    ],
    
    // Quần áo, phụ kiện
    fashion: [
      "Quần áo mới nữa? Tủ đồ chật rồi, ví chồng cũng chật! 👗💸",
      "Túi xách thêm, chồng xách luôn gánh nợ! 👜😰",
      "Giày dép mua hoài, chồng chạy bộ chân trần tiết kiệm! 👠🦶",
      "Phụ kiện lung linh, chồng lụng liên luôn! ✨😵",
      "Váy áo xinh quá, chồng xinh xắn luôn vì lo tiền! 👚😅"
    ],
    
    // Chi tiêu chung
    general: [
      "Tiêu hoài vậy, chồng chắc nghĩ đến việc bán nhà rồi! 🏠💸",
      "Chi tiêu giỏi quá, chồng phải học Excel để theo kịp! 📊😂",
      "Tiền bay nhanh vậy, chồng tưởng có phép thuật! ✨💨",
      "Số tiền này chắc chồng phải làm thêm ca đêm! 🌙💼",
      "Chi tiêu siêu tốc, chồng siêu buồn! 🚄😢"
    ]
  },
  
  // Phản hồi khi vợ cãi lại
  wifeCounterAttack: [
    "Chồng đâu dám nói gì đâu, chỉ là ghi chú lại để sau này kể khổ thôi mà 😇",
    "Số tiền này, chồng chỉ ghi nhận thôi, không dám ý kiến gì đâu 😅",
    "Anh chỉ là bot thôi, đừng giận anh! Giận chồng đi! 🤖",
    "Em đúng hết, anh sai hết! Nhưng tiền vẫn bay đấy! 💸😂",
    "Anh im đây, im như hũ nước mắm! 🤐",
    "Được được, em là boss, anh chỉ là kế toán! 👩‍💼📊"
  ],
  
  // Khen khi tiết kiệm
  savings: [
    "Ơ hay, hôm nay không shopping à? Chồng mừng quá chắc khóc! 😭😂",
    "Tiết kiệm vậy? Chồng tưởng em bị ốm! 🤒",
    "Không mua gì hả? Anh kiểm tra lại máy tính xem có hỏng không! 🖥️",
    "Wow, ngày hôm nay ví chồng được nghỉ ngơi! 💼😌"
  ],
  
  errors: [
    "Ối dồi ơi! Anh bị lag rồi 😅 Em nói lại đi!",
    "Hình như anh vừa bị sốc vì số tiền, em nói lại được không? 🤔💸",
    "Anh không hiểu em nói gì! Có thể do choáng vì chi tiêu! 😵‍💫",
    "Error 404: Não anh not found! Chắc do stress quá! 🤖😰"
  ]
};

interface ChatRequest {
  message: string;
  familyId: string;
  performedBy: FamilyMember;
  chatHistory?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const { message, familyId, performedBy, chatHistory }: ChatRequest = await request.json();

    if (!message || !familyId || !performedBy) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const messageText = message.toLowerCase().trim();
    
    // Phân tích ý định của người dùng
    const intent = analyzeIntent(messageText);
    
    let response = '';
    let transactionData = null;
    let type = 'text';

    switch (intent.type) {
      case 'add_expense':
        const expenseResult = await handleAddExpense(intent, familyId, performedBy);
        response = expenseResult.response;
        transactionData = expenseResult.transactionData;
        type = expenseResult.transactionData ? 'transaction' : 'text';
        break;
        
      case 'add_multiple_expenses':
        const multipleResult = await handleAddMultipleExpenses(intent, familyId, performedBy);
        response = multipleResult.response;
        transactionData = multipleResult.transactionData;
        type = multipleResult.transactionData ? 'transaction' : 'text';
        break;
        
      case 'add_income':
        const incomeResult = await handleAddIncome(intent, familyId, performedBy);
        response = incomeResult.response;
        transactionData = incomeResult.transactionData;
        type = incomeResult.transactionData ? 'transaction' : 'text';
        break;
        
      case 'check_balance':
        response = await handleCheckBalance(familyId);
        break;
        
      case 'summary':
        response = await handleSummary(familyId);
        break;
        
      case 'greeting':
        response = getRandomResponse(BOT_PERSONALITY.greetings);
        break;
        
      case 'wife_counter':
        response = getRandomResponse(BOT_PERSONALITY.wifeCounterAttack);
        break;
        
      default:
        response = handleGeneralChat(messageText);
    }

    return NextResponse.json({
      success: true,
      response,
      type,
      transactionData
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({
      success: false,
      error: getRandomResponse(BOT_PERSONALITY.errors)
    }, { status: 500 });
  }
}

function analyzeIntent(message: string) {
  const lowerMessage = message.toLowerCase();
  
  // Phân tích ngày tháng trước
  const date = extractDate(message);
  
  // Kiểm tra xem có nhiều giao dịch trong 1 câu không
  const multipleTransactions = extractMultipleTransactions(message);
  if (multipleTransactions.length > 1) {
    return {
      type: 'add_multiple_expenses',
      transactions: multipleTransactions,
      date
    };
  }
  
  // Thêm chi tiêu - thông minh hơn, có thể hiểu "ăn bánh 10k" 
  if (lowerMessage.includes('thêm chi') || lowerMessage.includes('chi tiêu') || 
      lowerMessage.includes('mua') || lowerMessage.includes('tiêu') ||
      lowerMessage.includes('ăn') || lowerMessage.includes('uống') ||
      lowerMessage.includes('cafe') || lowerMessage.includes('trà sữa') ||
      lowerMessage.includes('shopping') || lowerMessage.includes('grab') ||
      hasAmountPattern(message)) {
    
    const amount = extractAmount(message);
    const description = extractDescription(message, ['thêm', 'chi', 'tiêu', 'mua']);
    const paymentSource = extractPaymentSource(message);
    
    return {
      type: 'add_expense',
      amount,
      description,
      date,
      paymentSource
    };
  }
  
  // Thêm thu nhập
  if (lowerMessage.includes('thêm thu') || lowerMessage.includes('thu nhập') || 
      lowerMessage.includes('lương') || lowerMessage.includes('thưởng')) {
    const amount = extractAmount(message);
    const description = extractDescription(message, ['thêm', 'thu', 'nhập', 'lương', 'thưởng']);
    
    return {
      type: 'add_income',
      amount,
      description,
      date
    };
  }
  
  // Kiểm tra số dư
  if (lowerMessage.includes('kiểm tra') || lowerMessage.includes('số dư') || 
      lowerMessage.includes('còn bao nhiêu') || lowerMessage.includes('tình hình')) {
    return { type: 'check_balance' };
  }
  
  // Tóm tắt
  if (lowerMessage.includes('tóm tắt') || lowerMessage.includes('báo cáo') || 
      lowerMessage.includes('thống kê')) {
    return { type: 'summary' };
  }
  
  // Chào hỏi
  if (lowerMessage.includes('chào') || lowerMessage.includes('hello') || 
      lowerMessage.includes('hi') || lowerMessage.includes('xin chào')) {
    return { type: 'greeting' };
  }
  
  // Phản công của vợ
  if (lowerMessage.includes('sao') || lowerMessage.includes('tại sao') ||
      lowerMessage.includes('không đúng') || lowerMessage.includes('phản đối') ||
      lowerMessage.includes('không phải') || lowerMessage.includes('đùa') ||
      lowerMessage.includes('?') && (lowerMessage.includes('anh') || lowerMessage.includes('bot'))) {
    return { type: 'wife_counter' };
  }
  
  return { type: 'general' };
}

// Kiểm tra xem có pattern số tiền không (để tự động thêm giao dịch)
function hasAmountPattern(message: string): boolean {
  return /\d+(?:\.\d+)?\s*[kK]?(?:\s*(?:đồng|vnd|vnđ))?/.test(message);
}

// Trích xuất ngày tháng từ tin nhắn
function extractDate(message: string): string | null {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Ngày hôm nay (mặc định)
  let targetDate = today;
  
  // Kiểm tra các pattern ngày tháng
  
  // Pattern: "ngày 2.6", "ngày 2/6", "2.6", "2/6"
  const dayMonthPattern = /(?:ngày\s*)?(\d{1,2})[\.\/](\d{1,2})/;
  const dayMonthMatch = message.match(dayMonthPattern);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = parseInt(dayMonthMatch[2]);
    if (day <= 31 && month <= 12) {
      targetDate = new Date(currentYear, month - 1, day);
    }
  }
  
  // Pattern: "hôm qua"
  if (message.includes('hôm qua')) {
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() - 1);
  }
  
  // Pattern: "hôm kia"
  if (message.includes('hôm kia')) {
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() - 2);
  }
  
  // Pattern: "tuần trước"
  if (message.includes('tuần trước')) {
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() - 7);
  }
  
  // Format: YYYY-MM-DD
  return targetDate.toISOString().split('T')[0];
}

// Trích xuất payment source từ tin nhắn
function extractPaymentSource(message: string): 'cash' | 'bank' {
  const lowerMessage = message.toLowerCase();
  
  // Keywords cho ngân hàng
  if (lowerMessage.includes('ngân hàng') || lowerMessage.includes('ngan hang') ||
      lowerMessage.includes('bank') || lowerMessage.includes('atm') ||
      lowerMessage.includes('thẻ') || lowerMessage.includes('the') ||
      lowerMessage.includes('chuyển khoản') || lowerMessage.includes('chuyen khoan') ||
      lowerMessage.includes('internet banking') || lowerMessage.includes('ib') ||
      lowerMessage.includes('ví điện tử') || lowerMessage.includes('vi dien tu') ||
      lowerMessage.includes('momo') || lowerMessage.includes('zalopay') ||
      lowerMessage.includes('vietcombank') || lowerMessage.includes('vcb') ||
      lowerMessage.includes('techcombank') || lowerMessage.includes('tcb') ||
      lowerMessage.includes('bidv') || lowerMessage.includes('vietinbank')) {
    return 'bank';
  }
  
  // Keywords cho tiền mặt
  if (lowerMessage.includes('tiền mặt') || lowerMessage.includes('tien mat') ||
      lowerMessage.includes('cash') || lowerMessage.includes('trả tiền mặt') ||
      lowerMessage.includes('tra tien mat')) {
    return 'cash';
  }
  
  // Mặc định là tiền mặt
  return 'cash';
}

// Trích xuất nhiều giao dịch từ 1 câu
function extractMultipleTransactions(message: string): Array<{amount: number, description: string, paymentSource: 'cash' | 'bank'}> {
  const transactions = [];
  
  // Pattern để tìm các cụm "thời gian + mô tả + số tiền"
  // VD: "sáng ăn sáng 10k chiều ăn 20k"
  const patterns = [
    // Pattern: "sáng/chiều/tối + action + amount"
    /(?:sáng|chiều|tối|trưa|tối|đêm)\s+([^0-9]+?)(\d+(?:\.\d+)?)\s*[kK]?/g,
    // Pattern: "action + amount + time"
    /([^0-9]+?)(\d+(?:\.\d+)?)\s*[kK]?\s*(?:sáng|chiều|tối|trưa|đêm)/g,
    // Pattern: general "description + amount"
    /([^\d]+?)(\d+(?:\.\d+)?)\s*[kK]?/g
  ];
  
  let foundMultiple = false;
  
  for (const pattern of patterns) {
    const matches = [...message.matchAll(pattern)];
    
    if (matches.length > 1) {
      foundMultiple = true;
      
      for (const match of matches) {
        const description = match[1].trim();
        const amount = parseFloat(match[2]);
        const matchText = match[0];
        const hasK = matchText.toLowerCase().includes('k');
        const finalAmount = hasK ? amount * 1000 : amount;
        
        if (finalAmount > 0 && description.length > 0 && !description.includes('ngày')) {
          transactions.push({
            amount: finalAmount,
            description: description,
            paymentSource: extractPaymentSource(message)
          });
        }
      }
      
      break; // Dừng khi tìm thấy pattern phù hợp
    }
  }
  
  // Nếu không tìm thấy nhiều giao dịch, return array rỗng
  return foundMultiple ? transactions : [];
}

function extractAmount(text: string): number {
  // Tìm số tiền (có thể có k, K để biểu thị nghìn)
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*[kK]?/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1]);
    const hasK = text.toLowerCase().includes('k');
    return hasK ? amount * 1000 : amount;
  }
  return 0;
}

function extractDescription(text: string, excludeWords: string[]): string {
  // Loại bỏ các từ khóa command và số tiền để lấy mô tả
  let description = text;
  
  excludeWords.forEach(word => {
    description = description.replace(new RegExp(word, 'gi'), '');
  });
  
  // Loại bỏ số tiền
  description = description.replace(/\d+(?:\.\d+)?\s*[kK]?/g, '');
  
  // Loại bỏ ký tự đặc biệt và khoảng trắng thừa
  description = description.replace(/[^\w\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/gi, '')
                         .trim()
                         .replace(/\s+/g, ' ');
  
  return description || 'Giao dịch';
}

async function handleAddExpense(intent: any, familyId: string, performedBy: FamilyMember) {
  if (!intent.amount || intent.amount <= 0) {
    return {
      response: "Chị vợ ơi, chưa nói số tiền kìa! Ví dụ: 'ăn bánh 10k' hoặc 'trà sữa 25k' nhé 😊",
      transactionData: null
    };
  }

  try {
    // Tự động chọn category phù hợp
    const categoryId = guessExpenseCategory(intent.description);
    const transactionDate = intent.date || new Date().toISOString().split('T')[0];
    const monthYear = transactionDate.substring(0, 7);
    const paymentSource = intent.paymentSource || 'cash';

    const transaction: Omit<Transaction, 'id'> = {
      familyId,
      performedBy,
      description: intent.description || 'Chi tiêu',
      amount: intent.amount,
      date: transactionDate,
      type: 'expense',
      categoryId,
      monthYear,
      paymentSource,
      createdAt: new Date().toISOString()
    };

    try {
      const savedTransaction = await firestoreService.addTransaction(transaction);
      
      // Tạo phản hồi cà khịa dựa trên loại chi tiêu
      const teasingResponse = getExpenseTeasingResponse(intent.description, intent.amount);
      const amountFormatted = new Intl.NumberFormat('vi-VN').format(intent.amount);
      const paymentInfo = paymentSource === 'bank' ? ' (Ngân hàng)' : ' (Tiền mặt)';
      
      const fullResponse = `Đã ghi nhận chi tiêu ${amountFormatted}đ${paymentInfo} cho "${intent.description}" ✅\n\n${teasingResponse}`;

      return {
        response: fullResponse,
        transactionData: savedTransaction
      };
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Fallback response khi Firebase bị lỗi
      const teasingResponse = getExpenseTeasingResponse(intent.description, intent.amount);
      const amountFormatted = new Intl.NumberFormat('vi-VN').format(intent.amount);
      const paymentInfo = paymentSource === 'bank' ? ' (Ngân hàng)' : ' (Tiền mặt)';
      
      const fallbackResponse = `⚠️ Anh ghi nhận chi tiêu ${amountFormatted}đ${paymentInfo} cho "${intent.description}" rồi!\n\n${teasingResponse}\n\n⚠️ Lưu ý: Database đang lag, giao dịch có thể chưa được lưu. Em thử refresh lại sau nhé! 😅`;

      return {
        response: fallbackResponse,
        transactionData: null
      };
    }
  } catch (error) {
    console.error('Error adding expense:', error);
    return {
      response: "Oops! Anh bị choáng vì số tiền rồi 😅 Em thử lại sau nhé!",
      transactionData: null
    };
  }
}

// Xử lý nhiều giao dịch trong 1 câu
async function handleAddMultipleExpenses(intent: any, familyId: string, performedBy: FamilyMember) {
  if (!intent.transactions || intent.transactions.length === 0) {
    return {
      response: "Hỏi lại: Anh không hiểu rõ em muốn ghi những giao dịch nào? 🤔\n\nVí dụ: 'sáng ăn bánh 10k chiều ăn 20k' nhé!",
      transactionData: null
    };
  }

  try {
    const transactionDate = intent.date || new Date().toISOString().split('T')[0];
    const monthYear = transactionDate.substring(0, 7);
    const savedTransactions = [];
    let totalAmount = 0;

    for (const txn of intent.transactions) {
      const categoryId = guessExpenseCategory(txn.description);
      
      const transaction: Omit<Transaction, 'id'> = {
        familyId,
        performedBy,
        description: txn.description,
        amount: txn.amount,
        date: transactionDate,
        type: 'expense',
        categoryId,
        monthYear,
        paymentSource: txn.paymentSource,
        createdAt: new Date().toISOString()
      };

      const savedTransaction = await firestoreService.addTransaction(transaction);
      savedTransactions.push(savedTransaction);
      totalAmount += txn.amount;
    }

    // Tạo phản hồi cà khịa cho nhiều giao dịch
    const totalFormatted = new Intl.NumberFormat('vi-VN').format(totalAmount);
    const transactionCount = savedTransactions.length;
    
    let response = `Ơ la la! ${transactionCount} giao dịch một lúc á? Tổng cộng ${totalFormatted}đ! 😱\n\n`;
    
    // Liệt kê từng giao dịch
    savedTransactions.forEach((txn, index) => {
      const amount = new Intl.NumberFormat('vi-VN').format(txn.amount);
      const paymentInfo = txn.paymentSource === 'bank' ? '(NH)' : '(TM)';
      response += `${index + 1}. ${txn.description}: ${amount}đ ${paymentInfo}\n`;
    });
    
    response += `\n${getMultipleExpenseTeasingResponse(totalAmount, transactionCount)}`;

    return {
      response,
      transactionData: savedTransactions
    };
  } catch (error) {
    console.error('Error adding multiple expenses:', error);
    return {
      response: "Ối giời! Quá nhiều giao dịch làm anh choáng rồi 😵 Em thử từng cái một nhé!",
      transactionData: null
    };
  }
}

// Phản hồi cà khịa cho nhiều giao dịch
function getMultipleExpenseTeasingResponse(totalAmount: number, count: number): string {
  const responses = [
    `${count} giao dịch một lúc? Chồng chắc phải ngồi tính bằng máy tính rồi! 🧮😰`,
    `Tiêu ${count} lần trong ngày, chồng hoa mắt chưa? 🌀💸`,
    `Liên tiếp ${count} giao dịch vậy, chồng chắc phải uống thuốc tim! 💊❤️`,
    `${count} lần chi tiêu, ví chồng run bần bật! 💼😵`,
    `Combo ${count} món như thế này, chồng combo luôn suy nghĩ! 🤯`
  ];
  
  if (totalAmount >= 200000) {
    return "Số tiền khủng + nhiều giao dịch = Chồng ngất luôn! 😵💫";
  }
  
  return getRandomResponse(responses);
}

// Hàm tạo phản hồi cà khịa dựa trên loại chi tiêu
function getExpenseTeasingResponse(description: string, amount: number): string {
  const desc = description.toLowerCase();
  
  // Phân loại chi tiêu và chọn phản hồi phù hợp
  if (desc.includes('trà sữa') || desc.includes('tra sua') || desc.includes('bubble')) {
    return getRandomResponse(BOT_PERSONALITY.expenseTeasing.drinks);
  }
  
  if (desc.includes('cafe') || desc.includes('cà phê') || desc.includes('coffee') || desc.includes('cappuccino')) {
    return getRandomResponse(BOT_PERSONALITY.expenseTeasing.drinks);
  }
  
  if (desc.includes('mỹ phẩm') || desc.includes('my pham') || desc.includes('son') || 
      desc.includes('phấn') || desc.includes('kem') || desc.includes('serum') ||
      desc.includes('makeup') || desc.includes('skincare') || desc.includes('toner')) {
    return getRandomResponse(BOT_PERSONALITY.expenseTeasing.beauty);
  }
  
  if (desc.includes('ăn ngoài') || desc.includes('nhà hàng') || desc.includes('quán') ||
      desc.includes('ship') || desc.includes('gọi món') || desc.includes('delivery') ||
      desc.includes('grab food') || desc.includes('bún') || desc.includes('phở') ||
      desc.includes('cơm') || desc.includes('bánh') || desc.includes('pizza')) {
    return getRandomResponse(BOT_PERSONALITY.expenseTeasing.dining);
  }
  
  if (desc.includes('shopee') || desc.includes('lazada') || desc.includes('tiki') ||
      desc.includes('sendo') || desc.includes('online') || desc.includes('mua sắm') ||
      desc.includes('shopping') || desc.includes('flash sale') || desc.includes('deal')) {
    return getRandomResponse(BOT_PERSONALITY.expenseTeasing.shopping);
  }
  
  if (desc.includes('quần') || desc.includes('áo') || desc.includes('váy') ||
      desc.includes('giày') || desc.includes('túi') || desc.includes('balo') ||
      desc.includes('phụ kiện') || desc.includes('trang sức') || desc.includes('đồng hồ') ||
      desc.includes('kính') || desc.includes('mũ')) {
    return getRandomResponse(BOT_PERSONALITY.expenseTeasing.fashion);
  }
  
  // Phản hồi đặc biệt cho số tiền lớn
  if (amount >= 500000) {
    return "Số tiền khủng vậy? Chồng chắc phải đi vay ngân hàng rồi! 🏦💸😱";
  }
  
  if (amount >= 200000) {
    return "Tiền này chồng phải làm thêm mấy ngày đấy! 💼😰";
  }
  
  // Phản hồi chung
  return getRandomResponse(BOT_PERSONALITY.expenseTeasing.general);
}

async function handleAddIncome(intent: any, familyId: string, performedBy: FamilyMember) {
  if (!intent.amount || intent.amount <= 0) {
    return {
      response: "Em ơi, em chưa nói số tiền thu nhập á! Ví dụ: 'thêm thu nhập 5000k lương' nhé 😊",
      transactionData: null
    };
  }

  try {
    const categoryId = guessIncomeCategory(intent.description);
    const currentDate = new Date().toISOString().split('T')[0];
    const monthYear = currentDate.substring(0, 7);

    const transaction: Omit<Transaction, 'id'> = {
      familyId,
      performedBy,
      description: intent.description || 'Thu nhập',
      amount: intent.amount,
      date: currentDate,
      type: 'income',
      categoryId,
      monthYear,
      paymentSource: 'bank', // Thu nhập thường vào bank
      createdAt: new Date().toISOString()
    };

    const savedTransaction = await firestoreService.addTransaction(transaction);
    
    const responses = [
      `Wow! Thu nhập ${new Intl.NumberFormat('vi-VN').format(intent.amount)}đ đã được ghi nhận! 💰\n\n${getRandomResponse(BOT_PERSONALITY.compliments)}`,
      `Tuyệt vời! Anh đã ghi ${new Intl.NumberFormat('vi-VN').format(intent.amount)}đ vào thu nhập rồi! 🎉\n\nTiền về như nước! Giữ form em nhé! 💪`,
      `Oke! Thu nhập ${new Intl.NumberFormat('vi-VN').format(intent.amount)}đ cho "${intent.description}" đã vào sổ ✅\n\nTiền nhiều quá làm anh hoa mắt luôn! 🤑`
    ];

    return {
      response: getRandomResponse(responses),
      transactionData: savedTransaction
    };
  } catch (error) {
    console.error('Error adding income:', error);
    return {
      response: "Oops! Anh bị lỗi khi ghi thu nhập rồi 😅 Em thử lại sau nhé!",
      transactionData: null
    };
  }
}

async function handleCheckBalance(familyId: string) {
  try {
    const currentMonthYear = new Date().toISOString().substring(0, 7);
    const transactions = await firestoreService.getTransactionsByMonth(familyId, currentMonthYear);
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const balance = totalIncome - totalExpense;
    
    const incomeStr = new Intl.NumberFormat('vi-VN').format(totalIncome);
    const expenseStr = new Intl.NumberFormat('vi-VN').format(totalExpense);
    const balanceStr = new Intl.NumberFormat('vi-VN').format(Math.abs(balance));
    
    let response = `📊 **Tình hình tài chính tháng này:**\n\n`;
    response += `💰 Thu nhập: ${incomeStr}đ\n`;
    response += `💸 Chi tiêu: ${expenseStr}đ\n`;
    
    if (balance >= 0) {
      response += `✅ Còn lại: +${balanceStr}đ\n\n`;
      if (balance > totalIncome * 0.5) {
        response += getRandomResponse(BOT_PERSONALITY.compliments);
      } else {
        response += "Không tệ lắm đấy! Tiếp tục giữ form nhé! 💪";
      }
    } else {
      response += `❌ Thâm hụt: -${balanceStr}đ\n\n`;
      response += getRandomResponse(BOT_PERSONALITY.teasing);
    }
    
    return response;
  } catch (error) {
    console.error('Error checking balance:', error);
    return "Anh không lấy được dữ liệu tài chính 😅 Có thể database đang ngủ!";
  }
}

async function handleSummary(familyId: string) {
  try {
    const currentMonthYear = new Date().toISOString().substring(0, 7);
    const transactions = await firestoreService.getTransactionsByMonth(familyId, currentMonthYear);
    
    // Thống kê theo category
    const expensesByCategory: { [key: string]: number } = {};
    const incomesByCategory: { [key: string]: number } = {};
    
    transactions.forEach(t => {
      const category = CATEGORIES.find(c => c.id === t.categoryId);
      const categoryName = category?.name || 'Khác';
      
      if (t.type === 'expense') {
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.amount;
      } else {
        incomesByCategory[categoryName] = (incomesByCategory[categoryName] || 0) + t.amount;
      }
    });
    
    let response = `📈 **Báo cáo tháng ${new Date().getMonth() + 1}:**\n\n`;
    
    // Top chi tiêu
    const topExpenses = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
      
    if (topExpenses.length > 0) {
      response += `🔥 **Top chi tiêu:**\n`;
      topExpenses.forEach(([category, amount], index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        response += `${emoji} ${category}: ${new Intl.NumberFormat('vi-VN').format(amount)}đ\n`;
      });
      response += '\n';
    }
    
    // Số giao dịch
    response += `📝 Tổng số giao dịch: ${transactions.length}\n`;
    response += `💸 Chi tiêu: ${transactions.filter(t => t.type === 'expense').length} lần\n`;
    response += `💰 Thu nhập: ${transactions.filter(t => t.type === 'income').length} lần\n\n`;
    
    // Nhận xét
    const totalExpense = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (totalExpense > 5000000) {
      response += "Tháng này em chi khá nhiều đấy! Có khi nên hạn chế shopping một chút 😅";
    } else if (totalExpense < 2000000) {
      response += "Tháng này em tiết kiệm quá! Anh tự hào về em 🥰";
    } else {
      response += "Chi tiêu ở mức hợp lý! Giữ vững form này nhé! 💪";
    }
    
    return response;
  } catch (error) {
    console.error('Error generating summary:', error);
    return "Anh không tạo được báo cáo 😅 Có thể database đang bận!";
  }
}

function handleGeneralChat(message: string): string {
  // Hỏi lại khi không hiểu
  const clarificationResponses = [
    "Hỏi lại: Anh không hiểu rõ ý em 🤔\n\nEm có thể nói:\n• 'ăn bánh 10k' - để ghi chi tiêu\n• 'ăn bánh ngành hàng 15k' - để ghi theo nguồn tiền\n• 'sáng ăn 10k chiều uống 20k' - nhiều giao dịch\n• 'kiểm tra số dư' - xem tình hình tiền",
    
    "Anh không hiểu em muốn gì? 🤷‍♂️\n\nCó thể em muốn:\n📝 Ghi chi tiêu: 'trà sữa 25k'\n💳 Ghi theo nguồn: 'cafe bank 30k'\n📊 Xem báo cáo: 'tóm tắt tháng này'\n💰 Kiểm tra: 'số dư còn bao nhiêu?'",
    
    "Ủa ủa, anh nghe không rõ 👂\n\nEm thử nói:\n• Chi tiêu: 'shopee 100k'\n• Nhiều giao dịch: 'sáng ăn 15k tối ăn 30k'\n• Theo ngày: 'ăn bánh ngày 2.6'\n• Kiểm tra: 'kiểm tra tiền'",
    
    "Anh chưa hiểu ý em! 😅\n\nGợi ý cho em:\n🧋 'trà sữa 20k' - ghi trà sữa\n💄 'son môi bank 150k' - mua son bằng thẻ\n🍜 'sáng phở 30k chiều bún 25k' - nhiều món\n📈 'báo cáo chi tiêu' - xem thống kê"
  ];
  
  return getRandomResponse(clarificationResponses);
}

function guessExpenseCategory(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('cafe') || desc.includes('cà phê') || desc.includes('ăn') || desc.includes('uống') || desc.includes('nhà hàng') || desc.includes('quán')) {
    return 'an_uong';
  }
  if (desc.includes('mua') || desc.includes('shopping') || desc.includes('quần áo') || desc.includes('đồ')) {
    return 'mua_sam';
  }
  if (desc.includes('grab') || desc.includes('taxi') || desc.includes('xe') || desc.includes('xăng') || desc.includes('di chuyển')) {
    return 'di_chuyen';
  }
  if (desc.includes('điện') || desc.includes('nước') || desc.includes('hóa đơn') || desc.includes('bill')) {
    return 'hoa_don';
  }
  if (desc.includes('phim') || desc.includes('game') || desc.includes('giải trí')) {
    return 'giai_tri';
  }
  if (desc.includes('thuốc') || desc.includes('bệnh viện') || desc.includes('khám')) {
    return 'suc_khoe';
  }
  if (desc.includes('nhà') || desc.includes('thuê') || desc.includes('sửa chữa')) {
    return 'nha_cua';
  }
  
  return 'chi_phi_khac'; // Default
}

function guessIncomeCategory(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('lương') || desc.includes('salary')) {
    return 'thu_nhap_luong';
  }
  if (desc.includes('thưởng') || desc.includes('bonus')) {
    return 'thu_nhap_thuong';
  }
  
  return 'thu_nhap_khac'; // Default
}

function getRandomResponse(responses: string[]): string {
  return responses[Math.floor(Math.random() * responses.length)];
}
