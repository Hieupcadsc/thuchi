import { firestoreService } from './firestore-service';
import type { Transaction, SharedNote } from '@/types';

export interface BackupData {
  timestamp: string;
  version: string;
  familyId: string;
  data: {
    transactions: Transaction[];
    sharedNotes: SharedNote[];
  };
  metadata: {
    totalTransactions: number;
    totalNotes: number;
    exportedBy: string;
    appVersion: string;
    backupType: 'manual' | 'auto';
  };
}

export class BackupService {
  /**
   * Check if today is a scheduled backup day (4th or 22nd)
   */
  static isScheduledBackupDay(): boolean {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return dayOfMonth === 4 || dayOfMonth === 22;
  }

  /**
   * Check if auto backup was already done today
   */
  static hasAutoBackupToday(): boolean {
    const lastAutoBackup = localStorage.getItem('lastAutoBackup');
    if (!lastAutoBackup) return false;
    
    const lastBackupDate = new Date(lastAutoBackup);
    const today = new Date();
    
    return (
      lastBackupDate.getDate() === today.getDate() &&
      lastBackupDate.getMonth() === today.getMonth() &&
      lastBackupDate.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Mark auto backup as completed today
   */
  static markAutoBackupCompleted(): void {
    localStorage.setItem('lastAutoBackup', new Date().toISOString());
  }

  /**
   * Auto backup scheduler - call this on app load
   */
  static async checkAndPerformAutoBackup(familyId: string, currentUser: string): Promise<boolean> {
    try {
      // Only backup on scheduled days (4th and 22nd)
      if (!this.isScheduledBackupDay()) {
        return false;
      }

      // Don't backup if already done today
      if (this.hasAutoBackupToday()) {
        console.log('🔄 Auto backup already completed today');
        return false;
      }

      console.log('🔄 Performing scheduled auto backup...');
      
      // Perform auto backup
      const backupData = await this.exportFamilyData(familyId, currentUser, 'auto');
      
      // Download auto backup file immediately
      this.downloadBackupFile(backupData);
      
      // Also save to localStorage as emergency backup
      this.saveBackupToLocalStorage(backupData);
      
      // Mark as completed
      this.markAutoBackupCompleted();
      
      console.log('✅ Auto backup completed successfully and downloaded');
      return true;
      
    } catch (error) {
      console.error('❌ Auto backup failed:', error);
      return false;
    }
  }

  /**
   * Save backup to localStorage (emergency backup)
   */
  static saveBackupToLocalStorage(backupData: BackupData): void {
    try {
      const key = `autoBackup_${backupData.familyId}_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(key, JSON.stringify(backupData));
      
      // Keep only last 5 auto backups
      this.cleanOldLocalBackups(backupData.familyId);
    } catch (error) {
      console.warn('Failed to save backup to localStorage:', error);
    }
  }

  /**
   * Clean old auto backups from localStorage
   */
  static cleanOldLocalBackups(familyId: string): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`autoBackup_${familyId}_`)
      ).sort().reverse();
      
      // Keep only the latest 5 backups
      if (keys.length > 5) {
        keys.slice(5).forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clean old backups:', error);
    }
  }

  /**
   * Export all family data to JSON format
   */
  static async exportFamilyData(
    familyId: string, 
    currentUser: string, 
    backupType: 'manual' | 'auto' = 'manual'
  ): Promise<BackupData> {
    try {
      console.log(`🔄 Starting ${backupType} backup export for family:`, familyId);
      
      // Fetch all transactions
      const transactions = await firestoreService.getAllTransactions(familyId);
      
      // Fetch all shared notes
      const sharedNotes = await firestoreService.getAllSharedNotes(familyId);
      
      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        familyId,
        data: {
          transactions,
          sharedNotes
        },
        metadata: {
          totalTransactions: transactions.length,
          totalNotes: sharedNotes.length,
          exportedBy: currentUser,
          appVersion: '2.0-firestore',
          backupType
        }
      };
      
      console.log(`✅ ${backupType} backup data prepared:`, {
        transactions: transactions.length,
        notes: sharedNotes.length
      });
      
      return backupData;
    } catch (error) {
      console.error(`❌ Error exporting ${backupType} backup:`, error);
      throw new Error('Không thể export dữ liệu. Vui lòng thử lại.');
    }
  }

  /**
   * Download backup data as JSON file
   */
  static downloadBackupFile(backupData: BackupData, filename?: string): void {
    try {
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const backupTypePrefix = backupData.metadata.backupType === 'auto' ? 'auto-' : '';
      const defaultFilename = `thuchi-${backupTypePrefix}backup-${backupData.familyId}-${new Date().toISOString().split('T')[0]}.json`;
      const finalFilename = filename || defaultFilename;
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      console.log('✅ Backup file downloaded:', finalFilename);
    } catch (error) {
      console.error('❌ Error downloading backup file:', error);
      throw new Error('Không thể tải file backup. Vui lòng thử lại.');
    }
  }

  /**
   * Get backup summary for display
   */
  static getBackupSummary(backupData: BackupData): string {
    const { metadata, data } = backupData;
    return `
📊 BACKUP SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Ngày backup: ${new Date(backupData.timestamp).toLocaleDateString('vi-VN')}
👤 Người backup: ${metadata.exportedBy}
💳 Tổng giao dịch: ${metadata.totalTransactions}
📝 Tổng ghi chú: ${metadata.totalNotes}
🏷️ Phiên bản: ${metadata.appVersion}
🤖 Loại backup: ${metadata.backupType === 'auto' ? 'Tự động' : 'Thủ công'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Validate backup data structure
   */
  static validateBackupData(data: any): boolean {
    try {
      return (
        data &&
        typeof data === 'object' &&
        data.timestamp &&
        data.version &&
        data.familyId &&
        data.data &&
        Array.isArray(data.data.transactions) &&
        Array.isArray(data.data.sharedNotes) &&
        data.metadata
      );
    } catch {
      return false;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Quick backup with download
   */
  static async createAndDownloadBackup(
    familyId: string, 
    currentUser: string,
    showSummary: boolean = true
  ): Promise<void> {
    try {
      const backupData = await this.exportFamilyData(familyId, currentUser, 'manual');
      
      if (showSummary) {
        const summary = this.getBackupSummary(backupData);
        console.log(summary);
      }
      
      this.downloadBackupFile(backupData);
      
      return;
    } catch (error) {
      console.error('❌ Quick backup failed:', error);
      throw error;
    }
  }

  /**
   * Get next scheduled backup dates
   */
  static getNextBackupDates(): { next: Date; afterNext: Date } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const date4th = new Date(year, month, 4);
    const date22nd = new Date(year, month, 22);
    
    let next: Date;
    let afterNext: Date;
    
    if (today.getDate() < 4) {
      next = date4th;
      afterNext = date22nd;
    } else if (today.getDate() < 22) {
      next = date22nd;
      afterNext = new Date(year, month + 1, 4);
    } else {
      next = new Date(year, month + 1, 4);
      afterNext = new Date(year, month + 1, 22);
    }
    
    return { next, afterNext };
  }

  /**
   * Restore data from backup file
   */
  static async restoreFromBackup(
    backupData: BackupData, 
    familyId: string, 
    currentUser: string,
    options: {
      clearExisting?: boolean;
      onProgress?: (step: string, progress: number) => void;
    } = {}
  ): Promise<{ success: boolean; message: string; stats: any }> {
    const { clearExisting = true, onProgress } = options; // Default to clear existing
    
    try {
      // Validate backup data
      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data format');
      }
      
      // Check family ID match
      if (backupData.familyId !== familyId) {
        throw new Error(`Backup is for family ${backupData.familyId}, but current family is ${familyId}`);
      }
      
      onProgress?.('Validating backup...', 5);
      
      const { transactions, sharedNotes } = backupData.data;
      let restoredTransactions = 0;
      let restoredNotes = 0;
      let errors: string[] = [];
      
      // Clear existing data if requested
      if (clearExisting) {
        onProgress?.('Clearing existing data...', 10);
        await this.clearExistingData(familyId);
        onProgress?.('Existing data cleared', 15);
      }
      
      // Import transactions
      if (transactions?.length > 0) {
        onProgress?.('Restoring transactions...', 20);
        
        for (let i = 0; i < transactions.length; i++) {
          try {
            const transaction = transactions[i];
            
            // Check for duplicates by description, amount, date, and member
            const existing = await this.findDuplicateTransaction(transaction, familyId);
            if (existing && !clearExisting) {
              console.log('Skipping duplicate transaction:', transaction.description);
              continue;
            }
            
            // Remove id to let Firestore generate new ones
            const { id, ...transactionData } = transaction;
            
            await firestoreService.addTransaction(transactionData);
            restoredTransactions++;
            
            // Update progress
            const progress = 20 + (i / transactions.length) * 60;
            onProgress?.(`Restoring transaction ${i + 1}/${transactions.length}...`, progress);
            
          } catch (error) {
            console.error('Failed to restore transaction:', error);
            errors.push(`Transaction ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      // Import shared notes (replace completely)
      if (sharedNotes?.length > 0) {
        onProgress?.('Restoring shared notes...', 85);
        
        // For shared notes, just update with the latest content
        const latestNote = sharedNotes[sharedNotes.length - 1];
        try {
          await firestoreService.updateSharedNote(
            familyId, 
            latestNote.content, 
            latestNote.modifiedBy || currentUser
          );
          restoredNotes = 1;
        } catch (error) {
          console.error('Failed to restore shared note:', error);
          errors.push(`Shared note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      onProgress?.('Restore completed!', 100);
      
      const stats = {
        originalTransactions: transactions?.length || 0,
        originalNotes: sharedNotes?.length || 0,
        restoredTransactions,
        restoredNotes,
        errors: errors.length,
        errorDetails: errors,
        clearedExisting: clearExisting
      };
      
      const message = clearExisting 
        ? `Replaced all data: ${restoredTransactions} transactions, ${restoredNotes} notes`
        : `Added ${restoredTransactions}/${stats.originalTransactions} new transactions (${stats.originalTransactions - restoredTransactions} duplicates skipped)`;
      
      return { success: true, message, stats };
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown restore error',
        stats: null 
      };
    }
  }

  /**
   * Find duplicate transaction to avoid duplicates
   */
  static async findDuplicateTransaction(transaction: any, familyId: string): Promise<boolean> {
    try {
      // Get transactions for the same month
      const monthYear = transaction.monthYear || `${new Date(transaction.date).getFullYear()}-${String(new Date(transaction.date).getMonth() + 1).padStart(2, '0')}`;
      
      const existingTransactions = await firestoreService.getTransactionsByMonth(familyId, monthYear);
      
      // Check for exact matches
      return existingTransactions.some(existing => 
        existing.description === transaction.description &&
        existing.amount === transaction.amount &&
        existing.date === transaction.date &&
        existing.performedBy === transaction.performedBy &&
        existing.categoryId === transaction.categoryId
      );
    } catch (error) {
      console.warn('Could not check for duplicates:', error);
      return false;
    }
  }

  /**
   * Clear all existing data for a family (careful!)
   */
  static async clearExistingData(familyId: string): Promise<void> {
    try {
      console.log('🗑️ Clearing existing data for family:', familyId);
      
      // Get all transactions
      const allTransactions = await firestoreService.getAllTransactions(familyId);
      console.log(`Found ${allTransactions.length} transactions to delete`);
      
      if (allTransactions.length > 0) {
        // Use bulk delete for better performance
        const transactionIds = allTransactions.map(t => t.id).filter(id => id);
        
        if (transactionIds.length > 0) {
          console.log(`Bulk deleting ${transactionIds.length} transactions...`);
          await firestoreService.bulkDeleteTransactions(transactionIds);
          console.log('✅ Bulk delete completed');
        }
      }
      
      // Clear shared notes (set to empty)
      console.log('Clearing shared notes...');
      await firestoreService.updateSharedNote(familyId, '', 'system-restore');
      
      console.log(`✅ Cleared ${allTransactions.length} transactions and shared notes`);
      
    } catch (error) {
      console.error('❌ Failed to clear existing data:', error);
      
      // Try individual delete as fallback
      console.log('🔄 Trying individual delete as fallback...');
      try {
        const allTransactions = await firestoreService.getAllTransactions(familyId);
        
        for (const transaction of allTransactions) {
          if (transaction.id) {
            await firestoreService.deleteTransaction(transaction.id);
            console.log(`Deleted transaction: ${transaction.description}`);
          }
        }
        
        console.log('✅ Individual delete completed');
      } catch (fallbackError) {
        console.error('❌ Fallback delete also failed:', fallbackError);
        throw new Error('Không thể xóa dữ liệu cũ. Hãy thử chế độ "Thêm mới" thay vì "Thay thế hoàn toàn".');
      }
    }
  }

  /**
   * Parse backup file from user upload
   */
  static async parseBackupFile(file: File): Promise<BackupData> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!this.validateBackupData(data)) {
        throw new Error('Invalid backup file format');
      }
      
      return data as BackupData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON file');
      }
      throw error;
    }
  }

  /**
   * Get available auto backups from localStorage
   */
  static getLocalAutoBackups(familyId: string): Array<{
    key: string;
    date: string;
    data: BackupData;
  }> {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`autoBackup_${familyId}_`)
      ).sort().reverse();
      
      return keys.map(key => {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const date = key.split('_')[2]; // Extract date from key
        return { key, date, data };
      });
    } catch (error) {
      console.warn('Failed to get local auto backups:', error);
      return [];
    }
  }
} 