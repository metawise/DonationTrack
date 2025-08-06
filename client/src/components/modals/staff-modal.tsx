import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building, Calendar, UserCheck } from "lucide-react";
import { Staff, insertStaffSchema } from "@shared/schema";
import { STAFF_STATUS_COLORS, STAFF_ROLE_COLORS, DEPARTMENTS, STAFF_ROLES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface StaffModalProps {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "view" | "create" | "edit";
}

type StaffFormData = z.infer<typeof insertStaffSchema>;

export function StaffModal({ staff, isOpen, onClose, mode }: StaffModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<StaffFormData>({
    resolver: zodResolver(insertStaffSchema),
    defaultValues: {
      firstName: staff?.firstName || "",
      lastName: staff?.lastName || "",
      email: staff?.email || "",
      phone: staff?.phone || "",
      role: staff?.role || "staff",
      department: staff?.department || "",
      status: staff?.status || "active",
      hireDate: staff?.hireDate ? new Date(staff.hireDate) : new Date(),
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const response = await apiRequest('POST', '/api/staff', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff Member Created",
        description: "The new staff member has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Unable to create staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const response = await apiRequest('PUT', `/api/staff/${staff?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff Member Updated",
        description: "The staff member has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Unable to update staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormData) => {
    if (mode === "create") {
      createStaffMutation.mutate(data);
    } else if (mode === "edit") {
      updateStaffMutation.mutate(data);
    }
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

  const getTitle = () => {
    switch (mode) {
      case "create":
        return "Add New Staff Member";
      case "edit":
        return "Edit Staff Member";
      case "view":
        return "Staff Member Details";
      default:
        return "";
    }
  };

  if (mode === "view" && staff) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Staff Info */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-600" />
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

            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Email</div>
                    <div className="text-sm text-gray-900">{staff.email}</div>
                  </div>
                </div>
                {staff.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div className="text-sm text-gray-900">{staff.phone}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Work Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Work Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Department</div>
                    <div className="text-sm text-gray-900">{staff.department || "Not assigned"}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Hire Date</div>
                    <div className="text-sm text-gray-900">{formatDate(staff.hireDate)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
                className="bg-jfj-blue hover:bg-jfj-blue-dark"
              >
                {createStaffMutation.isPending || updateStaffMutation.isPending
                  ? "Saving..."
                  : mode === "create"
                  ? "Create Staff Member"
                  : "Update Staff Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}