"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, Wrench, Users, PlusCircle, ArrowLeftRight, LogOut, Settings, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NavLinkProps = {
  href: string;
  icon: React.ElementType;
  label: string;
  currentPath: string;
  onClick?: () => void;
};

const NavLink = ({ href, icon: Icon, label, currentPath, onClick }: NavLinkProps) => {
  const isActive = currentPath === href;
  return (
    <Link href={href} passHref>
      <Button
        variant={isActive ? "sidebar-primary" : "sidebar-ghost"}
        className="w-full justify-start gap-3"
        onClick={onClick}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Button>
    </Link>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await supabase.rpc("get_my_role");
      setRole((roleData as string) || "manager");
    })();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out: " + error.message);
    } else {
      toast.success("Signed out successfully!");
    }
  };

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/gear", icon: Wrench, label: "Gear" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/rentals/new", icon: PlusCircle, label: "New Rental" },
    { href: "/rentals", icon: ArrowLeftRight, label: "All Rentals" },
    { href: "/returns", icon: ArrowLeftRight, label: "Process Returns" },
    { href: "/maintenance", icon: Wrench, label: "Maintenance" },
    { href: "/reports", icon: BarChart3, label: "Reports" },
    ...(role === "manager" || role === "owner" ? [{ href: "/(app)/admin/users", icon: Users, label: "Users" }] : []),
    { href: "/settings", icon: Settings, label: "Settings" }
  ];

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col bg-sidebar text-sidebar-foreground">
          <SheetHeader className="p-4 border-b border-sidebar-border">
            <SheetTitle className="text-lg font-semibold text-sidebar-primary-foreground">Aldora Dive Gear</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-4 flex-grow">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                currentPath={pathname}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </nav>
          <div className="p-4 border-t border-sidebar-border">
            <Button variant="sidebar-ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-sidebar text-sidebar-foreground h-screen sticky top-0 p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-sidebar-primary-foreground">Aldora Dive Gear</h2>
        </div>
        <nav className="flex flex-col gap-1 flex-grow">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              currentPath={pathname}
            />
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <Button variant="sidebar-ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>
    </>
  );
}