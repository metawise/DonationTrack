"use client"

import { ProtectedRoute } from "@/components/auth/protected-route";
import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Clock, CheckCircle, AlertCircle, Calendar, Database, Settings, Play, StopCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SyncConfig {
  id: string;
  name: string;
  isActive: boolean;
  syncFrequencyMinutes: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  totalRecordsSynced: number;
  createdAt: string;
  updatedAt: string;
}

export default function SyncPage() {
  const [manualSyncStartDate, setManualSyncStartDate] = useState("");
  const [manualSyncEndDate, setManualSyncEndDate] = useState("");
  const [newSyncFrequency, setNewSyncFrequency] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: syncConfig, isLoading } = useQuery<SyncConfig>({
    queryKey: ['/api/sync/config'],
  });

  const manualSyncMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const response = await apiRequest('POST', '/api/sync/mywell', { startDate, endDate });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Completed",
        description: `Successfully synced ${data.totalSynced} transactions.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync transactions from MyWell API.",
        variant: "destructive",
      });
    },
  });

  const updateFrequencyMutation = useMutation({
    mutationFn: async (syncFrequencyMinutes: number) => {
      const response = await apiRequest('PUT', '/api/sync/config', { syncFrequencyMinutes });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Frequency Updated",
        description: "Sync frequency has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/config'] });
      setNewSyncFrequency("");
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update sync frequency.",
        variant: "destructive",
      });
    },
  });

  const handleManualSync = () => {
    if (!manualSyncStartDate || !manualSyncEndDate) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    
    manualSyncMutation.mutate({
      startDate: manualSyncStartDate,
      endDate: manualSyncEndDate,
    });
  };

  const handleUpdateFrequency = () => {
    const frequency = parseInt(newSyncFrequency);
    if (!frequency || frequency < 1) {
      toast({
        title: "Invalid Frequency",
        description: "Please enter a valid frequency in minutes (minimum 1).",
        variant: "destructive",
      });
      return;
    }

    updateFrequencyMutation.mutate(frequency);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Run</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const getFrequencyText = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>MyWell API Sync Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-jfj-blue" />
              MyWell API Sync Management
            </CardTitle>
            <Badge className={syncConfig?.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {syncConfig?.isActive ? <Play className="h-3 w-3 mr-1" /> : <StopCircle className="h-3 w-3 mr-1" />}
              {syncConfig?.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Last Sync</Label>
              <div className="text-sm font-medium">{formatDate(syncConfig?.lastSyncAt || null)}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Status</Label>
              <div>{getStatusBadge(syncConfig?.lastSyncStatus || null)}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Total Synced</Label>
              <div className="text-sm font-medium">{syncConfig?.totalRecordsSynced || 0} transactions</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">Frequency</Label>
              <div className="text-sm font-medium flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {getFrequencyText(syncConfig?.syncFrequencyMinutes || 60)}
              </div>
            </div>
          </div>

          {syncConfig?.lastSyncError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <div className="text-sm font-medium text-red-800">Last Sync Error:</div>
              </div>
              <div className="text-sm text-red-700 mt-1">{syncConfig.lastSyncError}</div>
            </div>
          )}

          <Separator />

          {/* Manual Sync */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Settings className="h-4 w-4 mr-2 text-jfj-blue" />
              <h3 className="text-lg font-medium">Manual Sync</h3>
            </div>
            <p className="text-sm text-gray-600">
              Manually sync transactions from MyWell API for a specific date range. This will import all transactions within the selected period.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={manualSyncStartDate}
                  onChange={(e) => setManualSyncStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={manualSyncEndDate}
                  onChange={(e) => setManualSyncEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleManualSync}
              disabled={manualSyncMutation.isPending}
              className="bg-jfj-blue hover:bg-jfj-blue-dark"
            >
              {manualSyncMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Manual Sync
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Sync Frequency Settings */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-jfj-blue" />
              <h3 className="text-lg font-medium">Sync Frequency</h3>
            </div>
            <p className="text-sm text-gray-600">
              Configure how often the system automatically syncs with MyWell API. Changes take effect immediately.
            </p>
            
            <div className="flex items-end space-x-3">
              <div className="space-y-2 flex-1">
                <Label htmlFor="frequency">Frequency (minutes)</Label>
                <Input
                  id="frequency"
                  type="number"
                  min="1"
                  placeholder={String(syncConfig?.syncFrequencyMinutes || 60)}
                  value={newSyncFrequency}
                  onChange={(e) => setNewSyncFrequency(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleUpdateFrequency}
                disabled={updateFrequencyMutation.isPending || !newSyncFrequency}
                variant="outline"
              >
                {updateFrequencyMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              Common values: 15 (every 15 min), 60 (hourly), 240 (every 4 hours), 1440 (daily)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-jfj-blue" />
            MyWell API Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">API Endpoint</Label>
              <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded mt-1">
                https://dev-api.mywell.io/api/transaction/gift/search
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Sync Limit</Label>
              <div className="text-sm text-gray-600 mt-1">500 transactions per request (with pagination)</div>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Description</Label>
            <p className="text-sm text-gray-600 mt-1">
              The system automatically syncs donation transactions from MyWell payment processor. 
              Transactions are stored locally and mapped to customer records for efficient dashboard operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </MainLayout>
    </ProtectedRoute>
  );
}