"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Eye, 
  Droplets, 
  Thermometer,
  Umbrella,
  MapPin,
  RefreshCw,
  TrendingUp,
  Lightbulb,
  Coffee,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    visibility: number;
    condition: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
    rainChance: number;
  }>;
}

interface WeatherSuggestion {
  id: string;
  type: 'expense' | 'saving' | 'activity';
  title: string;
  description: string;
  estimatedCost?: number;
  priority: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
}

// Sample weather data - in production, this would come from a weather API
const sampleWeatherData: WeatherData = {
  location: 'TP.HCM, Việt Nam',
  current: {
    temperature: 32,
    feelsLike: 36,
    humidity: 75,
    windSpeed: 12,
    visibility: 8,
    condition: 'Partly cloudy',
    icon: 'partly-cloudy'
  },
  forecast: [
    {
      date: format(new Date(), 'yyyy-MM-dd'),
      high: 34,
      low: 27,
      condition: 'Partly cloudy',
      icon: 'partly-cloudy',
      rainChance: 20
    },
    {
      date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      high: 31,
      low: 25,
      condition: 'Rainy',
      icon: 'rain',
      rainChance: 80
    },
    {
      date: format(new Date(Date.now() + 172800000), 'yyyy-MM-dd'),
      high: 29,
      low: 24,
      condition: 'Heavy rain',
      icon: 'heavy-rain',
      rainChance: 95
    }
  ]
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>(sampleWeatherData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Generate weather-based suggestions
  const weatherSuggestions: WeatherSuggestion[] = [
    {
      id: '1',
      type: 'expense',
      title: 'Mua ô che mưa',
      description: 'Dự báo mưa trong 2 ngày tới, nên chuẩn bị ô',
      estimatedCost: 150000,
      priority: 'medium',
      icon: <Umbrella className="h-4 w-4" />
    },
    {
      id: '2',
      type: 'saving',
      title: 'Tiết kiệm điện điều hòa',
      description: 'Thời tiết mát mẻ, có thể tắt điều hòa tiết kiệm điện',
      estimatedCost: -300000,
      priority: 'high',
      icon: <Wind className="h-4 w-4" />
    },
    {
      id: '3',
      type: 'activity',
      title: 'Uống nước nóng',
      description: 'Thời tiết mưa rét, nên uống đồ nóng để giữ ấm',
      estimatedCost: 50000,
      priority: 'low',
      icon: <Coffee className="h-4 w-4" />
    },
    {
      id: '4',
      type: 'expense',
      title: 'Mua thực phẩm dự trữ',
      description: 'Mưa to có thể khó đi chợ, nên mua trước',
      estimatedCost: 500000,
      priority: 'medium',
      icon: <ShoppingCart className="h-4 w-4" />
    }
  ];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="h-6 w-6 text-yellow-500" />;
      case 'partly-cloudy':
      case 'partly cloudy':
        return <Cloud className="h-6 w-6 text-gray-500" />;
      case 'rain':
      case 'rainy':
        return <CloudRain className="h-6 w-6 text-blue-500" />;
      case 'heavy-rain':
      case 'heavy rain':
        return <CloudRain className="h-6 w-6 text-blue-700" />;
      case 'snow':
        return <CloudSnow className="h-6 w-6 text-blue-200" />;
      default:
        return <Cloud className="h-6 w-6 text-gray-500" />;
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return 'Nắng đẹp';
      case 'partly-cloudy':
      case 'partly cloudy':
        return 'Có mây';
      case 'rain':
      case 'rainy':
        return 'Mưa';
      case 'heavy-rain':
      case 'heavy rain':
        return 'Mưa to';
      case 'snow':
        return 'Tuyết';
      default:
        return condition;
    }
  };

  const getSuggestionColor = (type: string, priority: string) => {
    if (type === 'saving') return 'border-l-green-500 bg-green-50';
    if (priority === 'high') return 'border-l-red-500 bg-red-50';
    if (priority === 'medium') return 'border-l-yellow-500 bg-yellow-50';
    return 'border-l-blue-500 bg-blue-50';
  };

  const refreshWeather = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {getWeatherIcon(weather.current.condition)}
            Thời tiết & Gợi ý
          </CardTitle>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshWeather}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Current Weather */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{weather.location}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">
                  {weather.current.temperature}°
                </span>
                <span className="text-sm text-gray-600">
                  Cảm giác như {weather.current.feelsLike}°
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {getConditionText(weather.current.condition)}
              </p>
            </div>
            
            <div className="text-right space-y-1">
              {getWeatherIcon(weather.current.condition)}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {weather.current.humidity}%
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  {weather.current.windSpeed} km/h
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-day Forecast */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {weather.forecast.map((day, index) => (
            <div key={day.date} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">
                {index === 0 ? 'Hôm nay' : format(new Date(day.date), 'EEE', { locale: vi })}
              </p>
              <div className="flex justify-center mb-1">
                {getWeatherIcon(day.condition)}
              </div>
              <div className="text-sm font-semibold">
                {day.high}° / {day.low}°
              </div>
              {day.rainChance > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mt-1">
                  <Droplets className="h-3 w-3" />
                  {day.rainChance}%
                </div>
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Gợi ý chi tiêu theo thời tiết
        </h4>

        {weatherSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={cn(
              "p-3 rounded-lg border-l-4 transition-all hover:shadow-sm",
              getSuggestionColor(suggestion.type, suggestion.priority)
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div className={cn(
                  "p-1.5 rounded",
                  suggestion.type === 'saving' ? 'bg-green-100 text-green-600' :
                  suggestion.priority === 'high' ? 'bg-red-100 text-red-600' :
                  suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                )}>
                  {suggestion.icon}
                </div>
                
                <div className="flex-1">
                  <h5 className="font-semibold text-sm mb-1">{suggestion.title}</h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Badge 
                  variant={suggestion.type === 'saving' ? 'default' : 'outline'}
                  className="text-xs mb-1"
                >
                  {suggestion.priority === 'high' ? 'Quan trọng' : 
                   suggestion.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                </Badge>
                {suggestion.estimatedCost && (
                  <p className={cn(
                    "text-sm font-semibold",
                    suggestion.estimatedCost > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {suggestion.estimatedCost > 0 ? '+' : ''}
                    {formatCurrency(suggestion.estimatedCost)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Cập nhật lần cuối: {format(lastUpdated, 'HH:mm dd/MM', { locale: vi })}
        </div>
      </CardContent>
    </Card>
  );
} 