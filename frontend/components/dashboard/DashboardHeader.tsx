
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/hooks/useAuth";
import { getAccessToken } from "@/lib/utils/permissions";
import { useLanguage } from "@/lib/context/LanguageContext";
import {
  commonTranslations,
  navLabelTranslations,
} from "@/constants/translations/common";
import { memberHeaderTranslations } from "@/constants/translations/member-header";
import { API_URL } from "@/lib/utils/api";
import SearchBar from "@/components/common/SearchBar";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

interface DashboardHeaderProps {
  title?: string;
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    aria-hidden="true"
    className={className}
    >
    <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
    />
    </svg>
  );
}

// Shared dashboard header for staff and Member dashboards.
export default function DashboardHeader({ title }: DashboardHeaderProps) {
  const router = useRouter();
  const { firstName, roles, logout } = useAuth();
  const { language } = useLanguage();

  const t = commonTranslations[language];
  const navLabels = navLabelTranslations[language];
  const mt = memberHeaderTranslations[language];
  const isMember = roles.includes("Member");

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [needsMembershipCompletion, setNeedsMembershipCompletion] =
  useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isMember) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      return;
    }

    fetch(`${API_URL}/members/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => (response.ok ? response.json() : null))
    .then((profile) =>
    setNeedsMembershipCompletion(
      !!profile && profile.membershipComplete === false
    )
    )
    .catch(() => setNeedsMembershipCompletion(false));

    fetch(`${API_URL}/members/notifications?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => setUnreadCount(data?.unreadCount ?? 0))
    .catch(() => setUnreadCount(0));
  }, [isMember]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push("/login");
  };

  return (
    <header className="relative z-20 border-b border-gray-100 bg-white px-4 py-4 sm:px-8">
    <div className="flex items-center justify-between gap-4">
    {title ? (
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
      {title}
      </h1>
    ) : isMember ? (
      <SearchBar
      className="w-48 md:w-64"
      placeholder={mt.searchPlaceholder}
      />
    ) : (
      <span />
    )}

    <div className="flex shrink-0 items-center gap-2">
    {!isMember && <SearchBar className="w-48 md:w-64" />}

    {isMember && (
      <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
        ? `${navLabels.notifications}, ${unreadCount} ${mt.unreadNotifications}`
        : navLabels.notifications
      }
      className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-50 hover:text-[#064E3B]"
      >
      <BellIcon className="h-5 w-5" />

      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
        {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      </Link>
    )}

    {/* Language selector is available on Member dashboards */}
    {isMember && (
      <LanguageSwitcher className="shrink-0" />
    )}

    <div ref={rootRef} className="relative">
    <button
    type="button"
    onClick={() => setOpen((previous) => !previous)}
    aria-haspopup="menu"
    aria-expanded={open}
    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-600 transition hover:bg-gray-50 hover:text-[#064E3B]"
    >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-[#064E3B]">
    {(firstName?.[0] ?? "?").toUpperCase()}
    </span>

    {firstName && (
      <span className="hidden text-sm font-medium text-gray-700 sm:inline">
      {firstName}
      </span>
    )}

    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
      open ? "rotate-180" : ""
    }`}
    >
    <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
    </svg>
    </button>

    {open && (
      <div
      role="menu"
      className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-xl"
      >
      {isMember && needsMembershipCompletion && (
        <Link
        href="/onboarding/mobile-money"
        role="menuitem"
        className="block px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
        >
        {mt.completeMembership}
        </Link>
      )}

      <button
      type="button"
      role="menuitem"
      onClick={handleLogout}
      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-[#064E3B]"
      >
      {t.logOut}
      </button>
      </div>
    )}
    </div>
    </div>
    </div>
    </header>
  );
}
