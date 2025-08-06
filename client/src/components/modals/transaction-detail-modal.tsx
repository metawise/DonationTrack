import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle, XCircle, Clock, Undo } from "lucide-react";
import { TransactionWithCustomer } from "@shared/schema";
import { STATUS_COLORS, TYPE_COLORS } from "@/lib/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TransactionDetailModalProps {
  transaction: TransactionWithCustomer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, isOpen, onClose }: TransactionDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refundMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest('POST', `/api/transactions/${transactionId}/refund`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Refund Processed",
        description: `Refund of $${data.amount} has been processed successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Refund Failed",
        description: "Unable to process refund. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!transaction) return null;

  const handleRefund = () => {
    if (confirm("Are you sure you want to process a refund for this transaction?")) {
      refundMutation.mutate(transaction.id);
    }
  };

  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "failed":
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Transaction ID</label>
              <div className="text-sm font-mono text-gray-900">{transaction.id}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <div className="text-lg font-semibold text-gray-900">
                {formatAmount(transaction.amount)} {transaction.currency}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <Badge className={TYPE_COLORS[transaction.type as keyof typeof TYPE_COLORS]}>
                {transaction.type === "monthly" ? "Monthly Subscription" : "One-time Donation"}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <Badge className={STATUS_COLORS[transaction.status as keyof typeof STATUS_COLORS]}>
                {getStatusIcon(transaction.status)}
                <span className="ml-1 capitalize">{transaction.status}</span>
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date</label>
              <div className="text-sm text-gray-900">{formatDate(transaction.createdAt)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Designation</label>
              <div className="text-sm text-gray-900">
                {transaction.designation ? transaction.designation.charAt(0).toUpperCase() + transaction.designation.slice(1) + " Fund" : "Not specified"}
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Donor Information</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <div className="text-sm text-gray-900">
                  {transaction.customer.firstName} {transaction.customer.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="text-sm text-gray-900">{transaction.customer.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <div className="text-sm text-gray-900">{transaction.customer.phone || "Not provided"}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Customer ID</label>
                <div className="text-sm font-mono text-gray-900">{transaction.customer.id}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Billing Address */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h4>
            <div className="text-sm text-gray-900 space-y-1">
              <div>{transaction.customer.street1}</div>
              {transaction.customer.street2 && <div>{transaction.customer.street2}</div>}
              <div>
                {transaction.customer.city}, {transaction.customer.state} {transaction.customer.postalCode}
              </div>
              <div>{transaction.customer.country}</div>
            </div>
          </div>

          <Separator />

          {/* Payment Method */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h4>
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-900">
                  Card ending in {transaction.paymentMethodLast4}
                </div>
                {transaction.paymentMethodExpires && (
                  <div className="text-sm text-gray-500">
                    Expires {transaction.paymentMethodExpires}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {transaction.status === "completed" && (
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={refundMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Undo className="h-4 w-4 mr-2" />
                {refundMutation.isPending ? "Processing..." : "Process Refund"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
