
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
import { CalendarIcon, Loader2, UploadCloud, Image as ImageIcon, AlertTriangle } from "lucide-react"; // Added UploadCloud, ImageIcon
import { cn } from "@/lib/utils";
import { format, parseISO, parse as parseDateFns } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; 
import React from "react";
import Image from 'next/image'; // For previewing image

// Server action for bill processing (will be created later)
// import { processBillImage } from '@/app/transactions/billActions'; 


const formSchema = z.object({
  description: z.string().min(1, "Mô tả không được để trống"),
  amount: z.coerce.number().positive("Số tiền phải là số dương"),
  date: z.date({ required_error: "Ngày không được để trống" }),
  type: z.enum(["income", "expense"], { required_error: "Vui lòng chọn loại giao dịch" }),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  // performedBy removed as it's derived from currentUser
  note: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
  transactionToEdit?: Transaction | null;
  onCancel?: () => void; 
  isBillMode?: boolean; // New prop
}

export function TransactionForm({ onSuccess, transactionToEdit, onCancel, isBillMode = false }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currentUser, familyId } = useAuthStore(); 
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [billImagePreview, setBillImagePreview] = React.useState<string | null>(null);
  const [billImageDataUri, setBillImageDataUri] = React.useState<string | null>(null);
  const [isProcessingBill, setIsProcessingBill] = React.useState(false);
  const [billProcessingError, setBillProcessingError] = React.useState<string | null>(null);


  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
      description: transactionToEdit.description,
      amount: Number(transactionToEdit.amount), 
      date: parseISO(transactionToEdit.date), 
      type: transactionToEdit.type,
      categoryId: transactionToEdit.categoryId,
      note: transactionToEdit.note || "",
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: "",
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
        note: transactionToEdit.note || "",
      });
      setBillImagePreview(null); // Clear bill preview if editing
      setBillImageDataUri(null);
    } else {
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        type: "expense",
        categoryId: "",
        note: "",
      });
       if (!isBillMode) { // Clear bill stuff if not in bill mode initially
        setBillImagePreview(null);
        setBillImageDataUri(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionToEdit, form, isBillMode]); // Added isBillMode to reset effect


  React.useEffect(() => {
    if (!transactionToEdit || (transactionToEdit && form.getValues("type") !== transactionToEdit.type)) {
        form.setValue("categoryId", "", { shouldValidate: true });
    }
    if (transactionType === "income" && !isBillMode) { // Only clear note if not bill mode
      form.setValue("note", ""); 
    }
  }, [transactionType, form, transactionToEdit, isBillMode]);
  
  React.useEffect(() => {
    // If switching out of bill mode, clear bill related states
    if (!isBillMode) {
      setBillImagePreview(null);
      setBillImageDataUri(null);
      setBillProcessingError(null);
    }
  }, [isBillMode]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImagePreview(reader.result as string);
        setBillImageDataUri(reader.result as string);
        setBillProcessingError(null);
        // Automatically set type to expense for bill mode
        form.setValue("type", "expense", { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      setBillImagePreview(null);
      setBillImageDataUri(null);
    }
  };

  const handleProcessBill = async () => {
    if (!billImageDataUri) {
      toast({ title: "Lỗi", description: "Vui lòng chọn ảnh bill để xử lý.", variant: "destructive" });
      return;
    }
    setIsProcessingBill(true);
    setBillProcessingError(null);
    try {
      // Placeholder for actual AI processing
      // const result = await processBillImage(billImageDataUri); 
      // For now, simulate AI response after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const simulatedResult = {
        // totalAmount: 125000,
        // transactionDate: "19/07/2024", // Example date format from AI
        // storeName: "Quán Ăn ABC"
      };

      // For testing, let's hardcode some values to prefill
      // In real scenario, use `simulatedResult` or actual `result`
      form.setValue("amount", 12345, { shouldValidate: true }); 
      form.setValue("description", "Thanh toán tại ABC (từ Bill)", { shouldValidate: true });
      
      // Example date parsing (adjust based on AI's actual date output format)
      // if (simulatedResult.transactionDate) {
      //   try {
      //     const parsedDate = parseDateFns(simulatedResult.transactionDate, "dd/MM/yyyy", new Date());
      //     if (isValid(parsedDate)) {
      //       form.setValue("date", parsedDate, { shouldValidate: true });
      //     } else {
      //       toast({ title: "Lưu ý", description: "Không thể tự động điền ngày từ bill, vui lòng chọn thủ công.", variant: "default"});
      //     }
      //   } catch (e) {
      //     toast({ title: "Lưu ý", description: "Lỗi định dạng ngày từ bill, vui lòng chọn thủ công.", variant: "default"});
      //   }
      // }
      // if (simulatedResult.storeName) {
      //   form.setValue("description", `Chi tiêu tại ${simulatedResult.storeName} (từ Bill)`, { shouldValidate: true });
      // }


      toast({ title: "Xử lý Bill (Demo)", description: "Thông tin giả lập đã được điền. Sắp có AI thật!" });
    } catch (error: any) {
      console.error("Error processing bill:", error);
      setBillProcessingError(error.message || "Lỗi khi xử lý ảnh bill.");
      toast({ title: "Lỗi Xử Lý Bill", description: error.message || "Không thể xử lý ảnh bill vào lúc này.", variant: "destructive" });
    }
    setIsProcessingBill(false);
  };


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
      performedBy: currentUser, // Always the current logged-in user
      note: data.type === 'expense' ? data.note : undefined,
    };
    
    try {
      if (transactionToEdit) {
        const payloadForUpdate: Transaction = {
            ...transactionBasePayload,
            id: transactionToEdit.id,
            userId: familyId, 
            performedBy: transactionToEdit.performedBy, // Keep original performer on edit
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
            note: "",
        });
        setBillImagePreview(null); // Clear image preview after successful submission
        setBillImageDataUri(null);
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
        
        {isBillMode && !transactionToEdit && (
          <Card className="bg-muted/50 dark:bg-muted/30 p-4">
            <CardTitle className="text-lg mb-3">Tải Lên Ảnh Bill</CardTitle>
            <FormField
              control={form.control} // This field is not part of formSchema, just for UI
              name="description" // Placeholder, actual image data handled by component state
              render={() => (
                <FormItem>
                  <FormLabel htmlFor="bill-image-upload" className="sr-only">Tải ảnh bill</FormLabel>
                  <FormControl>
                    <Input 
                      id="bill-image-upload"
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="mb-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={isSubmitting || isProcessingBill}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {billImagePreview && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">Xem trước ảnh bill:</p>
                <div className="relative w-full max-w-xs h-auto border rounded-md overflow-hidden aspect-video mx-auto">
                  <Image src={billImagePreview} alt="Xem trước Bill" layout="fill" objectFit="contain" />
                </div>
                <Button 
                  type="button" 
                  onClick={handleProcessBill} 
                  disabled={isProcessingBill || isSubmitting || !billImageDataUri}
                  className="w-full mt-2"
                >
                  {isProcessingBill ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isProcessingBill ? "Đang xử lý..." : "Xử lý Bill (Demo AI)"}
                </Button>
              </div>
            )}
            {billProcessingError && (
              <p className="text-sm text-destructive mt-2 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {billProcessingError}</p>
            )}
             <p className="text-xs text-muted-foreground mt-3">
              Sau khi AI xử lý (demo), thông tin sẽ được điền vào form bên dưới. Bạn có thể chỉnh sửa trước khi lưu.
            </p>
            <hr className="my-4" />
          </Card>
        )}


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
                    disabled={isSubmitting || (isBillMode && !transactionToEdit) } // Disable if bill mode for new transaction
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
          
          <div className="text-sm">
            <span className="font-medium">Người thực hiện: </span>
            <span className="text-muted-foreground">{transactionToEdit ? transactionToEdit.performedBy : currentUser}</span>
          </div>


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
            <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting || isProcessingBill || (isBillMode && !transactionToEdit && !billImageDataUri) }>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> 
                        : transactionToEdit ? "Cập Nhật Giao Dịch" : "Thêm Giao Dịch"}
            </Button>
            {onCancel && ( 
                 <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={onCancel} disabled={isSubmitting || isProcessingBill}>
                    Hủy
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}

