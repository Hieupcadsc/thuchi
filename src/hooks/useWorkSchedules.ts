import { useState, useEffect } from 'react';
import { useAuthStore } from './useAuth';
import { WorkSchedule } from '@/types';

export function useWorkSchedules() {
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { familyId } = useAuthStore();

  const loadWorkSchedules = async () => {
    if (!familyId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/work-schedules?familyId=${familyId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error loading work schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkSchedules();
  }, [familyId]);

  const updateWorkSchedule = (scheduleId: string, updates: Partial<WorkSchedule>) => {
    setWorkSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId ? { ...schedule, ...updates } : schedule
    ));
  };

  const addWorkSchedule = (schedule: WorkSchedule) => {
    setWorkSchedules(prev => [...prev, schedule]);
  };

  const deleteWorkSchedule = (scheduleId: string) => {
    setWorkSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
  };

  return {
    workSchedules,
    isLoading,
    loadWorkSchedules,
    updateWorkSchedule,
    addWorkSchedule,
    deleteWorkSchedule,
    setWorkSchedules
  };
} 