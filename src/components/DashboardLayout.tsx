import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, Award, BarChart3, LogOut, FolderOpen, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/dashboard/categories", label: "Categories", icon: FolderOpen },
  { to: "/dashboard/participants", label: "Participants", icon: Users },
  { to: "/dashboard/judges", label: "Judges", icon: UserCheck },
  { to: "/dashboard/results", label: "Results", icon: Award },
];

const judgeLinks = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/dashboard/scoring", label: "Score Participants", icon: Award },
  { to: "/dashboard/results", label: "Results", icon: Award },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const links = role === "admin" ? adminLinks : judgeLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold">Musabaqa</h2>
            <p className="text-xs capitalize text-sidebar-foreground/60">{role} Panel</p>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="mb-2 truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-heading font-semibold">Musabaqa</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
