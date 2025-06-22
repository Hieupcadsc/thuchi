"use client";

import React, { useState } from 'react';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as RadixAlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CATEGORIES, PAYMENT_SOURCE_OPTIONS } from "@/lib/constants";
import type { Transaction, FamilyMember } from "@/types";
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, User, FileText, StickyNote, Edit3, Trash2, ChevronDown, Landmark, Wallet, Coins, CalendarDays, Tag, ArrowRightLeft, TrendingUp, TrendingDown, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string, monthYear: string) => Promise<void>;
  selectedIds: string[];
  onToggleSelect: (transactionId: string) => void;
  isLoading?: boolean;
}

const TransactionCard = ({ 
  transaction, 
  onEdit, 
  onDelete 
}: { 
  transaction: Transaction; 
  onEdit: (transaction: Transaction) => void; 
  onDelete: (transactionId: string, monthYear: string) => void; 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const category = transaction.type === 'income' 
    ? CATEGORIES.find(cat => cat.id === transaction.categoryId)
    : CATEGORIES.find(cat => cat.id === transaction.categoryId);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(transaction.id, transaction.monthYear);
    } finally {
      setIsDeleting(false);
    }
  };

  const isIncome = transaction.type === 'income';
  const cardVariant = isIncome ? 'income' : 'expense';

  return (
    <Card className={cn(
      "modern-card group transition-all duration-200",
      isIncome 
        ? "border-l-4 border-l-green-500 hover:border-l-green-400" 
        : "border-l-4 border-l-red-500 hover:border-l-red-400"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                "p-2 rounded-xl shadow-sm",
                isIncome 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {transaction.description}
                  </h3>
                  <div className={cn(
                    "text-lg font-bold shrink-0",
                    isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {isIncome ? '+' : '-'}{new Intl.NumberFormat('vi-VN', { 
                      style: 'currency', 
                      currency: 'VND',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(transaction.amount)}
                  </div>
                </div>

                {/* Meta Information */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      <span>{format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: vi })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{transaction.performedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {category && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-muted/50 hover:bg-muted"
                      >
                        {category.name}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        transaction.paymentSource === 'bank' 
                          ? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                          : "border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400"
                      )}
                    >
                      {transaction.paymentSource === 'bank' ? (
                        <><Landmark className="h-3 w-3 mr-1" /> Ngân hàng</>
                      ) : (
                        <><Wallet className="h-3 w-3 mr-1" /> Tiền mặt</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover-lift rounded-lg"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Mở menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(transaction)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export function TransactionList({ transactions, onEdit, onDelete, selectedIds, onToggleSelect, isLoading }: TransactionListProps) {
  const [itemToConfirmDelete, setItemToConfirmDelete] = React.useState<Transaction | null>(null);
  const [openAccordionItems, setOpenAccordionItems] = React.useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="modern-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-muted rounded-xl shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded shimmer w-3/4" />
                  <div className="h-3 bg-muted rounded shimmer w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-muted rounded shimmer w-16" />
                    <div className="h-5 bg-muted rounded shimmer w-20" />
                  </div>
                </div>
                <div className="h-6 bg-muted rounded shimmer w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="modern-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chưa có giao dịch nào</h3>
          <p className="text-muted-foreground mb-4">
            Bắt đầu thêm giao dịch đầu tiên của bạn để theo dõi thu chi.
          </p>
          <Button variant="outline" className="hover-lift">
            Thêm giao dịch mới
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className="h-[400px] rounded-md border dark:border-gray-700">
        <AccordionPrimitive.Root 
            type="multiple" 
            className="w-full"
            value={openAccordionItems}
            onValueChange={setOpenAccordionItems}
        >
          {transactions.map((transaction) => {
            const category = CATEGORIES.find(cat => cat.id === transaction.categoryId);
            const CategoryIcon = category?.icon;
            const paymentSourceInfo = PAYMENT_SOURCE_OPTIONS.find(ps => ps.id === transaction.paymentSource);
            const PaymentSourceIcon = paymentSourceInfo?.icon;
            const isSelected = selectedIds.includes(transaction.id);

            const handleDeleteRequest = (e: React.MouseEvent) => {
              e.stopPropagation();
              setItemToConfirmDelete(transaction);
            };
            
            const handleConfirmDeleteDialog = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (itemToConfirmDelete) {
                onDelete(itemToConfirmDelete.id, itemToConfirmDelete.monthYear);
              }
              setItemToConfirmDelete(null);
            };

            const handleCancelDeleteDialog = (e?: React.MouseEvent) => {
                e?.stopPropagation();
                setItemToConfirmDelete(null);
            };
            
            const triggerContent = (
              <div className="w-full min-w-0">
                {/* Mobile Summary View */}
                <div className="flex flex-col space-y-1 p-2 pr-0 sm:hidden">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm truncate pr-2 flex-1">{transaction.description}</span>
                    <span className={`font-semibold text-sm whitespace-nowrap ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground space-x-3">
                    {CategoryIcon && (
                      <div className="flex items-center">
                        <CategoryIcon className="h-3.5 w-3.5 mr-1" />
                        <span className="truncate">{category?.name || transaction.categoryId}</span>
                      </div>
                    )}
                     <div className="flex items-center">
                      <CalendarDays className="h-3.5 w-3.5 mr-1" />
                      <span>{format(parseISO(transaction.date), "dd/MM/yy", { locale: vi })}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block w-full">
                  <Table className="w-full table-fixed">
                    <TableBody>
                      <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-none">
                        <TableCell className="font-medium w-[25%] truncate text-left py-3 px-2">
                          <Tooltip>
                            <TooltipTrigger asChild><span className="block truncate">{transaction.description}</span></TooltipTrigger>
                            <TooltipContent><p>{transaction.description}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="w-[15%] text-left py-3 px-2">
                          {category && CategoryIcon ? (
                            <div className="flex items-center">
                              <CategoryIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                              {category.name}
                            </div>
                          ) : (
                            transaction.categoryId
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-semibold w-[15%] py-3 px-2 ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                        </TableCell>
                        <TableCell className="w-[10%] text-left py-3 px-2">{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                        <TableCell className="w-[10%] text-left py-3 px-2">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                className={`${transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-700 dark:text-green-100 dark:border-green-500' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-700 dark:text-red-100 dark:border-red-500'} hover:opacity-90 text-xs`}>
                            {transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                          </Badge>
                        </TableCell>
                         <TableCell className="w-[10%] text-left py-3 px-2">
                          {PaymentSourceIcon ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center">
                                        <PaymentSourceIcon className="h-4 w-4 mr-1 text-muted-foreground"/>
                                        <span className="truncate">{paymentSourceInfo?.label}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent><p>{paymentSourceInfo?.label}</p></TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="w-[10%] text-left py-3 pl-2 pr-1">
                          <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-muted-foreground"/>
                              {transaction.performedBy || 'Không rõ'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[5%] text-right py-3 pl-1 pr-0">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-data-[state=open]/item:opacity-100 group-hover/item:opacity-100 focus-within/item:opacity-100 transition-opacity">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(transaction);}}>
                                            <Edit3 className="h-3.5 w-3.5"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Sửa</p></TooltipContent>
                                </Tooltip>
                                <RadixAlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" onClick={handleDeleteRequest}>
                                        <Trash2 className="h-3.5 w-3.5"/>
                                    </Button>
                                </RadixAlertDialogTrigger>
                            </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            );

            return (
            <AlertDialog key={transaction.id} open={itemToConfirmDelete?.id === transaction.id} onOpenChange={(open) => !open && setItemToConfirmDelete(null)}>
              <AccordionPrimitive.Item value={transaction.id} className="border-b dark:border-gray-700 group/item">
                <div className="flex items-center w-full hover:bg-muted/50 dark:hover:bg-muted/20 focus-within:bg-muted/50 dark:focus-within:bg-muted/20">
                  <div className="p-3 sm:pl-4 sm:pr-2 sm:py-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(transaction.id)}
                      aria-label={`Chọn giao dịch ${transaction.description}`}
                      className="mt-1 sm:mt-0"
                    />
                  </div>
                  <AccordionPrimitive.Header className="flex flex-1 min-w-0">
                    <AccordionPrimitive.Trigger asChild className={cn(
                        "flex flex-1 items-center justify-between py-0 sm:py-1 text-left font-medium cursor-pointer hover:no-underline focus:outline-none w-full group-data-[state=open]/item:pb-2",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                      )}>
                      <div className="flex flex-grow items-center justify-between w-full min-w-0">
                        <div className="flex-grow min-w-0">{triggerContent}</div>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]/item:rotate-180 mx-2" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                </div>
                
                <AccordionPrimitive.Content className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="px-4 py-3 bg-muted/30 dark:bg-muted/20 sm:pl-16">
                    <div className="space-y-2">
                      
                      <div className="flex items-start py-1">
                        <FileText className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">Mô tả đầy đủ: </span>
                          <span className="text-muted-foreground break-words">{transaction.description}</span>
                        </div>
                      </div>

                      <div className="flex items-start py-1">
                        {CategoryIcon ? <CategoryIcon className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> : <Tag className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">Danh mục: </span>
                          <span className="text-muted-foreground break-words">{category?.name || transaction.categoryId}</span>
                        </div>
                      </div>

                      <div className="flex items-start py-1">
                        <ArrowRightLeft className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">Loại: </span>
                          <span className="text-muted-foreground break-words">{transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}</span>
                        </div>
                      </div>
                     
                      <div className="flex items-start py-1">
                        <Coins className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <span className="font-semibold text-foreground">Số tiền: </span>
                            <span className={`font-medium break-words ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {transaction.type === 'income' ? '+' : '-'}
                                {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                            </span>
                        </div>
                      </div>
                      
                      <div className="flex items-start py-1">
                        <CalendarDays className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">Ngày: </span>
                          <span className="text-muted-foreground break-words">{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start py-1">
                        <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                         <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">Người thực hiện: </span>
                          <span className="text-muted-foreground break-words">{transaction.performedBy || 'Không rõ'}</span>
                        </div>
                      </div>

                      {paymentSourceInfo && (
                           <div className="flex items-start py-1">
                            {PaymentSourceIcon ? <PaymentSourceIcon className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> : <Wallet className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-foreground">Nguồn tiền: </span>
                              <span className="text-muted-foreground break-words">{paymentSourceInfo.label}</span>
                            </div>
                          </div>
                      )}

                      {transaction.note && (
                        <div className="flex items-start py-1">
                            <StickyNote className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="font-semibold text-foreground">Ghi chú: </span>
                                <p className="text-muted-foreground whitespace-pre-wrap break-words">{transaction.note}</p>
                            </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground/80 pt-1">ID: {transaction.id}</div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 pt-3">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(transaction);}} className="w-full sm:w-auto">
                            <Edit3 className="h-4 w-4 mr-1.5"/> Sửa
                        </Button>
                        <RadixAlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto hover:bg-destructive/20 hover:text-destructive" onClick={handleDeleteRequest}>
                                <Trash2 className="h-4 w-4 mr-1.5"/> Xóa
                            </Button>
                        </RadixAlertDialogTrigger>
                      </div>
                    </div>
                  </div>
                </AccordionPrimitive.Content>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa giao dịch?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Giao dịch "{transaction.description}" trị giá {transaction.amount.toLocaleString('vi-VN')} VND sẽ bị xóa vĩnh viễn.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancelDeleteDialog}>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeleteDialog} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AccordionPrimitive.Item>
              </AlertDialog>
            );
          })}
        </AccordionPrimitive.Root>
      </ScrollArea>
    </TooltipProvider>
  );
}
