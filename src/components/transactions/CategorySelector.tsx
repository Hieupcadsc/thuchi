"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CATEGORIES } from "@/lib/constants";
import type { Category } from "@/types";

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  transactionType: 'income' | 'expense';
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, transactionType, disabled }: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false);
  
  const filteredCategories = CATEGORIES.filter(cat => cat.type === transactionType);
  const selectedCategory = filteredCategories.find(cat => cat.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCategory ? (
            <div className="flex items-center">
              <selectedCategory.icon className="mr-2 h-4 w-4" />
              {selectedCategory.name}
            </div>
          ) : "Chọn danh mục..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Tìm danh mục..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy danh mục.</CommandEmpty>
            <CommandGroup>
              {filteredCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name} // CommandInput searches based on this value
                  onSelect={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <category.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
