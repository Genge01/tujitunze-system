
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/hooks/useAuth";
import { getStaffDashboardPath } from "@/lib/utils/permissions";
import { useLanguage } from "@/lib/context/LanguageContext";

import {
  commonTranslations,
  navLabelTranslations,
  roleLabelTranslations,
} from "@/constants/translations/common";

import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import Logo from "@/components/common/Logo";

import {
  ChevronDoubleLeftIcon,
  LogoutIcon,
  NAV_ICONS,
} from "@/components/common/SidebarIcons";

export interface SidebarNavItem {
  labelKey: keyof (typeof navLabelTranslations)["en"];
  href: string;
}

interface SidebarProps {
  roleLabel: keyof (typeof roleLabelTranslations)["en"];
  navItems: readonly SidebarNavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({
  roleLabel,
  navItems,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { firstName, roles, logout } = useAuth();
  const { language } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const isHoverOverlay = collapsed && hoverExpanded;
  const isCompact = collapsed && !hoverExpanded;

  const logoHref =
  getStaffDashboardPath(roles) ??
  (roles.includes("Member") ? "/dashboard" : "/");

  const navLabels = navLabelTranslations[language];
  const roleLabels = roleLabelTranslations[language];
  const t = commonTranslations[language];

  // Close mobile drawer whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Logout user.
  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    router.push("/login");
  };

  // Shared sidebar content for desktop and mobile.
  const sidebarBody = (
    onNavigate?: () => void,
                       compact = false
  ) => (
    <>
    {/* Sidebar logo and user information */}
    <div
    className={`border-b border-gray-100 ${
      compact
      ? "flex items-center justify-center px-1 py-4"
      : "px-2 py-6"
    }`}
    >
    <Logo
    href={logoHref}
    collapsed={compact}
    onNavigate={onNavigate}
    className={compact ? "" : "mx-4"}
    />

    {!compact && (
      <div className="mx-4">
      {firstName && (
        <p className="mt-3 truncate text-sm font-medium text-gray-700">
        {firstName}
        </p>
      )}

      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {roleLabels[roleLabel] ?? roleLabel}
      </p>
      </div>
    )}
    </div>

    {/* Navigation links */}
    <nav
    className={`flex-1 overflow-y-auto py-4 space-y-1 ${
      compact ? "px-2" : "px-3"
    }`}
    >
    {navItems.map((item) => {
      const isActive =
      pathname === item.href ||
      pathname?.startsWith(`${item.href}/`);

      const ItemIcon = NAV_ICONS[item.labelKey];
      const label = navLabels[item.labelKey] ?? item.labelKey;

      return (
        <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={compact ? label : undefined}
        aria-label={label}
        className={`
          flex items-center gap-3 rounded-lg
          px-3 py-2 text-sm font-medium transition
          ${compact ? "justify-center" : ""}
          ${
            isActive
            ? "bg-emerald-50 text-[#064E3B] font-semibold"
            : "text-slate-600 hover:bg-gray-50 hover:text-[#064E3B]"
          }
          `}
          >
          <ItemIcon className="h-5 w-5 shrink-0" />

          {!compact && (
            <span className="truncate">{label}</span>
          )}
          </Link>
      );
    })}
    </nav>

    {/* Language switcher and logout */}
    <div
    className={`relative z-50 shrink-0 border-t border-gray-100 py-4 space-y-2 ${
      compact ? "px-2" : "px-3"
    }`}
    >
    {!compact && (
      <LanguageSwitcher
      className="w-full sidebar-language-switcher"
      />
    )}

    <button
    type="button"
    onClick={handleLogout}
    title={compact ? t.logOut : undefined}
    aria-label={t.logOut}
    className={`
      flex w-full items-center gap-3 rounded-lg
      px-3 py-2 text-sm font-medium
      text-slate-600 transition
      hover:bg-gray-50 hover:text-[#064E3B]
      ${compact ? "justify-center" : "text-left"}
      `}
      >
      <LogoutIcon className="h-5 w-5 shrink-0" />

      {!compact && (
        <span>{t.logOut}</span>
      )}
      </button>
      </div>
      </>
  );

  return (
    <>
    {/* Mobile top bar */}
    <div
    className="
    md:hidden fixed inset-x-0 top-0 z-40
    flex min-h-14 items-center justify-between
    border-b border-gray-100 bg-white px-2
    pt-[env(safe-area-inset-top,0px)]
    pl-[calc(0.5rem+env(safe-area-inset-left,0px))]
    pr-[calc(0.5rem+env(safe-area-inset-right,0px))]
    "
    >
    <Logo href={logoHref} />

    <button
    type="button"
    onClick={() => setMobileOpen(true)}
    aria-label={t.openMenu}
    aria-expanded={mobileOpen}
    className="
    rounded-lg p-2 text-slate-600 transition
    hover:bg-gray-50 hover:text-[#064E3B]
    "
    >
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    aria-hidden="true"
    className="h-6 w-6"
    >
    <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
    />
    </svg>
    </button>
    </div>

    {/* Mobile overlay and drawer */}
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-50">
      <div
      className="absolute inset-0 bg-black/40"
      onClick={() => setMobileOpen(false)}
      />

      <aside
      className="
      absolute inset-y-0 left-0
      flex w-64 flex-col bg-white shadow-xl
      "
      >
      <div className="flex items-center justify-end px-3 pt-3">
      <button
      type="button"
      onClick={() => setMobileOpen(false)}
      aria-label={t.closeMenu}
      className="
      rounded-lg p-2 text-slate-600 transition
      hover:bg-gray-50 hover:text-[#064E3B]
      "
      >
      <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
      className="h-6 w-6"
      >
      <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
      />
      </svg>
      </button>
      </div>

      {sidebarBody(() => setMobileOpen(false))}
      </aside>
      </div>
    )}

    {/* Desktop sidebar */}
    <aside
    onMouseEnter={() => setHoverExpanded(true)}
    onMouseLeave={() => setHoverExpanded(false)}
    className={`
      hidden md:flex md:flex-col md:fixed md:inset-y-0
      border-r border-gray-100 bg-white
      transition-all duration-300 ease-in-out
      ${isCompact ? "md:w-20" : "md:w-64"}
      ${isHoverOverlay ? "z-[60] shadow-lg" : "z-40"}
      `}
      >
      {sidebarBody(undefined, isCompact)}

      {/* Collapse / expand button */}
      <button
      type="button"
      onClick={onToggleCollapsed}
      aria-label={collapsed ? t.openMenu : t.closeMenu}
      title={collapsed ? t.openMenu : t.closeMenu}
      className="
      absolute -right-3 top-8
      flex h-6 w-6 items-center justify-center
      rounded-full border border-gray-200 bg-white
      text-slate-500 shadow-sm transition
      hover:text-[#064E3B]
      "
      >
      <ChevronDoubleLeftIcon
      className={`
        h-3.5 w-3.5
        transition-transform duration-300 ease-in-out
        ${collapsed ? "rotate-180" : ""}
        `}
        />
        </button>
        </aside>
        </>
  );
}
