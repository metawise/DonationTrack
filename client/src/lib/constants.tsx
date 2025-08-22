import { Heart, ChartPie, ArrowLeftRight, Users, PlusCircle, DollarSign, Calendar, TrendingUp, CreditCard, Building, UserCheck, Database } from "lucide-react";

export const NAVIGATION_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: ChartPie,
    path: "/",
  },
  {
    id: "transactions",
    label: "Transactions", 
    icon: ArrowLeftRight,
    path: "/transactions",
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    path: "/customers",
  },
  {
    id: "staff",
    label: "Staff",
    icon: UserCheck,
    path: "/staff",
  },
  {
    id: "sync",
    label: "Sync Settings",
    icon: Database,
    path: "/sync",
  },
  {
    id: "create-donation",
    label: "Create Donation",
    icon: PlusCircle,
    path: "/create-donation",
  },
];

export const METRIC_ICONS = {
  totalDonations: DollarSign,
  activeSubscribers: Users,
  thisMonth: Calendar,
  avgDonation: TrendingUp,
};

export const PAYMENT_METHOD_ICONS = {
  "credit-card": CreditCard,
  bank: Building,
};

export const DONATION_TYPES = [
  { id: "one-time", label: "One-time Donation", icon: "hand-holding-usd" },
  { id: "monthly", label: "Monthly Subscription", icon: "sync-alt" },
];

export const DONATION_AMOUNTS = [25, 50, 100, 150];

export const DESIGNATIONS = [
  { value: "general", label: "General Fund" },
  { value: "missions", label: "Missions" },
  { value: "outreach", label: "Jewish Outreach" },
  { value: "education", label: "Education Programs" },
];

export const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
];

export const STATUS_COLORS = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

export const TYPE_COLORS = {
  "one-time": "bg-gray-100 text-gray-800",
  monthly: "bg-blue-100 text-blue-800",
};

export const CUSTOMER_TYPE_COLORS = {
  "active-subscriber": "bg-green-100 text-green-800",
  "one-time": "bg-blue-100 text-blue-800",
  inactive: "bg-gray-100 text-gray-800",
};

export const STAFF_STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
};

export const STAFF_ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  staff: "bg-gray-100 text-gray-800",
};

export const DEPARTMENTS = [
  { value: "administration", label: "Administration" },
  { value: "development", label: "Development" },
  { value: "outreach", label: "Outreach" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "communications", label: "Communications" },
];

export const STAFF_ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];
