"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CategorySelector } from "./CategorySelector";
import { AiCategorySuggestor } from "./AiCategorySuggestor";
import { useAuthStore } from "@/hooks/useAuth";
import { FAMILY_MEMBERS, PAYMENT_SOURCE_OPTIONS } from '@/lib/constants';
import type { Transaction, FamilyMember, PaymentSource } from "@/types";
import { CalendarIcon, Loader2, PlusCircle, XCircle, Camera, FileUp, UploadCloud, AlertTriangle } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
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
  performedBy: z.enum(FAMILY_MEMBERS as [FamilyMember, ...FamilyMember[]], {
    required_error: "Vui lòng chọn người thực hiện",
  }),
  paymentSource: z.enum(['cash', 'bank'], {
    required_error: "Vui lòng chọn nguồn tiền",
    invalid_type_error: "Vui lòng chọn một trong hai: tiền mặt hoặc ngân hàng",
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

const formatVnCurrency = (value: number | string | undefined): string => {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const numString = String(value).replace(/[^\d]/g, '');
  if (numString === '') return '';
  const num = Number(numString);
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

const parseVnCurrencyToNumber = (value: string): number => {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
};

export function TransactionForm({ onSuccess, transactionToEdit, onCancel, isBillMode = false }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currentUser } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayAmount, setDisplayAmount] = useState<string>('');
  const [billImagePreview, setBillImagePreview] = useState<string | null>(null);
  const [billImageDataUri, setBillImageDataUri] = useState<string | null>(null);
  const [isProcessingBill, setIsProcessingBill] = useState(false);
  const [billProcessingError, setBillProcessingError] = useState<string | null>(null);

  const takePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);
  const [shouldAutoTriggerCategorySuggestion, setShouldAutoTriggerCategorySuggestion] = useState(false);



  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
      description: transactionToEdit.description,
      amount: Number(transactionToEdit.amount),
      date: parseISO(transactionToEdit.date),
      type: transactionToEdit.type,
      categoryId: transactionToEdit.categoryId,
      performedBy: transactionToEdit.performedBy,
      paymentSource: transactionToEdit.paymentSource || 'cash', // Default cash nếu không có
      note: transactionToEdit.note || "",
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: "",
      performedBy: currentUser || FAMILY_MEMBERS[0],
      paymentSource: 'cash', // Mặc định là tiền mặt cho cả income và expense
      note: "",
    },
  });

  const transactionType = form.watch("type");
  const currentDescription = form.watch("description");

  useEffect(() => {
    const initialAmount = transactionToEdit
      ? Number(transactionToEdit.amount)
      : (form.formState.defaultValues?.amount || 0);
    setDisplayAmount(formatVnCurrency(initialAmount));
  }, [transactionToEdit, form.formState.defaultValues?.amount]);

  const watchedAmountFromRHF = form.watch('amount');
  useEffect(() => {
    const numericRHFValue = Number(watchedAmountFromRHF);
    if (parseVnCurrencyToNumber(displayAmount) !== numericRHFValue) {
      setDisplayAmount(formatVnCurrency(numericRHFValue));
    }
  }, [watchedAmountFromRHF, displayAmount]);

  useEffect(() => {
    if (!transactionToEdit || (transactionToEdit && form.getValues("type") !== transactionToEdit.type)) {
        form.setValue("categoryId", "", { shouldValidate: false });
    }
    if (transactionType === "income") {
      form.setValue("note", "");
      // Chỉ gợi ý, không tự động thay đổi nếu user đã chọn
      const currentPaymentSource = form.getValues("paymentSource");
      if (!currentPaymentSource) {
        form.setValue("paymentSource", "cash"); // Chỉ set nếu chưa có gì
      }
    }
     }, [transactionType, transactionToEdit, form]);

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
            form.setValue("paymentSource", "bank", { shouldValidate: true }); // Bill thường là expense từ bank
        }
      };
      reader.readAsDataURL(file);
    } else {
      setBillImagePreview(null);
      setBillImageDataUri(null);
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const parseAIDate = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    const formatsToTry = [
      'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd',
      'dd-MM-yyyy', 'MM-dd-yyyy',
      'd/M/yyyy', 'M/d/yyyy', 'dd.MM.yyyy', 'MM.dd.yyyy',
    ];
    for (const fmt of formatsToTry) {
      try {
        const parsed = parseDateFns(dateString, fmt, new Date());
        if (isValidDate(parsed)) return parsed;
      } catch (e) { /* ignore */ }
    }
    try {
      const parsed = parseISO(dateString);
      if (isValidDate(parsed)) return parsed;
    } catch(e) { /* ignore */ }
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
      if (result.success && result.data) {
        const { totalAmount, transactionDate, description, note } = result.data;
        let dateToSet = new Date();
        if (totalAmount !== undefined) form.setValue("amount", totalAmount, { shouldValidate: true });
        if (description) form.setValue("description", description, { shouldValidate: true });
        if (note) form.setValue("note", note, { shouldValidate: true });
        const parsedDate = parseAIDate(transactionDate);
        if (parsedDate) {
          dateToSet = parsedDate;
        } else if (transactionDate) {
          toast({ title: "Lưu ý ngày tháng", description: `AI trả về ngày: "${transactionDate}". Không thể tự động điền, vui lòng kiểm tra và chọn thủ công. Mặc định là ngày hôm nay.`, variant: "default", duration: 7000 });
        }
        form.setValue("date", dateToSet, { shouldValidate: true });
        // Nếu là expense thì default bank, nếu income thì cash
        const currentType = form.getValues("type");
        form.setValue("paymentSource", currentType === "income" ? "cash" : "bank", { shouldValidate: true });
        if (result.warning) {
          toast({ title: "⚠️ Cảnh báo AI", description: result.warning, variant: "default", duration: 8000 });
        } else if (Object.keys(result.data).length === 0){
            toast({ title: "AI không tìm thấy thông tin", description: "Không thể trích xuất dữ liệu từ bill. Vui lòng nhập thủ công.", variant: "default"});
        } else {
            toast({ title: "✅ Xử lý Bill thành công", description: "Thông tin từ bill đã được điền. AI sẽ tự động gợi ý danh mục." });
            // Auto-trigger category suggestion sau khi process bill thành công
            setShouldAutoTriggerCategorySuggestion(true);
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

    try {
      if (transactionToEdit) {
        const payloadForUpdate: Transaction = {
            id: transactionToEdit.id,
            familyId: transactionToEdit.familyId,
            description: data.description,
            amount: data.amount,
            date: formattedDate,
            type: data.type,
            categoryId: data.categoryId,
            monthYear: formattedDate.substring(0,7),
            performedBy: data.performedBy,
            paymentSource: data.paymentSource,
            note: data.type === 'expense' ? data.note : undefined,
        };
        await updateTransaction(payloadForUpdate);
      } else {
        const addPayload = {
          description: data.description,
          amount: data.amount,
          date: formattedDate,
          type: data.type,
          categoryId: data.categoryId,
          performedBy: currentUser,
          paymentSource: data.paymentSource,
          note: data.type === 'expense' ? data.note : undefined,
        };
        await addTransaction(addPayload);
      }

      if (!transactionToEdit) {
        form.reset({
            description: "",
            amount: 0,
            date: new Date(),
            type: "expense",
            categoryId: "",
            performedBy: currentUser || FAMILY_MEMBERS[0],
            paymentSource: 'cash', // Mặc định là tiền mặt
            note: "",
        });
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
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
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-6"
                    disabled={isSubmitting}
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="income" /></FormControl>
                      <FormLabel className="font-normal">Thu nhập</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="expense" /></FormControl>
                      <FormLabel className="font-normal">Chi tiêu</FormLabel>
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
                    className="flex space-x-6"
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentSource"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>
                  Nguồn tiền 
                  {transactionType === "income" && (
                    <span className="text-xs text-emerald-600 ml-2 font-medium">
                      (Thu nhập khuyến khích dùng tiền mặt)
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value || 'cash'} // Đảm bảo luôn có giá trị
                    className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                    disabled={isSubmitting}
                  >
                    {PAYMENT_SOURCE_OPTIONS.map((source) => (
                      <FormItem key={source.id} className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value={source.id} /></FormControl>
                        <source.icon className="mr-1 h-4 w-4 text-muted-foreground" />
                        <FormLabel className="font-normal">{source.label}</FormLabel>
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

        {/* Bill Processing Section */}
        {!transactionToEdit && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-700 dark:text-blue-300">Xử Lý Bill Bằng AI</CardTitle>
              </div>
              <CardDescription className="text-sm text-muted-foreground mb-4">
                Chụp ảnh hoặc tải lên bill để AI tự động điền thông tin giao dịch
              </CardDescription>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => takePhotoInputRef.current?.click()}
                  disabled={isSubmitting || isProcessingBill}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Chụp Bill
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => uploadFileInputRef.current?.click()}
                  disabled={isSubmitting || isProcessingBill}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Tải Ảnh Lên
                </Button>
              </div>

              {billImagePreview && (
                <div className="space-y-3">
                  <div className="relative max-w-xs mx-auto">
                    <Image
                      src={billImagePreview}
                      alt="Bill Preview"
                      width={200}
                      height={200}
                      className="rounded-lg border border-border object-cover"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleProcessBill}
                    disabled={isSubmitting || isProcessingBill}
                    className="w-full btn-enhanced gradient-bg-primary text-white hover:shadow-lg transition-all duration-300"
                  >
                    {isProcessingBill ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Xử Lý Bill Bằng AI
                      </>
                    )}
                  </Button>
                  
                  {billProcessingError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700 dark:text-red-300">{billProcessingError}</span>
                    </div>
                  )}
                </div>
              )}
              
              <input
                ref={takePhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />
              
              <input
                ref={uploadFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </Card>
        )}

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
                    disabled={isSubmitting}
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
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        field.onChange(new Date(e.target.value));
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </FormControl>
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

        {/* AI Category Suggestion - Hiển thị sau khi có description */}
        {currentDescription && transactionType && !transactionToEdit && (
          <AiCategorySuggestor
            onCategorySelect={(categoryId) => form.setValue("categoryId", categoryId, { shouldValidate: true })}
            transactionType={transactionType}
            currentDescription={currentDescription}
            autoTrigger={shouldAutoTriggerCategorySuggestion}
            onAutoTriggerComplete={() => setShouldAutoTriggerCategorySuggestion(false)}
          />
        )}

        {/* Manual Category Selection - Fallback nếu AI không gợi ý được */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                Danh mục
                {currentDescription && !transactionToEdit && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Hoặc chọn thủ công nếu AI không gợi ý được)
                  </span>
                )}
              </FormLabel>
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

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
            <Button
              type="submit"
              className="w-full sm:flex-1 btn-enhanced gradient-bg-success text-white hover:shadow-lg transition-all duration-300 h-12 text-lg font-semibold"
              disabled={isSubmitting}
            >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                <span className="animate-pulse-soft">Đang lưu...</span>
              </>
            ) : (
              <>
                {transactionToEdit ? (
                  <>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Cập Nhật Giao Dịch
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Thêm Giao Dịch
                  </>
                )}
              </>
            )}
            </Button>
            {onCancel && (
                 <Button 
                   type="button" 
                   variant="outline" 
                   className="w-full sm:flex-1 btn-enhanced border-2 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-all duration-300 h-12 text-lg" 
                   onClick={onCancel} 
                   disabled={isSubmitting}
                 >
                    <XCircle className="mr-2 h-4 w-4" />
                    Hủy
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}
