
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, NotebookPen, Save, AlertTriangle } from 'lucide-react';
import { getSharedNote, saveSharedNote } from '@/app/dashboard/notesActions';
import { useAuthStore } from '@/hooks/useAuth';
import type { FamilyMember } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export function SharedNotes() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [lastModifiedBy, setLastModifiedBy] = useState<FamilyMember | undefined>(undefined);
  const [lastModifiedAt, setLastModifiedAt] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getSharedNote('GIA_DINH');
    if ('error' in result) {
      setError(result.error);
      toast({ title: "Lỗi Tải Ghi Chú", description: result.error, variant: "destructive" });
    } else {
      setNote(result.note);
      setLastModifiedBy(result.modifiedBy);
      setLastModifiedAt(result.modifiedAt);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleSaveNote = async () => {
    if (!currentUser) {
      toast({ title: "Lỗi", description: "Vui lòng đăng nhập để lưu ghi chú.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setError(null);
    const result = await saveSharedNote(note, currentUser, 'GIA_DINH');
    if (result.success && result.data) {
      setLastModifiedBy(result.data.modifiedBy);
      setLastModifiedAt(result.data.modifiedAt);
      toast({ title: "Thành Công", description: "Đã lưu ghi chú chung." });
    } else {
      setError(result.error || "Không thể lưu ghi chú.");
      toast({ title: "Lỗi Lưu Ghi Chú", description: result.error || "Không thể lưu ghi chú.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <NotebookPen className="mr-2 h-6 w-6 text-primary" />
          Ghi Chú Chung Gia Đình
        </CardTitle>
        <CardDescription>
          Nơi để cả hai vợ chồng cùng ghi lại những việc cần làm, kế hoạch hoặc nhắc nhở chung.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Đang tải ghi chú...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Lỗi: {error}</p>
            <Button onClick={fetchNote} className="mt-2 border border-border">Thử lại</Button>
          </div>
        ) : (
          <Textarea
            placeholder="Nhập ghi chú của gia đình tại đây..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={8}
            className="resize-none text-base"
            disabled={isSaving}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4">
        <div className="text-xs text-muted-foreground text-left sm:text-right w-full sm:w-auto order-2 sm:order-1">
          {lastModifiedBy && lastModifiedAt ? (
            `Sửa lần cuối bởi ${lastModifiedBy} lúc ${format(parseISO(lastModifiedAt), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}`
          ) : (
            !isLoading && !error && "Chưa có ghi chú nào được lưu."
          )}
        </div>
        <Button onClick={handleSaveNote} disabled={isSaving || isLoading || !currentUser} className="w-full sm:w-auto order-1 sm:order-2">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? 'Đang lưu...' : 'Lưu Ghi Chú'}
        </Button>
      </CardFooter>
    </Card>
  );
}
