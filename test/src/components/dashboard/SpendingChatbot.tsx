
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For displaying multi-line answers
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MessageCircleQuestion, Sparkles, AlertTriangle, Send } from 'lucide-react';
import { askSpendingChatbot } from '@/app/dashboard/chatbotActions'; // Server Action
import type { ChatWithSpendingOutput } from '@/ai/flows/chat-with-spending-flow';
import { ScrollArea } from '../ui/scroll-area';

interface ChatMessage {
  type: 'user' | 'ai';
  text: string;
}

export function SpendingChatbot() {
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const newQuestion: ChatMessage = { type: 'user', text: question };
    setChatHistory(prev => [...prev, newQuestion]);
    setQuestion(''); // Clear input
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await askSpendingChatbot(newQuestion.text);
      if ('error' in result) {
        setError(result.error);
        setChatHistory(prev => [...prev, {type: 'ai', text: `Lỗi: ${result.error}`}]);
      } else {
        setChatHistory(prev => [...prev, {type: 'ai', text: result.answer}]);
      }
    } catch (e: any) {
      const errorMessage = e.message || "Lỗi không xác định khi gửi câu hỏi.";
      setError(errorMessage);
      setChatHistory(prev => [...prev, {type: 'ai', text: `Lỗi: ${errorMessage}`}]);
    }
    setIsLoading(false);
  };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center"><MessageCircleQuestion className="mr-2 h-6 w-6 text-primary" /> Trợ Lý Chi Tiêu AI</CardTitle>
        <CardDescription>Hỏi AI về chi tiêu của gia đình trong tháng này. Ví dụ: "Tháng này nhà mình ăn ngoài hết bao nhiêu?"</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[200px] w-full rounded-md border p-3 space-y-3 bg-muted/30">
          {chatHistory.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-10">Chưa có tin nhắn nào. Hãy đặt câu hỏi cho AI!</p>
          )}
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-2.5 rounded-lg shadow ${
                msg.type === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card text-card-foreground border'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && chatHistory[chatHistory.length -1]?.type === 'user' && (
             <div className="flex justify-start">
                <div className="max-w-[80%] p-2.5 rounded-lg shadow bg-card text-card-foreground border">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            </div>
          )}
        </ScrollArea>
        
        {error && !isLoading && ( // Show persistent error if last AI response was an error
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmitQuestion} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Nhập câu hỏi của bạn..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading || !question.trim()} size="icon">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Gửi</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
