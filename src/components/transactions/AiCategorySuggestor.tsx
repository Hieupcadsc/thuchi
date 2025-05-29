"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2 } from 'lucide-react';
import { suggestExpenseCategories } from '@/ai/flows/suggest-expense-categories'; // Ensure this path is correct
import { CATEGORIES } from '@/lib/constants';
import type { Category } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AiCategorySuggestorProps {
  onCategorySelect: (categoryId: string) => void;
  transactionType: 'income' | 'expense';
}

export function AiCategorySuggestor({ onCategorySelect, transactionType }: AiCategorySuggestorProps) {
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!description.trim() || transactionType === 'income') {
      setSuggestions([]);
      if (transactionType === 'income') {
        toast({ title: "Thông báo", description: "Gợi ý AI chỉ áp dụng cho khoản chi." });
      }
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestExpenseCategories({ expenseDescription: description });
      const suggestedCategoryNames = result.suggestedCategories.map(s => s.toLowerCase());
      
      const matchedCategories = CATEGORIES.filter(category => 
        category.type === 'expense' && 
        suggestedCategoryNames.some(suggestedName => category.name.toLowerCase().includes(suggestedName) || suggestedName.includes(category.name.toLowerCase()))
      ).slice(0, 3); // Limit to 3 suggestions

      setSuggestions(matchedCategories);
      if(matchedCategories.length === 0) {
        toast({ title: "Không tìm thấy gợi ý", description: "Không tìm thấy danh mục phù hợp từ gợi ý của AI." });
      }
    } catch (error) {
      console.error("Error suggesting categories:", error);
      toast({ title: "Lỗi", description: "Không thể gợi ý danh mục vào lúc này.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (transactionType === 'income') {
    return null; // Or a message indicating AI suggestions are for expenses
  }

  return (
    <div className="space-y-2 mt-2 p-3 border rounded-md bg-accent/20">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Nhập mô tả chi tiêu để AI gợi ý danh mục..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-background"
        />
        <Button onClick={handleSuggest} disabled={isLoading || !description.trim()} size="icon" variant="outline">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <p className="text-sm text-muted-foreground w-full">Gợi ý:</p>
          {suggestions.map((category) => (
            <Button
              key={category.id}
              variant="outline"
              size="sm"
              onClick={() => onCategorySelect(category.id)}
              className="bg-background hover:bg-primary/10"
            >
              <category.icon className="mr-2 h-4 w-4" />
              {category.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
