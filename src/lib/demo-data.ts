// Demo data for testing purposes
import type { Transaction } from '@/types';
import { DEMO_ACCOUNT_ID, DEMO_USER } from '@/lib/constants';

export const DEMO_TRANSACTIONS: Omit<Transaction, 'id'>[] = [
  // Thu nhập demo
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Lương tháng 1",
    amount: 15000000,
    date: "2024-01-15",
    type: "income",
    categoryId: "thu_nhap_luong",
    monthYear: "2024-01",
    paymentSource: "bank",
    createdAt: "2024-01-15T08:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Thưởng cuối năm",
    amount: 5000000,
    date: "2024-01-05",
    type: "income",
    categoryId: "thu_nhap_thuong",
    monthYear: "2024-01",
    paymentSource: "bank",
    createdAt: "2024-01-05T09:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Freelance project",
    amount: 3000000,
    date: "2024-01-20",
    type: "income",
    categoryId: "thu_nhap_khac",
    monthYear: "2024-01",
    paymentSource: "bank",
    createdAt: "2024-01-20T14:30:00.000Z"
  },

  // Chi phí demo
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Tiền điện tháng 1",
    amount: 450000,
    date: "2024-01-10",
    type: "expense",
    categoryId: "hoa_don",
    monthYear: "2024-01",
    paymentSource: "bank",
    note: "Hóa đơn điện EVN",
    createdAt: "2024-01-10T16:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Tiền nước tháng 1",
    amount: 120000,
    date: "2024-01-10",
    type: "expense",
    categoryId: "hoa_don",
    monthYear: "2024-01",
    paymentSource: "bank",
    note: "Hóa đon nước SAWACO",
    createdAt: "2024-01-10T16:15:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Mua sắm tạp hóa",
    amount: 850000,
    date: "2024-01-12",
    type: "expense",
    categoryId: "mua_sam",
    monthYear: "2024-01",
    paymentSource: "cash",
    note: "Siêu thị Coopmart",
    createdAt: "2024-01-12T10:30:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Ăn trưa nhà hàng",
    amount: 320000,
    date: "2024-01-14",
    type: "expense",
    categoryId: "an_uong",
    monthYear: "2024-01",
    paymentSource: "cash",
    note: "Nhà hàng Golden Dragon",
    createdAt: "2024-01-14T12:45:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Xăng xe máy",
    amount: 150000,
    date: "2024-01-16",
    type: "expense",
    categoryId: "di_chuyen",
    monthYear: "2024-01",
    paymentSource: "cash",
    createdAt: "2024-01-16T07:20:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Xem phim CGV",
    amount: 240000,
    date: "2024-01-18",
    type: "expense",
    categoryId: "giai_tri",
    monthYear: "2024-01",
    paymentSource: "bank",
    note: "2 vé phim + bỏng ngô",
    createdAt: "2024-01-18T19:30:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Khám sức khỏe định kỳ",
    amount: 780000,
    date: "2024-01-22",
    type: "expense",
    categoryId: "suc_khoe",
    monthYear: "2024-01",
    paymentSource: "bank",
    note: "Bệnh viện Chợ Rẫy",
    createdAt: "2024-01-22T09:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Rút tiền mặt ATM",
    amount: 2000000,
    date: "2024-01-25",
    type: "expense",
    categoryId: "rut_tien_mat",
    monthYear: "2024-01",
    paymentSource: "bank",
    createdAt: "2024-01-25T14:20:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Nạp tiền mặt từ NH",
    amount: 2000000,
    date: "2024-01-25",
    type: "income",
    categoryId: "nap_tien_mat_tu_nh",
    monthYear: "2024-01",
    paymentSource: "cash",
    createdAt: "2024-01-25T14:21:00.000Z"
  },

  // Dữ liệu tháng 2
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Lương tháng 2",
    amount: 15000000,
    date: "2024-02-15",
    type: "income",
    categoryId: "thu_nhap_luong",
    monthYear: "2024-02",
    paymentSource: "bank",
    createdAt: "2024-02-15T08:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Mua quần áo Tết",
    amount: 1200000,
    date: "2024-02-05",
    type: "expense",
    categoryId: "mua_sam",
    monthYear: "2024-02",
    paymentSource: "bank",
    note: "Quần áo cho cả gia đình",
    createdAt: "2024-02-05T15:30:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Tiệc Tết gia đình",
    amount: 2500000,
    date: "2024-02-10",
    type: "expense",
    categoryId: "an_uong",
    monthYear: "2024-02",
    paymentSource: "cash",
    note: "Cúng ông bà và tiệc gia đình",
    createdAt: "2024-02-10T11:00:00.000Z"
  },

  // Dữ liệu tháng hiện tại (2025-08)
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Lương tháng 8",
    amount: 16000000,
    date: "2025-08-15",
    type: "income",
    categoryId: "thu_nhap_luong",
    monthYear: "2025-08",
    paymentSource: "bank",
    createdAt: "2025-08-15T08:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Tiền điện tháng 8",
    amount: 520000,
    date: "2025-08-05",
    type: "expense",
    categoryId: "hoa_don",
    monthYear: "2025-08",
    paymentSource: "bank",
    note: "Hóa đơn điện EVN",
    createdAt: "2025-08-05T16:00:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Mua sắm siêu thị",
    amount: 750000,
    date: "2025-08-10",
    type: "expense",
    categoryId: "mua_sam",
    monthYear: "2025-08",
    paymentSource: "cash",
    note: "Siêu thị Big C",
    createdAt: "2025-08-10T10:30:00.000Z"
  },
  {
    familyId: DEMO_ACCOUNT_ID,
    performedBy: DEMO_USER,
    description: "Ăn trưa công ty",
    amount: 85000,
    date: "2025-08-12",
    type: "expense",
    categoryId: "an_uong",
    monthYear: "2025-08",
    paymentSource: "cash",
    createdAt: "2025-08-12T12:30:00.000Z"
  }
];

export function initializeDemoData() {
  // This function can be called to populate demo data
  // Implementation would depend on how you want to handle demo data initialization
  console.log('Demo data available for:', DEMO_USER, 'with', DEMO_TRANSACTIONS.length, 'transactions');
}
