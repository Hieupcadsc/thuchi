
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
import { useAuthStore } from "@/hooks/useAuth";
import { FAMILY_MEMBERS } from '@/lib/constants'; 
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
  performedBy: z.enum(FAMILY_MEMBERS as [string, ...string[]], { // Ensures performedBy is one of the FamilyMembers
    required_error: "Vui lòng chọn người thực hiện"
  }),
  note: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
  transactionToEdit?: Transaction | null;
  onCancel?: () => void; 
}

export function TransactionForm({ onSuccess, transactionToEdit, onCancel }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currentUser, familyId } = useAuthStore(); 
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
      description: transactionToEdit.description,
      amount: Number(transactionToEdit.amount), 
      date: parseISO(transactionToEdit.date), 
      type: transactionToEdit.type,
      categoryId: transactionToEdit.categoryId,
      performedBy: transactionToEdit.performedBy,
      note: transactionToEdit.note || "",
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: "",
      performedBy: currentUser || undefined, // Default to current user if adding new
      note: "",
    },
  });

  const transactionType = form.watch("type");
  const currentDescription = form.watch("description"); 

  React.useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        description: transactionToEdit.description,
        amount: Number(transactionToEdit.amount),
        date: parseISO(transactionToEdit.date),
        type: transactionToEdit.type,
        categoryId: transactionToEdit.categoryId,
        performedBy: transactionToEdit.performedBy,
        note: transactionToEdit.note || "",
      });
    } else {
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        type: "expense",
        categoryId: "",
        performedBy: currentUser || undefined,
        note: "",
      });
    }
  }, [transactionToEdit, form, currentUser]);


  React.useEffect(() => {
    if (!transactionToEdit || (transactionToEdit && form.getValues("type") !== transactionToEdit.type)) {
        form.setValue("categoryId", "", { shouldValidate: true });
    }
    if (transactionType === "income") {
      form.setValue("note", ""); 
    }
  }, [transactionType, form, transactionToEdit]);


  const onSubmit = async (data: TransactionFormValues) => {
    if (!currentUser || !familyId) { 
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const formattedDate = format(data.date, "yyyy-MM-dd");
    const monthYear = formattedDate.substring(0,7);

    const transactionBasePayload = {
      description: data.description,
      amount: data.amount,
      date: formattedDate,
      type: data.type,
      categoryId: data.categoryId,
      monthYear: monthYear,
      performedBy: data.performedBy, 
      note: data.type === 'expense' ? data.note : undefined,
    };
    
    try {
      if (transactionToEdit) {
        const payloadForUpdate: Transaction = {
            ...transactionBasePayload,
            id: transactionToEdit.id,
            userId: familyId, 
        };
        await updateTransaction(payloadForUpdate);
        toast({ title: "Thành công!", description: "Đã cập nhật giao dịch." });
      } else {
        const payloadForAdd: Transaction = {
            ...transactionBasePayload,
            id: crypto.randomUUID(), 
            userId: familyId, 
        };
        await addTransaction(payloadForAdd);
        toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });
      }
      
      if (!transactionToEdit) { 
        form.reset({
            description: "",
            amount: 0,
            date: new Date(),
            type: "expense",
            categoryId: "",
            performedBy: currentUser || undefined,
            note: "",
        });
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error submitting transaction form:", error);
       toast({ title: "Lỗi", description: error.message || "Có lỗi xảy ra khi lưu giao dịch.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6 p-1">
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Loại giao dịch</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("categoryId", "", {shouldValidate: true}); 
                    }}
                    value={field.value} 
                    className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
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
          
          <FormField
            control={form.control}
            name="performedBy"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Người thực hiện</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                    disabled={isSubmitting || !!transactionToEdit} // Disable if editing
                  >
                    {FAMILY_MEMBERS.map((member) => (
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
        </div>
        
        {transactionType === 'expense' && (
           <AiCategorySuggestor
             onCategorySelect={(categoryId) => form.setValue('categoryId', categoryId, { shouldValidate: true })}
             transactionType={transactionType}
             currentDescription={currentDescription} 
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isSubmitting}
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
        
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> 
                        : transactionToEdit ? "Cập Nhật Giao Dịch" : "Thêm Giao Dịch"}
            </Button>
            {onCancel && ( 
                 <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={onCancel} disabled={isSubmitting}>
                    Hủy
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}
