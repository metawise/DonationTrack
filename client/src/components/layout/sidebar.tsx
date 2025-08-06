import { Link, useLocation } from "wouter";
import { Heart } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-jfj-blue rounded-lg flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Jews for Jesus</span>
        </div>
      </div>
      
      <nav className="mt-8">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.id} href={item.path}>
              <div
                className={cn(
                  "flex items-center px-6 py-3 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "text-jfj-blue bg-jfj-blue-light border-r-2 border-jfj-blue"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
