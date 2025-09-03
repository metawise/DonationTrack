import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, X } from "lucide-react";
import jfjLogo from "@assets/star-blue-digital_1755825777612.png";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const location = usePathname();

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile && onClose) {
      onClose();
    }
  }, [location, isMobile, onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-white shadow-sm border-r border-gray-200 flex-shrink-0 z-50",
        // Desktop styles
        "hidden lg:flex lg:w-64 lg:flex-col",
        // Mobile styles
        isMobile && [
          "fixed inset-y-0 left-0 w-64 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        ]
      )}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={jfjLogo.src} alt="Jews for Jesus" className="h-6 w-6" />
            </div>
            <span className="font-semibold text-gray-900">Jews for Jesus</span>
          </div>
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      <nav className="mt-8 flex-1 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link 
              key={item.id} 
              href={item.path as any}
              prefetch={true}
              className={cn(
                "flex items-center px-6 py-3 text-sm font-medium transition-all duration-200 cursor-pointer block",
                isActive
                  ? "text-jfj-blue bg-jfj-blue-light border-r-2 border-jfj-blue"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      </div>
    </>
  );
}
