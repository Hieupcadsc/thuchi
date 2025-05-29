"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Keep for manual input if desired
import { Loader2, Wand2 } from 'lucide-react';
import { suggestExpenseCategories } from '@/ai/flows/suggest-expense-categories';
import { CATEGORIES } from '@/lib/constants';
import type { Category } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AiCategorySuggestorProps {
  onCategorySelect: (categoryId: string) => void;
  transactionType: 'income' | 'expense';
  currentDescription: string; // Get description from parent form
}

export function AiCategorySuggestor({ onCategorySelect, transactionType, currentDescription }: AiCategorySuggestorProps) {
  // Removed internal description state, will use currentDescription prop
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!currentDescription.trim() || transactionType === 'income') {
      setSuggestions([]);
      if (transactionType === 'income') {
        // toast({ title: "Thông báo", description: "Gợi ý AI chỉ áp dụng cho khoản chi." });
      }
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestExpenseCategories({ expenseDescription: currentDescription });
      const suggestedCategoryNames = result.suggestedCategories.map(s => s.toLowerCase().trim());
      
      const matchedCategories = CATEGORIES.filter(category => 
        category.type === 'expense' && 
        suggestedCategoryNames.some(suggestedName => {
            const categoryNameLower = category.name.toLowerCase().trim();
            // Check for exact match or if one contains the other (helps with pluralization/variations)
            return categoryNameLower === suggestedName || categoryNameLower.includes(suggestedName) || suggestedName.includes(categoryNameLower);
        })
      ).slice(0, 3); // Limit to 3 suggestions

      setSuggestions(matchedCategories);
      if(matchedCategories.length === 0 && currentDescription.trim()) { // Only toast if description was provided
        toast({ title: "Không tìm thấy gợi ý AI", description: "Không có danh mục phù hợp nào từ gợi ý của AI cho mô tả này.", variant: "default" });
      }
    } catch (error) {
      console.error("Error suggesting categories:", error);
      toast({ title: "Lỗi gợi ý AI", description: "Không thể gợi ý danh mục vào lúc này.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  // Automatically suggest when description changes (debounced)
  useEffect(() => {
    if (transactionType === 'expense' && currentDescription.trim()) {
      const debounceTimeout = setTimeout(() => {
        handleSuggest();
      }, 700); // Debounce time in ms
      return () => clearTimeout(debounceTimeout);
    } else {
      setSuggestions([]); // Clear suggestions if not expense or description is empty
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDescription, transactionType]);


  if (transactionType === 'income') {
    return null; 
  }

  return (
    <div className="space-y-2 mt-2 p-3 border rounded-md bg-muted/50 dark:bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
            {isLoading ? "AI đang tìm gợi ý..." : suggestions.length > 0 ? "Gợi ý danh mục từ AI:" : "Nhập mô tả để AI gợi ý."}
        </p>
        <Button onClick={handleSuggest} disabled={isLoading || !currentDescription.trim()} size="icon" variant="ghost" className="h-7 w-7">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          <span className="sr-only">Gợi ý danh mục bằng AI</span>
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {suggestions.map((category) => (
            <Button
              key={category.id}
              variant="outline"
              size="sm"
              onClick={() => onCategorySelect(category.id)}
              className="bg-background hover:bg-primary/10 text-xs"
            >
              {category.icon && <category.icon className="mr-1.5 h-3.5 w-3.5" />}
              {category.name}
            </Button>
          ))}
        </div>
      )}
       { !isLoading && suggestions.length === 0 && currentDescription.trim() && (
         <p className="text-xs text-muted-foreground">Không có gợi ý nào từ AI. Vui lòng chọn thủ công.</p>
       )}
    </div>
  );
}
