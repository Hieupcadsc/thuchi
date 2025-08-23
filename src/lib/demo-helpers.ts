// Helper functions for Demo user data management using localStorage
import type { CalendarEvent, WorkSchedule } from '@/types';
import { DEMO_ACCOUNT_ID } from '@/lib/constants';

// Calendar Events Demo Helpers
export const demoCalendarHelpers = {
  getEvents: (): CalendarEvent[] => {
    try {
      const localKey = `calendar_events_${DEMO_ACCOUNT_ID}`;
      const data = localStorage.getItem(localKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Demo: Failed to load calendar events:', error);
      return [];
    }
  },

  saveEvents: (events: CalendarEvent[]): void => {
    try {
      const localKey = `calendar_events_${DEMO_ACCOUNT_ID}`;
      localStorage.setItem(localKey, JSON.stringify(events));
      console.log(`📅 Demo: Saved ${events.length} calendar events to localStorage`);
    } catch (error) {
      console.error('Demo: Failed to save calendar events:', error);
    }
  },

  addEvent: (event: Omit<CalendarEvent, 'id'>): CalendarEvent => {
    const newEvent: CalendarEvent = {
      id: `demo-event-${Date.now()}`,
      ...event,
      familyId: DEMO_ACCOUNT_ID
    };
    
    const events = demoCalendarHelpers.getEvents();
    const updatedEvents = [...events, newEvent];
    demoCalendarHelpers.saveEvents(updatedEvents);
    
    return newEvent;
  },

  updateEvent: (id: string, updates: Partial<CalendarEvent>): boolean => {
    const events = demoCalendarHelpers.getEvents();
    const eventIndex = events.findIndex(e => e.id === id);
    
    if (eventIndex === -1) return false;
    
    events[eventIndex] = { ...events[eventIndex], ...updates };
    demoCalendarHelpers.saveEvents(events);
    
    return true;
  },

  deleteEvent: (id: string): boolean => {
    const events = demoCalendarHelpers.getEvents();
    const filteredEvents = events.filter(e => e.id !== id);
    
    if (filteredEvents.length === events.length) return false;
    
    demoCalendarHelpers.saveEvents(filteredEvents);
    return true;
  }
};

// Work Schedules Demo Helpers
export const demoWorkScheduleHelpers = {
  getSchedules: (): WorkSchedule[] => {
    try {
      const localKey = `work_schedules_${DEMO_ACCOUNT_ID}`;
      const data = localStorage.getItem(localKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Demo: Failed to load work schedules:', error);
      return [];
    }
  },

  saveSchedules: (schedules: WorkSchedule[]): void => {
    try {
      const localKey = `work_schedules_${DEMO_ACCOUNT_ID}`;
      localStorage.setItem(localKey, JSON.stringify(schedules));
      console.log(`⏰ Demo: Saved ${schedules.length} work schedules to localStorage`);
    } catch (error) {
      console.error('Demo: Failed to save work schedules:', error);
    }
  },

  addSchedule: (schedule: Omit<WorkSchedule, 'id'>): WorkSchedule => {
    const newSchedule: WorkSchedule = {
      id: `demo-schedule-${Date.now()}`,
      ...schedule,
      familyId: DEMO_ACCOUNT_ID
    };
    
    const schedules = demoWorkScheduleHelpers.getSchedules();
    const updatedSchedules = [...schedules, newSchedule];
    demoWorkScheduleHelpers.saveSchedules(updatedSchedules);
    
    return newSchedule;
  },

  updateSchedule: (id: string, updates: Partial<WorkSchedule>): boolean => {
    const schedules = demoWorkScheduleHelpers.getSchedules();
    const scheduleIndex = schedules.findIndex(s => s.id === id);
    
    if (scheduleIndex === -1) return false;
    
    schedules[scheduleIndex] = { ...schedules[scheduleIndex], ...updates };
    demoWorkScheduleHelpers.saveSchedules(schedules);
    
    return true;
  },

  deleteSchedule: (id: string): boolean => {
    const schedules = demoWorkScheduleHelpers.getSchedules();
    const filteredSchedules = schedules.filter(s => s.id !== id);
    
    if (filteredSchedules.length === schedules.length) return false;
    
    demoWorkScheduleHelpers.saveSchedules(filteredSchedules);
    return true;
  }
};

// Generic Demo Helper for other data types
export const createDemoHelpers = <T extends { id: string; familyId?: string }>(dataType: string) => ({
  getData: (): T[] => {
    try {
      const localKey = `${dataType}_${DEMO_ACCOUNT_ID}`;
      const data = localStorage.getItem(localKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Demo: Failed to load ${dataType}:`, error);
      return [];
    }
  },

  saveData: (items: T[]): void => {
    try {
      const localKey = `${dataType}_${DEMO_ACCOUNT_ID}`;
      localStorage.setItem(localKey, JSON.stringify(items));
      console.log(`💾 Demo: Saved ${items.length} ${dataType} to localStorage`);
    } catch (error) {
      console.error(`Demo: Failed to save ${dataType}:`, error);
    }
  },

  addItem: (item: Omit<T, 'id'>): T => {
    const newItem: T = {
      id: `demo-${dataType}-${Date.now()}`,
      ...item,
      familyId: DEMO_ACCOUNT_ID
    } as T;
    
    const items = createDemoHelpers<T>(dataType).getData();
    const updatedItems = [...items, newItem];
    createDemoHelpers<T>(dataType).saveData(updatedItems);
    
    return newItem;
  },

  updateItem: (id: string, updates: Partial<T>): boolean => {
    const items = createDemoHelpers<T>(dataType).getData();
    const itemIndex = items.findIndex(item => item.id === id);
    
    if (itemIndex === -1) return false;
    
    items[itemIndex] = { ...items[itemIndex], ...updates };
    createDemoHelpers<T>(dataType).saveData(items);
    
    return true;
  },

  deleteItem: (id: string): boolean => {
    const items = createDemoHelpers<T>(dataType).getData();
    const filteredItems = items.filter(item => item.id !== id);
    
    if (filteredItems.length === items.length) return false;
    
    createDemoHelpers<T>(dataType).saveData(filteredItems);
    return true;
  }
});

// Initialize Demo data for first time Demo user login
export const initializeDemoMasterData = () => {
  // Initialize demo calendar events
  const existingEvents = demoCalendarHelpers.getEvents();
  if (existingEvents.length === 0) {
    const sampleEvents: Omit<CalendarEvent, 'id'>[] = [
      {
        familyId: DEMO_ACCOUNT_ID,
        title: "Sinh nhật mẹ",
        description: "Chuẩn bị quà và tổ chức tiệc",
        type: "birthday",
        date: "2025-08-20",
        isRecurring: true,
        recurringPattern: "yearly",
        isLunarDate: false,
        createdBy: 'Demo',
        color: "#ff6b6b",
        priority: "high"
      },
      {
        familyId: DEMO_ACCOUNT_ID,
        title: "Họp phụ huynh",
        description: "Họp phụ huynh cuối kỳ",
        type: "meeting",
        date: "2025-08-25",
        isRecurring: false,
        isLunarDate: false,
        createdBy: 'Demo',
        color: "#4ecdc4",
        priority: "medium"
      }
    ];
    
    sampleEvents.forEach(event => demoCalendarHelpers.addEvent(event));
  }

  // Initialize demo work schedules
  const existingSchedules = demoWorkScheduleHelpers.getSchedules();
  if (existingSchedules.length === 0) {
    const sampleSchedules: Omit<WorkSchedule, 'id'>[] = [
      {
        familyId: DEMO_ACCOUNT_ID,
        employeeName: 'Demo',
        title: "Ca sáng",
        startTime: "08:00",
        endTime: "12:00",
        date: "2025-08-26",
        isRecurring: true,
        recurringDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        location: "Văn phòng",
        notes: "Ca làm việc cố định",
        color: "#4a90e2"
      },
      {
        familyId: DEMO_ACCOUNT_ID,
        employeeName: 'Demo',
        title: "Họp nhóm",
        startTime: "14:00",
        endTime: "16:00",
        date: "2025-08-27",
        isRecurring: false,
        location: "Phòng họp A",
        notes: "Review dự án quý 3",
        color: "#f39c12"
      }
    ];
    
    sampleSchedules.forEach(schedule => demoWorkScheduleHelpers.addSchedule(schedule));
  }

  console.log('🎯 Demo: Initialized master data (events, schedules)');
};
