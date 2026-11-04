"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Landmark,
  Smartphone,
  Package,
  ArrowLeftRight,
  Wallet,
  CalendarDays,
  ReceiptText,
} from "lucide-react";

import { getAccessToken } from "@/lib/utils/permissions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { commonTranslations } from "@/constants/translations/common";
import { memberSavingsTranslations } from "@/constants/translations/member-savings";
import { API_URL } from "@/lib/utils/api";
import PageContainer from "@/components/dashboard/PageContainer";

/* ---------------------------------------------
 *  TYPES
 - *-------------------------------------------- */

type ContributionType =
| "RESOURCE_CONVERSION"
| "TRANSACTION_DIVERSION";

type TransactionStatus =
| "SUCCESS"
| "SUCCESSFUL"
| "PENDING"
| "FAILED"
| "REVERSED"
| string;

interface RecentEntry {
  ledgerId: number;
  principle: ContributionType;
  source: string;
  savedValueTzs: number;
  createdAt: string;
  status?: TransactionStatus;
  reference?: string;
  bankName?: string;
  operator?: string;
}

interface BankContribution {
  bankName: string;
  totalSavedTzs: number;
  count: number;
  transactions?: RecentEntry[];
}

interface TelecomOperatorContribution {
  operator: string;
  totalSavedTzs: number;
  count: number;
  transactions?: RecentEntry[];
}

interface TelecomSourceContribution {
  principle: ContributionType;
  totalSavedTzs: number;
  count: number;
  operators: TelecomOperatorContribution[];
}

interface SavingsSummary {
  totalSavedTzs: number;

  resourceConversion: {
    count: number;
    totalSavedTzs: number;
  };

  transactionDiversion: {
    count: number;
    totalSavedTzs: number;
  };

  recent: RecentEntry[];

  // Additional fields required from the backend
  bankContribution?: {
    totalSavedTzs: number;
    banks: BankContribution[];
  };

  telecomContribution?: {
    totalSavedTzs: number;
    resourceConversion: TelecomSourceContribution;
    transactionDiversion: TelecomSourceContribution;
  };
}

type SavingsView =
| "overview"
| "banks"
| "telecom"
| "bank-details"
| "telecom-operators"
| "operator-details";

/* ---------------------------------------------
 *  HELPERS
 - *-------------------------------------------- */

function formatTsh(amount: number) {
  return `TSh ${Number(amount || 0).toLocaleString("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString("en-TZ");
}

function getStatusStyle(status?: TransactionStatus) {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
    case "SUCCESSFUL":
      return "bg-emerald-100 text-emerald-700";

    case "PENDING":
      return "bg-amber-100 text-amber-700";

    case "FAILED":
    case "REVERSED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getStatusLabel(status?: TransactionStatus) {
  if (!status) return "Confirmed";

  switch (status.toUpperCase()) {
    case "SUCCESS":
      return "Successful";
    case "SUCCESSFUL":
      return "Successful";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REVERSED":
      return "Reversed";
    default:
      return status;
  }
}

/* ---------------------------------------------
 *  REUSABLE COMPONENTS
 - *-------------------------------------------- */

function SavingsCard({
  title,
  amount,
  description,
  icon,
  onClick,
}: {
  title: string;
  amount: number;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition ${
      onClick
      ? "cursor-pointer hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
      : "cursor-default"
    }`}
    >
    <div className="flex items-center justify-between">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
    {icon}
    </div>

    {onClick && (
      <ArrowRight className="h-5 w-5 text-gray-400" />
    )}
    </div>

    <p className="mt-4 text-sm font-medium text-gray-500">
    {title}
    </p>

    <p className="mt-2 text-xl font-bold text-gray-900">
    {formatTsh(amount)}
    </p>

    <p className="mt-2 text-xs text-gray-400">
    {description}
    </p>
    </button>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
    <h2 className="text-xl font-bold text-gray-900">
    {title}
    </h2>

    {description && (
      <p className="mt-1 text-sm text-gray-500">
      {description}
      </p>
    )}
    </div>
  );
}

function TransactionList({
  transactions,
}: {
  transactions: RecentEntry[];
}) {
  if (!transactions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <ReceiptText className="mx-auto h-9 w-9 text-gray-300" />

      <p className="mt-3 font-medium text-gray-700">
      No transactions found
      </p>

      <p className="mt-1 text-sm text-gray-400">
      Transactions will appear here when contribution records are available.
      </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="divide-y divide-gray-100">
    {transactions.map((entry) => (
      <div
      key={entry.ledgerId}
      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
      <div className="min-w-0">
      <p className="font-semibold text-gray-900">
      {entry.source || "Savings contribution"}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
      <CalendarDays className="h-3.5 w-3.5" />

      <span>{formatDate(entry.createdAt)}</span>

      {entry.reference && (
        <span>Reference: {entry.reference}</span>
      )}
      </div>

      <span
      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
        entry.status
      )}`}
      >
      {getStatusLabel(entry.status)}
      </span>
      </div>

      <p className="font-bold text-emerald-700">
      +{formatTsh(entry.savedValueTzs)}
      </p>
      </div>
    ))}
    </div>
    </div>
  );
}

/* ---------------------------------------------
 *  MAIN SAVINGS PAGE
 - *-------------------------------------------- */

export default function SavingsPage() {
  const router = useRouter();

  const { language } = useLanguage();

  const t = memberSavingsTranslations[language];
  const common = commonTranslations[language];

  const [summary, setSummary] = useState<SavingsSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeView, setActiveView] =
  useState<SavingsView>("overview");

  const [selectedBank, setSelectedBank] =
  useState<BankContribution | null>(null);

  const [selectedTelecomSource, setSelectedTelecomSource] =
  useState<TelecomSourceContribution | null>(null);

  const [selectedOperator, setSelectedOperator] =
  useState<TelecomOperatorContribution | null>(null);

  /* ---------------------------------------------
   *    LOAD SAVINGS DATA
   * --------------------------------------------- */

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const controller = new AbortController();

    async function loadSavings() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/members/savings-summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || t.loadError);
        }

        setSummary(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error ? err.message : t.loadError
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSavings();

    return () => controller.abort();
  }, [router, t.loadError]);

  /* ---------------------------------------------
   *    NAVIGATION
   * --------------------------------------------- */

  function goBack() {
    switch (activeView) {
      case "overview":
        router.push("/dashboard");
        break;

      case "banks":
      case "telecom":
        setActiveView("overview");
        break;

      case "bank-details":
        setSelectedBank(null);
        setActiveView("banks");
        break;

      case "telecom-operators":
        setSelectedTelecomSource(null);
        setActiveView("telecom");
        break;

      case "operator-details":
        setSelectedOperator(null);
        setActiveView("telecom-operators");
        break;
    }
  }

  function openBank(bank: BankContribution) {
    setSelectedBank(bank);
    setActiveView("bank-details");
  }

  function openTelecomSource(source: TelecomSourceContribution) {
    setSelectedTelecomSource(source);
    setActiveView("telecom-operators");
  }

  function openOperator(operator: TelecomOperatorContribution) {
    setSelectedOperator(operator);
    setActiveView("operator-details");
  }

  /* ---------------------------------------------
   *    CALCULATED TOTALS
   * --------------------------------------------- */

  const banks = summary?.bankContribution?.banks ?? [];

  const bankTotal =
  summary?.bankContribution?.totalSavedTzs ??
  banks.reduce((total, bank) => total + bank.totalSavedTzs, 0);

  const telecomTotal =
  summary?.telecomContribution?.totalSavedTzs ??
  (summary?.resourceConversion.totalSavedTzs ?? 0) +
  (summary?.transactionDiversion.totalSavedTzs ?? 0);

  const totalSavings =
  summary?.totalSavedTzs ?? bankTotal + telecomTotal;

  const bundleConversion =
  summary?.telecomContribution?.resourceConversion;

  const transactionContributions =
  summary?.telecomContribution?.transactionDiversion;

  /* ---------------------------------------------
   *    PAGE
   * --------------------------------------------- */

  return (
    <PageContainer
    backHref="/dashboard"
    backLabel={common.backToDashboard}
    >
    <div className="mt-4">

    {/* BACK NAVIGATION */}

    {activeView !== "overview" && (
      <button
      type="button"
      onClick={goBack}
      className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
      <ArrowLeft className="h-4 w-4" />
      Back
      </button>
    )}

    {/* PAGE HEADER */}

    <h1 className="text-3xl font-bold text-gray-900">
    {t.title}
    </h1>

    <p className="mt-2 max-w-xl text-gray-600">
    {t.subtitle}
    </p>

    {/* ERROR */}

    {error && (
      <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
      {error}
      </div>
    )}

    {/* LOADING */}

    {loading && (
      <p className="mt-8 text-gray-500">
      {common.loading}
      </p>
    )}

    {!loading && summary && (
      <div className="mt-8">

      {/* =================================
        OVERVIEW
        ================================= */}

        {activeView === "overview" && (
          <>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-700">
          <Wallet className="h-6 w-6" />
          </div>

          <div>
          <p className="text-sm font-medium text-emerald-700">
          Total Savings
          </p>

          <p className="mt-1 text-3xl font-bold text-[#064E3B]">
          {formatTsh(totalSavings)}
          </p>
          </div>
          </div>

          <p className="mt-4 text-sm text-emerald-800">
          Your combined confirmed bank and telecom contributions.
          </p>
          </div>

          <div className="mt-8">
          <SectionHeading
          title="Savings Contributions"
          description="Select a contribution source to view its breakdown and transactions."
          />

          <div className="grid gap-5 sm:grid-cols-2">
          <SavingsCard
          title="Bank Contribution"
          amount={bankTotal}
          description="View contributions from your linked bank accounts."
          icon={<Landmark className="h-6 w-6" />}
          onClick={() => setActiveView("banks")}
          />

          <SavingsCard
          title="Telecom Contribution"
          amount={telecomTotal}
          description="View bundle conversion and transaction contributions."
          icon={<Smartphone className="h-6 w-6" />}
          onClick={() => setActiveView("telecom")}
          />
          </div>
          </div>

          <div className="mt-10">
          <SectionHeading title={t.recentTitle} />

          <TransactionList
          transactions={summary.recent ?? []}
          />
          </div>
          </>
        )}

        {/* =================================
          BANK CONTRIBUTION
          ================================= */}

          {activeView === "banks" && (
            <>
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
            <p className="text-sm font-medium text-emerald-700">
            Total Bank Contributions
            </p>

            <p className="mt-2 text-3xl font-bold text-[#064E3B]">
            {formatTsh(bankTotal)}
            </p>
            </div>

            <SectionHeading
            title="Bank Accounts"
            description="Select a bank to view its contribution history."
            />

            {banks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <Landmark className="mx-auto h-9 w-9 text-gray-300" />

              <p className="mt-3 font-medium text-gray-700">
              No bank contribution records found
              </p>

              <p className="mt-1 text-sm text-gray-400">
              Bank contributions will appear here when records are available.
              </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
              {banks.map((bank) => (
                <SavingsCard
                key={bank.bankName}
                title={bank.bankName}
                amount={bank.totalSavedTzs}
                description={`${bank.count} contribution transactions`}
                icon={<Landmark className="h-6 w-6" />}
                onClick={() => openBank(bank)}
                />
              ))}
              </div>
            )}
            </>
          )}

          {/* =================================
            BANK DETAILS
            ================================= */}

            {activeView === "bank-details" && selectedBank && (
              <>
              <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
              <p className="text-sm font-medium text-emerald-700">
              {selectedBank.bankName} Total Savings
              </p>

              <p className="mt-2 text-3xl font-bold text-[#064E3B]">
              {formatTsh(selectedBank.totalSavedTzs)}
              </p>

              <p className="mt-2 text-sm text-emerald-800">
              {selectedBank.count} contribution transactions
              </p>
              </div>

              <SectionHeading
              title={`${selectedBank.bankName} Transactions`}
              description="Contribution records from this bank account."
              />

              <TransactionList
              transactions={selectedBank.transactions ?? []}
              />
              </>
            )}

            {/* =================================
              TELECOM CONTRIBUTION
              ================================= */}

              {activeView === "telecom" && (
                <>
                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                <p className="text-sm font-medium text-emerald-700">
                Total Telecom Contributions
                </p>

                <p className="mt-2 text-3xl font-bold text-[#064E3B]">
                {formatTsh(telecomTotal)}
                </p>
                </div>

                <SectionHeading
                title="Telecom Contribution Sources"
                description="Choose how your telecom savings were generated."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                <SavingsCard
                title="Bundle Conversion"
                amount={
                  bundleConversion?.totalSavedTzs ??
                  summary.resourceConversion.totalSavedTzs
                }
                description="Savings generated through eligible airtime, data, minutes and SMS conversions."
                icon={<Package className="h-6 w-6" />}
                onClick={() => {
                  if (bundleConversion) {
                    openTelecomSource(bundleConversion);
                  } else {
                    setSelectedTelecomSource({
                      principle: "RESOURCE_CONVERSION",
                      totalSavedTzs:
                      summary.resourceConversion.totalSavedTzs,
                      count: summary.resourceConversion.count,
                      operators: [],
                    });
                    setActiveView("telecom-operators");
                  }
                }}
                />

                <SavingsCard
                title="Transaction Contributions"
                amount={
                  transactionContributions?.totalSavedTzs ??
                  summary.transactionDiversion.totalSavedTzs
                }
                description="Savings generated through eligible mobile money transactions."
                icon={<ArrowLeftRight className="h-6 w-6" />}
                onClick={() => {
                  if (transactionContributions) {
                    openTelecomSource(transactionContributions);
                  } else {
                    setSelectedTelecomSource({
                      principle: "TRANSACTION_DIVERSION",
                      totalSavedTzs:
                      summary.transactionDiversion.totalSavedTzs,
                      count: summary.transactionDiversion.count,
                      operators: [],
                    });
                    setActiveView("telecom-operators");
                  }
                }}
                />
                </div>
                </>
              )}

              {/* =================================
                TELECOM OPERATORS
                ================================= */}

                {activeView === "telecom-operators" &&
                  selectedTelecomSource && (
                    <>
                    <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                    <p className="text-sm font-medium text-emerald-700">
                    {selectedTelecomSource.principle ===
                      "RESOURCE_CONVERSION"
                      ? "Bundle Conversion Savings"
                      : "Transaction Contribution Savings"}
                      </p>

                      <p className="mt-2 text-3xl font-bold text-[#064E3B]">
                      {formatTsh(selectedTelecomSource.totalSavedTzs)}
                      </p>
                      </div>

                      <SectionHeading
                      title="Telecom Operators"
                      description="Select an operator to view its individual contribution records."
                      />

                      {selectedTelecomSource.operators.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                        <Smartphone className="mx-auto h-9 w-9 text-gray-300" />

                        <p className="mt-3 font-medium text-gray-700">
                        Operator breakdown unavailable
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                        The backend must provide operator-level contribution records to display this information.
                        </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                        {selectedTelecomSource.operators.map(
                          (operator) => (
                            <SavingsCard
                            key={operator.operator}
                            title={operator.operator}
                            amount={operator.totalSavedTzs}
                            description={`${operator.count} contribution transactions`}
                            icon={
                              <Smartphone className="h-6 w-6" />
                            }
                            onClick={() => openOperator(operator)}
                            />
                          )
                        )}
                        </div>
                      )}
                      </>
                  )}

                  {/* =================================
                    OPERATOR TRANSACTIONS
                    ================================= */}

                    {activeView === "operator-details" &&
                      selectedOperator && (
                        <>
                        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                        <p className="text-sm font-medium text-emerald-700">
                        {selectedOperator.operator} Total Contributions
                        </p>

                        <p className="mt-2 text-3xl font-bold text-[#064E3B]">
                        {formatTsh(selectedOperator.totalSavedTzs)}
                        </p>

                        <p className="mt-2 text-sm text-emerald-800">
                        {selectedOperator.count} contribution transactions
                        </p>
                        </div>

                        <SectionHeading
                        title={`${selectedOperator.operator} Transactions`}
                        description="Individual savings contributions from this operator."
                        />

                        <TransactionList
                        transactions={selectedOperator.transactions ?? []}
                        />
                        </>
                      )}
                      </div>
    )}

    {/* NO SUMMARY */}

    {!loading && !error && !summary && (
      <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
      <Wallet className="mx-auto h-10 w-10 text-gray-300" />

      <p className="mt-3 font-medium text-gray-700">
      Savings information is unavailable
      </p>

      <p className="mt-1 text-sm text-gray-400">
      Please try again later.
      </p>
      </div>
    )}
    </div>
    </PageContainer>
  );
}
