// API wrapper functions that handle both Demo users (localStorage) and regular users (API calls)
import type { CalendarEvent, WorkSchedule, FamilyMember } from '@/types';
import { DEMO_USER, DEMO_ACCOUNT_ID } from '@/lib/constants';
import { demoCalendarHelpers, demoWorkScheduleHelpers } from '@/lib/demo-helpers';

// Calendar Events API Wrapper
export const calendarAPI = {
  async getEvents(familyId: string, currentUser?: FamilyMember): Promise<CalendarEvent[]> {
    if (currentUser === DEMO_USER || familyId === DEMO_ACCOUNT_ID) {
      // Demo user - use localStorage
      return demoCalendarHelpers.getEvents();
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/events?familyId=${encodeURIComponent(familyId)}`);
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        return data.events || [];
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        return [];
      }
    }
  },

  async addEvent(event: Omit<CalendarEvent, 'id'>, currentUser?: FamilyMember): Promise<CalendarEvent | null> {
    if (currentUser === DEMO_USER || event.familyId === DEMO_ACCOUNT_ID) {
      // Demo user - use localStorage
      return demoCalendarHelpers.addEvent(event);
    } else {
      // Regular users - call API
      try {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
        if (!response.ok) throw new Error('Failed to add event');
        const data = await response.json();
        return data.event;
      } catch (error) {
        console.error('Failed to add calendar event:', error);
        return null;
      }
    }
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>, currentUser?: FamilyMember): Promise<boolean> {
    if (currentUser === DEMO_USER) {
      // Demo user - use localStorage
      return demoCalendarHelpers.updateEvent(id, updates);
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to update calendar event:', error);
        return false;
      }
    }
  },

  async deleteEvent(id: string, currentUser?: FamilyMember): Promise<boolean> {
    if (currentUser === DEMO_USER) {
      // Demo user - use localStorage
      return demoCalendarHelpers.deleteEvent(id);
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/events/${id}`, {
          method: 'DELETE'
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to delete calendar event:', error);
        return false;
      }
    }
  }
};

// Work Schedules API Wrapper
export const workScheduleAPI = {
  async getSchedules(familyId: string, currentUser?: FamilyMember): Promise<WorkSchedule[]> {
    if (currentUser === DEMO_USER || familyId === DEMO_ACCOUNT_ID) {
      // Demo user - use localStorage
      return demoWorkScheduleHelpers.getSchedules();
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/work-schedules?familyId=${encodeURIComponent(familyId)}`);
        if (!response.ok) throw new Error('Failed to fetch work schedules');
        const data = await response.json();
        return data.schedules || [];
      } catch (error) {
        console.error('Failed to fetch work schedules:', error);
        return [];
      }
    }
  },

  async addSchedule(schedule: Omit<WorkSchedule, 'id'>, currentUser?: FamilyMember): Promise<WorkSchedule | null> {
    if (currentUser === DEMO_USER || schedule.familyId === DEMO_ACCOUNT_ID) {
      // Demo user - use localStorage
      return demoWorkScheduleHelpers.addSchedule(schedule);
    } else {
      // Regular users - call API
      try {
        const response = await fetch('/api/work-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schedule)
        });
        if (!response.ok) throw new Error('Failed to add work schedule');
        const data = await response.json();
        return data.schedule;
      } catch (error) {
        console.error('Failed to add work schedule:', error);
        return null;
      }
    }
  },

  async updateSchedule(id: string, updates: Partial<WorkSchedule>, currentUser?: FamilyMember): Promise<boolean> {
    if (currentUser === DEMO_USER) {
      // Demo user - use localStorage
      return demoWorkScheduleHelpers.updateSchedule(id, updates);
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/work-schedules/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to update work schedule:', error);
        return false;
      }
    }
  },

  async deleteSchedule(id: string, currentUser?: FamilyMember): Promise<boolean> {
    if (currentUser === DEMO_USER) {
      // Demo user - use localStorage
      return demoWorkScheduleHelpers.deleteSchedule(id);
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/work-schedules/${id}`, {
          method: 'DELETE'
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to delete work schedule:', error);
        return false;
      }
    }
  }
};

// Shared Notes API Wrapper
export const sharedNotesAPI = {
  async getNote(familyId: string, currentUser?: FamilyMember): Promise<{ content: string; modifiedBy?: string; modifiedAt?: string } | null> {
    if (currentUser === DEMO_USER || familyId === DEMO_ACCOUNT_ID) {
      // Demo user - use localStorage
      try {
        const localKey = `shared_note_${DEMO_ACCOUNT_ID}`;
        const data = localStorage.getItem(localKey);
        return data ? JSON.parse(data) : { content: '', modifiedBy: undefined, modifiedAt: undefined };
      } catch (error) {
        console.error('Demo: Failed to load shared note:', error);
        return { content: '', modifiedBy: undefined, modifiedAt: undefined };
      }
    } else {
      // Regular users - call API
      try {
        const response = await fetch(`/api/shared-notes?familyId=${encodeURIComponent(familyId)}`);
        if (!response.ok) throw new Error('Failed to fetch shared note');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch shared note:', error);
        return null;
      }
    }
  },

  async saveNote(familyId: string, content: string, modifiedBy: string, currentUser?: FamilyMember): Promise<boolean> {
    if (currentUser === DEMO_USER || familyId === DEMO_ACCOUNT_ID) {
      // Demo user - use localStorage
      try {
        const localKey = `shared_note_${DEMO_ACCOUNT_ID}`;
        const noteData = {
          content,
          modifiedBy,
          modifiedAt: new Date().toISOString()
        };
        localStorage.setItem(localKey, JSON.stringify(noteData));
        console.log('📝 Demo: Saved shared note to localStorage');
        return true;
      } catch (error) {
        console.error('Demo: Failed to save shared note:', error);
        return false;
      }
    } else {
      // Regular users - call API
      try {
        const response = await fetch('/api/shared-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ familyId, content, modifiedBy })
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to save shared note:', error);
        return false;
      }
    }
  }
};
