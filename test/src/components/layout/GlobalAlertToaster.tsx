
"use client";

import React, { useEffect } from 'react';
import { useAuthStore, FAMILY_MEMBERS } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

export function GlobalAlertToaster() {
  const { currentUser, highValueExpenseAlerts, markAlertAsViewedBySpouse } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser && highValueExpenseAlerts.length > 0) {
      const unviewedAlertsForSpouse = highValueExpenseAlerts.filter(alert => 
        alert.performedBy !== currentUser && !alert.spouseHasViewed
      );

      unviewedAlertsForSpouse.forEach(alert => {
        toast({
          title: "⚠️ Cảnh báo: Chi tiêu lớn!",
          description: (
            <div>
              <p>{alert.performedBy} vừa có khoản chi lớn:</p>
              <p className="font-semibold">{alert.amount.toLocaleString('vi-VN')} VND</p>
              <p>Cho: "{alert.description}"</p>
              <p className="text-xs text-muted-foreground">
                Lúc: {format(parseISO(alert.date), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
              </p>
            </div>
          ),
          variant: "destructive", 
          duration: Infinity, // Requires explicit dismissal or action
          action: (
            <ToastAction 
              altText="Đã hiểu" 
              onClick={() => markAlertAsViewedBySpouse(alert.id)}
            >
              Đã hiểu
            </ToastAction>
          ),
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, highValueExpenseAlerts, toast]); // markAlertAsViewedBySpouse is stable

  return null; // This component only triggers toasts, doesn't render anything itself
}
