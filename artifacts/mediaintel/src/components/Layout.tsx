import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Settings, Zap, Sun, Moon, Newspaper, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

interface LayoutProps {
  children: React.ReactNode;
}

function CloudwaysIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C8.5 2 5.5 4.1 4.2 7.1C2.3 7.6 1 9.3 1 11.3C1 13.6 2.9 15.5 5.2 15.5H18.8C21.1 15.5 23 13.6 23 11.3C23 9.3 21.7 7.6 19.8 7.1C18.5 4.1 15.5 2 12 2Z"
        className="fill-current"
        opacity="0.9"
      />
      <path
        d="M8 15.5V21M12 15.5V19M16 15.5V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-sm selection:bg-primary/30">
      {/* Mini Sidebar Nav — desktop only */}
      <nav className="hidden md:flex w-16 border-r border-border bg-sidebar flex-col items-center py-4 flex-shrink-0 z-10">
        {/* App logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
            <Zap size={18} strokeWidth={2.5} />
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full px-2">
          <NavItem href="/" icon={<Activity size={20} />} isActive={location === "/"} label="Web" />
          <NavItem href="/analytics" icon={<BarChart2 size={20} />} isActive={location === "/analytics"} label="Analytics" />
          <NavItem href="/comp-intel" icon={<Newspaper size={20} />} isActive={location === "/comp-intel"} label="Blogs" />
          <NavItem href="/pages" icon={<Globe size={20} />} isActive={location === "/pages"} label="Pages" />
          <NavItem href="/community" icon={<Users size={20} />} isActive={location === "/community"} label="Community" />

          {/* Cloudways — visually distinct brand entry */}
          <div className="h-px bg-border/50 mx-1 my-1" />
          <Link
            href="/cloudways"
            title="Cloudways Brand"
            className={cn(
              "w-12 h-12 flex flex-col items-center justify-center rounded-md transition-all duration-200 relative",
              location === "/cloudways"
                ? "bg-[#1a6fff]/15 text-[#1a6fff]"
                : "text-[#1a6fff]/60 hover:bg-[#1a6fff]/10 hover:text-[#1a6fff]"
            )}
          >
            <CloudwaysIcon size={22} />
            {location === "/cloudways" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#1a6fff]" />
            )}
          </Link>
        </div>

        <div className="mt-auto flex flex-col gap-3 w-full px-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-12 h-10 flex items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <NavItem href="/settings" icon={<Settings size={20} />} isActive={location === "/settings"} label="Settings" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Tab Bar — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-border bg-sidebar"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <BottomTab href="/" icon={<Activity size={22} />} isActive={location === "/"} label="Web" />
        <BottomTab href="/analytics" icon={<BarChart2 size={22} />} isActive={location === "/analytics"} label="Analytics" />
        <BottomTab href="/comp-intel" icon={<Newspaper size={22} />} isActive={location === "/comp-intel"} label="Blogs" />
        <BottomTab href="/pages" icon={<Globe size={22} />} isActive={location === "/pages"} label="Pages" />
        <BottomTab href="/community" icon={<Users size={22} />} isActive={location === "/community"} label="Community" />

        {/* Cloudways mobile tab */}
        <Link
          href="/cloudways"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors",
            location === "/cloudways" ? "text-[#1a6fff]" : "text-[#1a6fff]/40"
          )}
        >
          <CloudwaysIcon size={22} />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Cloudways</span>
        </Link>

        {/* Theme toggle mobile tab */}
        <button
          onClick={toggle}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-sidebar-foreground transition-colors"
        >
          {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          <span className="text-[9px] font-semibold uppercase tracking-wider">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        <BottomTab href="/settings" icon={<Settings size={22} />} isActive={location === "/settings"} label="Settings" />
      </nav>
    </div>
  );
}

function NavItem({
  href,
  icon,
  isActive,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "w-12 h-12 flex flex-col items-center justify-center rounded-md transition-all duration-200 group relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      title={label}
    >
      {icon}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
      )}
    </Link>
  );
}

function BottomTab({
  href,
  icon,
  isActive,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors",
        isActive ? "text-primary" : "text-sidebar-foreground"
      )}
    >
      {icon}
      <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
    </Link>
  );
}
