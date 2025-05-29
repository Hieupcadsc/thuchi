
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CATEGORIES } from "@/lib/constants";
import type { Transaction } from "@/types";
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, User, FileText, StickyNote } from "lucide-react";


interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-card text-card-foreground">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Chưa có giao dịch nào</h3>
        <p className="text-muted-foreground">Hãy thêm giao dịch mới để bắt đầu theo dõi chi tiêu.</p>
      </div>
    );
  }

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId);
  };

  return (
    <TooltipProvider>
      <ScrollArea className="h-[400px] rounded-md border">
        <Accordion type="multiple" className="w-full">
          {transactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map((transaction) => {
            const category = getCategoryInfo(transaction.categoryId);
            const Icon = category?.icon;
            return (
              <AccordionItem value={transaction.id} key={transaction.id} className="border-b">
                <AccordionTrigger className="w-full hover:no-underline focus:no-underline py-0">
                  <Table className="w-full">
                    <TableBody>
                      <TableRow className="hover:bg-transparent border-none">
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
                        <TableCell className={`text-right font-semibold w-[120px] py-3 px-2 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                        </TableCell>
                        <TableCell className="w-[100px] text-left py-3 px-2">{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                        <TableCell className="w-[100px] text-left py-3 px-2">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                 className={`${transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'} hover:opacity-90`}>
                            {transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[120px] text-left py-3 pl-2 pr-4">
                          <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-muted-foreground"/>
                              {transaction.performedBy || 'Không rõ'}
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-muted/50">
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
    </TooltipProvider>
  );
}

