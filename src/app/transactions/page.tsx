'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftRight, Search, DollarSign, Calendar, CreditCard, User, ChevronLeft, ChevronRight, Filter, RefreshCw, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { TransactionDetailModal } from "@/components/modals/transaction-detail-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TransactionWithCustomer } from "@shared/schema";

type TransactionsResponse = {
  transactions: TransactionWithCustomer[];
  total: number;
};

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCustomer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [countdown, setCountdown] = useState<string>("");
  const [highlightedTransactions, setHighlightedTransactions] = useState<Set<string>>(new Set());
  const itemsPerPage = 50;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastSyncTimeRef = useRef<string | null>(null);
  const previousTransactionsRef = useRef<TransactionWithCustomer[]>([]);

  // Determine if we need to fetch all data for client-side filtering
  const hasFilters = searchTerm || statusFilter !== "all";

  // Query for sync status and next sync time
  const { data: syncStatus } = useQuery<any>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 60000, // Refetch every 60 seconds to update countdown
  });

  // Query for sync config to detect when sync completes
  const { data: syncConfig } = useQuery<any>({
    queryKey: ['/api/sync/config'],
    refetchInterval: 60000, // Refetch every 60 seconds to detect sync completion
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sync/trigger'),
    onSuccess: () => {
      toast({
        title: "Sync Triggered",
        description: "Transaction sync has been started successfully.",
      });
      // Refetch transactions after sync
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to trigger transaction sync. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Detect sync completion and refresh transaction data
  useEffect(() => {
    if (syncConfig?.lastSyncAt && syncConfig.lastSyncStatus === 'success') {
      // Check if this is a new sync completion
      if (lastSyncTimeRef.current && lastSyncTimeRef.current !== syncConfig.lastSyncAt) {
        // A new sync has completed - invalidate transaction cache to refresh data
        console.log('🔄 Auto sync completed - refreshing transaction data');
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      }
      // Update the ref to track this sync time
      lastSyncTimeRef.current = syncConfig.lastSyncAt;
    }
  }, [syncConfig?.lastSyncAt, syncConfig?.lastSyncStatus, queryClient]);


  // Update countdown timer
  useEffect(() => {
    if (!syncStatus?.nextSyncTime) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const nextSync = new Date(syncStatus.nextSyncTime).getTime();
      const timeLeft = nextSync - now;

      if (timeLeft <= 0) {
        setCountdown("Syncing now...");
        return;
      }

      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [syncStatus?.nextSyncTime]);
  
  const { data: response, isLoading } = useQuery<TransactionsResponse>({
    queryKey: ['/api/transactions', hasFilters ? 'all' : currentPage, hasFilters ? 'all' : itemsPerPage],
    queryFn: async () => {
      const url = new URL('/api/transactions', window.location.origin);
      if (hasFilters) {
        // Fetch all transactions for client-side filtering
        url.searchParams.set('page', '1');
        url.searchParams.set('limit', '1000'); // Large limit to get all data
      } else {
        // Use server-side pagination
        url.searchParams.set('page', currentPage.toString());
        url.searchParams.set('limit', itemsPerPage.toString());
      }
      const res = await fetch(url.toString());
      return res.json();
    },
  });

  const transactions = response?.transactions || [];
  const totalTransactions = response?.total || 0;
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

  // Filter transactions based on search and status
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchTerm || 
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate pagination for filtered results
  const filteredTotalPages = hasFilters ? Math.ceil(filteredTransactions.length / itemsPerPage) : totalPages;
  
  // For server-side pagination (no filters) use original transactions
  // For client-side filtering, paginate the filtered results
  const paginatedTransactions = hasFilters 
    ? filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : transactions;

  // Detect newly added transactions and highlight them
  useEffect(() => {
    if (transactions.length > 0) {
      const previousIds = new Set(previousTransactionsRef.current.map(t => t.id));
      const newTransactionIds = transactions
        .filter(transaction => !previousIds.has(transaction.id))
        .map(transaction => transaction.id);
      
      if (newTransactionIds.length > 0 && previousTransactionsRef.current.length > 0) {
        // Highlight newly added transactions
        setHighlightedTransactions(new Set(newTransactionIds));
        
        // Remove highlights after 5 seconds
        setTimeout(() => {
          setHighlightedTransactions(new Set());
        }, 5000);
        
        console.log(`✨ Highlighting ${newTransactionIds.length} new transactions`);
      }
      
      // Update previous transactions reference
      previousTransactionsRef.current = [...transactions];
    }
  }, [transactions]);

  const formatAmount = (amount: number) => {
    return (amount / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleViewTransaction = (transaction: TransactionWithCustomer) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getKindBadge = (kind: string) => {
    const colors = {
      SALE: "bg-blue-100 text-blue-800",
      DONATION: "bg-purple-100 text-purple-800",
      REFUND: "bg-red-100 text-red-800",
    };
    return (
      <Badge variant="outline" className={colors[kind as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {kind}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ArrowLeftRight className="h-5 w-5 text-jfj-blue" />
          <h1 className="text-2xl font-bold">Transactions</h1>
          <Badge variant="outline">
            {hasFilters 
              ? `${filteredTransactions.length} filtered` 
              : `${totalTransactions} total`}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          {countdown && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Next auto-sync: {countdown}</span>
            </div>
          )}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            size="sm"
            className="flex items-center space-x-2"
            data-testid="button-sync-transactions"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Now'}</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transaction Records</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <TableRow 
                  key={transaction.id}
                  className={`transition-all duration-1000 ease-in-out ${
                    highlightedTransactions.has(transaction.id) 
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 shadow-md animate-pulse' 
                      : ''
                  }`}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">
                          {transaction.customer 
                            ? `${transaction.customer.firstName} ${transaction.customer.lastName}`
                            : "Unknown Customer"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.customer?.email || transaction.emailAddress || "No email"}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          TX: {transaction.id.length > 16 
                            ? `${transaction.id.substring(0, 8)}...${transaction.id.substring(transaction.id.length - 8)}`
                            : transaction.id}
                        </div>
                        {transaction.paymentMethod && (
                          <div className="text-xs text-gray-400 font-mono">
                            PM: {transaction.paymentMethod}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getKindBadge(transaction.kind)}
                      <span className="text-xs text-gray-500">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                      <span className="font-medium">
                        {formatAmount(transaction.amount)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(transaction.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewTransaction(transaction)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">
                      {hasFilters
                        ? "No transactions match your search criteria."
                        : "No transactions found."}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {(hasFilters ? filteredTransactions.length > itemsPerPage : totalTransactions > itemsPerPage) && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                {hasFilters 
                  ? `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} to ${Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of ${filteredTransactions.length} filtered transactions`
                  : `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, totalTransactions)} to ${Math.min(currentPage * itemsPerPage, totalTransactions)} of ${totalTransactions} transactions`
                }
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, hasFilters ? filteredTotalPages : totalPages) }, (_, i) => {
                    const page = Math.max(1, currentPage - 2) + i;
                    const maxPages = hasFilters ? filteredTotalPages : totalPages;
                    if (page > maxPages) return null;
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= (hasFilters ? filteredTotalPages : totalPages)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransaction(null);
        }}
      />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}