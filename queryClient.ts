import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CheckoutPage from "@/pages/checkout";
import VehiclesPage from "@/pages/vehicles";
import { LayoutDashboard, ArrowRightLeft, Truck, Menu, X } from "lucide-react";
import { useState } from "react";

function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/checkout", label: "Check Out / In", icon: ArrowRightLeft },
    { href: "/vehicles", label: "All Vehicles", icon: Truck },
  ];

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== "/" && location.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md hover:bg-muted"
          data-testid="button-mobile-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">Memphis Fleet</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <Truck className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-sidebar-foreground">Memphis Fleet</p>
                <p className="text-xs text-sidebar-foreground/50">Vehicle Post Log</p>
              </div>
            </div>
            {nav}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Truck className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">Memphis Fleet</p>
            <p className="text-xs text-sidebar-foreground/50">Vehicle Post Log</p>
          </div>
        </div>
        {nav}
      </aside>
    </>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/vehicles" component={VehiclesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
              <AppRouter />
            </main>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
