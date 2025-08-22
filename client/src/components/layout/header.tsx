import { useLocation } from "wouter";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { StaffModal } from "@/components/modals/staff-modal";

export function Header() {
  const [location] = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const currentPage = NAVIGATION_ITEMS.find(item => item.path === location);
  
  const pageConfig = {
    "/": { title: "Dashboard", subtitle: "Overview of donation activity" },
    "/transactions": { title: "Transactions", subtitle: "Manage all donation transactions" },
    "/customers": { title: "Customers", subtitle: "Manage donor records and information" },
    "/staff": { title: "Staff", subtitle: "Manage team members and permissions" },
    "/sync": { title: "Sync Settings", subtitle: "Configure MyWell API synchronization" },
    "/create-donation": { title: "Create Donation", subtitle: "Process manual donations" },
  };
  
  const config = pageConfig[location as keyof typeof pageConfig] || pageConfig["/"];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{config.title}</h1>
            <p className="text-gray-600">{config.subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Bell className="h-5 w-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-jfj-blue text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700">Admin User</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => {
                  // Clear any session storage or local storage if needed
                  sessionStorage.clear();
                  localStorage.clear();
                  // Show logout message and reload after delay
                  alert('Logged out successfully');
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Staff Profile Modal */}
      <StaffModal
        staff={{
          id: "current-staff-id", 
          firstName: "Current", 
          lastName: "Staff", 
          email: "staff@jewsforjesus.org",
          role: "admin",
          phone: null,
          department: null,
          status: "active",
          hireDate: new Date(),
          createdAt: new Date()
        }}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={async (staffData) => {
          try {
            const response = await fetch(`/api/staff/current-staff-id`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(staffData)
            });
            
            if (response.ok) {
              setIsProfileModalOpen(false);
            }
          } catch (error) {
            console.error('Error updating profile:', error);
          }
        }}
      />
    </header>
  );
}
