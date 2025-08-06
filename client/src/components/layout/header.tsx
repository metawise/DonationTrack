import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/lib/constants";

export function Header() {
  const [location] = useLocation();
  
  const currentPage = NAVIGATION_ITEMS.find(item => item.path === location);
  
  const pageConfig = {
    "/": { title: "Dashboard", subtitle: "Overview of donation activity" },
    "/transactions": { title: "Transactions", subtitle: "Manage all donation transactions" },
    "/customers": { title: "Customers", subtitle: "Manage donor records and information" },
    "/staff": { title: "Staff", subtitle: "Manage team members and permissions" },
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
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Staff Member</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
