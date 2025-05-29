
"use client";

import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion"; // Import Radix primitive
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
  AccordionItem, // Keep using AccordionItem
  AccordionContent, // Keep using AccordionContent
} from "@/components/ui/accordion"; // Import only necessary parts from ui/accordion
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
import { CATEGORIES } from "@/lib/constants";
import type { Transaction } from "@/types";
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, User, FileText, StickyNote, Edit3, Trash2, ChevronDown } from "lucide-react"; // Added ChevronDown
import { cn } from "@/lib/utils";


interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string, monthYear: string) => Promise<void>;
  selectedIds: string[];
  onToggleSelect: (transactionId: string) => void;
}

export function TransactionList({ transactions, onEdit, onDelete, selectedIds, onToggleSelect }: TransactionListProps) {
  const [itemToConfirmDelete, setItemToConfirmDelete] = React.useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-card text-card-foreground">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Chưa có giao dịch nào</h3>
        <p className="text-muted-foreground">Hãy thêm giao dịch mới hoặc điều chỉnh bộ lọc để xem kết quả.</p>
      </div>
    );
  }

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId);
  };

  return (
    <TooltipProvider>
      <ScrollArea className="h-[400px] rounded-md border dark:border-gray-700">
        <AccordionPrimitive.Root type="multiple" className="w-full"> {/* Use Radix Root */}
          {transactions.map((transaction) => {
            const category = getCategoryInfo(transaction.categoryId);
            const Icon = category?.icon;
            const isSelected = selectedIds.includes(transaction.id);

            const handleDeleteRequest = (e: React.MouseEvent) => {
              e.stopPropagation();
              setItemToConfirmDelete(transaction);
            };

            const handleCancelDeleteDialog = (e?: React.MouseEvent) => {
              e?.stopPropagation();
              setItemToConfirmDelete(null);
            };

            const handleDeleteConfirmation = async (e: React.MouseEvent) => {
              e.stopPropagation();
              if (itemToConfirmDelete) {
                await onDelete(itemToConfirmDelete.id, itemToConfirmDelete.monthYear);
              }
              setItemToConfirmDelete(null);
            };
            
            const triggerContent = (
              <>
                {/* Mobile optimized view for trigger content */}
                <div className="flex items-center sm:hidden w-full space-x-2 flex-grow mr-2"> {/* mr-2 for chevron space */}
                  <div className="flex flex-col w-full space-y-1 ml-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium truncate pr-2 flex-1">{transaction.description}</span>
                      <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center">
                        {Icon && <Icon className="h-3.5 w-3.5 mr-1" />}
                        <span>{category?.name || transaction.categoryId}</span>
                      </div>
                        <div className="flex items-center">
                          <User className="h-3.5 w-3.5 mr-1" />
                          {transaction.performedBy || 'Không rõ'}
                        </div>
                    </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}
                      </div>
                  </div>
                </div>

                {/* Desktop view for trigger content */}
                <div className="hidden sm:flex w-full flex-grow items-center mr-2"> {/* mr-2 for chevron space */}
                  <Table className="w-full table-fixed"> 
                    <TableBody>
                      <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-none">
                        <TableCell className="font-medium w-[30%] truncate text-left py-3 px-2"> 
                          <Tooltip>
                              <TooltipTrigger asChild><span className="block truncate">{transaction.description}</span></TooltipTrigger>
                              <TooltipContent><p>{transaction.description}</p></TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="w-[17%] text-left py-3 px-2">
                          {category && Icon ? (
                            <div className="flex items-center">
                              <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
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
                        <TableCell className="w-[12%] text-left py-3 px-2">{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                        <TableCell className="w-[12%] text-left py-3 px-2">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                className={`${transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-700 dark:text-green-100 dark:border-green-500' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-700 dark:text-red-100 dark:border-red-500'} hover:opacity-90`}>
                            {transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[10%] text-left py-3 pl-2 pr-1">
                          <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-muted-foreground"/>
                              {transaction.performedBy || 'Không rõ'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[4%] text-right py-3 pl-1 pr-0"> 
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-data-[state=open]/accordionitem:opacity-100 group-hover/accordionitem:opacity-100 focus-within/accordionitem:opacity-100 transition-opacity">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(transaction);}}>
                                            <Edit3 className="h-3.5 w-3.5"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Sửa</p></TooltipContent>
                                </Tooltip>
                                <AlertDialog>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <RadixAlertDialogTrigger asChild onClick={handleDeleteRequest}>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive">
                                                  <Trash2 className="h-3.5 w-3.5"/>
                                              </Button>
                                          </RadixAlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Xóa</p></TooltipContent>
                                  </Tooltip>
                                   {/* AlertDialogContent moved to ensure it's not improperly nested during open state */}
                                </AlertDialog>
                            </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </>
            );

            return (
              <AccordionItem value={transaction.id} key={transaction.id} className="border-b dark:border-gray-700 group/accordionitem">
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
                    <AccordionPrimitive.Trigger asChild className="w-full p-0 rounded-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none">
                      <div
                        className={cn(
                          "flex flex-1 items-center justify-between py-3 pl-0 pr-2 text-left font-medium cursor-pointer hover:no-underline focus:outline-none w-full",
                          // "group/trigger" // Use accordionitem group for chevron
                        )}
                      >
                        <div className="flex-grow min-w-0">
                          {triggerContent}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            "group-data-[state=open]/accordionitem:rotate-180" // Rotates based on AccordionItem's state
                          )}
                        />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                </div>
                {itemToConfirmDelete && itemToConfirmDelete.id === transaction.id && (
                    <AlertDialog open={!!itemToConfirmDelete} onOpenChange={(open) => !open && setItemToConfirmDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa giao dịch?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Hành động này không thể hoàn tác. Giao dịch "{transaction.description}" trị giá {transaction.amount.toLocaleString('vi-VN')} VND sẽ bị xóa vĩnh viễn.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleCancelDeleteDialog}>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirmation} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <AccordionContent className="p-4 bg-muted/30 dark:bg-muted/20 text-sm ml-12 sm:ml-16"> 
                  <div className="grid gap-2">
                    <div className="flex items-start">
                        <FileText className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div>
                            <span className="font-semibold">Mô tả đầy đủ:</span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{transaction.description}</p>
                        </div>
                    </div>
                      <div className="sm:hidden"> 
                        <div className="flex items-start mt-1">
                          <div className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0">{category && category.icon && <category.icon className="w-full h-full" />}</div>
                            <div>
                              <span className="font-semibold">Danh mục:</span>
                              <p className="text-muted-foreground">{category?.name || transaction.categoryId}</p>
                          </div>
                        </div>
                        <div className="flex items-start mt-1">
                            <div className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0">
                                {transaction.type === 'income' ? 
                                    <span className="text-green-500 font-bold text-lg leading-none">↑</span> : 
                                    <span className="text-red-500 font-bold text-lg leading-none">↓</span>
                                }
                            </div>
                            <div>
                              <span className="font-semibold">Loại:</span>
                              <p className="text-muted-foreground">{transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}</p>
                          </div>
                        </div>
                      </div>
                    {transaction.note && (
                          <div className="flex items-start mt-1">
                            <StickyNote className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <span className="font-semibold">Ghi chú:</span>
                                <p className="text-muted-foreground whitespace-pre-wrap">{transaction.note}</p>
                            </div>
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground/80 pt-1">ID giao dịch: {transaction.id}</div>
                    <div className="sm:hidden flex items-center justify-end gap-2 mt-2"> 
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(transaction);}}>
                          <Edit3 className="h-4 w-4 mr-1.5"/> Sửa
                      </Button>
                      <AlertDialog>
                          <RadixAlertDialogTrigger asChild onClick={handleDeleteRequest}>
                              <Button variant="outline" size="sm" className="hover:bg-destructive/20 hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-1.5"/> Xóa
                              </Button>
                          </RadixAlertDialogTrigger>
                           {/* Content handled by the per-item AlertDialog instance above */}
                        </AlertDialog>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </AccordionPrimitive.Root>
      </ScrollArea>
    </TooltipProvider>
  );
}
    

    