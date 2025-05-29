
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
import { CalendarIcon, Loader2, UploadCloud, AlertTriangle, User, Camera, FileUp } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card"; // Card was missing from imports previously
import { cn } from "@/lib/utils";
import { format, parseISO, parse as parseDateFns, isValid as isValidDate } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import React from "react";
import Image from 'next/image';
import { processBillImage } from '@/app/transactions/billActions';


const formSchema = z.object({
  description: z.string().min(1, "Mô tả không được để trống"),
  amount: z.coerce.number().positive("Số tiền phải là số dương"),
  date: z.date({ required_error: "Ngày không được để trống" }),
  type: z.enum(["income", "expense"], { required_error: "Vui lòng chọn loại giao dịch" }),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  performedBy: z.custom<FamilyMember>((val) => FAMILY_MEMBERS.includes(val as FamilyMember), {
    message: "Vui lòng chọn người thực hiện hợp lệ",
  }),
  note: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess?: () => void;
  transactionToEdit?: Transaction | null;
  onCancel?: () => void;
  isBillMode?: boolean;
}

// Helper function to format number with Vietnamese style separators
const formatVnCurrency = (value: number | string | undefined): string => {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const numString = String(value).replace(/[^\d]/g, '');
  if (numString === '') return '';

  const num = Number(numString);
  if (isNaN(num)) return ''; 

  return num.toLocaleString('vi-VN');
};

// Helper function to parse formatted string back to number
const parseVnCurrencyToNumber = (value: string): number => {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
};


export function TransactionForm({ onSuccess, transactionToEdit, onCancel, isBillMode = false }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currentUser } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [billImagePreview, setBillImagePreview] = React.useState<string | null>(null);
  const [billImageDataUri, setBillImageDataUri] = React.useState<string | null>(null);
  const [isProcessingBill, setIsProcessingBill] = React.useState(false);
  const [billProcessingError, setBillProcessingError] = React.useState<string | null>(null);

  const takePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);

  const defaultPerformedBy = transactionToEdit ? transactionToEdit.performedBy : (currentUser || FAMILY_MEMBERS[0]);

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
      performedBy: currentUser || FAMILY_MEMBERS[0],
      note: "",
    },
  });

  const transactionType = form.watch("type");
  const currentDescription = form.watch("description");
  const [displayAmount, setDisplayAmount] = React.useState<string>('');


  // Initialize displayAmount and sync with RHF value
  React.useEffect(() => {
    const initialAmount = transactionToEdit
      ? Number(transactionToEdit.amount)
      : (form.formState.defaultValues?.amount || 0);
    
    const currentRHFValue = form.getValues('amount');
    if (currentRHFValue !== initialAmount) {
        form.setValue('amount', initialAmount, { shouldValidate: !transactionToEdit }); // Validate only if new or values explicitly differ
    }
    // This will be handled by the watch effect below if RHF value changes
    // For direct initialization:
    setDisplayAmount(formatVnCurrency(initialAmount));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionToEdit, form.formState.defaultValues?.amount]); // form.setValue and form.getValues should ideally not be in dep array if form instance is stable.

  // Watch for changes in RHF 'amount' value (e.g., from AI processing or reset)
  // and update the displayAmount accordingly.
  const watchedAmountFromRHF = form.watch('amount');
  React.useEffect(() => {
    const numericRHFValue = Number(watchedAmountFromRHF);
    if (parseVnCurrencyToNumber(displayAmount) !== numericRHFValue) {
      setDisplayAmount(formatVnCurrency(numericRHFValue));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAmountFromRHF]);


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
      // displayAmount will be updated by the watchedAmountFromRHF effect
      setBillImagePreview(null);
      setBillImageDataUri(null);
      setBillProcessingError(null);
    } else {
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        type: isBillMode ? "expense" : "expense",
        categoryId: "",
        performedBy: currentUser || FAMILY_MEMBERS[0],
        note: "",
      });
       if (!isBillMode) {
        setBillImagePreview(null);
        setBillImageDataUri(null);
        setBillProcessingError(null);
      }
      // displayAmount will be updated by the watchedAmountFromRHF effect
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionToEdit, form.reset, isBillMode, currentUser]);


  React.useEffect(() => {
    if (!transactionToEdit || (transactionToEdit && form.getValues("type") !== transactionToEdit.type)) {
        form.setValue("categoryId", "", { shouldValidate: false });
    }
    if (transactionType === "income" && !isBillMode) {
      form.setValue("note", ""); // Clear note for income if not bill mode
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, transactionToEdit, isBillMode]); // form.setValue/getValues ideally not in dep array

  React.useEffect(() => {
    if (!isBillMode) {
      setBillImagePreview(null);
      setBillImageDataUri(null);
      setBillProcessingError(null);
    } else {
      if (!transactionToEdit) {
        form.setValue("type", "expense", { shouldValidate: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBillMode, transactionToEdit]); // form.setValue ideally not in dep array

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImagePreview(reader.result as string);
        setBillImageDataUri(reader.result as string);
        setBillProcessingError(null);
        if (!transactionToEdit) {
            form.setValue("type", "expense", { shouldValidate: true });
        }
      };
      reader.readAsDataURL(file);
    } else {
      setBillImagePreview(null);
      setBillImageDataUri(null);
    }
    if(event.target) {
        event.target.value = ''; // Reset file input
    }
  };

  const parseAIDate = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    // console.log("[TransactionForm parseAIDate] Attempting to parse AI date string:", dateString);
    const formatsToTry = [
      'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd',
      'dd-MM-yyyy', 'MM-dd-yyyy',
      'd/M/yyyy', 'M/d/yyyy', 'dd.MM.yyyy', 'MM.dd.yyyy',
    ];
    for (const fmt of formatsToTry) {
      try {
        const parsed = parseDateFns(dateString, fmt, new Date());
        if (isValidDate(parsed)) {
          // console.log(`[TransactionForm parseAIDate] Parsed "${dateString}" with format "${fmt}" to:`, parsed);
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    try { // ISO format last attempt
      const parsed = parseISO(dateString);
      if (isValidDate(parsed)) {
        // console.log(`[TransactionForm parseAIDate] Parsed "${dateString}" with ISO to:`, parsed);
        return parsed;
      }
    } catch(e) { /* ignore */ }

    // console.warn(`[TransactionForm parseAIDate] Could not parse date string from AI: "${dateString}"`);
    return undefined;
  };

  const handleProcessBill = async () => {
    if (!billImageDataUri) {
      toast({ title: "Lỗi", description: "Vui lòng chọn ảnh bill để xử lý.", variant: "destructive" });
      return;
    }
    setIsProcessingBill(true);
    setBillProcessingError(null);
    try {
      const result = await processBillImage(billImageDataUri);
      // console.log("[TransactionForm handleProcessBill] AI Result:", result);

      if (result.success && result.data) {
        const { totalAmount, transactionDate, description } = result.data;
        let dateToSet = new Date(); 

        if (totalAmount !== undefined) form.setValue("amount", totalAmount, { shouldValidate: true }); // This will trigger watch to update displayAmount
        if (description) form.setValue("description", description, { shouldValidate: true });

        const parsedDate = parseAIDate(transactionDate);
        if (parsedDate) {
          dateToSet = parsedDate;
        } else if (transactionDate) {
          toast({ title: "Lưu ý ngày tháng", description: `AI trả về ngày: "${transactionDate}". Không thể tự động điền, vui lòng kiểm tra và chọn thủ công. Mặc định là ngày hôm nay.`, variant: "default", duration: 7000 });
        }
        form.setValue("date", dateToSet, { shouldValidate: true });
        // console.log("[TransactionForm handleProcessBill] Date being set to form after AI:", dateToSet);

        if (Object.keys(result.data).length === 0){
            toast({ title: "AI không tìm thấy thông tin", description: "Không thể trích xuất dữ liệu từ bill. Vui lòng nhập thủ công.", variant: "default"});
        } else {
            toast({ title: "Xử lý Bill thành công", description: "Thông tin từ bill đã được điền. Vui lòng kiểm tra và hoàn tất." });
        }
      } else {
        throw new Error(result.error || "AI không thể xử lý bill này.");
      }
    } catch (error: any) {
      console.error("Error processing bill in form:", error);
      setBillProcessingError(error.message || "Lỗi khi xử lý ảnh bill.");
      toast({ title: "Lỗi Xử Lý Bill", description: error.message || "Không thể xử lý ảnh bill vào lúc này.", variant: "destructive" });
    }
    setIsProcessingBill(false);
  };


  const onSubmit = async (data: TransactionFormValues) => {
    if (!currentUser) {
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const formattedDate = format(data.date, "yyyy-MM-dd");
    const finalPerformedBy = transactionToEdit ? data.performedBy : currentUser;


    // console.log("[TransactionForm onSubmit] Data submitted to useAuthStore:", {
    //   description: data.description,
    //   amount: data.amount,
    //   date: formattedDate, 
    //   type: data.type,
    //   categoryId: data.categoryId,
    //   performedBy: finalPerformedBy, 
    //   note: data.type === 'expense' ? data.note : undefined,
    // });

    try {
      if (transactionToEdit) {
        const payloadForUpdate: Transaction = {
            id: transactionToEdit.id,
            userId: transactionToEdit.userId, 
            description: data.description,
            amount: data.amount,
            date: formattedDate,
            type: data.type,
            categoryId: data.categoryId,
            monthYear: formattedDate.substring(0,7), 
            performedBy: data.performedBy, 
            note: data.type === 'expense' ? data.note : undefined,
        };
        await updateTransaction(payloadForUpdate);
      } else {
        await addTransaction({
          description: data.description,
          amount: data.amount,
          date: formattedDate, 
          type: data.type,
          categoryId: data.categoryId,
          performedBy: currentUser, // Always current user for new transactions
          note: data.type === 'expense' ? data.note : undefined,
        });
      }

      if (!transactionToEdit) { // Only reset fully if it was a new transaction
        form.reset({
            description: "",
            amount: 0, // RHF will be 0, displayAmount will be updated by watch
            date: new Date(),
            type: isBillMode ? "expense" : "expense",
            categoryId: "",
            performedBy: currentUser || FAMILY_MEMBERS[0],
            note: "",
        });
        setBillImagePreview(null);
        setBillImageDataUri(null);
        setBillProcessingError(null);
      }
      if (onSuccess) onSuccess();
    } catch (error: any)      {
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
          <Card className="bg-muted/50 dark:bg-muted/30 p-4 border shadow-sm">
            <CardTitle className="text-lg mb-1">Thêm từ Bill</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mb-3">Chụp ảnh hoặc tải lên hóa đơn của bạn.</CardDescription>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={takePhotoInputRef}
                onChange={handleImageChange}
                className="hidden"
                id="take-photo-input"
            />
            <input
                type="file"
                accept="image/*"
                ref={uploadFileInputRef}
                onChange={handleImageChange}
                className="hidden"
                id="upload-file-input"
            />

            <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => takePhotoInputRef.current?.click()}
                    className="w-full sm:flex-1"
                    disabled={isSubmitting || isProcessingBill}
                >
                    <Camera className="mr-2 h-4 w-4" /> Chụp Ảnh
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => uploadFileInputRef.current?.click()}
                    className="w-full sm:flex-1"
                    disabled={isSubmitting || isProcessingBill}
                >
                    <FileUp className="mr-2 h-4 w-4" /> Tải Tệp Lên
                </Button>
            </div>

            {billImagePreview && (
              <div className="mt-3 space-y-3">
                <p className="text-sm font-medium">Xem trước ảnh bill:</p>
                <div className="relative w-full max-w-xs h-auto border rounded-md overflow-hidden aspect-[3/4] mx-auto bg-gray-100 dark:bg-gray-800">
                  <Image src={billImagePreview} alt="Xem trước Bill" layout="fill" objectFit="contain" />
                </div>
                <Button
                  type="button"
                  onClick={handleProcessBill}
                  disabled={isProcessingBill || isSubmitting || !billImageDataUri}
                  className="w-full mt-2"
                >
                  {isProcessingBill ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isProcessingBill ? "Đang xử lý..." : "Xử lý Bill bằng AI"}
                </Button>
              </div>
            )}
            {billProcessingError && (
              <p className="text-sm text-destructive mt-2 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {billProcessingError}</p>
            )}
             <p className="text-xs text-muted-foreground mt-3">
              AI sẽ cố gắng trích xuất thông tin từ ảnh. Vui lòng kiểm tra và chỉnh sửa lại trước khi lưu.
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
                      form.setValue("categoryId", "", {shouldValidate: false});
                    }}
                    value={field.value}
                    className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                    disabled={isSubmitting || (isBillMode && !transactionToEdit)}
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
                {transactionToEdit ? (
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                      disabled={isSubmitting}
                    >
                      {FAMILY_MEMBERS.map((member) => (
                        <FormItem key={member} className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value={member} /></FormControl>
                          <FormLabel className="font-normal">{member}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                ) : (
                  <div className="flex items-center space-x-2 p-2 rounded-md bg-muted/50 dark:bg-muted/30 min-h-[40px]">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{currentUser || 'Không xác định'}</span>
                  </div>
                )}
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
                  <Input placeholder="VD: Ăn tối, Tiền lương tháng 5" {...field} disabled={isSubmitting || isProcessingBill} />
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
                disabled={!transactionType || isSubmitting || isProcessingBill}
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
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    name={field.name}
                    ref={field.ref}
                    value={displayAmount}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const numericValue = parseVnCurrencyToNumber(inputValue);
                      field.onChange(numericValue); 
                      setDisplayAmount(formatVnCurrency(inputValue)); 
                    }}
                    onBlur={(e) => {
                      field.onBlur(); 
                      setDisplayAmount(formatVnCurrency(form.getValues('amount')));
                    }}
                    disabled={isSubmitting || isProcessingBill}
                  />
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
                        disabled={isSubmitting || isProcessingBill}
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
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isSubmitting || isProcessingBill}
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
                    disabled={isSubmitting || isProcessingBill}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              type="submit" 
              className="w-full sm:flex-1" 
              disabled={
                isSubmitting || 
                isProcessingBill || 
                (isBillMode && !transactionToEdit && !billImageDataUri && !form.formState.dirtyFields.amount && !form.formState.dirtyFields.description && !form.formState.dirtyFields.date)
              }
            >
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
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

