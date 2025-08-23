"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus,
  Loader2, 
  Save, 
  AlertTriangle, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  StickyNote,
  RotateCcw,
  Eye,
  X,
  Minimize2,
  Pin,
  PinOff,
  Trash2,
  Search,
  Grid3X3,
  Settings
} from 'lucide-react';
import { firestoreService } from '@/lib/firestore-service';
import { useAuthStore } from '@/hooks/useAuth';
import type { FamilyMember, StickyNote as StickyNoteType } from '@/types';
import { FAMILY_ACCOUNT_ID, DEMO_USER, DEMO_ACCOUNT_ID } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STICKY_COLORS = [
  { name: 'yellow', bg: 'bg-yellow-200', border: 'border-yellow-300', text: 'text-yellow-900', label: 'Vàng' },
  { name: 'pink', bg: 'bg-pink-200', border: 'border-pink-300', text: 'text-pink-900', label: 'Hồng' },
  { name: 'green', bg: 'bg-green-200', border: 'border-green-300', text: 'text-green-900', label: 'Xanh lá' },
  { name: 'blue', bg: 'bg-blue-200', border: 'border-blue-300', text: 'text-blue-900', label: 'Xanh dương' },
  { name: 'purple', bg: 'bg-purple-200', border: 'border-purple-300', text: 'text-purple-900', label: 'Tím' },
  { name: 'orange', bg: 'bg-orange-200', border: 'border-orange-300', text: 'text-orange-900', label: 'Cam' },
] as const;

// Individual Sticky Note Component - Memoized để tránh re-render
const StickyNoteCard = React.memo(function StickyNoteCard({ 
  note, 
  onUpdate, 
  onDelete, 
  onMinimize,
  onPin,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDraggedOver,
  className 
}: {
  note: StickyNoteType;
  onUpdate: (id: string, updates: Partial<StickyNoteType>) => void;
  onDelete: (id: string) => void;
  onMinimize: (id: string) => void;
  onPin: (id: string) => void;
  onDragStart?: (noteId: string) => void;
  onDragEnd?: () => void;
  onDragEnter?: (targetNoteId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (draggedNoteId: string, targetNoteId: string) => void;
  isDraggedOver?: boolean;
  className?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isDoubleClickAnimating, setIsDoubleClickAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const colorConfig = STICKY_COLORS.find(c => c.name === note.color) || STICKY_COLORS[0];

  useEffect(() => {
    if (editorRef.current && isEditing) {
      editorRef.current.innerHTML = content;
    }
  }, [isEditing, content]);

  // Sync state với props khi note được update từ bên ngoài
  useEffect(() => {
    setContent(note.content);
    setTitle(note.title);
    setHasUnsavedChanges(false);
  }, [note.content, note.title, note.updatedAt]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-save với debounce
  const debouncedAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      await onUpdate(note.id, {
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
      setHasUnsavedChanges(false);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
      console.log(`📝 Auto-saved sticky note: ${note.title || 'Untitled'}`);
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Note: Không show toast error cho auto-save để tránh spam user
    } finally {
      setIsSaving(false);
    }
  }, [note.id, note.title, title, content, hasUnsavedChanges, isSaving, onUpdate]);

  // Debounce auto-save (1.5 giây sau khi ngừng typing)
  useEffect(() => {
    if (hasUnsavedChanges && isEditing) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        debouncedAutoSave();
      }, 1500);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, isEditing, debouncedAutoSave]);

  // Handle click outside để auto-save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node) && isEditing && hasUnsavedChanges) {
        debouncedAutoSave();
        setIsEditing(false);
        setIsPreviewMode(true);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, hasUnsavedChanges, debouncedAutoSave]);

  // handleContentChange removed - using direct onChange in textarea

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(note.id, {
        title,
        content,
        updatedAt: new Date().toISOString(),
      });
      setHasUnsavedChanges(false);
      setIsEditing(false);
      setIsPreviewMode(true);
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts (Ctrl+S để save manual)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditing && event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (hasUnsavedChanges) {
          handleSave();
        }
      }
      // ESC để exit edit mode
      if (isEditing && event.key === 'Escape') {
        if (hasUnsavedChanges) {
          debouncedAutoSave();
        }
        setIsEditing(false);
        setIsPreviewMode(true);
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, hasUnsavedChanges, handleSave, debouncedAutoSave]);



  const handleEditClick = () => {
    setIsEditing(true);
    setIsPreviewMode(false);
  };

  const handleDoubleClick = () => {
    if (!isEditing) {
      // Trigger double-click animation
      setIsDoubleClickAnimating(true);
      setTimeout(() => setIsDoubleClickAnimating(false), 200);
      
      setIsEditing(true);
      setIsPreviewMode(false);
      
      // Focus vào title input sau khi vào edit mode
      setTimeout(() => {
        const titleInput = cardRef.current?.querySelector('input[placeholder*="Tiêu đề"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.focus();
          titleInput.select(); // Select all text in title
        }
      }, 250); // Tăng delay để animation hoàn thành
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault(); // Không cho drag khi đang edit
      return;
    }
    
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', note.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    if (cardRef.current) {
      cardRef.current.style.opacity = '0.5';
    }
    
    onDragStart?.(note.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    
    // Restore opacity
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
    
    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnterNote = (e: React.DragEvent) => {
    if (!isEditing) {
      e.preventDefault();
      onDragEnter?.(note.id);
    }
  };

  const handleDragLeaveNote = (e: React.DragEvent) => {
    if (!isEditing && e.currentTarget === e.target) {
      e.preventDefault();
      onDragLeave?.();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedNoteId = e.dataTransfer.getData('text/plain');
    
    if (draggedNoteId !== note.id && onDrop) {
      onDrop(draggedNoteId, note.id);
    }
  };

  if (note.isMinimized) {
    return (
      <div className={cn(
        "w-48 h-12 border-2 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 group",
        colorConfig.bg,
        colorConfig.border,
        isDoubleClickAnimating && "animate-double-click",
        className
      )}
      onClick={() => onMinimize(note.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // Trigger animation
        setIsDoubleClickAnimating(true);
        setTimeout(() => setIsDoubleClickAnimating(false), 200);
        
        onMinimize(note.id); // Mở note lên
        // Sau khi mở lên thì vào edit mode
        setTimeout(() => {
          setIsEditing(true);
          setIsPreviewMode(false);
        }, 300);
      }}
      title="Click để mở">
        <div className="p-2 flex items-center justify-between">
          <span className={cn("text-sm font-medium truncate", colorConfig.text)}>
            {note.title || 'Sticky Note'}
          </span>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="h-6 w-6 p-0 hover:bg-red-200"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      draggable={!isEditing && !note.isMinimized}
      onDoubleClick={handleDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnterNote}
      onDragLeave={handleDragLeaveNote}
      onDrop={handleDrop}
      className={cn(
        "relative w-80 min-h-96 max-h-[500px] transform transition-all duration-300",
        "shadow-2xl hover:shadow-3xl",
        colorConfig.bg,
        colorConfig.border,
        "border-2 rounded-lg overflow-hidden",
        "hover:rotate-0",
        note.isPinned ? "rotate-0" : "rotate-1",
        hasUnsavedChanges && isEditing && "ring-2 ring-blue-300 ring-opacity-50", // Visual indicator cho unsaved changes
        !isEditing && "cursor-pointer hover:ring-1 hover:ring-gray-300 hover:ring-opacity-30 group", // Show pointer cursor và hover effect when not editing
        isDoubleClickAnimating && "animate-double-click", // Double-click animation
        isDragging && "opacity-50 rotate-3 scale-105", // Drag feedback
        isDraggedOver && "ring-2 ring-blue-500 ring-opacity-70 scale-102", // Drop target highlight
        !isEditing && !note.isMinimized && "cursor-grab active:cursor-grabbing", // Drag cursor
        className
      )}
      title={!isEditing ? (isDragging ? "Đang kéo..." : "Double-click để sửa") : undefined}>


      {/* Tape Effect */}
      {note.isPinned && (
        <div className="absolute -top-2 left-8 w-16 h-8 bg-red-400/60 rounded-sm transform -rotate-12 shadow-md z-10"></div>
      )}
      
      {/* Header */}
      <div className="relative p-3">
        <div className="flex items-center justify-between">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={cn(
              "bg-transparent border-none p-0 font-bold text-lg focus:ring-0 focus:outline-none",
              colorConfig.text
            )}
            style={{ direction: 'ltr', unicodeBidi: 'normal', textAlign: 'left' }}
            dir="ltr"
            placeholder="Tiêu đề sticky note..."
            disabled={!isEditing}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPin(note.id)}
              className={cn(
                "h-6 w-6 p-0",
                note.isPinned ? "text-red-600" : "opacity-60"
              )}
              title={note.isPinned ? "Bỏ ghim" : "Ghim note"}
            >
              {note.isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMinimize(note.id)}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              title="Thu nhỏ"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(note.id)}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:text-red-600"
              title="Xóa note"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>


      </div>

            {/* Content */}
      <div className="p-3 h-full">

        {/* Editor/Preview */}
        <div className="relative">
          {isEditing && !isPreviewMode ? (
            // Use textarea for Vietnamese input
            <textarea
              ref={editorRef as any}
              value={content?.replace(/<[^>]*>/g, '') || ''}
              onChange={(e) => {
                setContent(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className={cn(
                "sticky-note-editor min-h-[250px] max-h-[350px] w-full resize-none",
                "p-3 bg-white/20 rounded border border-dashed border-white/40",
                "text-gray-800 leading-relaxed text-sm",
                "focus:outline-none focus:border-white/70",
                isSaving && "opacity-50 pointer-events-none"
              )}
              style={{
                fontFamily: '"Comic Sans MS", "Marker Felt", cursive, sans-serif',
                direction: 'ltr',
                unicodeBidi: 'normal',
                textAlign: 'left'
              }}
              dir="ltr"
              placeholder="Nhấn để viết ghi chú..."
              autoComplete="off"
              spellCheck="false"
            />
          ) : (
            // Display mode
            <div
              className={cn(
                "sticky-note-editor min-h-[250px] max-h-[350px] overflow-y-auto",
                "p-3 bg-white/20 rounded border border-dashed border-white/40",
                "text-gray-800 leading-relaxed text-sm cursor-default"
              )}
              style={{
                fontFamily: '"Comic Sans MS", "Marker Felt", cursive, sans-serif',
                direction: 'ltr',
                unicodeBidi: 'normal',
                textAlign: 'left',
                whiteSpace: 'pre-wrap'
              }}
              dir="ltr"
            >
              {content?.replace(/<[^>]*>/g, '') || 'Nhấn để viết ghi chú...'}
            </div>
          )}
        </div>


      </div>
    </div>
  );
});

// Main Sticky Notes Manager
export function SharedNotes() {
  const { currentUser, familyId } = useAuthStore();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState<StickyNoteType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);

  // Load notes - Demo user uses localStorage, regular users use Firestore
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      if (currentUser === DEMO_USER) {
        // Demo user - load from localStorage
        const localKey = `sticky_notes_${DEMO_ACCOUNT_ID}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const demoNotes = JSON.parse(localData);
          setNotes(demoNotes);
          console.log(`📝 Demo: Loaded ${demoNotes.length} sticky notes from localStorage`);
        } else {
          setNotes([]);
          console.log('📝 Demo: No sticky notes in localStorage');
        }
        setError(null);
      } else {
        // Regular users - load from Firestore
        const fetchedNotes = await firestoreService.getStickyNotes(FAMILY_ACCOUNT_ID);
        setNotes(fetchedNotes);
        setError(null);
        console.log(`📝 Regular: Loaded ${fetchedNotes.length} sticky notes from Firestore`);
      }
    } catch (err) {
      console.error('Error loading sticky notes:', err);
      setError('Không thể tải sticky notes');
      toast({ title: "❌ Lỗi", description: "Không thể tải sticky notes", variant: "destructive" });
    }
    setIsLoading(false);
  }, [currentUser, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNewNote = async () => {
    if (!currentUser) {
      toast({ title: "❌ Lỗi", description: "Vui lòng đăng nhập", variant: "destructive" });
      return;
    }

    const colors = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange'] as const;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const now = new Date().toISOString();
    
    const targetFamilyId = currentUser === DEMO_USER ? DEMO_ACCOUNT_ID : FAMILY_ACCOUNT_ID;
    
    const newNoteData: Omit<StickyNoteType, 'id'> = {
      familyId: targetFamilyId,
      title: '',
      content: '<p>Ghi chú mới...</p>',
      color: randomColor,
      isMinimized: false,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      lastModifiedBy: currentUser,
    };

    try {
      if (currentUser === DEMO_USER) {
        // Demo user - save to localStorage
        const newNote: StickyNoteType = { 
          id: `demo-note-${Date.now()}`, 
          ...newNoteData 
        };
        
        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        
        // Save to localStorage
        const localKey = `sticky_notes_${DEMO_ACCOUNT_ID}`;
        localStorage.setItem(localKey, JSON.stringify(updatedNotes));
        
        toast({ title: "✅ Thành công", description: "Đã tạo sticky note Demo!", duration: 2000 });
        console.log('📝 Demo: Created sticky note:', newNote.id);
      } else {
        // Regular users - save to Firestore
        // Optimistic update
        const tempNote: StickyNoteType = { id: 'temp-' + Date.now(), ...newNoteData };
        setNotes(prev => [tempNote, ...prev]);
        
        // Save to Firestore
        const savedNote = await firestoreService.addStickyNote(newNoteData);
        
        // Replace temp note with real note
        setNotes(prev => prev.map(note => 
          note.id === tempNote.id ? savedNote : note
        ));
        
        toast({ title: "✅ Thành công", description: "Đã tạo sticky note mới!", duration: 2000 });
      }
    } catch (error) {
      console.error('Error creating sticky note:', error);
      // Remove temp note on error for regular users
      if (currentUser !== DEMO_USER) {
        setNotes(prev => prev.filter(note => !note.id.startsWith('temp-')));
      }
      toast({ title: "❌ Lỗi", description: "Không thể tạo sticky note", variant: "destructive" });
    }
  };

  const updateNote = async (id: string, updates: Partial<StickyNoteType>) => {
    if (!currentUser) return;
    
    try {
      // Optimistic update
      const updatedData = { ...updates, lastModifiedBy: currentUser, updatedAt: new Date().toISOString() };
      const updatedNotes = notes.map(note => 
        note.id === id 
          ? { ...note, ...updatedData }
          : note
      );
      setNotes(updatedNotes);
      
      if (currentUser === DEMO_USER) {
        // Demo user - save to localStorage
        const localKey = `sticky_notes_${DEMO_ACCOUNT_ID}`;
        localStorage.setItem(localKey, JSON.stringify(updatedNotes));
        console.log('📝 Demo: Updated sticky note:', id);
      } else {
        // Regular users - save to Firestore (silent - no toast spam)
        await firestoreService.updateStickyNote(id, updatedData);
      }
    } catch (error) {
      console.error('Error updating sticky note:', error);
      // Revert optimistic update
      await loadNotes();
      toast({ title: "❌ Lỗi", description: "Không thể cập nhật sticky note", variant: "destructive" });
    }
  };

  const deleteNote = async (id: string) => {
    const originalNotes = notes; // Store original state for rollback
    
    try {
      // Optimistic update
      const updatedNotes = notes.filter(note => note.id !== id);
      setNotes(updatedNotes);
      
      if (currentUser === DEMO_USER) {
        // Demo user - save to localStorage
        const localKey = `sticky_notes_${DEMO_ACCOUNT_ID}`;
        localStorage.setItem(localKey, JSON.stringify(updatedNotes));
        console.log('📝 Demo: Deleted sticky note:', id);
        toast({ title: "🗑️ Đã xóa", description: "Sticky note Demo đã được xóa", duration: 2000 });
      } else {
        // Regular users - delete from Firestore
        await firestoreService.deleteStickyNote(id);
        toast({ title: "🗑️ Đã xóa", description: "Sticky note đã được xóa", duration: 2000 });
      }
    } catch (error) {
      console.error('Error deleting sticky note:', error);
      // Revert optimistic update
      setNotes(originalNotes);
      toast({ title: "❌ Lỗi", description: "Không thể xóa sticky note", variant: "destructive" });
    }
  };

  const toggleMinimize = (id: string) => {
    updateNote(id, { 
      isMinimized: !notes.find(n => n.id === id)?.isMinimized 
    });
  };

  const togglePin = (id: string) => {
    updateNote(id, { 
      isPinned: !notes.find(n => n.id === id)?.isPinned 
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (noteId: string) => {
    setDraggedNoteId(noteId);
  };

  const handleDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
  };

  const handleDragEnter = (targetNoteId: string) => {
    if (draggedNoteId && draggedNoteId !== targetNoteId) {
      setDragOverNoteId(targetNoteId);
    }
  };

  const handleDragLeave = () => {
    setDragOverNoteId(null);
  };

  const handleDrop = (draggedNoteId: string, targetNoteId: string) => {
    if (draggedNoteId === targetNoteId) return;

    const draggedNote = notes.find(n => n.id === draggedNoteId);
    const targetNote = notes.find(n => n.id === targetNoteId);

    if (!draggedNote || !targetNote) return;

    // Reorder notes array
    const updatedNotes = [...notes];
    const draggedIndex = updatedNotes.findIndex(n => n.id === draggedNoteId);
    const targetIndex = updatedNotes.findIndex(n => n.id === targetNoteId);

    // Remove dragged note and insert at target position
    const [removedNote] = updatedNotes.splice(draggedIndex, 1);
    updatedNotes.splice(targetIndex, 0, removedNote);

    setNotes(updatedNotes);
    setDragOverNoteId(null); // Clear drag over state

    // Optional: Update order in Firestore
    // Could add a 'sortOrder' field to notes and update it
    
    toast({ 
      title: "📦 Đã di chuyển", 
      description: `Sticky note "${draggedNote.title || 'Untitled'}" đã được di chuyển`, 
      duration: 1500 
    });
  };

  // Memoize filter operations để tránh re-compute mỗi render
  const { filteredNotes, pinnedNotes, regularNotes, minimizedNotes } = useMemo(() => {
    const filtered = notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
      filteredNotes: filtered,
      pinnedNotes: filtered.filter(n => n.isPinned && !n.isMinimized),
      regularNotes: filtered.filter(n => !n.isPinned && !n.isMinimized),
      minimizedNotes: filtered.filter(n => n.isMinimized)
    };
  }, [notes, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-600" />
          <p className="text-gray-600">Đang tải Sticky Notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <StickyNote className="h-6 w-6 text-yellow-600" />
              📌 Sticky Notes Gia Đình
            </CardTitle>
            <div className="flex gap-2">
                             <Button
                 onClick={() => createNewNote()}
                 className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-medium shadow-md"
               >
                 <Plus className="mr-2 h-4 w-4" />
                 Tạo Note Mới
               </Button>
            </div>
          </div>
          
          {/* Search & Controls */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm trong notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <div className="flex items-center justify-center h-32 text-red-600">
          <AlertTriangle className="h-6 w-6 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Notes Content */}
      <div className="space-y-6">
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Pin className="h-5 w-5 text-red-500" />
              📌 Notes Đã Ghim ({pinnedNotes.length})
            </h3>
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "space-y-4"
            )}>
                             {pinnedNotes.map(note => (
                 <StickyNoteCard
                   key={note.id}
                   note={note}
                   onUpdate={updateNote}
                   onDelete={deleteNote}
                   onMinimize={toggleMinimize}
                   onPin={togglePin}
                   onDragStart={handleDragStart}
                   onDragEnd={handleDragEnd}
                   onDragEnter={handleDragEnter}
                   onDragLeave={handleDragLeave}
                   onDrop={handleDrop}
                   isDraggedOver={dragOverNoteId === note.id}
                 />
               ))}
            </div>
          </div>
        )}

        {/* Regular Notes */}
        {regularNotes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-yellow-600" />
              📝 Notes Thường ({regularNotes.length})
            </h3>
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "space-y-4"
            )}>
                             {regularNotes.map(note => (
                 <StickyNoteCard
                   key={note.id}
                   note={note}
                   onUpdate={updateNote}
                   onDelete={deleteNote}
                   onMinimize={toggleMinimize}
                   onPin={togglePin}
                   onDragStart={handleDragStart}
                   onDragEnd={handleDragEnd}
                   onDragEnter={handleDragEnter}
                   onDragLeave={handleDragLeave}
                   onDrop={handleDrop}
                   isDraggedOver={dragOverNoteId === note.id}
                 />
               ))}
            </div>
          </div>
        )}

        {/* Minimized Notes */}
        {minimizedNotes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Minimize2 className="h-5 w-5 text-gray-500" />
              📦 Notes Thu Nhỏ ({minimizedNotes.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {minimizedNotes.map(note => (
                <StickyNoteCard
                  key={note.id}
                  note={note}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onMinimize={toggleMinimize}
                  onPin={togglePin}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  isDraggedOver={dragOverNoteId === note.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredNotes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <StickyNote className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {searchTerm ? 'Không tìm thấy note nào' : 'Chưa có Sticky Note nào'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Hãy thử từ khóa khác' : 'Bắt đầu tạo sticky note đầu tiên của gia đình!'}
            </p>
                         {!searchTerm && (
               <Button onClick={() => createNewNote()} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900">
                 <Plus className="mr-2 h-4 w-4" />
                 Tạo Note Đầu Tiên
               </Button>
             )}
          </div>
        )}
      </div>

             {/* Stats & Auto-save Info */}
       {notes.length > 0 && (
         <div className="text-center text-sm text-gray-500 py-4 border-t space-y-2">
           <div>
             📊 Tổng cộng: {notes.length} notes • 
             📌 Ghim: {notes.filter(n => n.isPinned).length} • 
             📦 Thu nhỏ: {notes.filter(n => n.isMinimized).length}
           </div>
           <div className="text-xs opacity-75" dir="ltr" style={{ unicodeBidi: 'normal' }}>
             💡 Auto-save • 🖱️ Double-click để sửa • 🔄 Kéo thả để sắp xếp
           </div>
         </div>
       )}
    </div>
  );
}
