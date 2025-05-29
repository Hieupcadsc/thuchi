
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
import { CATEGORIES } from "@/lib/constants";
import type { Transaction } from "@/types";
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, User } from "lucide-react"; 


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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mô tả</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Người thực hiện</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map((transaction) => {
              const category = getCategoryInfo(transaction.categoryId);
              const Icon = category?.icon;
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <span>{transaction.description}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{transaction.description}</p>
                        </TooltipContent>
                      </Tooltip>
                  </TableCell>
                  <TableCell>
                    {category && Icon ? (
                      <div className="flex items-center">
                        <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                        {category.name}
                      </div>
                    ) : (
                      transaction.categoryId
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {new Intl.NumberFormat('vi-VN').format(transaction.amount)} ₫
                  </TableCell>
                  <TableCell>{format(parseISO(transaction.date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} 
                           className={transaction.type === 'income' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}>
                      {transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground"/>
                        {transaction.performedBy || 'Không rõ'}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {transaction.note ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <span>{transaction.note}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs whitespace-normal">{transaction.note}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/70">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </TooltipProvider>
  );
}
