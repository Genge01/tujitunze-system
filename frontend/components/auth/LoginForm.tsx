
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  decodeAccessToken,
  getStaffDashboardPath,
  storeAuthUser,
} from "@/lib/utils/permissions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { loginFormTranslations } from "@/constants/translations/auth";
import { API_URL } from "@/lib/utils/api";
import FormField from "@/components/auth/FormField";
import Spinner from "@/components/auth/Spinner";
import { FullLogo, LogoMark } from "@/components/common/Logo";

// Matches the duration of the slide-in-left/slide-in-right entrance
// animations in globals.css (0.8s) closely enough that the card doesn't
// visibly jump — this is purely how long the post-submit fade-out plays
// before navigating, not tied to the request itself in any way.
const SUCCESS_TRANSITION_MS = 300;

type FieldName = "identifier" | "password";

export default function LoginForm() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = loginFormTranslations[language];

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // True from the moment login succeeds until the delayed router.push()
  // below actually navigates away — drives the card's fade-out. Kept
  // separate from `loading` (still true too, through the same window) so
  // the button's own disabled/spinner state and the card's exit
  // animation can be styled independently.
  const [submitted, setSubmitted] = useState(false);

  const validateField = (field: FieldName, value: string): string | undefined => {
    if (field === "identifier" && !value.trim()) {
      return t.usernameRequired;
    }

    if (field === "password" && !value) {
      return t.passwordRequired;
    }

    return undefined;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const field = name as FieldName;

    setFormData((previousData) => ({
      ...previousData,
      [field]: value,
    }));

    if (touched[field]) {
      setFieldErrors((previous) => ({
        ...previous,
        [field]: validateField(field, value),
      }));
    }

    setError("");
    setSuccess("");
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as FieldName;

    setTouched((previous) => ({ ...previous, [field]: true }));

    setFieldErrors((previous) => ({
      ...previous,
      [field]: validateField(field, value),
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const nextErrors: Partial<Record<FieldName, string>> = {
      identifier: validateField("identifier", formData.identifier),
      password: validateField("password", formData.password),
    };

    setFieldErrors(nextErrors);
    setTouched({ identifier: true, password: true });

    if (nextErrors.identifier || nextErrors.password) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: formData.identifier,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.errorFallback);
      }

      setSuccess(t.successMessage);

      sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.accessToken);

      const payload = decodeAccessToken(data.accessToken);

      if (payload) {
        storeAuthUser({
          userId: payload.sub,
          roles: payload.roles,
          firstName: payload.firstName || data.member?.firstName || "",
        });
      }

      const staffDashboardPath = getStaffDashboardPath(payload?.roles ?? []);

      // Every role lands on its own dashboard right after login: staff
      // roles via getStaffDashboardPath (their tenant-scoped
      // /<role>/dashboard), Members on the bare /dashboard they own per
      // the route-group table in CLAUDE.md. All paths here are relative —
      // never a hardcoded origin — so this redirect works unchanged across
      // dev, staging, and production.
      const destination = staffDashboardPath ?? "/dashboard";

      // `loading` deliberately stays true here (not reset in a `finally`
      // below) so the button keeps its spinner/disabled state through the
      // fade-out instead of flickering back to normal right before the
      // page navigates away. A reduced-motion preference skips the delay
      // and the fade entirely — this is a real user-facing wait before
      // navigation, not just decoration, so it has to be opt-out-able the
      // same way every other animation in this codebase is.
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        router.push(destination);
      } else {
        setSubmitted(true);
        setTimeout(() => router.push(destination), SUCCESS_TRANSITION_MS);
      }

      return;
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t.genericErrorFallback);
      }
    }

    setLoading(false);
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-white px-4 py-12 sm:px-6">

      <div className="flex w-full max-w-5xl flex-col items-center">

        {/* The card itself fades/scales out once login succeeds, right
            before the delayed navigation in handleSubmit fires — a
            reduced-motion preference skips straight to navigating
            instead (see SUCCESS_TRANSITION_MS above), so this transition
            never becomes an unskippable wait. */}
        <div
          className={`flex w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all duration-300 lg:flex-row ${
            submitted ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
        >

          {/* Form side — left on desktop (lg:flex-row's first child),
              on top on mobile (this container is flex-col below lg) */}
          <div className="flex-1 p-8 [animation:slide-in-left_0.8s_ease-out_forwards] motion-reduce:[animation:none] sm:p-10 lg:p-12">

            <div className="text-center mb-8">

              <FullLogo href="/" className="justify-center" />

              <h1 className="mt-6 text-3xl font-bold text-gray-900">
                {t.title}
              </h1>

              <p className="mt-2 text-sm text-gray-600">
                {t.subtitle}
              </p>

            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 [animation:fade-in_0.3s_ease-out_forwards] motion-reduce:[animation:none]">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-[#064E3B] [animation:fade-in_0.3s_ease-out_forwards] motion-reduce:[animation:none]">
                {success}
              </div>
            )}

            <form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >

            {/* NIDA Number or Email */}
            <FormField
              id="identifier"
              name="identifier"
              label={t.usernameLabel}
              value={formData.identifier}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t.usernamePlaceholder}
              autoComplete="username"
              error={fieldErrors.identifier}
              valid={touched.identifier && !!formData.identifier.trim()}
              helpText={t.usernameHelp}
            />

            {/* Password */}
            <div>

              <div className="flex items-center justify-between mb-2">

                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  {t.passwordLabel}
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm text-[#064E3B] hover:text-[#065F46] hover:underline"
                >
                  {t.forgotPassword}
                </Link>

              </div>

              <FormField
                id="password"
                name="password"
                label=""
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={t.passwordPlaceholder}
                autoComplete="current-password"
                error={fieldErrors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                    aria-pressed={showPassword}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >

                    {showPassword ? (

                      // Eye-off icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>

                    ) : (

                      // Eye icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>

                    )}

                  </button>
                }
              />

            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3">

              <input
                id="rememberMe"
                type="checkbox"
                className="
                  h-4
                  w-4
                  rounded
                  border-gray-300
                  text-[#064E3B]
                  focus:ring-[#064E3B]
                "
              />

              <label
                htmlFor="rememberMe"
                className="text-sm text-gray-600"
              >
                {t.rememberMe}
              </label>

            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                flex
                items-center
                justify-center
                gap-2
                bg-[#064E3B]
                text-white
                py-3
                rounded-lg
                font-semibold
                hover:bg-[#065F46]
                hover:scale-105
                transition-colors
                transition-transform
                duration-200
                ease-in-out
                focus:outline-none
                focus:ring-2
                focus:ring-[#064E3B]
                focus:ring-offset-2
                disabled:opacity-60
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                motion-reduce:hover:scale-100
              "
            >
              {loading && <Spinner />}
              {loading ? t.loggingIn : t.loginButton}
            </button>

          </form>

            {/* Sign Up */}
            <div className="mt-8 text-center">

              <p className="text-sm text-gray-600">

                {t.noAccount}{" "}

                <Link
                  href="/register"
                  className="font-semibold text-[#064E3B] hover:text-[#065F46] hover:underline"
                >
                  {t.signUp}
                </Link>

              </p>

            </div>

          </div>

          {/* Welcome panel — right on desktop, below the form on mobile
              (this whole card is flex-col until lg:, so this is simply
              the second child rather than a separate hidden-on-mobile
              element). LogoMark renders the raster brand icon inside a
              rounded-full clip, which reads fine against this dark
              emerald background — same combination Header.tsx uses on
              its own bg-emerald-900 bar — so no separate "light" variant
              of the mark was needed. */}
          <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#064E3B] to-emerald-800 p-10 text-center text-white [animation:slide-in-right_0.8s_ease-out_forwards] motion-reduce:[animation:none] sm:p-12">
            <LogoMark className="h-16 w-16" />
            <h2 className="mt-6 text-2xl font-bold">{t.welcomeTitle}</h2>
            <p className="mt-3 max-w-xs text-sm text-emerald-100">
              {t.welcomeMessage}
            </p>
          </div>

        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t.copyright}
        </p>

      </div>

    </section>
  );
}
