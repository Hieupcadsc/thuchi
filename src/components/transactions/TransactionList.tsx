
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
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
import { CATEGORIES, FAMILY_MEMBERS } from "@/lib/constants";
import type { Transaction, FamilyMember } from "@/types";
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, User, FileText, StickyNote, Edit3, Trash2, CalendarDays, Tag, ArrowUpDown } from "lucide-react";


interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string, monthYear: string) => Promise<void>;
  selectedIds: string[]; // Added selectedIds
  onToggleSelect: (transactionId: string) => void; // Added onToggleSelect
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
        <Accordion type="multiple" className="w-full">
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

            return (
              <AccordionItem value={transaction.id} key={transaction.id} className="border-b dark:border-gray-700">
                <AccordionTrigger className="w-full hover:no-underline focus:no-underline py-0 group text-left">
                  {/* Mobile optimized view for trigger */}
                  <div className="flex items-start sm:hidden w-full p-3 space-x-2">
                     <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(transaction.id)}
                        onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                        aria-label={`Chọn giao dịch ${transaction.description}`}
                        className="mt-1 flex-shrink-0"
                      />
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

                  {/* Desktop view for trigger */}
                  <div className="hidden sm:block w-full">
                    <Table className="w-full">
                      <TableBody>
                        <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/20 border-none">
                           <TableCell className="w-[5%] py-3 pl-4 pr-1">
                             <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onToggleSelect(transaction.id)}
                                onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                                aria-label={`Chọn giao dịch ${transaction.description}`}
                              />
                           </TableCell>
                          <TableCell className="font-medium w-[28%] truncate text-left py-3 px-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{transaction.description}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{transaction.description}</p>
                                </TooltipContent>
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
                          <TableCell className="w-[10%] text-left py-3 px-2">{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                          <TableCell className="w-[10%] text-left py-3 px-2">
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
                          <TableCell className="w-[5%] text-right py-3 pl-1 pr-4">
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
                                    {itemToConfirmDelete && itemToConfirmDelete.id === transaction.id && (
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
                                    )}
                                  </AlertDialog>
                              </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-muted/50 dark:bg-muted/20 text-sm">
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
                          <Tag className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                           <div>
                              <span className="font-semibold">Danh mục:</span>
                              <p className="text-muted-foreground">{category?.name || transaction.categoryId}</p>
                          </div>
                        </div>
                        <div className="flex items-start mt-1">
                           <ArrowUpDown className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
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
                          <AlertDialogTrigger asChild onClick={handleDeleteRequest}>
                              <Button variant="outline" size="sm" className="hover:bg-destructive/20 hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-1.5"/> Xóa
                              </Button>
                          </AlertDialogTrigger>
                           {itemToConfirmDelete && itemToConfirmDelete.id === transaction.id && (
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
                           )}
                        </AlertDialog>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </TooltipProvider>
  );
}

