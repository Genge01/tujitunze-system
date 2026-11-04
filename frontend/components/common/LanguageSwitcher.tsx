
"use client";

import { useEffect, useRef, useState } from "react";

import {
  useLanguage,
  type Language,
} from "@/lib/context/LanguageContext";

import { commonTranslations } from "@/constants/translations/common";

interface LanguageSwitcherProps {
  className?: string;
}

const LANGUAGE_OPTIONS: {
  code: Language;
  label: string;
  shortLabel: string;
}[] = [
  {
    code: "en",
    label: "English",
    shortLabel: "EN",
  },
{
  code: "sw",
  label: "Swahili",
  shortLabel: "SW",
},
];

export default function LanguageSwitcher({
  className = "",
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const t = commonTranslations[language];

  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const current =
  LANGUAGE_OPTIONS.find((option) => option.code === language) ??
  LANGUAGE_OPTIONS[0];

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
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

  // Change application language.
  const handleSelect = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  // Sidebar switchers open upward; other switchers open downward.
  const opensUpward = className.includes("sidebar-language-switcher");

  return (
    <div
    ref={rootRef}
    className={`relative ${className}`}
    >
    <button
    type="button"
    onClick={() => setOpen((previous) => !previous)}
    aria-label={t.changeLanguage}
    aria-haspopup="listbox"
    aria-expanded={open}
    className="
    flex w-full items-center justify-center gap-2
    border border-gray-200 bg-white text-gray-700
    px-3 py-2 rounded-lg text-sm font-semibold
    hover:border-[#064E3B] hover:text-[#064E3B]
    transition
    "
    >
    <span className="hidden md:inline">
    {current.label}
    </span>

    <span className="md:hidden">
    {current.shortLabel}
    </span>

    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    className={`
      h-3.5 w-3.5 shrink-0 transition-transform
      ${open ? "rotate-180" : ""}
      `}
      >
      <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
      </svg>
      </button>

      {open && (
        <ul
        role="listbox"
        aria-label={t.changeLanguage}
        className={`
          absolute right-0 z-[99999]
          min-w-[176px] w-44
          overflow-hidden rounded-lg
          border border-gray-100 bg-white
          py-1 shadow-xl
          ${opensUpward ? "bottom-full mb-2" : "top-full mt-2"}
          `}
          >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = option.code === language;

            return (
              <li
              key={option.code}
              role="option"
              aria-selected={isSelected}
              >
              <button
              type="button"
              onClick={() => handleSelect(option.code)}
              className={`
                flex w-full items-center justify-between
                gap-2.5 px-4 py-2.5
                text-left text-sm transition
                ${
                  isSelected
                  ? "bg-emerald-50 font-semibold text-[#064E3B]"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#064E3B]"
                }
                `}
                >
                <span>{option.label}</span>

                {isSelected && (
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                  >
                  <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 4 4L19 6"
                  />
                  </svg>
                )}
                </button>
                </li>
            );
          })}
          </ul>
      )}
      </div>
  );
}
