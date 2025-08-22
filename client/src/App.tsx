import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Customers from "@/pages/customers";
import CreateDonation from "@/pages/create-donation";
import Staff from "@/pages/staff";
import Sync from "@/pages/sync";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

function ProtectedRouter() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/customers" component={Customers} />
          <Route path="/staff" component={Staff} />
          <Route path="/sync" component={Sync} />
          <Route path="/create-donation" component={CreateDonation} />
          <Route component={NotFound} />
        </Switch>
      </MainLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login">
              {() => <Login />}
            </Route>
            <Route>
              {() => <ProtectedRouter />}
            </Route>
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
