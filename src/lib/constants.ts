
import type { Category, FamilyMember, PaymentSource, UserType } from '@/types';
import { Utensils, ShoppingCart, Car, Home, Receipt, Film, HeartPulse, BookOpen, MoreHorizontal, TrendingUp, TrendingDown, LayoutDashboard, ArrowRightLeft, LineChart, Settings, LogOut, CircleDollarSign, Moon, Sun, Landmark, Wallet, ArrowDownUp, ArrowUpDown, HandCoins, PiggyBank } from 'lucide-react'; // Added Settings
import type { LucideIcon } from 'lucide-react';


export const APP_NAME = "Ngân Sách Gia Đình";

export const FAMILY_MEMBERS: FamilyMember[] = ['Minh Đan', 'Minh Hiếu'];
export const FAMILY_ACCOUNT_ID: UserType = "GIA_DINH"; 

export const PAYMENT_SOURCE_OPTIONS: Array<{ id: PaymentSource, label: string, icon: LucideIcon }> = [
  { id: 'bank', label: 'Ngân hàng', icon: Landmark },
  { id: 'cash', label: 'Tiền mặt', icon: Wallet },
];

export const CATEGORIES: Category[] = [
  { id: 'an_uong', name: 'Ăn uống', icon: Utensils, type: 'expense' },
  { id: 'mua_sam', name: 'Mua sắm', icon: ShoppingCart, type: 'expense' },
  { id: 'di_chuyen', name: 'Di chuyển', icon: Car, type: 'expense' },
  { id: 'nha_cua', name: 'Nhà cửa', icon: Home, type: 'expense' },
  { id: 'hoa_don', name: 'Hóa đơn', icon: Receipt, type: 'expense' },
  { id: 'giai_tri', name: 'Giải trí', icon: Film, type: 'expense' },
  { id: 'suc_khoe', name: 'Sức khỏe', icon: HeartPulse, type: 'expense' },
  { id: 'giao_duc', name: 'Giáo dục', icon: BookOpen, type: 'expense' },
  { id: 'thu_nhap_luong', name: 'Lương', icon: CircleDollarSign, type: 'income' },
  { id: 'thu_nhap_thuong', name: 'Thưởng', icon: TrendingUp, type: 'income' },
  { id: 'thu_nhap_khac', name: 'Thu nhập khác', icon: MoreHorizontal, type: 'income' },
  { id: 'chi_phi_khac', name: 'Chi phí khác', icon: MoreHorizontal, type: 'expense' },
  { id: 'rut_tien_mat', name: 'Rút tiền mặt (NH)', icon: ArrowDownUp, type: 'expense' }, // From Bank
  { id: 'nap_tien_mat_tu_nh', name: 'Nạp tiền mặt (từ NH)', icon: ArrowUpDown, type: 'income' }, // To Cash
  { id: 'cho_muon_tien', name: 'Cho mượn tiền', icon: HandCoins, type: 'expense' }, // Lending money
  { id: 'thu_no', name: 'Thu nợ', icon: PiggyBank, type: 'income' }, // Collecting debt
];

export const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Giao dịch', icon: ArrowRightLeft },
  // { href: '/loans', label: 'Cho vay (Đang phát triển)', icon: HandCoins },
  { href: '/reports', label: 'Báo cáo', icon: LineChart },
  { href: '/settings', label: 'Cài đặt', icon: Settings }, // Added Settings link
];

export const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

export const PERFORMED_BY_OPTIONS: FamilyMember[] = [...FAMILY_MEMBERS];
export const THEME_TOGGLE_ICONS = {
  light: Moon,
  dark: Sun,
};

export const RUT_TIEN_MAT_CATEGORY_ID = 'rut_tien_mat';
export const NAP_TIEN_MAT_CATEGORY_ID = 'nap_tien_mat_tu_nh';
export const CHO_MUON_TIEN_CATEGORY_ID = 'cho_muon_tien';
export const THU_NO_CATEGORY_ID = 'thu_no';

// For Shared Notes feature - SQLite doesn't need these for sheet interaction
// export const SHARED_NOTES_SHEET_NAME = "SharedNotes";
// export const SHARED_NOTE_CELL = "A1";
// export const SHARED_NOTE_MODIFIED_INFO_CELL = "B1";

// Filter constants
export const ALL_CATEGORIES_VALUE = "all_categories";
export const ALL_MEMBERS_VALUE = "all_members";
export const ALL_TRANSACTIONS_VALUE = "all_transactions";

