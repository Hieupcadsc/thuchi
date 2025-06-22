import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase'; // Your existing firebase config
import type { Transaction } from '@/types';

const TRANSACTIONS_COLLECTION = 'transactions';
const SHARED_NOTES_COLLECTION = 'shared_notes';

// Transaction operations
export const firestoreAdapter = {
  // Get all transactions for a family
  async getTransactions(familyId: string): Promise<Transaction[]> {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('userId', '==', familyId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  // Get transactions by month
  async getTransactionsByMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('userId', '==', familyId),
      where('monthYear', '==', monthYear),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  // Add transaction
  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), transaction);
    return docRef.id;
  },

  // Update transaction
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await updateDoc(docRef, updates);
  },

  // Delete transaction
  async deleteTransaction(id: string): Promise<void> {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // Shared notes operations
  async getSharedNote(familyId: string): Promise<{ content: string; modifiedBy?: string; modifiedAt?: string } | null> {
    const q = query(
      collection(db, SHARED_NOTES_COLLECTION),
      where('familyId', '==', familyId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return doc.data() as any;
  },

  async updateSharedNote(familyId: string, content: string, modifiedBy: string): Promise<void> {
    const q = query(
      collection(db, SHARED_NOTES_COLLECTION),
      where('familyId', '==', familyId)
    );
    const snapshot = await getDocs(q);
    
    const data = {
      familyId,
      content,
      modifiedBy,
      modifiedAt: new Date().toISOString()
    };

    if (snapshot.empty) {
      await addDoc(collection(db, SHARED_NOTES_COLLECTION), data);
    } else {
      const docRef = doc(db, SHARED_NOTES_COLLECTION, snapshot.docs[0].id);
      await updateDoc(docRef, data);
    }
  }
}; 