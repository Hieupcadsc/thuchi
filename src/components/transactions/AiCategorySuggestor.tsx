"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2 } from 'lucide-react';
// Removed direct AI flow import to avoid client-side issues
import { CATEGORIES } from '@/lib/constants';
import type { Category } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AiCategorySuggestorProps {
  onCategorySelect: (categoryId: string) => void;
  transactionType: 'income' | 'expense';
  currentDescription: string;
  autoTrigger?: boolean;
  onAutoTriggerComplete?: () => void;
}

export function AiCategorySuggestor({ 
  onCategorySelect, 
  transactionType, 
  currentDescription,
  autoTrigger = false,
  onAutoTriggerComplete
}: AiCategorySuggestorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{categoryId: string; confidence: number; category: Category}[]>([]);
  const { toast } = useToast();

  // Auto-trigger suggestion when autoTrigger is set
  useEffect(() => {
    if (autoTrigger && currentDescription.trim() && !isLoading) {
      handleSuggest();
      onAutoTriggerComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrigger, currentDescription]);

  const handleSuggest = async () => {
    if (!currentDescription.trim()) {
      toast({
        title: "Cần mô tả",
        description: "Vui lòng nhập mô tả giao dịch để AI có thể gợi ý danh mục.",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: currentDescription,
          type: transactionType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const result = await response.json();

      // Find the category details
      const category = CATEGORIES.find((c: any) => c.id === result.suggestedCategoryId);
      
      if (category) {
        setSuggestions([{
          categoryId: result.suggestedCategoryId,
          confidence: result.confidence,
          category,
        }]);
        
        toast({
          title: "AI Gợi ý",
          description: `Đề xuất danh mục: ${category.name} (${Math.round(result.confidence * 100)}% tin cậy)`,
        });
      }
    } catch (error: any) {
      console.error('Error getting AI suggestions:', error);
      toast({
        title: "Lỗi AI",
        description: "Không thể lấy gợi ý từ AI. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (categoryId: string) => {
    onCategorySelect(categoryId);
    setSuggestions([]);
    toast({
      title: "Đã chọn",
      description: "Đã áp dụng gợi ý từ AI.",
    });
  };

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              AI Gợi Ý Danh Mục
            </span>
            {isLoading && (
              <span className="text-xs text-muted-foreground">(Đang phân tích...)</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggest}
              disabled={isLoading || !currentDescription.trim()}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Đang phân tích...' : 'Gợi ý AI'}
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Gợi ý từ AI:</p>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <suggestion.category.icon className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">{suggestion.category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(suggestion.confidence * 100)}%)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSelectSuggestion(suggestion.categoryId)}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    Chọn
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 