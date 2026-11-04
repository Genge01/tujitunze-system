
"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  HeartPulse,
  IdCard,
  Mail,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

import { API_URL } from "@/lib/utils/api";
import { getAccessToken } from "@/lib/utils/permissions";

type Data = Record<string, any>;

interface DashboardData {
  member: Data;
  membership: Data;
}

/* -------------------------------------------------------
 *   HELPER FUNCTIONS
 * ------------------------------------------------------- */

const getValue = (obj: Data, keys: string[]) => {
  for (const key of keys) {
    const value = obj?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const unwrap = (response: Data, keys: string[]): Data => {
  let result = response;

  for (const key of keys) {
    if (result?.[key] && typeof result[key] === "object") {
      result = result[key];
    }
  }

  return result || {};
};

const display = (value: any) => {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
};

/* Remove hyphens and spaces from NIDA */

const formatNida = (value: any) => {
  if (!value) return "Not available";

  return String(value).replace(/[-\s]/g, "");
};

/* Date formatting */

const formatDate = (value: any) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* Currency formatting */

const formatMoney = (value: any) => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "TZS 0.00";
  }

  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/* Registration and eligibility status */

const getBooleanStatus = (
  value: any,
  positive: string,
  negative: string
) => {
  if (typeof value === "boolean") {
    return value ? positive : negative;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();

    if (
      [
        "true",
        "complete",
        "completed",
        "fully registered",
        "eligible",
        "active",
        "yes",
      ].includes(normalized)
    ) {
      return positive;
    }

    if (
      [
        "false",
        "incomplete",
        "pending",
        "not eligible",
        "not yet eligible",
        "inactive",
        "no",
      ].includes(normalized)
    ) {
      return negative;
    }
  }

  return "Not available";
};

/* -------------------------------------------------------
 *   SECTION HEADING
 * ------------------------------------------------------- */

function SectionHeading({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
    <Icon size={20} />
    </div>

    <div>
    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
    {title}
    </h2>

    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
    {description}
    </p>
    </div>
    </div>
  );
}

/* -------------------------------------------------------
 *   MEMBER INFORMATION CARD
 *   Milk / cream colour design
 * ------------------------------------------------------- */

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: any;
  icon: any;
}) {
  return (
    <div className="rounded-xl border border-[#eee8d9] bg-[#faf7ed] p-4 transition-colors hover:border-[#dcd1b7] dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0ead8] text-[#806b43] dark:bg-gray-700 dark:text-amber-200">
    <Icon size={19} />
    </div>

    <div className="min-w-0 flex-1">
    <p className="text-xs font-medium text-[#887d68] dark:text-gray-400">
    {label}
    </p>

    <p className="mt-1 break-words text-sm font-semibold text-[#514936] dark:text-gray-100">
    {display(value)}
    </p>
    </div>
    </div>
    </div>
  );
}

/* -------------------------------------------------------
 *   STATUS CARD
 * ------------------------------------------------------- */

function StatusItem({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  const isPositive =
  value === "Fully Registered" ||
  value === "Eligible" ||
  value === "Active";

  const isNegative =
  value === "Incomplete" ||
  value === "Not Yet Eligible" ||
  value === "Inactive";

  const colorClass = isPositive
  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
  : isNegative
  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  const Icon = isPositive
  ? CheckCircle2
  : isNegative
  ? Clock3
  : Activity;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
    <div>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
    {label}
    </p>

    <p className="mt-2 text-lg font-bold text-gray-800 dark:text-white">
    {value}
    </p>
    </div>

    <div
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
    >
    <Icon size={20} />
    </div>
    </div>

    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
    {description}
    </p>
    </div>
  );
}

/* -------------------------------------------------------
 *   HEALTH FUND CARD
 * ------------------------------------------------------- */

function FundCard({
  title,
  value,
  description,
  icon: Icon,
  featured = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: any;
  featured?: boolean;
}) {
  return (
    <div
    className={`rounded-xl border p-5 ${
      featured
      ? "border-emerald-700 bg-emerald-700 text-white"
      : "border-gray-100 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
    }`}
    >
    <div className="flex items-center justify-between gap-3">
    <p
    className={`text-sm font-medium ${
      featured
      ? "text-emerald-100"
      : "text-gray-500 dark:text-gray-400"
    }`}
    >
    {title}
    </p>

    <div
    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
      featured
      ? "bg-white/15 text-white"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
    }`}
    >
    <Icon size={20} />
    </div>
    </div>

    <p className="mt-5 break-words text-xl font-bold">
    {value}
    </p>

    <p
    className={`mt-2 text-xs ${
      featured
      ? "text-emerald-100"
      : "text-gray-400 dark:text-gray-500"
    }`}
    >
    {description}
    </p>
    </div>
  );
}

/* -------------------------------------------------------
 *   MEMBER DASHBOARD PAGE
 * ------------------------------------------------------- */

export default function MemberDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    member: {},
    membership: {},
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* FETCH MEMBER INFORMATION */

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getAccessToken();

        if (!token) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        const baseUrl = API_URL.replace(/\/$/, "");

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [memberResponse, membershipResponse] =
        await Promise.all([
          fetch(`${baseUrl}/members/me`, { headers }),
                          fetch(`${baseUrl}/members/membership`, { headers }),
        ]);

        if (!memberResponse.ok) {
          throw new Error(
            "Unable to retrieve member information."
          );
        }

        if (!membershipResponse.ok) {
          throw new Error(
            "Unable to retrieve membership information."
          );
        }

        const [memberResult, membershipResult] =
        await Promise.all([
          memberResponse.json(),
                          membershipResponse.json(),
        ]);

        const member = unwrap(memberResult, [
          "data",
          "member",
        ]);

        const membership = unwrap(membershipResult, [
          "data",
          "membership",
        ]);

        if (!cancelled) {
          setData({ member, membership });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.message || "Failed to load dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  /* LOADING STATE */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

      <p className="text-sm text-gray-500 dark:text-gray-400">
      Loading your dashboard...
      </p>
      </div>
    );
  }

  /* ERROR STATE */

  if (error) {
    return (
      <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex items-start gap-3">
      <XCircle size={22} className="mt-1 text-red-600" />

      <div>
      <h2 className="font-semibold text-red-800 dark:text-red-300">
      Dashboard loading error
      </h2>

      <p className="mt-2 text-sm text-red-700 dark:text-red-400">
      {error}
      </p>

      <button
      onClick={() => window.location.reload()}
      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
      Try Again
      </button>
      </div>
      </div>
      </div>
    );
  }

  const { member, membership } = data;

  /* MEMBER NAME */

  const firstName = getValue(member, [
    "firstName",
    "first_name",
  ]);

  const middleName = getValue(member, [
    "middleName",
    "middle_name",
  ]);

  const lastName = getValue(member, [
    "lastName",
    "last_name",
    "surname",
  ]);

  const composedName = [
    firstName,
    middleName,
    lastName,
  ]
  .filter(Boolean)
  .join(" ");

  const fullName =
  composedName ||
  getValue(member, [
    "fullName",
    "full_name",
    "name",
  ]) ||
  "Not available";

    const greetingName =
    firstName ||
    String(fullName).trim().split(/\s+/)[0] ||
    "Member";

    const initials = String(fullName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

    /* MEMBER INFORMATION */

    const nidaNumber = formatNida(
      getValue(member, [
        "nida",
        "nidaNumber",
        "nida_number",
      ])
    );

    const email = getValue(member, [
      "email",
      "emailAddress",
      "email_address",
    ]);

    const accountStatus = display(
      getValue(member, [
        "accountStatus",
        "account_status",
        "status",
      ])
    );

    const registrationDate = formatDate(
      getValue(member, [
        "registrationDate",
        "registration_date",
        "createdAt",
        "created_at",
      ])
    );

    const memberId = getValue(member, [
      "memberId",
      "member_id",
      "membershipNumber",
      "membership_number",
    ]);

    /* REGISTRATION STATUS */

    const registrationProgress = getBooleanStatus(
      getValue(membership, [
        "onboardingCompleted",
        "onboarding_completed",
        "registrationComplete",
        "registration_complete",
      ]) ??
      getValue(member, [
        "onboardingCompleted",
        "onboarding_completed",
      ]),
      "Fully Registered",
      "Incomplete"
    );

    /* HEALTHCARE ELIGIBILITY */

    const healthcareAccess = getBooleanStatus(
      getValue(membership, [
        "healthcareEligible",
        "healthcare_eligible",
        "isEligible",
        "is_eligible",
        "eligibilityStatus",
        "eligibility_status",
      ]),
      "Eligible",
      "Not Yet Eligible"
    );

    const membershipStatus = display(
      getValue(membership, [
        "membershipStatus",
        "membership_status",
        "status",
      ])
    );

    /* HEALTH FUND INFORMATION */

    const walletBalance = getValue(membership, [
      "walletBalance",
      "wallet_balance",
      "balance",
    ]);

    const totalContributions = getValue(membership, [
      "totalContributions",
      "total_contributions",
      "totalContributed",
      "total_contributed",
    ]);

    const lastContribution = getValue(membership, [
      "lastContribution",
      "last_contribution",
      "lastContributionDate",
      "last_contribution_date",
    ]);

    /* DASHBOARD DISPLAY */

    return (
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* WELCOME SECTION */}

      <section className="rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

      <div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs text-emerald-50">
      <HeartPulse size={15} />
      Tujitunze Health Savings
      </div>

      <p className="text-sm text-emerald-100">
      Welcome back,
      </p>

      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
      {greetingName}
      </h1>

      <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50">
      Manage your membership information and monitor
      your health fund contributions from your personal dashboard.
      </p>
      </div>

      <div className="flex items-center gap-3 self-start rounded-xl bg-white/10 p-3 sm:self-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-emerald-700">
      {initials || "M"}
      </div>

      <div>
      <p className="font-semibold">
      {display(fullName)}
      </p>

      <p className="mt-1 text-xs text-emerald-100">
      Tujitunze Member
      </p>
      </div>
      </div>

      </div>
      </section>

      {/* MEMBER INFORMATION */}

      <section>
      <SectionHeading
      title="Member Information"
      description="Your registered personal and account information."
      icon={UserRound}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

      <InfoItem
      label="Full Name"
      value={fullName}
      icon={UserRound}
      />

      <InfoItem
      label="NIDA Number"
      value={nidaNumber}
      icon={ShieldCheck}
      />

      <InfoItem
      label="Email Address"
      value={email}
      icon={Mail}
      />

      <InfoItem
      label="Account Status"
      value={accountStatus}
      icon={Activity}
      />

      <InfoItem
      label="Registration Date"
      value={registrationDate}
      icon={CalendarDays}
      />

      </div>
      </section>

      {/* MEMBERSHIP AND HEALTHCARE ACCESS */}



      {/* HEALTH FUND SUMMARY */}

      <section>
      <SectionHeading
      title="Health Fund Summary"
      description="Your available balance and contribution information."
      icon={Wallet}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

      <FundCard
      title="Wallet Balance"
      value={formatMoney(walletBalance)}
      description="Your recorded health fund balance"
      icon={Wallet}
      featured
      />

      <FundCard
      title="Total Contributions"
      value={formatMoney(totalContributions)}
      description="Your recorded total contributions"
      icon={Coins}
      />

      <FundCard
      title="Last Contribution"
      value={formatDate(lastContribution)}
      description="Date of your last recorded contribution"
      icon={TrendingUp}
      />

      </div>
      </section>

      {/* FOOTER */}

      <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-100 pt-5 text-xs text-gray-400 dark:border-gray-800 sm:flex-row">
      <p>
      Tujitunze Health Savings & Insurance Management System
      </p>

      <p className="flex items-center gap-1.5">
      <ShieldCheck size={14} />
      Your membership information
      </p>
      </div>

      </main>
    );
}
