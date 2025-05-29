
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CATEGORIES } from "@/lib/constants";
import type { Transaction } from "@/types";
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, User, FileText, StickyNote, Edit3, Trash2 } from "lucide-react";


interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string, monthYear: string) => Promise<void>;
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  // This state is still useful if you want to visually indicate which item is being considered for deletion,
  // or if other parts of the UI need to react to it.
  // However, for the dialog's direct operation, Radix will manage the open state of each individual AlertDialog.
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
        <Accordion type="multiple" className="w-full">
          {transactions.map((transaction) => {
            const category = getCategoryInfo(transaction.categoryId);
            const Icon = category?.icon;

            const handleDeleteRequest = (e: React.MouseEvent) => {
              e.stopPropagation();
              setItemToConfirmDelete(transaction);
              // Radix will open the AlertDialog associated with this trigger.
            };

            const handleCancelDeleteDialog = (e?: React.MouseEvent) => {
              e?.stopPropagation();
              setItemToConfirmDelete(null); // Clear state
              // Radix handles closing the dialog.
            };

            const handleDeleteConfirmation = async (e: React.MouseEvent) => {
              e.stopPropagation();
              await onDelete(transaction.id, transaction.monthYear);
              setItemToConfirmDelete(null); // Clear state after deletion
            };

            return (
              <AccordionItem value={transaction.id} key={transaction.id} className="border-b dark:border-gray-700">
                <AccordionTrigger className="w-full hover:no-underline focus:no-underline py-0 group">
                  <Table className="w-full">
                    <TableBody>
                      <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/20 border-none">
                        <TableCell className="font-medium w-[150px] truncate text-left py-3 pl-4 pr-2">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                 <span>{transaction.description}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{transaction.description}</p>
                              </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="w-[150px] text-left py-3 px-2">
                          {category && Icon ? (
                            <div className="flex items-center">
                              <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                              {category.name}
                            </div>
                          ) : (
                            transaction.categoryId
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-semibold w-[120px] py-3 px-2 ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                        </TableCell>
                        <TableCell className="w-[100px] text-left py-3 px-2">{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                        <TableCell className="w-[100px] text-left py-3 px-2">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                 className={`${transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-700 dark:text-green-100 dark:border-green-500' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-700 dark:text-red-100 dark:border-red-500'} hover:opacity-90`}>
                            {transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[120px] text-left py-3 pl-2 pr-1">
                          <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-muted-foreground"/>
                              {transaction.performedBy || 'Không rõ'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px] text-right py-3 pl-1 pr-4">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(transaction);}}>
                                            <Edit3 className="h-4 w-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Sửa</p></TooltipContent>
                                </Tooltip>
                                
                                <AlertDialog>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild onClick={handleDeleteRequest}>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive">
                                                  <Trash2 className="h-4 w-4"/>
                                              </Button>
                                          </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Xóa</p></TooltipContent>
                                  </Tooltip>
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
                            </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-muted/50 dark:bg-muted/20">
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start">
                        <FileText className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div>
                            <span className="font-semibold">Mô tả đầy đủ:</span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{transaction.description}</p>
                        </div>
                    </div>
                    {transaction.note && (
                         <div className="flex items-start">
                            <StickyNote className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <span className="font-semibold">Ghi chú:</span>
                                <p className="text-muted-foreground whitespace-pre-wrap">{transaction.note}</p>
                            </div>
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground/80">ID giao dịch: {transaction.id}</div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
      {/* The single, shared AlertDialog is no longer needed here */}
    </TooltipProvider>
  );
}
