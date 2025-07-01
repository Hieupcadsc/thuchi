"use client";

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Home, 
  Zap, 
  Droplets, 
  Flame, 
  Thermometer, 
  Lightbulb, 
  Wind, 
  Tv,
  Wifi,
  Lock,
  Camera,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Power,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';

interface UtilityUsage {
  id: string;
  type: 'electricity' | 'water' | 'gas';
  currentUsage: number;
  currentMonthUsage: number;
  lastMonthUsage: number;
  estimatedBill: number;
  unit: string;
  lastUpdated: Date;
}

interface SmartDevice {
  id: string;
  name: string;
  type: 'light' | 'ac' | 'tv' | 'security' | 'other';
  room: string;
  isOnline: boolean;
  isActive: boolean;
  powerConsumption: number;
  settings?: {
    brightness?: number;
    temperature?: number;
    volume?: number;
  };
}

const sampleUtilities: UtilityUsage[] = [
  {
    id: '1',
    type: 'electricity',
    currentUsage: 4.2,
    currentMonthUsage: 285,
    lastMonthUsage: 320,
    estimatedBill: 750000,
    unit: 'kWh',
    lastUpdated: new Date()
  },
  {
    id: '2',
    type: 'water',
    currentUsage: 0.8,
    currentMonthUsage: 18,
    lastMonthUsage: 22,
    estimatedBill: 250000,
    unit: 'm³',
    lastUpdated: new Date()
  },
  {
    id: '3',
    type: 'gas',
    currentUsage: 0.3,
    currentMonthUsage: 12,
    lastMonthUsage: 15,
    estimatedBill: 180000,
    unit: 'm³',
    lastUpdated: new Date()
  }
];

const sampleDevices: SmartDevice[] = [
  {
    id: '1',
    name: 'Đèn phòng khách',
    type: 'light',
    room: 'Phòng khách',
    isOnline: true,
    isActive: true,
    powerConsumption: 12,
    settings: { brightness: 80 }
  },
  {
    id: '2',
    name: 'Điều hòa phòng ngủ',
    type: 'ac',
    room: 'Phòng ngủ',
    isOnline: true,
    isActive: false,
    powerConsumption: 0,
    settings: { temperature: 26 }
  }
];

export function SmartHomeWidget() {
  const [utilities, setUtilities] = useState<UtilityUsage[]>(sampleUtilities);
  const [devices, setDevices] = useState<SmartDevice[]>(sampleDevices);
  const [activeTab, setActiveTab] = useState('utilities');

  const totalPowerConsumption = useMemo(() =>
    devices.filter(d => d.isActive).reduce((sum, device) => sum + device.powerConsumption, 0),
    [devices]
  );

  const totalEstimatedBill = useMemo(() =>
    utilities.reduce((sum, utility) => sum + utility.estimatedBill, 0),
    [utilities]
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case 'electricity': return <Zap className="h-4 w-4" />;
      case 'water': return <Droplets className="h-4 w-4" />;
      case 'gas': return <Flame className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  const getUtilityColor = (type: string) => {
    switch (type) {
      case 'electricity': return 'text-yellow-600 bg-yellow-100';
      case 'water': return 'text-blue-600 bg-blue-100';  
      case 'gas': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light': return <Lightbulb className="h-4 w-4" />;
      case 'ac': return <Wind className="h-4 w-4" />;
      case 'tv': return <Tv className="h-4 w-4" />;
      case 'security': return <Camera className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  const toggleDevice = (deviceId: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { 
            ...device, 
            isActive: !device.isActive,
            powerConsumption: !device.isActive ? 
              (device.type === 'ac' ? 800 : device.type === 'tv' ? 150 : 12) : 0
          }
        : device
    ));
  };

  const getUsageComparison = (current: number, last: number) => {
    const diff = ((current - last) / last) * 100;
    return {
      percentage: Math.abs(diff).toFixed(1),
      isIncrease: diff > 0,
      isSignificant: Math.abs(diff) > 10
    };
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Home className="h-5 w-5 text-green-500" />
            Smart Home
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Power className="h-3 w-3 mr-1" />
              {totalPowerConsumption}W
            </Badge>
            <Badge variant="outline" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              {formatCurrency(totalEstimatedBill)}/tháng
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Thiết bị hoạt động</p>
            <p className="text-lg font-bold text-green-700">
              {devices.filter(d => d.isActive).length}/{devices.length}
            </p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Tiêu thụ hiện tại</p>
            <p className="text-lg font-bold text-blue-700">{totalPowerConsumption}W</p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 font-medium">Hóa đơn ước tính</p>
            <p className="text-lg font-bold text-orange-700">
              {formatCurrency(totalEstimatedBill)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="utilities">Tiện ích</TabsTrigger>
            <TabsTrigger value="devices">Thiết bị</TabsTrigger>
          </TabsList>

          <TabsContent value="utilities" className="space-y-4 mt-4">
            {utilities.map((utility) => {
              const comparison = getUsageComparison(utility.currentMonthUsage, utility.lastMonthUsage);
              return (
                <Card key={utility.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", getUtilityColor(utility.type))}>
                          {getUtilityIcon(utility.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm capitalize">
                            {utility.type === 'electricity' ? 'Điện' : 
                             utility.type === 'water' ? 'Nước' : 'Gas'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Hôm nay: {utility.currentUsage} {utility.unit}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {comparison.isIncrease ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                          <span className={cn(
                            "text-xs font-medium",
                            comparison.isIncrease ? "text-red-600" : "text-green-600"
                          )}>
                            {comparison.percentage}%
                          </span>
                        </div>
                        <p className="text-sm font-bold">
                          {formatCurrency(utility.estimatedBill)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tháng này: {utility.currentMonthUsage} {utility.unit}</span>
                        <span>Tháng trước: {utility.lastMonthUsage} {utility.unit}</span>
                      </div>
                      
                      <Progress 
                        value={(utility.currentMonthUsage / (utility.lastMonthUsage * 1.2)) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="devices" className="space-y-4 mt-4">
            {devices.map((device) => (
              <Card key={device.id} className={cn(
                "border-l-4 transition-all",
                device.isActive ? "border-l-green-500 bg-green-50/30" : "border-l-gray-300"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        device.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                      )}>
                        {getDeviceIcon(device.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{device.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {device.room} • {device.powerConsumption}W
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={device.isOnline ? "default" : "destructive"} 
                        className="text-xs"
                      >
                        {device.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                      <Switch
                        checked={device.isActive}
                        onCheckedChange={() => toggleDevice(device.id)}
                        disabled={!device.isOnline}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 