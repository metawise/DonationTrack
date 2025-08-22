import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, User } from "lucide-react";
import { METRIC_ICONS, STATUS_COLORS, TYPE_COLORS } from "@/lib/constants";
import { DashboardMetrics, TransactionWithCustomer } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";
import { TransactionDetailModal } from "@/components/modals/transaction-detail-modal";

export default function Dashboard() {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCustomer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery<{transactions: TransactionWithCustomer[], total: number}>({
    queryKey: ['/api/transactions', 1, 100], // Get first 100 transactions
  });
  
  const recentTransactions = transactionsResponse?.transactions?.slice(0, 5) || [];

  const handleViewTransaction = (transaction: TransactionWithCustomer) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMetricChange = (metricKey: string) => {
    // Mock percentage changes for demo
    const changes = {
      totalDonations: "+12%",
      activeSubscribers: "+8%", 
      thisMonth: "+15%",
      avgDonation: "+3%"
    };
    return changes[metricKey as keyof typeof changes] || "+0%";
  };

  return (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24 mb-4" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          Object.entries(metrics || {}).map(([key, value]) => {
            const Icon = METRIC_ICONS[key as keyof typeof METRIC_ICONS];
            const metricLabels = {
              totalDonations: "Total Donations",
              activeSubscribers: "Active Subscribers", 
              thisMonth: "This Month",
              avgDonation: "Avg Donation"
            };
            const iconColors = {
              totalDonations: "text-green-600 bg-green-100",
              activeSubscribers: "text-jfj-blue bg-blue-100",
              thisMonth: "text-purple-600 bg-purple-100", 
              avgDonation: "text-orange-600 bg-orange-100"
            };

            return (
              <Card key={key}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {metricLabels[key as keyof typeof metricLabels]}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {key === 'totalDonations' || key === 'thisMonth' || key === 'avgDonation' 
                          ? formatCurrency(value)
                          : value.toLocaleString()
                        }
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconColors[key as keyof typeof iconColors]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-green-600 text-sm font-medium">
                      {getMetricChange(key)}
                    </span>
                    <span className="text-gray-600 text-sm"> from last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-jfj-blue hover:text-jfj-blue-dark">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactionsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full mr-4" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </td>
                    </tr>
                  ))
                ) : (
                  recentTransactions?.map((transaction) => (
                    <tr 
                      key={transaction.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewTransaction(transaction)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.customer.firstName} {transaction.customer.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.customer.email}
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${(transaction.amount / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={TYPE_COLORS[transaction.type as keyof typeof TYPE_COLORS]}>
                          {transaction.type === "monthly" ? "Monthly" : "One-time"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(transaction.createdAt)}</div>
                        <div className="text-sm text-gray-500">{formatTime(transaction.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={STATUS_COLORS[transaction.status as keyof typeof STATUS_COLORS]}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
