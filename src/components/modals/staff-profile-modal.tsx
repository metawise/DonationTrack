import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building, Calendar } from "lucide-react";
import { insertStaffSchema } from "@shared/schema";
import { STAFF_STATUS_COLORS, STAFF_ROLE_COLORS, DEPARTMENTS, STAFF_ROLES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { z } from "zod";

interface StaffProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

type StaffFormData = z.infer<typeof insertStaffSchema>;

export function StaffProfileModal({ userId, isOpen, onClose }: StaffProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshAuth } = useAuth();

  // Fetch actual staff data by ID
  const { data: staff, isLoading } = useQuery({
    queryKey: ['/api/staff', userId],
    queryFn: async () => {
      const response = await fetch(`/api/staff/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch staff member');
      }
      return response.json();
    },
    enabled: isOpen && !!userId
  });

  const form = useForm<StaffFormData>({
    resolver: zodResolver(insertStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "staff",
      department: "",
      status: "active",
      hireDate: new Date(),
    },
  });

  // Update form when staff data loads
  React.useEffect(() => {
    if (staff) {
      form.reset({
        firstName: staff.firstName || "",
        lastName: staff.lastName || "",
        email: staff.email || "",
        phone: staff.phone || "",
        role: staff.role || "staff",
        department: staff.department || "",
        status: staff.status || "active",
        hireDate: staff.hireDate ? new Date(staff.hireDate) : new Date(),
      });
    }
  }, [staff, form]);

  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const payload = {
        ...data,
        hireDate: data.hireDate instanceof Date ? data.hireDate.toISOString() : data.hireDate
      };
      const response = await apiRequest('PUT', `/api/staff/${userId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff', userId] });
      refreshAuth(); // Refresh auth context with updated data
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Unable to update your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormData) => {
    updateStaffMutation.mutate(data);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "manager":
        return "Manager";
      case "staff":
        return "Staff";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jfj-blue"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!staff) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile Not Found</DialogTitle>
          </DialogHeader>
          <p>Unable to load your profile information.</p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Staff Info Display */}
            <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
              <div className="w-16 h-16 bg-jfj-blue rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {staff.firstName} {staff.lastName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={STAFF_ROLE_COLORS[staff.role as keyof typeof STAFF_ROLE_COLORS]}>
                    {getRoleLabel(staff.role)}
                  </Badge>
                  <Badge className={STAFF_STATUS_COLORS[staff.status as keyof typeof STAFF_STATUS_COLORS]}>
                    {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Personal Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
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
                  name="lastName"
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

              <FormField
                control={form.control}
                name="email"
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Phone Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Work Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Work Information</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STAFF_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
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
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateStaffMutation.isPending}
                className="bg-jfj-blue hover:bg-jfj-blue-dark"
              >
                {updateStaffMutation.isPending ? "Saving..." : "Update Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}