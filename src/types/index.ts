import type { LucideIcon } from 'lucide-react';

// UserType will now represent a generic identifier, primarily for the family account.
export type UserType = string;

// Specific user roles within the family
export type FamilyMember = 'Minh Đan' | 'Minh Hiếu' | 'Demo';
export type PaymentSource = 'cash' | 'bank'; // Added PaymentSource type

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: string;
  familyId: UserType; // Will store the family account identifier (e.g., FAMILY_ACCOUNT_ID)
  performedBy: FamilyMember; // Who actually performed the transaction
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  categoryId: string;
  monthYear: string; // YYYY-MM, for sheet organization
  note?: string; // Optional note, primarily for expenses
  paymentSource?: PaymentSource; // New: Source of the payment
  createdAt?: string; // ISO timestamp - thời điểm tạo giao dịch để sắp xếp chính xác
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface HighValueExpenseAlert {
  id: string; // Matches transaction.id
  performedBy: FamilyMember;
  amount: number;
  description: string;
  date: string; // ISO string, when the alert was generated
  spouseHasViewed: boolean;
}

export interface SharedNote {
  id: string;
  familyId: UserType;
  content: string;
  lastModified: string; // ISO timestamp
  modifiedBy: FamilyMember;
}

// Windows-style Sticky Notes
export interface StickyNote {
  id: string;
  familyId: UserType;
  title: string;
  content: string; // HTML content from rich editor
  color: 'yellow' | 'pink' | 'green' | 'blue' | 'purple' | 'orange';
  position?: { x: number; y: number }; // Position on screen
  size?: { width: number; height: number }; // Note size
  isMinimized: boolean;
  isPinned: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  createdBy: FamilyMember;
  lastModifiedBy: FamilyMember;
}

// Calendar Event Types
export type EventType = 'family' | 'work' | 'anniversary' | 'birthday' | 'death_anniversary' | 'wedding' | 'meeting' | 'reminder';

export interface CalendarEvent {
  id: string;
  familyId: UserType;
  title: string;
  description?: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  recurringPattern?: 'yearly' | 'monthly' | 'weekly';
  isLunarDate: boolean; // True nếu theo lịch âm
  lunarDate?: {
    day: number;
    month: number;
    year?: number; // Optional cho sự kiện hàng năm
    isLeapMonth?: boolean;
  };
  reminders?: {
    daysBefore: number;
    isEnabled: boolean;
  }[];
  createdBy: FamilyMember;
  color?: string; // Màu hiển thị
  priority: 'low' | 'medium' | 'high';
}

export interface WorkSchedule {
  id: string;
  familyId?: string; // Add familyId for consistency
  employeeName: FamilyMember;
  title: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  recurringDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  location?: string;
  notes?: string;
  color?: string;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  transactions: Transaction[];
  events: CalendarEvent[];
  workSchedules: WorkSchedule[];
  totalIncome: number;
  totalExpense: number;
  lunarDate: LunarDate;
}

// Loan Management Types
export type LoanStatus = 'active' | 'completed' | 'overdue' | 'partially_paid';

export interface Loan {
  id: number;
  familyId: number;
  lenderName: string;
  borrowerName: string;
  borrowerPhone?: string;
  principalAmount: number;
  loanDate: string;
  dueDate?: string;
  status: 'active' | 'completed' | 'overdue' | 'partially_paid';
  totalPaidAmount: number;
  remainingAmount: number;
  description?: string;
  paymentSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  paymentAmount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentSource; // cash/bank
  note?: string;
  createdBy: FamilyMember;
  createdAt: string; // ISO timestamp
}

export interface LoanSummary {
  totalLoansActive: number; // Số khoản vay đang hoạt động
  totalLoanAmount: number; // Tổng số tiền đã cho vay
  totalOutstanding: number; // Tổng số tiền chưa thu về
  totalCollected: number; // Tổng số tiền đã thu về
  overdueLoans: number; // Số khoản quá hạn
}
