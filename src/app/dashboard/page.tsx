'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, User } from "lucide-react";
import { METRIC_ICONS, STATUS_COLORS, TYPE_COLORS } from "@/lib/constants";
import { DashboardMetrics, TransactionWithCustomer } from "@shared/schema";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { TransactionDetailModal } from "@/components/modals/transaction-detail-modal";

export default function Dashboard() {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCustomer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const queryClient = useQueryClient();
  const lastSyncTimeRef = useRef<string | null>(null);

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery<{transactions: TransactionWithCustomer[], total: number}>({
    queryKey: ['/api/transactions', 1, 5], // Get first 5 transactions for recent list
    queryFn: async () => {
      const url = new URL('/api/transactions', window.location.origin);
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '5');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
  });

  // Query for sync config to detect when sync completes
  const { data: syncConfig } = useQuery<any>({
    queryKey: ['/api/sync/config'],
    refetchInterval: 60000, // Refetch every 60 seconds (normal interval)
  });
  
  // Detect sync completion and refresh dashboard data
  useEffect(() => {
    if (syncConfig?.lastSyncAt && syncConfig.lastSyncStatus === 'success') {
      // Check if this is a new sync completion
      if (lastSyncTimeRef.current && lastSyncTimeRef.current !== syncConfig.lastSyncAt) {
        // A new sync has completed - invalidate dashboard cache to refresh data
        console.log('🔄 Auto sync completed - refreshing dashboard data');
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      }
      // Update the ref to track this sync time
      lastSyncTimeRef.current = syncConfig.lastSyncAt;
    }
  }, [syncConfig?.lastSyncAt, syncConfig?.lastSyncStatus, queryClient]);

  // Highlight new transactions that were just synced
  const [highlightedTransactions, setHighlightedTransactions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (transactionsResponse?.transactions && syncConfig?.lastSyncAt) {
      const recentTransactions = transactionsResponse.transactions.filter(t => {
        const transactionTime = new Date(t.syncedAt || t.createdAt).getTime();
        const syncTime = new Date(syncConfig.lastSyncAt).getTime();
        const timeDiff = Math.abs(syncTime - transactionTime);
        return timeDiff < 300000; // Within 5 minutes of sync
      });

      if (recentTransactions.length > 0) {
        console.log(`✨ Highlighting ${recentTransactions.length} new transactions`);
        const newHighlighted = new Set(recentTransactions.map(t => t.id));
        setHighlightedTransactions(newHighlighted);

        // Remove highlighting after 10 seconds
        setTimeout(() => {
          setHighlightedTransactions(new Set());
        }, 10000);
      }
    }
  }, [transactionsResponse?.transactions, syncConfig?.lastSyncAt]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleTransactionClick = (transaction: TransactionWithCustomer) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load dashboard metrics.</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to the Jews for Jesus donation management system.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            {METRIC_ICONS.revenue}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalTransactions} donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            {METRIC_ICONS.monthly}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              This month's donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            {METRIC_ICONS.customers}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total registered donors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Donation</CardTitle>
            {METRIC_ICONS.average}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageDonation)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="ml-auto">
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactionsResponse?.transactions && transactionsResponse.transactions.length > 0 ? (
            <div className="space-y-4">
              {transactionsResponse.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-muted/50 ${
                    highlightedTransactions.has(transaction.id) 
                      ? 'bg-blue-50 border-2 border-blue-200 shadow-md' 
                      : ''
                  }`}
                  onClick={() => handleTransactionClick(transaction)}
                  data-testid={`transaction-row-${transaction.id}`}
                >
                  <div className="flex-shrink-0">
                    {transaction.customer ? (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {transaction.customer 
                        ? `${transaction.customer.firstName} ${transaction.customer.lastName}`
                        : 'Anonymous Donor'
                      }
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {formatDate(transaction.createdAt)} • {transaction.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline"
                      className={`${STATUS_COLORS[transaction.status]} ${TYPE_COLORS[transaction.type]} border`}
                    >
                      {transaction.status}
                    </Badge>
                    <div className="text-sm font-medium">
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by syncing with MyWell or creating a donation.
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <Link href="/sync">
                  <Button variant="outline" size="sm">
                    Sync Data
                  </Button>
                </Link>
                <Link href="/create-donation">
                  <Button size="sm">
                    Create Donation
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}