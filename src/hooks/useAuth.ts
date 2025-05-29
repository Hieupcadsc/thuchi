"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType } from '@/types';

interface AuthState {
  user: UserType | null;
  transactions: Transaction[];
  login: (userType: UserType) => void;
  logout: () => void;
  addTransaction: (transaction: Transaction) => void;
  getTransactionsByUserAndMonth: (userId: UserType, monthYear: string) => Transaction[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      transactions: [],
      login: (userType) => set({ user: userType }),
      logout: () => set({ user: null }),
      addTransaction: (transaction) => {
        // Mock Google Sheet interaction: Log to console
        console.log("Adding transaction to Google Sheet (mock):", transaction);
        // For demo purposes, store in Zustand state
        set((state) => ({ transactions: [...state.transactions, transaction] }));
      },
      getTransactionsByUserAndMonth: (userId, monthYear) => {
        // Mock Google Sheet interaction: Log to console
        console.log("Fetching transactions from Google Sheet (mock) for:", userId, monthYear);
        // For demo purposes, filter from Zustand state
        return get().transactions.filter(t => t.userId === userId && t.monthYear === monthYear);
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
