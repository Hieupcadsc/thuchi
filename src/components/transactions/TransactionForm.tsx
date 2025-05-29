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
  onCancel?: () => void; // Added for closing form
}

export function TransactionForm({ onSuccess, transactionToEdit, onCancel }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currentUser, familyId } = useAuthStore(); 
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultPerformedBy = transactionToEdit ? transactionToEdit.performedBy : currentUser || undefined;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
      ...transactionToEdit,
      date: parseISO(transactionToEdit.date), 
      amount: Number(transactionToEdit.amount), 
      performedBy: transactionToEdit.performedBy,
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: "",
      note: "",
      performedBy: currentUser || undefined, // Set based on logged-in user for new transactions
    },
  });

  const transactionType = form.watch("type");
  const currentDescription = form.watch("description"); // For AI suggestor

  React.useEffect(() => {
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
    // Only reset category if it's a new transaction or type changed while editing
    if (!transactionToEdit || (transactionToEdit && form.getValues("type") !== transactionToEdit.type)) {
        form.setValue("categoryId", "", { shouldValidate: true });
    }
    if (transactionType === "income") {
      form.setValue("note", ""); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, form]); // Removed transactionToEdit from deps to avoid loop on edit


  const onSubmit = async (data: TransactionFormValues) => {
    if (!currentUser || !familyId) { 
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const formattedDate = format(data.date, "yyyy-MM-dd");
    const monthYear = formattedDate.substring(0,7);

    const transactionPayload: Omit<Transaction, 'id' | 'userId'> & { id?: string; userId?: string } = {
      ...data,
      date: formattedDate,
      monthYear: monthYear,
      note: data.type === 'expense' ? data.note : undefined,
      performedBy: data.performedBy, // Ensure performedBy from form is used
    };
    
    try {
      if (transactionToEdit) {
        const payloadForUpdate: Transaction = {
            ...transactionPayload,
            id: transactionToEdit.id,
            userId: transactionToEdit.userId, // Keep original userId (FAMILY_ACCOUNT_ID)
            performedBy: data.performedBy, // Allow changing performedBy on edit
        };
        await updateTransaction(payloadForUpdate);
        toast({ title: "Thành công!", description: "Đã cập nhật giao dịch." });
      } else {
        // For new transactions, userId should be familyId, performedBy is from form
        const payloadForAdd: Transaction = {
            ...transactionPayload,
            id: crypto.randomUUID(), // Generate new ID for new transaction
            userId: familyId, // Always use FAMILY_ACCOUNT_ID for new transactions
            performedBy: data.performedBy, // This comes from the form selector
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
            note: "",
            performedBy: currentUser || undefined,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Loại giao dịch</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("categoryId", "", {shouldValidate: true}); // Reset category on type change
                  }}
                  value={field.value} 
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
        
        {/* Performed By Field - Always visible */}
        <FormField
          control={form.control}
          name="performedBy"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Người thực hiện</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
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
             // Pass current description for AI suggestions
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
        
        <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> 
                        : transactionToEdit ? "Cập Nhật Giao Dịch" : "Thêm Giao Dịch"}
            </Button>
            {(transactionToEdit || onCancel) && ( // Show cancel if editing or if onCancel prop is provided
                 <Button type="button" variant="outline" className="flex-1" onClick={onCancel || (() => form.reset())} disabled={isSubmitting}>
                    Hủy
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}
