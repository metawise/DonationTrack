import { usePathname } from "next/navigation";
import { Bell, User, Settings, LogOut, Menu } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { StaffProfileModal } from "@/components/modals/staff-profile-modal";
import { useAuth } from "@/contexts/auth-context";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const location = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user, logout } = useAuth();
  
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
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 truncate">{config.title}</h1>
              <p className="text-gray-600 text-sm lg:text-base hidden sm:block">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600">
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
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Staff Profile Modal */}
      {user && (
        <StaffProfileModal
          userId={user.id}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </header>
  );
}
