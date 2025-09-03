"use client"

import { ProtectedRoute } from "@/components/auth/protected-route";
import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Building, HandHeart, RefreshCw } from "lucide-react";
import { createTransactionSchema, CreateTransactionPayload } from "@shared/schema";
import { DONATION_AMOUNTS, DESIGNATIONS, COUNTRIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CreateDonation() {
  const [donationType, setDonationType] = useState<"one-time" | "monthly">("one-time");
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [paymentMethod, setPaymentMethod] = useState<"credit-card" | "bank">("credit-card");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateTransactionPayload>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "one-time",
      kind: "donation",
      amount: 25,
      emailAddress: "",
      billingAddress: {
        firstName: "",
        lastName: "",
        street1: "",
        street2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
        email: "",
        phone: "",
      },
      paymentMethod: {
        currencyType: "USD",
        displayName: "Credit Card",
        token: "temp-token",
      },
      description: "",
      clientType: "manual",
    },
  });

  const createDonationMutation = useMutation({
    mutationFn: async (data: CreateTransactionPayload) => {
      const response = await apiRequest('POST', '/api/v1/transaction', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Donation Processed Successfully",
        description: `Transaction ${data.id} has been created for $${data.amount}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      form.reset();
      setSelectedAmount(25);
    },
    onError: () => {
      toast({
        title: "Donation Failed",
        description: "Unable to process donation. Please check the form and try again.",
        variant: "destructive",
      });
    },
  });

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue('amount', amount);
  };

  const handleCustomAmount = (value: string) => {
    const amount = parseFloat(value) || 0;
    setSelectedAmount(amount);
    form.setValue('amount', amount);
  };

  const handleDonationTypeChange = (type: "one-time" | "monthly") => {
    setDonationType(type);
    form.setValue('type', type);
    form.setValue('description', `${type} donation`);
  };

  const handlePaymentMethodChange = (method: "credit-card" | "bank") => {
    setPaymentMethod(method);
    form.setValue('paymentMethod.displayName', method === "credit-card" ? "Credit Card" : "Bank Transfer");
  };

  const onSubmit = (data: CreateTransactionPayload) => {
    // Sync email addresses
    data.billingAddress.email = data.emailAddress;
    createDonationMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Manual Donation</CardTitle>
          <p className="text-gray-600">Process donations manually for phone or in-person transactions</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Donation Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={donationType === "one-time" ? "default" : "outline"}
                  className={cn(
                    "p-6 h-auto flex flex-col items-center",
                    donationType === "one-time" 
                      ? "bg-jfj-blue text-white border-jfj-blue" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => handleDonationTypeChange("one-time")}
                >
                  <HandHeart className="h-6 w-6 mb-2" />
                  One-time Donation
                </Button>
                <Button
                  type="button"
                  variant={donationType === "monthly" ? "default" : "outline"}
                  className={cn(
                    "p-6 h-auto flex flex-col items-center",
                    donationType === "monthly" 
                      ? "bg-jfj-blue text-white border-jfj-blue" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => handleDonationTypeChange("monthly")}
                >
                  <RefreshCw className="h-6 w-6 mb-2" />
                  Monthly Subscription
                </Button>
              </div>

              {/* Amount Selection */}
              <div className="space-y-4">
                <FormLabel>Choose donation amount</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {DONATION_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={selectedAmount === amount ? "default" : "outline"}
                      className={cn(
                        "p-4 font-medium",
                        selectedAmount === amount
                          ? "bg-jfj-blue text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      )}
                      onClick={() => handleAmountSelect(amount)}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-medium text-gray-700 mr-2">$</span>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="25"
                            {...field}
                            value={selectedAmount}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              handleCustomAmount(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Designation */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giving to</FormLabel>
                    <Select onValueChange={(value) => field.onChange(`${donationType} donation - ${value}`)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DESIGNATIONS.map((designation) => (
                          <SelectItem key={designation.value} value={designation.label}>
                            {designation.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Billing Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Billing Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingAddress.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="First Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingAddress.lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Last Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emailAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingAddress.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Phone Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="billingAddress.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingAddress.street1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Street Address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City/Locality *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingAddress.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province *</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingAddress.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP/Postal Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant={paymentMethod === "credit-card" ? "default" : "outline"}
                    className={cn(
                      "w-full p-4 font-medium text-left flex items-center justify-center",
                      paymentMethod === "credit-card"
                        ? "bg-jfj-blue text-white border-jfj-blue"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => handlePaymentMethodChange("credit-card")}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Credit Card
                  </Button>
                  
                  <Button
                    type="button"
                    variant={paymentMethod === "bank" ? "default" : "outline"}
                    className={cn(
                      "w-full p-4 font-medium text-left flex items-center justify-center",
                      paymentMethod === "bank"
                        ? "bg-jfj-blue text-white border-jfj-blue"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => handlePaymentMethodChange("bank")}
                  >
                    <Building className="h-5 w-5 mr-2" />
                    Bank Info
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  className="bg-jfj-blue text-white px-8 py-3 hover:bg-jfj-blue-dark"
                  disabled={createDonationMutation.isPending}
                >
                  {createDonationMutation.isPending ? "Processing..." : "Process Donation"}
                </Button>
              </div>

              {/* Security Notice */}
              <div className="flex items-center justify-center pt-4">
                <div className="flex items-center text-gray-500">
                  <span className="text-sm">Secured by</span>
                  <span className="ml-2 font-semibold text-gray-700">MyWell</span>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </MainLayout>
    </ProtectedRoute>
  );
}
