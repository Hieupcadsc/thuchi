"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  X, 
  Send, 
  Plus, 
  Search, 
  Bot,
  User,
  Sparkles,
  Coffee
} from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuth';
import { FAMILY_ACCOUNT_ID } from '@/lib/constants';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'transaction' | 'suggestion';
  transactionData?: any;
}

interface ChatBotProps {
  className?: string;
}

export function ChatBot({ className }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Chào chị vợ! Anh là Bot Quản Gia - chuyên canh gác ví chồng và... troll vợ 😏\n\nChị có thể:\n• Khai báo chi tiêu: 'ăn bánh 10k' hoặc 'trà sữa 25k'\n• Ghi ngày cụ thể: 'ăn bánh ngày 2.6'\n• Kiểm tra tiền: 'kiểm tra số dư'\n• Xem báo cáo: 'tóm tắt tháng này'\n\nNhưng anh cảnh báo trước: anh sẽ troll chị về mọi khoản chi tiêu đấy! 🤭💸\n\nChồng đã uỷ quyền cho anh rồi nè! 😂",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          familyId: FAMILY_ACCOUNT_ID,
          performedBy: currentUser,
          chatHistory: messages.slice(-5) // Gửi 5 tin nhắn gần nhất để có context
        }),
      });

      const data = await response.json();

      if (data.success) {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'bot',
          timestamp: new Date(),
          type: data.type || 'text',
          transactionData: data.transactionData
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // ✅ OPTIMIZATION: Nếu có transaction data, không cần reload page
        // Store đã được update optimistically bởi API chatbot
        if (data.transactionData) {
          console.log("✅ Chatbot transaction saved - using optimistic update, no page reload");
        }
      } else {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Ối dồi ơi! Anh bị lag rồi 😅 Em thử lại sau nhé, hoặc có thể anh đang bận cà khịa ai đó khác 🤪",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { label: "Ăn bánh 10k", action: "ăn bánh 10k" },
    { label: "Trà sữa bank 25k", action: "trà sữa bank 25k" },
    { label: "Sáng phở 30k chiều bún 25k", action: "sáng ăn phở 30k chiều ăn bún 25k" },
    { label: "Kiểm tra số dư", action: "kiểm tra số dư" }
  ];

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn("fixed bottom-8 right-4 z-50", className)}>
      {/* Chat Interface */}
      {isOpen && (
        <Card className="absolute bottom-32 sm:bottom-28 right-0 w-80 sm:w-96 h-[480px] shadow-2xl border-0 bg-gradient-to-br from-white via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 mb-4 max-h-[calc(100vh-160px)]">
          {/* Header - ĐẸP ĐẸP XÍU */}
          <div className="relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 opacity-0 animate-pulse"></div>
            
            <div className="relative flex items-center justify-between p-4 border-b border-white/20 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                    <Bot className="h-6 w-6 drop-shadow-lg" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-bounce shadow-lg">
                    <div className="w-2 h-2 bg-green-200 rounded-full absolute top-0.5 left-0.5 animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg drop-shadow-md">Bot Quản Gia</h3>
                  <p className="text-sm opacity-90 drop-shadow-sm">Chuyên gia troll vợ & canh gác ví chồng 😏</p>
                </div>
              </div>
              <Button
                onClick={toggleChat}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-full transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <X className="h-5 w-5 drop-shadow-lg" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 h-[320px]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    message.sender === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                    message.sender === 'user' 
                      ? "bg-blue-500 text-white" 
                      : "bg-gradient-primary text-white"
                  )}>
                    {message.sender === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-2 max-w-full",
                    message.sender === 'user'
                      ? "bg-blue-500 text-white ml-2"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-2"
                  )}>
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    {message.transactionData && (
                      <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-800 dark:text-green-200">
                          ✅ Đã thêm giao dịch: {message.transactionData.description}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-300">
                          {new Intl.NumberFormat('vi-VN').format(message.transactionData.amount)}đ
                        </p>
                      </div>
                    )}
                    <p className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary text-white flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 mr-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-1">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setInputMessage(action.action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Nhập tin nhắn..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-primary hover:opacity-90 text-white h-10 w-10 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Floating Button - TO TO ĐẸP ĐẸP XÍU */}
      <div className="relative">
        {/* Outer glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 opacity-30 blur-lg animate-pulse scale-125"></div>
        
        <Button
          onClick={toggleChat}
          className={cn(
            "relative h-20 w-20 rounded-full shadow-2xl hover-lift border-0 text-white transition-all duration-500",
            "hover:scale-125 active:scale-95 overflow-hidden group",
            "bg-gradient-to-br from-purple-500 via-pink-500 to-red-500",
            "hover:from-purple-400 hover:via-pink-400 hover:to-red-400",
            "before:absolute before:inset-0 before:rounded-full before:bg-white before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-10",
            isOpen && "scale-110"
          )}
        >
          {/* Rotating background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-30 transition-all duration-500 animate-spin-slow"></div>
          
          <div className="relative z-10 flex items-center justify-center">
            {isOpen ? (
              <X className="h-8 w-8 drop-shadow-lg transition-all duration-300" />
            ) : (
              <>
                <MessageSquare className="h-8 w-8 drop-shadow-lg transition-all duration-300" />
                {/* Online indicator - BIGGER */}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-3 border-white shadow-lg animate-bounce">
                  <Coffee className="h-3 w-3 text-white absolute top-1 left-1" />
                </div>
              </>
            )}
          </div>
          
          {/* Multiple sparkle effects */}
          <div className="absolute inset-0 pointer-events-none">
            <Sparkles className="absolute top-2 left-2 h-4 w-4 text-yellow-200 animate-pulse" />
            <Sparkles className="absolute bottom-2 right-2 h-3 w-3 text-yellow-200 animate-pulse [animation-delay:0.3s]" />
            <Sparkles className="absolute top-2 right-2 h-2 w-2 text-yellow-300 animate-pulse [animation-delay:0.6s]" />
            <Sparkles className="absolute bottom-2 left-2 h-3 w-3 text-yellow-100 animate-pulse [animation-delay:0.9s]" />
          </div>
          
          {/* Ripple effect on hover */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 scale-0 group-hover:scale-100 transition-all duration-500"></div>
        </Button>
        
        {/* Floating notification badge */}
        {!isOpen && (
          <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-bounce border-2 border-white">
            !
          </div>
        )}
      </div>
    </div>
  );
}
