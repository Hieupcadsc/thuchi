// src/components/dashboard/FinancialInsights.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { getFinancialAnalysis } from '@/app/dashboard/actions'; // Server Action
import type { AnalyzeSpendingOutput } from '@/ai/flows/analyze-spending-flow';

export function FinancialInsights() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSpendingOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await getFinancialAnalysis();
      if ('error' in result) {
        setError(result.error);
      } else {
        setAnalysisResult(result);
      }
    } catch (e: any) {
      setError(e.message || "Lỗi không xác định khi lấy phân tích.");
    }
    setIsLoading(false);
  };

  const getChangeColor = (changeDesc?: string) => {
    if (!changeDesc) return "text-muted-foreground";
    if (changeDesc.includes("tăng")) return "text-red-500 dark:text-red-400";
    if (changeDesc.includes("giảm")) return "text-green-500 dark:text-green-400";
    return "text-muted-foreground";
  };


  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" /> Phân Tích Tài Chính AI</CardTitle>
                <CardDescription>Nhận thông tin chi tiết và mẹo tài chính từ trợ lý AI.</CardDescription>
            </div>
            <Button onClick={handleGetAnalysis} disabled={isLoading} size="lg">
                {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                <Lightbulb className="mr-2 h-5 w-5" />
                )}
                {isLoading ? "Đang phân tích..." : "Nhận Phân Tích Ngay"}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Lỗi Phân Tích</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysisResult && !error && (
          <div className="space-y-6">
            <Alert variant="default" className="bg-primary/5 dark:bg-primary/10 border-primary/30">
              <CheckCircle className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold text-primary">Tóm Tắt Tổng Quan</AlertTitle>
              <AlertDescription className="text-foreground/90">
                {analysisResult.overallSummary}
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Phân Tích Theo Danh Mục</h3>
              {analysisResult.categoryInsights.length > 0 ? (
                <div className="space-y-4">
                  {analysisResult.categoryInsights.map((item, index) => (
                    <Card key={index} className="bg-card/80 dark:bg-card/50 shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{item.categoryName}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <p><strong>Tháng này:</strong> {item.currentMonthTotal.toLocaleString('vi-VN')} VND</p>
                        {item.previousMonthTotal !== undefined && (
                          <p><strong>Tháng trước:</strong> {item.previousMonthTotal.toLocaleString('vi-VN')} VND</p>
                        )}
                        {item.changeDescription && (
                          <p className={getChangeColor(item.changeDescription)}>
                            <strong>Thay đổi:</strong> {item.changeDescription}
                          </p>
                        )}
                        <p className="text-muted-foreground pt-1 italic">{item.insight}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Không có phân tích chi tiết nào theo danh mục.</p>
              )}
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Mẹo Tài Chính Từ AI</h3>
              {analysisResult.financialTips.length > 0 ? (
                <ul className="list-disc list-inside space-y-2 pl-5 text-foreground/90">
                  {analysisResult.financialTips.map((tip, index) => (
                    <li key={index} className="leading-relaxed">{tip}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">AI chưa có mẹo nào cho bạn lúc này.</p>
              )}
            </div>
          </div>
        )}
        {!isLoading && !analysisResult && !error && (
            <div className="text-center py-8 text-muted-foreground">
                <p>Nhấn nút ở trên để AI bắt đầu phân tích tình hình tài chính của gia đình bạn.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
