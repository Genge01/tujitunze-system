
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/utils/permissions";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PageContainer from "@/components/dashboard/PageContainer";
import StatGroup from "@/components/dashboard/StatGroup";
import StatisticCard from "@/components/cards/StatisticCard";
import { useLanguage, type Language } from "@/lib/context/LanguageContext";
import { superAdminSavingRulesTranslations } from "@/constants/translations/super-admin-saving-rules";
import { superAdminDashboardTranslations } from "@/constants/translations/super-admin-dashboard";
import { API_URL } from "@/lib/utils/api";

import {
  BadgeCheckIcon,
  ClipboardIcon,
  CoinsIcon,
  SwapIcon,
} from "@/components/common/SidebarIcons";

type Principle = "RESOURCE_CONVERSION" | "TRANSACTION_DIVERSION";

interface SavingRule {
  ruleId: number;
  ruleType: string;
  principle: Principle;
  transactionType: string | null;
  channel: string | null;
  ratePercent: string;
  minimumAmount: string;
  effectiveDate: string;
  isActive: boolean;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;

    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

type SavingRulesText =
(typeof superAdminSavingRulesTranslations)[Language];

function RuleTable({
  items,
  t,
  savingRuleId,
  onRateChange,
  onActiveChange,
  onSave,
}: {
  items: SavingRule[];
  t: SavingRulesText;
  savingRuleId: number | null;
  onRateChange: (ruleId: number, value: string) => void;
  onActiveChange: (ruleId: number, value: boolean) => void;
  onSave: (rule: SavingRule) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
    <table className="w-full text-left text-sm">
    <thead className="bg-gray-50 text-xs uppercase text-slate-500">
    <tr>
    <th className="px-6 py-3 font-semibold">{t.ruleType}</th>
    <th className="px-6 py-3 font-semibold">{t.ratePercent}</th>
    <th className="px-6 py-3 font-semibold">{t.active}</th>
    <th className="px-6 py-3 font-semibold">{t.lastUpdated}</th>
    <th className="px-6 py-3 font-semibold"></th>
    </tr>
    </thead>

    <tbody className="divide-y divide-gray-100">
    {items.map((rule) => (
      <tr
      key={rule.ruleId}
      className="transition hover:bg-gray-50"
      >
      <td className="px-6 py-4 font-semibold text-gray-900">
      {rule.ruleType}
      </td>

      <td className="px-6 py-4">
      <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      value={rule.ratePercent}
      onChange={(e) =>
        onRateChange(rule.ruleId, e.target.value)
      }
      className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
      />
      </td>

      <td className="px-6 py-4">
      <label className="inline-flex items-center gap-2">
      <input
      type="checkbox"
      checked={rule.isActive}
      onChange={(e) =>
        onActiveChange(rule.ruleId, e.target.checked)
      }
      />

      <span className="text-slate-600">
      {rule.isActive ? t.active : t.inactive}
      </span>
      </label>
      </td>

      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
      {new Date(rule.effectiveDate).toLocaleDateString("en-TZ")}
      </td>

      <td className="px-6 py-4 text-right">
      <button
      type="button"
      onClick={() => onSave(rule)}
      disabled={savingRuleId === rule.ruleId}
      className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
      {savingRuleId === rule.ruleId ? t.saving : t.save}
      </button>
      </td>
      </tr>
    ))}
    </tbody>
    </table>
    </div>
  );
}

export default function SuperAdminSavingRulesPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = superAdminSavingRulesTranslations[language];
  const dt = superAdminDashboardTranslations[language];

  const [rules, setRules] = useState<SavingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [savingRuleId, setSavingRuleId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");

  const lastSyncedRulesRef = useRef<Map<number, SavingRule>>(
    new Map()
  );

  const loadRules = () => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${API_URL}/super-admin/saving-rules`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(async (response) => {
      const body = await response.json();

      if (!response.ok) {
        throw new Error(extractMessage(body, t.loadError));
      }

      return body as SavingRule[];
    })
    .then((body) => {
      lastSyncedRulesRef.current = new Map(
        body.map((rule) => [rule.ruleId, rule])
      );

      setRules(body);
    })
    .catch((err) => {
      setLoadError(
        err instanceof Error ? err.message : t.loadError
      );
    })
    .finally(() => {
      setLoading(false);
    });
  };

  useEffect(loadRules, [router, t.loadError]);

  // Revalidate rules when the browser tab receives focus.
  useEffect(() => {
    const revalidate = async () => {
      const token = getAccessToken();

      if (!token) return;

      try {
        const response = await fetch(
          `${API_URL}/super-admin/saving-rules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) return;

        const serverRules = (await response.json()) as SavingRule[];

        setRules((current) =>
        serverRules.map((serverRule) => {
          const currentRow = current.find(
            (rule) => rule.ruleId === serverRule.ruleId
          );

          const lastSynced = lastSyncedRulesRef.current.get(
            serverRule.ruleId
          );

          const isDirty =
          currentRow &&
          JSON.stringify(currentRow) !== JSON.stringify(lastSynced);

          return isDirty ? currentRow! : serverRule;
        })
        );

        lastSyncedRulesRef.current = new Map(
          serverRules.map((rule) => [rule.ruleId, rule])
        );
      } catch {
        // Keep the currently displayed rules if revalidation fails.
      }
    };

    window.addEventListener("focus", revalidate);

    return () => {
      window.removeEventListener("focus", revalidate);
    };
  }, []);

  const updateRuleField = (
    ruleId: number,
    field: "ratePercent" | "isActive",
    value: string | boolean
  ) => {
    if (field === "isActive" && value === false) {
      const rule = rules.find((item) => item.ruleId === ruleId);

      if (
        rule?.principle === "RESOURCE_CONVERSION" &&
        !window.confirm(
          t.deactivateResourceConversionConfirm.replace(
            "{ruleType}",
            rule.ruleType
          )
        )
      ) {
        return;
      }
    }

    setRules((previous) =>
    previous.map((rule) =>
    rule.ruleId === ruleId
    ? { ...rule, [field]: value }
    : rule
    )
    );
  };

  const saveRule = async (rule: SavingRule) => {
    setSaveError("");

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setSavingRuleId(rule.ruleId);

    try {
      const response = await fetch(
        `${API_URL}/super-admin/saving-rules/${rule.ruleId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ratePercent: Number(rule.ratePercent),
                               isActive: rule.isActive,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(extractMessage(body, t.saveError));
      }

      lastSyncedRulesRef.current.set(
        rule.ruleId,
        body as SavingRule
      );

      setRules((previous) =>
      previous.map((item) =>
      item.ruleId === rule.ruleId ? body : item
      )
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.saveError
      );
    } finally {
      setSavingRuleId(null);
    }
  };

  const resourceRules = rules.filter(
    (rule) => rule.principle === "RESOURCE_CONVERSION"
  );

  const transactionRules = rules.filter(
    (rule) => rule.principle === "TRANSACTION_DIVERSION"
  );

  const activeRuleCount = rules.filter(
    (rule) => rule.isActive
  ).length;

  return (
    <div>
    <DashboardHeader title={t.title} />

    <PageContainer maxWidth="6xl">
    <p className="mt-6 max-w-3xl text-sm text-slate-500">
    {t.subtitle}
    </p>

    {loadError && (
      <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
      {loadError}
      </div>
    )}

    {saveError && (
      <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
      {saveError}
      </div>
    )}

    {!loading && (
      <StatGroup title={dt.sectionGovernance}>
      <StatisticCard
      label={dt.activeRules}
      value={activeRuleCount}
      icon={BadgeCheckIcon}
      />

      <StatisticCard
      label={dt.inactiveRules}
      value={rules.length - activeRuleCount}
      icon={ClipboardIcon}
      />

      <StatisticCard
      label={dt.resourceConversionRules}
      value={resourceRules.length}
      icon={CoinsIcon}
      />

      <StatisticCard
      label={dt.transactionDiversionRules}
      value={transactionRules.length}
      icon={SwapIcon}
      />
      </StatGroup>
    )}

    {loading ? (
      <p className="mt-8 text-slate-500">{t.loading}</p>
    ) : (
      <div className="mt-10 space-y-8">
      <div>
      <h2 className="mb-2 text-lg font-bold text-gray-900">
      {t.resourceConversionHeading}
      </h2>

      <p className="mb-3 text-sm text-emerald-700">
      {t.resourceConversionNote}
      </p>

      <RuleTable
      items={resourceRules}
      t={t}
      savingRuleId={savingRuleId}
      onRateChange={(ruleId, value) =>
        updateRuleField(ruleId, "ratePercent", value)
      }
      onActiveChange={(ruleId, value) =>
        updateRuleField(ruleId, "isActive", value)
      }
      onSave={saveRule}
      />
      </div>

      <div>
      <h2 className="mb-2 text-lg font-bold text-gray-900">
      {t.transactionDiversionHeading}
      </h2>

      <p className="mb-3 text-sm text-amber-700">
      {t.transactionDiversionNote}
      </p>

      <RuleTable
      items={transactionRules}
      t={t}
      savingRuleId={savingRuleId}
      onRateChange={(ruleId, value) =>
        updateRuleField(ruleId, "ratePercent", value)
      }
      onActiveChange={(ruleId, value) =>
        updateRuleField(ruleId, "isActive", value)
      }
      onSave={saveRule}
      />
      </div>
      </div>
    )}
    </PageContainer>
    </div>
  );
}
