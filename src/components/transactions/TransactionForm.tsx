"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CategorySelector } from "./CategorySelector";
import { AiCategorySuggestor } from "./AiCategorySuggestor";
import { useAuthStore } from "@/hooks/useAuth";
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@/types";
import React from "react";

const formSchema = z.object({
  description: z.string().min(1, "Mô tả không được để trống"),
  amount: z.coerce.number().positive("Số tiền phải là số dương"),
  date: z.date({ required_error: "Ngày không được để trống" }),
  type: z.enum(["income", "expense"], { required_error: "Vui lòng chọn loại giao dịch" }),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { user, addTransaction } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: "",
    },
  });

  const transactionType = form.watch("type");
  const transactionDescription = form.watch("description");

  // Reset categoryId when transactionType changes
  React.useEffect(() => {
    form.resetField("categoryId");
  }, [transactionType, form]);


  const onSubmit = (data: TransactionFormValues) => {
    if (!user) {
      toast({ title: "Lỗi", description: "Không tìm thấy người dùng.", variant: "destructive" });
      return;
    }

    const formattedDate = format(data.date, "yyyy-MM-dd");
    const monthYear = format(data.date, "yyyy-MM");

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      userId: user,
      description: data.description,
      amount: data.amount,
      date: formattedDate,
      type: data.type,
      categoryId: data.categoryId,
      monthYear: monthYear,
    };

    try {
      addTransaction(newTransaction); // This is the mock function from Zustand
      toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      toast({ title: "Lỗi", description: "Không thể thêm giao dịch.", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Loại giao dịch</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal">Khoản Chi</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal">Khoản Thu</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Input placeholder="VD: Ăn tối, Tiền lương tháng 5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {transactionType === 'expense' && (
           <AiCategorySuggestor
             onCategorySelect={(categoryId) => form.setValue('categoryId', categoryId, { shouldValidate: true })}
             transactionType={transactionType}
           />
        )}
        
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Danh mục</FormLabel>
              <CategorySelector
                value={field.value}
                onChange={field.onChange}
                transactionType={transactionType}
                disabled={!transactionType}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số tiền</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Ngày</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang lưu..." : "Thêm Giao Dịch"}
        </Button>
      </form>
    </Form>
  );
}
