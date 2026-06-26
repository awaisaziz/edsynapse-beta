"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  PlusCircle,
  LogOut,
  Menu,
  X,
  User,
  BookMarked,
  Users,
  Activity,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquarePlus,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, logout, useRequireOnboarded } from "@/lib/useAuth";
import { useResizableSidebar } from "@/lib/useResizableSidebar";
import { FEEDBACK_URL } from "@/lib/feedback";

interface AppShellProps {
  children: React.ReactNode;
  role?: "student" | "teacher";
}

export function AppShell({ children, role = "student" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  useRequireOnboarded();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebar = useResizableSidebar({ storageKey: "es-app-nav-w", defaultWidth: 256, min: 208, max: 420 });

  const displayName = user?.name ?? "Loading...";
  const accountLabel =
    role === "student" ? "Student Account" : "Educator Portal";
  // Clicking the brand logo returns the user to their role's dashboard.
  const dashboardHref = role === "teacher" ? "/teacher/dashboard" : "/student";

  // Define navigation items based on role
  const navItems =
    role === "student"
      ? [
          {
            label: "My Subjects",
            href: "/student",
            icon: Home,
          },
          {
            label: "Strengths & Gaps",
            href: "/student/strengths-gaps",
            icon: BookMarked,
          },
          {
            label: "Self-Study Setup",
            href: "/student/self-study/new",
            icon: PlusCircle,
          },
        ]
      : [
          {
            label: "Dashboard",
            href: "/teacher/dashboard",
            icon: Users,
          },
          {
            label: "Course Pulse",
            href: "/teacher/course-pulse",
            icon: Activity,
          },
        ];

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };


  return (
    <div className="min-h-screen liquid-canvas relative flex overflow-hidden">
      {/* Sidebar for Desktop (collapsible + drag-resizable) */}
      <aside
        style={{ width: sidebarCollapsed ? 64 : sidebar.width }}
        className={cn(
          "relative hidden md:flex flex-col border-r border-white/70 bg-white/45 backdrop-blur-md shrink-0 overflow-hidden ease-in-out",
          sidebar.resizing ? "" : "transition-[width] duration-300"
        )}
      >
        {/* Drag handle on the right edge — only when expanded */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={sidebar.onMouseDown}
            title="Drag to resize"
            className="absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize transition-colors hover:bg-primary/25 active:bg-primary/40"
          />
        )}
        {/* Brand Header */}
        <div className={cn("h-16 flex items-center border-b border-white/50", sidebarCollapsed ? "justify-center px-2" : "gap-2 px-6")}>
          {!sidebarCollapsed && (
            <>
              <Link href={dashboardHref} aria-label="Go to dashboard" className="flex items-center gap-2 min-w-0">
                <Image src="/logo.png" alt="EdSynapse" width={32} height={32} className="w-8 h-8 rounded-xl object-contain shrink-0" priority />
                <span className="text-base font-bold text-foreground font-display tracking-tight truncate">
                  EdSynapse
                </span>
              </Link>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                Beta
              </span>
            </>
          )}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            type="button"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-8 h-8 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/40 text-muted-foreground transition-all hover:bg-white hover:text-foreground active:scale-[0.95]",
              !sidebarCollapsed && "ml-auto"
            )}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className={cn("flex-1 space-y-1", sidebarCollapsed ? "px-2 pt-3" : "px-3")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/student" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-2xl text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
                  sidebarCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-4 py-3",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:bg-white/40 hover:text-foreground border border-transparent hover:border-white/50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Panel */}
        <div className={cn("border-t border-white/40 space-y-1", sidebarCollapsed ? "p-2" : "p-3")}>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={sidebarCollapsed ? "Share Feedback" : undefined}
            className={cn(
              "flex items-center rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-white/40 hover:text-foreground transition-all border border-transparent hover:border-white/50 active:scale-[0.98]",
              sidebarCollapsed ? "justify-center w-10 h-10 mx-auto" : "w-full gap-3 px-4 py-3"
            )}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Share Feedback</span>}
          </a>
          <Link
            href="/settings"
            title={sidebarCollapsed ? `${displayName} — Settings` : undefined}
            className={cn(
              "flex items-center rounded-2xl transition-all duration-150 active:scale-[0.98] border",
              sidebarCollapsed ? "justify-center w-10 h-10 mx-auto" : "w-full gap-3 p-2.5",
              pathname.startsWith("/settings")
                ? "bg-primary/10 border-primary/20"
                : "bg-white/40 border-white/60 hover:bg-white/70"
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {accountLabel}
                </p>
              </div>
            )}
            {!sidebarCollapsed && <Settings className="w-4 h-4 shrink-0 text-muted-foreground" />}
          </Link>
          <button
            onClick={handleSignOut}
            type="button"
            title={sidebarCollapsed ? "Sign Out" : undefined}
            className={cn(
              "flex items-center rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition-all border border-transparent active:scale-[0.98]",
              sidebarCollapsed ? "justify-center w-10 h-10 mx-auto" : "w-full gap-3 px-4 py-3"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Nav Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/60 backdrop-blur-lg border-b border-white/60 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.back()}
            type="button"
            aria-label="Go back"
            className="p-2 rounded-xl bg-white/40 border border-white/60 text-foreground active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link href={dashboardHref} aria-label="Go to dashboard" className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              ES
            </div>
            <span className="text-sm font-bold text-foreground font-display">EdSynapse</span>
          </Link>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          type="button"
          aria-label="Open menu"
          className="p-2 rounded-xl bg-white/40 border border-white/60 text-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden flex justify-end">
          <div className="w-72 bg-white/90 backdrop-blur-xl h-full p-6 flex flex-col justify-between border-l border-white/40 relative shadow-2xl transition-all duration-300">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              type="button"
              className="absolute top-4 right-4 p-2 rounded-xl bg-muted text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <Link
                href={dashboardHref}
                aria-label="Go to dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                  ES
                </div>
                <span className="text-base font-bold text-foreground">EdSynapse</span>
              </Link>

              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                  pathname.startsWith("/settings")
                    ? "bg-primary/10 border-primary/20"
                    : "bg-white/60 border-white/40 hover:bg-white/80"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {role === "student" ? "Student" : "Teacher"}
                  </p>
                </div>
                <Settings className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Link>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/student" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-150",
                        isActive
                          ? "bg-primary text-white shadow-lg"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-1.5">
              <a
                href={FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Share Feedback</span>
              </a>
              <button
                onClick={handleSignOut}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area — no desktop topbar; the sidebar is the sole nav and
          the content reclaims the full height. */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto h-screen">
        {/* Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
