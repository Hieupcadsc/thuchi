"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Assuming you might want a switch for theme
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME, FAMILY_MEMBERS, DIEU_CHINH_SO_DU_CATEGORY_ID } from '@/lib/constants';
import { Sun, Moon, Info, Palette, Download, Shield, Loader2, CheckCircle, Database, Cloud, Upload, FileText, Calendar, RotateCcw, AlertCircle, Banknote } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuth';
import { BackupService } from '@/lib/backup';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { firestoreService } from '@/lib/firestore-service';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';


export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, familyId, transactions, addTransaction } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreMode, setRestoreMode] = useState<'replace' | 'add'>('replace');
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [autoBackupStatus, setAutoBackupStatus] = useState<{ next: string; afterNext: string } | null>(null);
  const [localBackups, setLocalBackups] = useState<Array<{ key: string; date: string; data: any }>>([]);
  const [isTestingDelete, setIsTestingDelete] = useState(false);
  const [bankTarget, setBankTarget] = useState(0);
  const [cashTarget, setCashTarget] = useState(0);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const balances = useMemo(() => {
    let bank = 0, cash = 0;
    transactions.forEach(t => {
      if (t.paymentSource === 'bank') {
        bank += t.type === 'income' ? t.amount : -t.amount;
      } else if (t.paymentSource === 'cash') {
        cash += t.type === 'income' ? t.amount : -t.amount;
      }
    });
    return { bank, cash };
  }, [transactions]);

  useEffect(() => {
    if (familyId) {
      // Get last manual backup time
      const lastBackup = localStorage.getItem(`lastManualBackup_${familyId}`);
      setLastBackupTime(lastBackup);
      
      // Get auto backup schedule
      const schedule = BackupService.getNextBackupDates();
      setAutoBackupStatus({
        next: schedule.next.toLocaleDateString('vi-VN'),
        afterNext: schedule.afterNext.toLocaleDateString('vi-VN')
      });
      
      // Get local auto backups
      const locals = BackupService.getLocalAutoBackups(familyId);
      setLocalBackups(locals);
    }
  }, [familyId]);

  const handleManualBackup = async () => {
    if (!currentUser || !familyId) {
      toast({
        title: "❌ Lỗi backup",
        description: "Không thể xác định thông tin người dùng.",
        variant: "destructive",
      });
      return;
    }

    setIsBackingUp(true);
    try {
      const backupData = await BackupService.exportFamilyData(familyId, currentUser, 'manual');
      BackupService.downloadBackupFile(backupData);
      
      // Update last backup time
      const now = new Date().toISOString();
      localStorage.setItem(`lastManualBackup_${familyId}`, now);
      setLastBackupTime(now);
      
      toast({
        title: "✅ Backup thành công",
        description: "File backup đã được tải xuống",
      });
    } catch (error) {
      console.error('Backup failed:', error);
      toast({
        title: "❌ Backup thất bại",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleRestoreFromFile(file);
    }
  };

  const handleRestoreFromFile = async (file: File) => {
    if (!currentUser || !familyId) return;
    
    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreStatus('Đang đọc file backup...');
    
    try {
      // Parse backup file
      const backupData = await BackupService.parseBackupFile(file);
      
      // Restore with progress tracking
      const result = await BackupService.restoreFromBackup(
        backupData, 
        familyId, 
        currentUser,
        {
          clearExisting: restoreMode === 'replace',
          onProgress: (step, progress) => {
            setRestoreStatus(step);
            setRestoreProgress(progress);
          }
        }
      );
      
      if (result.success) {
        toast({
          title: "✅ Restore thành công",
          description: result.message,
        });
        
        // Reload page to show new data
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Restore failed:', error);
      toast({
        title: "❌ Restore thất bại",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreStatus('');
    }
  };

  const handleRestoreFromLocal = async (localBackup: any) => {
    if (!currentUser || !familyId) return;
    
    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreStatus('Đang restore từ auto backup...');
    
    try {
      const result = await BackupService.restoreFromBackup(
        localBackup.data, 
        familyId, 
        currentUser,
        {
          clearExisting: restoreMode === 'replace',
          onProgress: (step, progress) => {
            setRestoreStatus(step);
            setRestoreProgress(progress);
          }
        }
      );
      
      if (result.success) {
        toast({
          title: "✅ Restore thành công",
          description: `Restored từ auto backup ${localBackup.date}`,
        });
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Restore failed:', error);
      toast({
        title: "❌ Restore thất bại",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreStatus('');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('vi-VN');
    } catch {
      return 'Không rõ';
    }
  };

  const testDeleteFunction = async () => {
    if (!currentUser || !familyId) return;
    
    setIsTestingDelete(true);
    try {
      console.log('🧪 Starting delete test...');
      
      // Get current transactions
      console.log('📋 Fetching all transactions...');
      const allTransactions = await firestoreService.getAllTransactions(familyId);
      console.log(`📊 Found ${allTransactions.length} transactions in Firestore`);
      
      if (allTransactions.length === 0) {
        toast({
          title: "ℹ️ Không có data để test",
          description: "Hãy tạo vài transaction trước khi test delete",
        });
        return;
      }

      // Try to delete first transaction
      const firstTransaction = allTransactions[0];
      console.log('🎯 Target transaction for delete test:', {
        firestoreDocId: firstTransaction.id,
        description: firstTransaction.description,
        amount: firstTransaction.amount
      });
      
      // The issue: firstTransaction.id is the Firestore document ID, which is correct!
      // But somehow the useAuth store has different IDs
      
      if (firstTransaction.id) {
        console.log(`🗑️ Attempting to delete transaction using Firestore doc ID: ${firstTransaction.id}`);
        await firestoreService.deleteTransaction(firstTransaction.id);
        console.log('✅ Delete operation completed');
        
        // Verify deletion by re-fetching
        console.log('🔍 Verifying deletion by re-fetching...');
        const afterDeleteTransactions = await firestoreService.getAllTransactions(familyId);
        console.log(`📊 After delete: ${afterDeleteTransactions.length} transactions remain`);
        
        const stillExists = afterDeleteTransactions.find(t => t.id === firstTransaction.id);
        if (stillExists) {
          console.log('❌ Transaction still exists after delete!');
          toast({
            title: "❌ Delete test FAILED",
            description: "Transaction vẫn tồn tại sau khi delete",
            variant: "destructive"
          });
        } else {
          console.log('✅ Transaction successfully deleted and verified');
          toast({
            title: "✅ Delete test thành công",
            description: `Đã xóa và verify: ${firstTransaction.description}`,
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Delete test failed:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: "❌ Delete test thất bại",
        description: `Lỗi: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    } finally {
      setIsTestingDelete(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!currentUser || !familyId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập trước khi điều chỉnh số dư",
        variant: "destructive"
      });
      return;
    }
    
    setIsAdjusting(true);
    try {
      // Tính chênh lệch cần điều chỉnh
      const bankDiff = bankTarget - balances.bank;
      const cashDiff = cashTarget - balances.cash;
      
      if (bankDiff === 0 && cashDiff === 0) {
        toast({
          title: "Không có gì thay đổi",
          description: "Số dư hiện tại đã trùng với số dư mong muốn",
        });
        return;
      }
      
      const today = format(new Date(), 'yyyy-MM-dd');
      let successCount = 0;

      // Điều chỉnh số dư ngân hàng
      if (bankDiff !== 0) {
        const bankTxData = {
          description: `Điều chỉnh số dư ngân hàng ${bankDiff > 0 ? '+' : ''}${bankDiff.toLocaleString('vi-VN')}₫`,
          amount: Math.abs(bankDiff),
          date: today,
          type: bankDiff > 0 ? 'income' : 'expense',
          categoryId: DIEU_CHINH_SO_DU_CATEGORY_ID,
          performedBy: currentUser,
          paymentSource: 'bank',
        } as const;
        
        const bankResult = await addTransaction(bankTxData);
        if (bankResult) successCount++;
      }

      // Điều chỉnh số dư tiền mặt
      if (cashDiff !== 0) {
        const cashTxData = {
          description: `Điều chỉnh số dư tiền mặt ${cashDiff > 0 ? '+' : ''}${cashDiff.toLocaleString('vi-VN')}₫`,
          amount: Math.abs(cashDiff),
          date: today,
          type: cashDiff > 0 ? 'income' : 'expense',
          categoryId: DIEU_CHINH_SO_DU_CATEGORY_ID,
          performedBy: currentUser,
          paymentSource: 'cash',
        } as const;
        
        const cashResult = await addTransaction(cashTxData);
        if (cashResult) successCount++;
      }

      if (successCount > 0) {
        toast({
          title: '✅ Điều chỉnh số dư thành công',
          description: `Đã tạo ${successCount} giao dịch điều chỉnh. Refresh dashboard để xem kết quả.`,
        });
        
        // Reset form
        setBankTarget(balances.bank);
        setCashTarget(balances.cash);
      } else {
        throw new Error('Không thể tạo giao dịch điều chỉnh');
      }
    } catch (error) {
      console.error('Adjust balance failed:', error);
      toast({
        title: "❌ Điều chỉnh số dư thất bại",
        description: error instanceof Error ? error.message : "Lỗi không xác định. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài Đặt</h1>
        <p className="text-muted-foreground">Quản lý các tùy chọn và thông tin ứng dụng.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-5 w-5" />
            Giao Diện
          </CardTitle>
          <CardDescription>Tùy chỉnh giao diện sáng hoặc tối cho ứng dụng.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              {theme === 'light' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
              <Label htmlFor="theme-toggle" className="text-base">
                Giao diện {theme === 'light' ? 'Sáng' : 'Tối'}
              </Label>
            </div>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle theme"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Thông Tin Tài Khoản
          </CardTitle>
          <CardDescription>Thông tin tài khoản đang đăng nhập.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentUser && (
            <div className="text-sm">
              <p><span className="font-semibold">Người dùng:</span> {currentUser}</p>
              <p><span className="font-semibold">ID Gia Đình:</span> {familyId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Giới Thiệu Ứng Dụng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-lg font-semibold">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">
            Phiên bản 2.0.0 (Firebase Firestore Edition)
          </p>
          <p className="text-sm">
            Ứng dụng quản lý tài chính cá nhân cho gia đình {FAMILY_MEMBERS.join(' và ')}.
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            ✅ Nâng cấp: Dữ liệu an toàn 100% với Firebase Cloud
          </p>
          <p className="text-sm">
            Phát triển bởi Ngô Minh Hiếu.
          </p>
          <p className="text-sm">
            Liên hệ: <a href="mailto:Hieu@hieungo.uk" className="text-primary hover:underline">Hieu@hieungo.uk</a>
          </p>
        </CardContent>
      </Card>

      {/* Backup Section */}
      <Card className="shadow-lg border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center text-green-700 dark:text-green-300">
            <Shield className="mr-2 h-5 w-5" />
            Sao Lưu Dữ Liệu
          </CardTitle>
          <CardDescription>
            Tạo bản sao lưu thủ công để bảo vệ dữ liệu của bạn. Dữ liệu đã được tự động lưu trữ an toàn trên Firebase Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Backup Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Auto Backup</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Firestore - Tự động 24/7
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                📅 Backup tự động: Ngày 4 & 22 hàng tháng
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">Manual Backup</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {lastBackupTime ? formatDate(lastBackupTime) : "⏳ Chưa có backup thủ công"}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {(() => {
                  const nextDates = BackupService.getNextBackupDates();
                  return `📅 Tiếp theo: ${nextDates.next}`;
                })()}
              </p>
            </div>
          </div>

          {/* Manual Backup Button */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleManualBackup} 
              disabled={isBackingUp || !currentUser || !familyId}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isBackingUp ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Đang backup...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Tải backup ngay
                </div>
              )}
            </Button>
            
            {/* Debug Test Button */}
            <Button 
              onClick={testDeleteFunction} 
              disabled={isTestingDelete || !currentUser || !familyId}
              className="w-full text-xs border-red-200 hover:bg-red-50 border"
            >
              {isTestingDelete ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                  Testing delete...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  🧪 Test Delete Function
                </div>
              )}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>• File backup sẽ chứa tất cả giao dịch và ghi chú</p>
              <p>• Định dạng JSON dễ đọc và khôi phục</p>
              <p>• Khuyến nghị backup hàng tháng</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card className="clean-card border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Upload className="h-5 w-5" />
            Restore Data
          </CardTitle>
          <CardDescription>
            Khôi phục dữ liệu từ file backup JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRestoring && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>{restoreStatus}</span>
                    <span className="text-sm text-slate-600">{restoreProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={restoreProgress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Restore Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Chọn kiểu restore:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={(e) => setRestoreMode('replace')}
                    className="text-orange-600"
                  />
                  <span className="text-sm">
                    <strong>Thay thế hoàn toàn</strong> (xóa data cũ, thêm data mới)
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="add"
                    checked={restoreMode === 'add'}
                    onChange={(e) => setRestoreMode('add')}
                    className="text-orange-600"
                  />
                  <span className="text-sm">
                    <strong>Thêm mới</strong> (giữ data cũ, bỏ qua duplicate)
                  </span>
                </label>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring || !currentUser || !familyId}
              className="w-full border-orange-200 hover:bg-orange-50 border"
            >
              <Upload className="h-4 w-4 mr-2" />
              Chọn file backup để restore
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Firebase Auto Sync:</strong> Sau khi restore xong, data sẽ tự động sync với Firebase Firestore. 
              Bạn có thể đóng app và mở lại, data vẫn còn đó! 🔄✨
              <br /><br />
              <strong>Lưu ý:</strong> Chế độ "Thay thế hoàn toàn" sẽ xóa tất cả data hiện tại. 
              Nếu gặp lỗi khi xóa, hãy thử chế độ "Thêm mới".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Separator />
      
      <div className="text-center text-sm text-slate-500">
        🛡️ <strong>Bảo vệ 3 lớp:</strong> Firestore Cloud + Auto Backup + Manual Backup
      </div>

      {/* Debug Clear Cache Section */}
      <div className="space-y-4 p-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800">🔧 Debug Tools</h3>
        <p className="text-sm text-yellow-700">
          Clear cache và sync lại data từ Firestore
        </p>
        <button
          onClick={async () => {
            try {
              // Clear all caches
              localStorage.clear();
              
              // Force refresh transactions from Firestore
              await useAuthStore.getState().forceRefreshTransactions();
              
              alert('🔄 Cache cleared - Đã xóa cache và sync lại từ Firestore');
            } catch (error: any) {
              alert('❌ Lỗi clear cache: ' + error.message);
            }
          }}
          className="px-4 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 hover:bg-yellow-200 rounded-md"
        >
          🔄 Clear Cache & Sync Firestore
        </button>
      </div>

      {/* Test Delete Section */}
      <div className="space-y-4 p-6 bg-red-50 border-l-4 border-red-400 rounded-lg">
        <h3 className="text-lg font-medium text-red-800">🧪 Test Delete Function</h3>
        <p className="text-sm text-red-700">
          Test delete functionality để debug
        </p>
        <button
          onClick={testDeleteFunction}
          className="px-4 py-2 bg-red-100 border border-red-300 text-red-800 hover:bg-red-200 rounded-md"
        >
          🧪 Test Delete Function
        </button>
      </div>

      {/* Check Database Section */}
      <div className="space-y-4 p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
        <h3 className="text-lg font-medium text-blue-800">🔍 Kiểm Tra Database</h3>
        <p className="text-sm text-blue-700">
          Kiểm tra dữ liệu giao dịch trong Firestore database
        </p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!currentUser || !familyId) return;
              try {
                console.log('🔍 Checking database transactions...');
                const allTransactions = await firestoreService.getAllTransactions(familyId);
                console.log(`📊 Total transactions in database: ${allTransactions.length}`);
                
                // Tính số dư tiền mặt từ database
                const cashTransactions = allTransactions.filter(t => t.paymentSource === 'cash');
                const cashIncome = cashTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const cashExpense = cashTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                const cashBalance = cashIncome - cashExpense;
                
                // Tính số dư ngân hàng từ database
                const bankTransactions = allTransactions.filter(t => t.paymentSource === 'bank');
                const bankIncome = bankTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const bankExpense = bankTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                const bankBalance = bankIncome - bankExpense;
                
                const message = `
📊 KIỂM TRA DATABASE FIRESTORE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Tổng giao dịch: ${allTransactions.length}

💵 TIỀN MẶT:
  • Thu nhập: ${cashIncome.toLocaleString('vi-VN')}₫
  • Chi tiêu: ${cashExpense.toLocaleString('vi-VN')}₫
  • SỐ DƯ: ${cashBalance.toLocaleString('vi-VN')}₫

🏦 NGÂN HÀNG:
  • Thu nhập: ${bankIncome.toLocaleString('vi-VN')}₫
  • Chi tiêu: ${bankExpense.toLocaleString('vi-VN')}₫
  • SỐ DƯ: ${bankBalance.toLocaleString('vi-VN')}₫

💰 TỔNG SỐ DƯ: ${(cashBalance + bankBalance).toLocaleString('vi-VN')}₫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                `;
                
                alert(message);
                console.log(message);
                
                toast({
                  title: "✅ Kiểm tra database hoàn tất",
                  description: `Tiền mặt: ${cashBalance.toLocaleString('vi-VN')}₫ | Ngân hàng: ${bankBalance.toLocaleString('vi-VN')}₫`,
                });
              } catch (error: any) {
                console.error('❌ Error checking database:', error);
                alert('❌ Lỗi kiểm tra database: ' + error.message);
              }
            }}
            className="px-4 py-2 bg-blue-100 border border-blue-300 text-blue-800 hover:bg-blue-200 rounded-md"
          >
            🔍 Kiểm tra số dư trong Database
          </button>
          
          <button
            onClick={async () => {
              if (!currentUser || !familyId) return;
              try {
                const allTransactions = await firestoreService.getAllTransactions(familyId);
                const last10 = allTransactions.slice(0, 10);
                
                console.log('📋 Last 10 transactions:');
                last10.forEach((t, index) => {
                  console.log(`${index + 1}. ${t.date} - ${t.description} - ${t.amount.toLocaleString('vi-VN')}₫ (${t.type} - ${t.paymentSource})`);
                });
                
                const message = `📋 10 GIAO DỊCH GẦN NHẤT:\n${last10.map((t, i) => 
                  `${i + 1}. ${t.date} - ${t.description}\n   ${t.amount.toLocaleString('vi-VN')}₫ (${t.type === 'income' ? 'Thu' : 'Chi'} - ${t.paymentSource === 'cash' ? 'Tiền mặt' : 'Ngân hàng'})`
                ).join('\n\n')}`;
                
                alert(message);
              } catch (error: any) {
                alert('❌ Lỗi: ' + error.message);
              }
            }}
            className="px-4 py-2 bg-green-100 border border-green-300 text-green-800 hover:bg-green-200 rounded-md"
          >
            📋 Xem 10 giao dịch mới nhất
          </button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Điều Chỉnh Số Dư
          </CardTitle>
          <CardDescription>Nhập số dư mong muốn để hệ thống tự tạo giao dịch điều chỉnh.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hiển thị số dư hiện tại */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Số dư hiện tại:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Ngân hàng:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {balances.bank.toLocaleString('vi-VN')}₫
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Tiền mặt:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {balances.cash.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Số dư Ngân hàng mong muốn</Label>
              <Input 
                type="number" 
                placeholder={balances.bank.toString()} 
                value={bankTarget} 
                onChange={e=>setBankTarget(Number(e.target.value))}
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">
                Chênh lệch: {(bankTarget - balances.bank).toLocaleString('vi-VN')}₫
              </p>
            </div>
            <div className="space-y-2">
              <Label>Số dư Tiền mặt mong muốn</Label>
              <Input 
                type="number" 
                placeholder={balances.cash.toString()} 
                value={cashTarget} 
                onChange={e=>setCashTarget(Number(e.target.value))}
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">
                Chênh lệch: {(cashTarget - balances.cash).toLocaleString('vi-VN')}₫
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => {
                setBankTarget(balances.bank);
                setCashTarget(balances.cash);
              }}
              variant="outline"
              className="flex-1"
              disabled={isAdjusting}
            >
              Reset về số dư hiện tại
            </Button>
            <Button 
              onClick={handleAdjustBalance} 
              disabled={isAdjusting || !currentUser || (bankTarget === balances.bank && cashTarget === balances.cash)} 
              className="flex-1 bg-primary text-white"
            >
              {isAdjusting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
              Lưu điều chỉnh
            </Button>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Lưu ý:</strong> Chức năng này sẽ tạo giao dịch điều chỉnh để đưa số dư về mức mong muốn. 
              Các giao dịch này sẽ có danh mục "Điều chỉnh số dư" và không ảnh hưởng thống kê thu/chi.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
