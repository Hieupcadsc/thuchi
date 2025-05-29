
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CategorySelector } from "./CategorySelector";
import { AiCategorySuggestor } from "./AiCategorySuggestor";
import { useAuthStore, FAMILY_MEMBERS } from "@/hooks/useAuth";
import type { Transaction, FamilyMember } from "@/types";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; 
import React from "react";

const formSchema = z.object({
  description: z.string().min(1, "Mô tả không được để trống"),
  amount: z.coerce.number().positive("Số tiền phải là số dương"),
  date: z.date({ required_error: "Ngày không được để trống" }),
  type: z.enum(["income", "expense"], { required_error: "Vui lòng chọn loại giao dịch" }),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  note: z.string().optional(),
  performedBy: z.enum(FAMILY_MEMBERS, { required_error: "Vui lòng chọn người thực hiện" }),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionForm({ onSuccess, transactionToEdit }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currentUser } = useAuthStore(); 
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultPerformedBy = transactionToEdit ? transactionToEdit.performedBy : currentUser || undefined;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
      ...transactionToEdit,
      date: parseISO(transactionToEdit.date), // Convert date string back to Date object
      amount: Number(transactionToEdit.amount), // Ensure amount is number
      performedBy: transactionToEdit.performedBy,
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: "",
      note: "",
      performedBy: currentUser || undefined,
    },
  });

  const transactionType = form.watch("type");

  React.useEffect(() => {
    // Reset form if transactionToEdit changes (e.g., from editing to adding new)
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        date: parseISO(transactionToEdit.date),
        amount: Number(transactionToEdit.amount),
        performedBy: transactionToEdit.performedBy,
      });
    } else {
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        type: "expense",
        categoryId: "",
        note: "",
        performedBy: currentUser || undefined,
      });
    }
  }, [transactionToEdit, form, currentUser]);


  React.useEffect(() => {
    if (!transactionToEdit) { // Only reset categoryId for new transactions on type change
        form.resetField("categoryId");
    }
    if (transactionType === "income") {
      form.setValue("note", ""); 
    }
  }, [transactionType, form, transactionToEdit]);


  const onSubmit = async (data: TransactionFormValues) => {
    if (!currentUser) { 
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng hiện tại.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const formattedDate = format(data.date, "yyyy-MM-dd");
    const monthYear = formattedDate.substring(0,7);

    const transactionPayload = {
      ...data, // includes performedBy from form
      date: formattedDate,
      monthYear: monthYear,
      note: data.type === 'expense' ? data.note : undefined,
    };

    try {
      if (transactionToEdit) {
        await updateTransaction({ ...transactionPayload, id: transactionToEdit.id, userId: transactionToEdit.userId });
      } else {
        await addTransaction(transactionPayload);
      }
      
      if (!transactionToEdit) { // Only reset fully if it was an add operation
        form.reset({
            description: "",
            amount: 0,
            date: new Date(),
            type: "expense",
            categoryId: "",
            note: "",
            performedBy: currentUser || undefined,
        });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting transaction form:", error);
    } finally {
      setIsSubmitting(false);
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
                  value={field.value} // Controlled component
                  className="flex space-x-4"
                  disabled={isSubmitting}
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value="expense" /></FormControl>
                    <FormLabel className="font-normal">Khoản Chi</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value="income" /></FormControl>
                    <FormLabel className="font-normal">Khoản Thu</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Performed By Field */}
        <FormField
          control={form.control}
          name="performedBy"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Người thực hiện</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value} // Controlled component
                  className="flex space-x-4"
                  disabled={isSubmitting}
                >
                  {FAMILY_MEMBERS.map(member => (
                    <FormItem key={member} className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value={member} /></FormControl>
                      <FormLabel className="font-normal">{member}</FormLabel>
                    </FormItem>
                  ))}
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
                <Input placeholder="VD: Ăn tối, Tiền lương tháng 5" {...field} disabled={isSubmitting} />
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
                disabled={!transactionType || isSubmitting}
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
                  <Input type="number" placeholder="0" {...field} disabled={isSubmitting} 
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
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
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        disabled={isSubmitting}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {transactionType === 'expense' && (
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ghi chú (tuỳ chọn)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Thêm ghi chú cho khoản chi này..."
                    className="resize-none"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> 
                       : transactionToEdit ? "Cập Nhật Giao Dịch" : "Thêm Giao Dịch"}
        </Button>
      </form>
    </Form>
  );
}
