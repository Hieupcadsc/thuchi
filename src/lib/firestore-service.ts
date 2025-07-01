import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction, SharedNote, CalendarEvent, WorkSchedule } from '@/types';

const TRANSACTIONS_COLLECTION = 'transactions';
const SHARED_NOTES_COLLECTION = 'shared_notes';
const CALENDAR_EVENTS_COLLECTION = 'calendar_events';
const WORK_SCHEDULES_COLLECTION = 'work_schedules';

// Helper function to remove undefined values from object
const cleanData = (obj: any) => {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

// Transaction operations
export const firestoreService = {
  // Add transaction
  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const cleanedTransaction = cleanData(transaction);
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), cleanedTransaction);
    return { id: docRef.id, ...cleanedTransaction };
  },

  // Get transactions by month  
  async getTransactionsByMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
    // Simple query - only filter by familyId to avoid composite index requirement
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('familyId', '==', familyId)
    );
    const snapshot = await getDocs(q);
    
    // Filter by monthYear and sort client-side
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        const { id: dataId, ...otherData } = data;  // Don't let data.id overwrite doc.id
        return { id: doc.id, ...otherData } as Transaction;
      })
      .filter(transaction => transaction.monthYear === monthYear)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Update transaction
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
    const cleanedUpdates = cleanData(updates);
    await updateDoc(docRef, cleanedUpdates);
  },

  // Delete transaction
  async deleteTransaction(transactionId: string): Promise<void> {
    console.log('🗑️ [firestoreService.deleteTransaction] Starting delete for ID:', transactionId);
    
    try {
      const docRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
      console.log('📄 [firestoreService.deleteTransaction] Created doc reference:', docRef.path);
      
      // Check if document exists before delete
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.warn('⚠️ [firestoreService.deleteTransaction] Document does not exist:', transactionId);
        return;
      }
      
      console.log('📋 [firestoreService.deleteTransaction] Document exists, data:', docSnap.data());
      
      console.log('🔄 [firestoreService.deleteTransaction] Calling deleteDoc...');
      await deleteDoc(docRef);
      console.log('✅ [firestoreService.deleteTransaction] deleteDoc completed for:', transactionId);
      
      // Verify deletion
      const verifySnap = await getDoc(docRef);
      if (verifySnap.exists()) {
        console.error('❌ [firestoreService.deleteTransaction] Document still exists after delete!');
        console.error('🔍 [firestoreService.deleteTransaction] Remaining data:', verifySnap.data());
        throw new Error('Delete operation failed - document still exists');
      } else {
        console.log('🎉 [firestoreService.deleteTransaction] Deletion verified - document no longer exists');
      }
      
    } catch (error) {
      console.error('💥 [firestoreService.deleteTransaction] Error:', error);
      if (error instanceof Error) {
        console.error('💥 [firestoreService.deleteTransaction] Error name:', error.name);
        console.error('💥 [firestoreService.deleteTransaction] Error message:', error.message);
        console.error('💥 [firestoreService.deleteTransaction] Error stack:', error.stack);
      }
      throw error;
    }
  },

  // Bulk delete transactions
  async bulkDeleteTransactions(transactionIds: string[]): Promise<void> {
    console.log('🔄 Firestore bulkDeleteTransactions called with:', transactionIds);
    
    if (transactionIds.length === 0) {
      console.log('⚠️ No transaction IDs provided, skipping delete');
      return;
    }

    try {
      const batch = writeBatch(db);
      
      transactionIds.forEach((id, index) => {
        console.log(`📝 Adding delete operation ${index + 1}/${transactionIds.length} for ID: ${id}`);
        const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
        batch.delete(docRef);
      });
      
      console.log('💾 Committing batch delete operation...');
      await batch.commit();
      console.log('✅ Batch delete committed successfully');
      
    } catch (error) {
      console.error('❌ Error in bulkDeleteTransactions:', error);
      throw error;
    }
  },

  // Shared notes operations
  async getSharedNote(familyId: string): Promise<{ content: string; modifiedBy?: string; modifiedAt?: string } | null> {
    const q = query(
      collection(db, SHARED_NOTES_COLLECTION),
      where('familyId', '==', familyId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docData = snapshot.docs[0].data();
    return {
      content: docData.content || '',
      modifiedBy: docData.modifiedBy,
      modifiedAt: docData.modifiedAt
    };
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
  },

  // Get all transactions for a family (for backup purposes)
  async getAllTransactions(familyId: string): Promise<Transaction[]> {
    try {
      console.log('📋 [firestoreService.getAllTransactions] Starting fetch for familyId:', familyId);
      
      // Use simple query to avoid composite index issues
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('familyId', '==', familyId)
      );
      
      console.log('🔍 [firestoreService.getAllTransactions] Executing query...');
      const querySnapshot = await getDocs(q);
      console.log('📊 [firestoreService.getAllTransactions] Found', querySnapshot.docs.length, 'documents');
      
      const transactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📄 [firestoreService.getAllTransactions] Document ID: ${doc.id}, data:`, data);
        
        // Don't let data.id overwrite the Firestore document ID
        const { id: dataId, ...otherData } = data;
        return {
          id: doc.id,  // Use Firestore document ID, not data.id field
          ...otherData
        } as Transaction;
      });
      
      // Sort client-side
      const sortedTransactions = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log('✅ [firestoreService.getAllTransactions] Returning', sortedTransactions.length, 'sorted transactions');
      
      return sortedTransactions;
    } catch (error) {
      console.error('💥 [firestoreService.getAllTransactions] Error getting all transactions:', error);
      throw error;
    }
  },

  // Get all shared notes for a family (for backup purposes)
  async getAllSharedNotes(familyId: string): Promise<SharedNote[]> {
    try {
      const q = query(
        collection(db, SHARED_NOTES_COLLECTION),
        where('familyId', '==', familyId)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SharedNote));
    } catch (error) {
      console.error('Error getting all shared notes:', error);
      throw error;
    }
  },

  // Calendar Events operations
  async getCalendarEvents(familyId: string): Promise<CalendarEvent[]> {
    try {
      const q = query(
        collection(db, CALENDAR_EVENTS_COLLECTION),
        where('familyId', '==', familyId)
      );
      
      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CalendarEvent));
      
      // Sort client-side to avoid index requirement
      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  },

  async addCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const cleanedEvent = cleanData(event);
    const docRef = await addDoc(collection(db, CALENDAR_EVENTS_COLLECTION), cleanedEvent);
    return { id: docRef.id, ...cleanedEvent };
  },

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<void> {
    const docRef = doc(db, CALENDAR_EVENTS_COLLECTION, id);
    const cleanedUpdates = cleanData(updates);
    await updateDoc(docRef, cleanedUpdates);
  },

  async deleteCalendarEvent(eventId: string): Promise<void> {
    const docRef = doc(db, CALENDAR_EVENTS_COLLECTION, eventId);
    await deleteDoc(docRef);
  },

  // Work Schedules operations
  async getWorkSchedules(familyId: string): Promise<WorkSchedule[]> {
    try {
      // Try to get by familyId first, if no results then get all (for backward compatibility)
      let q = query(
        collection(db, WORK_SCHEDULES_COLLECTION),
        where('familyId', '==', familyId)
      );
      
      let querySnapshot = await getDocs(q);
      
      // If no results with familyId, get all work schedules (backward compatibility)
      if (querySnapshot.empty) {
        q = query(collection(db, WORK_SCHEDULES_COLLECTION));
        querySnapshot = await getDocs(q);
      }
      
      const schedules = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkSchedule));
      
      // Sort client-side to avoid index requirement
      return schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting work schedules:', error);
      throw error;
    }
  },

  async addWorkSchedule(schedule: Omit<WorkSchedule, 'id'>): Promise<WorkSchedule> {
    const cleanedSchedule = cleanData(schedule);
    const docRef = await addDoc(collection(db, WORK_SCHEDULES_COLLECTION), cleanedSchedule);
    return { id: docRef.id, ...cleanedSchedule };
  },

  async updateWorkSchedule(id: string, updates: Partial<WorkSchedule>): Promise<void> {
    const docRef = doc(db, WORK_SCHEDULES_COLLECTION, id);
    const cleanedUpdates = cleanData(updates);
    await updateDoc(docRef, cleanedUpdates);
  },

  async deleteWorkSchedule(scheduleId: string): Promise<void> {
    const docRef = doc(db, WORK_SCHEDULES_COLLECTION, scheduleId);
    await deleteDoc(docRef);
  },

  // Delete all work schedules for a specific employee in a specific month/year
  async deleteWorkSchedulesByEmployeeAndMonth(familyId: string, employeeName: string, year: number, month: number): Promise<void> {
    try {
      console.log(`🗑️ [firestoreService] Deleting work schedules for ${employeeName} in ${year}/${month}`);
      
      // Query all work schedules for this employee
      const q = query(
        collection(db, WORK_SCHEDULES_COLLECTION),
        where('familyId', '==', familyId),
        where('employeeName', '==', employeeName)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`📋 [firestoreService] Found ${querySnapshot.docs.length} work schedules for ${employeeName}`);
      
      if (querySnapshot.empty) {
        console.log(`ℹ️ [firestoreService] No existing schedules found for ${employeeName} in ${year}/${month}`);
        return;
      }

      // Filter schedules by month/year client-side and collect IDs to delete
      const schedulesToDelete: string[] = [];
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.date && data.date.startsWith(monthPrefix)) {
          schedulesToDelete.push(doc.id);
          console.log(`🎯 [firestoreService] Will delete schedule ${doc.id} for date ${data.date}`);
        }
      });

      if (schedulesToDelete.length === 0) {
        console.log(`ℹ️ [firestoreService] No schedules found for ${employeeName} in ${year}/${month}`);
        return;
      }

      // Batch delete
      console.log(`🔄 [firestoreService] Batch deleting ${schedulesToDelete.length} schedules...`);
      const batch = writeBatch(db);
      
      schedulesToDelete.forEach(scheduleId => {
        const docRef = doc(db, WORK_SCHEDULES_COLLECTION, scheduleId);
        batch.delete(docRef);
      });
      
      await batch.commit();
      console.log(`✅ [firestoreService] Successfully deleted ${schedulesToDelete.length} work schedules for ${employeeName} in ${year}/${month}`);
      
    } catch (error) {
      console.error(`❌ [firestoreService] Error deleting work schedules for ${employeeName} in ${year}/${month}:`, error);
      throw error;
    }
  }
}; 