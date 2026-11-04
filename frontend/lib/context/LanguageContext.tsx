
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from "react";

export type Language = "en" | "sw";

const LANGUAGE_STORAGE_KEY = "hsims_language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getSavedLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (stored === "en" || stored === "sw") {
      return stored;
    }
  } catch (error) {
    console.error("Unable to read saved language:", error);
  }

  return "en";
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");
  const [initialized, setInitialized] = useState(false);

  // Restore the saved language when the application loads.
  useEffect(() => {
    setLanguageState(getSavedLanguage());
    setInitialized(true);
  }, []);

  // Update the language and save it immediately.
  const setLanguage = useCallback((nextLanguage: Language) => {
    if (nextLanguage !== "en" && nextLanguage !== "sw") {
      return;
    }

    setLanguageState(nextLanguage);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.error("Unable to save selected language:", error);
    }
  }, []);

  // Listen for language changes made in another browser tab.
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        if (event.newValue === "en" || event.newValue === "sw") {
          setLanguageState(event.newValue);
        }
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <LanguageContext.Provider
    value={{
      language,
      setLanguage,
    }}
    >
    {initialized ? children : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used within a LanguageProvider"
    );
  }

  return context;
}
