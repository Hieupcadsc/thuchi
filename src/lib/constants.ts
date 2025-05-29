import type { Category } from '@/types';
import { Utensils, ShoppingCart, Car, Home, Receipt, Film, HeartPulse, BookOpen, MoreHorizontal, TrendingUp, TrendingDown, LayoutDashboard, ArrowRightLeft, LineChart, Settings, LogOut, CircleDollarSign } from 'lucide-react';

export const APP_NAME = "Ngân Sách Gia Đình";

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
];

export const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Giao dịch', icon: ArrowRightLeft },
  { href: '/reports', label: 'Báo cáo', icon: LineChart },
  // { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];
