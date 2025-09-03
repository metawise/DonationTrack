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
import { Search, Eye, Edit, Trash2, Plus, User } from "lucide-react";
import { Staff } from "@shared/schema";
import { STAFF_STATUS_COLORS, STAFF_ROLE_COLORS } from "@/lib/constants";
import { StaffModal } from "@/components/modals/staff-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function StaffPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "create" | "edit">("view");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: staff, isLoading } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await apiRequest('DELETE', `/api/staff/${staffId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff Member Deleted",
        description: "The staff member has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Unable to delete staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleView = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleEdit = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedStaff(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleDelete = (staffMember: Staff) => {
    if (confirm(`Are you sure you want to delete ${staffMember.firstName} ${staffMember.lastName}?`)) {
      deleteStaffMutation.mutate(staffMember.id);
    }
  };

  const filteredStaff = staff?.filter(staffMember => {
    const matchesSearch = searchTerm === "" || 
      staffMember.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staffMember.department && staffMember.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === "all" || staffMember.role === roleFilter;
    const matchesStatus = statusFilter === "all" || staffMember.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Staff Management</CardTitle>
            <Button onClick={handleCreate} className="bg-jfj-blue hover:bg-jfj-blue-dark">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                className="w-64 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hire Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
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
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-8 w-24" />
                      </td>
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No staff members found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staffMember) => (
                    <tr key={staffMember.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {staffMember.firstName} {staffMember.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{staffMember.email}</div>
                            <div className="text-sm text-gray-400">{staffMember.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {staffMember.department || "Not assigned"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={STAFF_ROLE_COLORS[staffMember.role as keyof typeof STAFF_ROLE_COLORS]}>
                          {getRoleLabel(staffMember.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={STAFF_STATUS_COLORS[staffMember.status as keyof typeof STAFF_STATUS_COLORS]}>
                          {staffMember.status.charAt(0).toUpperCase() + staffMember.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(staffMember.hireDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-jfj-blue hover:text-jfj-blue-dark"
                            onClick={() => handleView(staffMember)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => handleEdit(staffMember)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(staffMember)}
                            disabled={deleteStaffMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <StaffModal
        staff={selectedStaff}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
      />
    </div>
    </MainLayout>
    </ProtectedRoute>
  );
}