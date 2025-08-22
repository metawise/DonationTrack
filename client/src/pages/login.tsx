import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import starLogoPath from "@assets/star-blue-digital_1755825777612.png";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const otpSchema = z.object({
  code: z.string().min(6, "Verification code must be 6 digits"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function Login() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const sendOTPMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send verification code');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setEmail(emailForm.getValues("email"));
      setStep("otp");
      toast({
        title: "Verification Code Sent",
        description: `Please check your email ${data.email} for the 6-digit code.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: OTPFormData) => {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: data.code,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid verification code');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login Successful",
        description: `Welcome ${data.user?.firstName || 'back'} to the donation management system.`,
      });
      // Force page reload to trigger auth context refresh
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Verification Code",
        description: error.message || "Please check your code and try again.",
        variant: "destructive",
      });
      otpForm.setError("code", { message: "Invalid verification code" });
    },
  });

  const onEmailSubmit = (data: EmailFormData) => {
    sendOTPMutation.mutate(data);
  };

  const onOTPSubmit = (data: OTPFormData) => {
    verifyOTPMutation.mutate(data);
  };

  const handleBackToEmail = () => {
    setStep("email");
    setEmail("");
    emailForm.reset();
    otpForm.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-jfj-blue/5 to-jfj-blue/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={starLogoPath} 
            alt="Jews for Jesus" 
            className="mx-auto mb-4 h-16 w-16"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Donation Management System
          </h1>
          <p className="text-gray-600">
            Jews for Jesus Staff Portal
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">
              {step === "email" ? "Staff Login" : "Enter Verification Code"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "email" ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Enter your staff email"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-jfj-blue hover:bg-jfj-blue-dark"
                    disabled={sendOTPMutation.isPending}
                  >
                    {sendOTPMutation.isPending ? "Sending..." : "Send Verification Code"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    A 6-digit verification code has been sent to <strong>{email}</strong>
                  </AlertDescription>
                </Alert>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                    <FormField
                      control={otpForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <div className="flex justify-center">
                              <InputOTP maxLength={6} {...field}>
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-jfj-blue hover:bg-jfj-blue-dark"
                      disabled={verifyOTPMutation.isPending}
                    >
                      {verifyOTPMutation.isPending ? "Verifying..." : "Verify & Login"}
                    </Button>
                  </form>
                </Form>

                <div className="text-center space-y-2">
                  <Button variant="ghost" onClick={handleBackToEmail}>
                    Use Different Email
                  </Button>
                  <p className="text-sm text-gray-600">
                    Didn't receive the code? Check your spam folder or try again.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          Need help? Contact IT Support at{" "}
          <a href="mailto:it@jewsforjesus.org" className="text-jfj-blue hover:underline">
            it@jewsforjesus.org
          </a>
        </div>
      </div>
    </div>
  );
}