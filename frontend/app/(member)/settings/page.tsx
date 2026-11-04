
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Smartphone,
  Landmark,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  getAccessToken,
  MEMBERSHIP_JUST_COMPLETED_STORAGE_KEY,
} from "@/lib/utils/permissions";
import { useMembershipGate } from "@/lib/hooks/useMembershipGate";
import { useLanguage } from "@/lib/context/LanguageContext";
import { memberSettingsTranslations } from "@/constants/translations/member-settings";
import { API_URL } from "@/lib/utils/api";
import PageContainer from "@/components/dashboard/PageContainer";
import MembershipGateSpinner from "@/components/dashboard/MembershipGateSpinner";
import Button from "@/components/common/Button";
import InfoTooltip from "@/components/common/InfoTooltip";

interface TelecomOperator {
  operator_id: number;
  operator_name: string;
}

interface Bank {
  bank_id: number;
  bank_name: string;
}

interface LinkedPhoneNumber {
  phoneId: number;
  phoneNumber: string;
  operatorId: number;
  isPrimary: boolean;
  phoneStatus: string;
  simType: string;
}

interface LinkedBankAccount {
  memberBankAccountId: number;
  bankId: number;
  accountNumber: string;
  accountType: string | null;
  isPrimary: boolean;
  accountStatus: string;
  currency: string;
  accountCapacity: string;
}

interface MemberProfile {
  membershipComplete: boolean;
  canManageAccounts: boolean;
  phoneNumbers: LinkedPhoneNumber[];
  bankAccounts: LinkedBankAccount[];
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 " +
  "text-gray-900 outline-none transition " +
  "focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200";

const selectClass = `${inputClass} appearance-none pr-10`;

function useAuthHeaders() {
  const router = useRouter();

  return () => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return null;
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };
}

// =====================================================
// Shared presentational pieces
// =====================================================

// Grouped panel — the "distinct panel with a clear heading" unit every
// settings group renders in. Subtly tinted (bg-gray-50) so it separates
// from the page background without the harder line a border-only card
// gives; inputs inside stay bg-white so they still pop against it.
function SettingsPanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#064E3B]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

// A setting-level sub-heading, one size down from the panel's own
// heading — used when a panel holds more than one distinct control
// (Wallet Sources: phone + bank) so each keeps its own label.
function SubHeading({
  icon: Icon,
  title,
  description,
  tooltip,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      )}
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function Alert({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
}) {
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;
  const styles =
    variant === "error"
      ? "border border-red-100 bg-red-50 text-red-700"
      : "border border-emerald-100 bg-emerald-50 text-emerald-700";

  return (
    <div className={`mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

// Floating, self-dismissing toast — same fixed top-right / auto-dismiss
// treatment as the Dashboard's "?welcome=1" banner
// ((member)/dashboard/page.tsx), reused here since a removal can be
// triggered from either the phone or bank list and a page-level toast
// reads better than duplicating an inline Alert in both places.
function Toast({
  variant,
  children,
  onDismiss,
}: {
  variant: "success" | "error";
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  useEffect(() => {
    const timeout = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed right-4 top-4 z-50 flex items-start gap-3 rounded-lg border border-emerald-100 bg-white px-4 py-3 shadow-xl [animation:fade-in_0.3s_ease-out_forwards] motion-reduce:[animation:none]"
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          variant === "success" ? "bg-emerald-100 text-[#064E3B]" : "bg-red-100 text-red-600"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-gray-900">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-2 shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

// Blocking confirm dialog for a destructive-but-reversible action (unlink,
// not delete — the member can re-add the same number/account afterwards).
// Self-contained rather than routed through components/modals/*.tsx or
// components/ui/Modal.tsx — both are empty stubs with no established
// contract, same reasoning InfoTooltip's own doc comment gives for not
// wiring through components/ui/Tooltip.tsx.
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-bold text-gray-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  required,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={selectClass}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  hint,
  showLabel,
  hideLabel,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  hint?: { text: string; met: boolean };
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />

        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className={`${inputClass} pl-10 pr-10`}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {hint && (
        <p
          className={`mt-1.5 flex items-center gap-1 text-xs ${
            hint.met ? "text-emerald-700" : "text-gray-400"
          }`}
        >
          {hint.met && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
          {hint.text}
        </p>
      )}
    </div>
  );
}

// =====================================================
// Change Password
// =====================================================

function ChangePasswordSection() {
  const getAuthHeaders = useAuthHeaders();
  const { language } = useLanguage();
  const t = memberSettingsTranslations[language];

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmNewPassword) {
      setError(t.newPasswordsDontMatch);
      return;
    }

    if (form.newPassword.length < 8) {
      setError(t.newPasswordTooShort);
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/members/me/password`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.changePasswordErrorFallback);
      }

      setSuccess(t.changePasswordSuccess);
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.genericErrorFallback
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SubHeading icon={Lock} title={t.changePasswordTitle} />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">

        <PasswordField
          id="currentPassword"
          name="currentPassword"
          label={t.currentPassword}
          value={form.currentPassword}
          onChange={handleChange}
          autoComplete="current-password"
          required
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
        />

        <PasswordField
          id="newPassword"
          name="newPassword"
          label={t.newPassword}
          value={form.newPassword}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          hint={{ text: t.passwordMinLengthHint, met: form.newPassword.length >= 8 }}
        />

        <PasswordField
          id="confirmNewPassword"
          name="confirmNewPassword"
          label={t.confirmNewPassword}
          value={form.confirmNewPassword}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          hint={
            form.confirmNewPassword.length > 0
              ? { text: t.passwordsMatchHint, met: form.confirmNewPassword === form.newPassword }
              : undefined
          }
        />

        <Button type="submit" disabled={loading} size="sm">
          {loading ? t.saving : t.changePasswordButton}
        </Button>

      </form>

    </div>
  );
}

// =====================================================
// Linked Accounts — the phone numbers/bank accounts already on file,
// each with a "Remove" (unlink) action. Fetches its own copy of
// /members/me (rather than lifting state up to SettingsPage) so it can
// reconcile the list locally right after a successful DELETE without a
// full-page refetch, the same self-contained-per-section convention the
// Add forms below already use for their own option lists.
// =====================================================

type AccountKind = "phone" | "bank";

type RemoveTarget = { kind: AccountKind; id: number; label: string };
type DeleteTarget = { kind: AccountKind; id: number; label: string };

function LinkedAccountsSection({
  profile,
  onChanged,
}: {
  // Owned by SettingsPage, not fetched here — see walletProfile's doc
  // comment there for why (this list needs to reflect additions made by
  // the sibling Add Phone/Bank sections, not just its own mutations).
  profile: MemberProfile | null;
  onChanged: () => void;
}) {
  const getAuthHeaders = useAuthHeaders();
  const { language } = useLanguage();
  const t = memberSettingsTranslations[language];

  const [operators, setOperators] = useState<TelecomOperator[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [target, setTarget] = useState<RemoveTarget | null>(null);
  const [removing, setRemoving] = useState(false);
  // Keyed "phone:<id>" / "bank:<id>" rather than a bare id — phoneId and
  // memberBankAccountId are separate sequences that can collide on the
  // same number, and reactivation (unlike remove/delete) has no
  // confirm-dialog gate to make that ambiguity harmless.
  const [reactivatingKey, setReactivatingKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ variant: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    fetch(`${API_URL}/members/telecom-operators`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setOperators)
      .catch(() => setOperators([]));

    fetch(`${API_URL}/members/banks`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setBanks)
      .catch(() => setBanks([]));
  }, []);

  const operatorName = (operatorId: number) =>
    operators.find((operator) => operator.operator_id === operatorId)?.operator_name ??
    t.unknownNetwork;

  const bankName = (bankId: number) =>
    banks.find((bank) => bank.bank_id === bankId)?.bank_name ?? t.unknownBank;

  const handleConfirmRemove = async () => {
    if (!target) return;

    const headers = getAuthHeaders();
    if (!headers) return;

    setRemoving(true);

    try {
      const path =
        target.kind === "phone"
          ? `/members/phone-numbers/${target.id}`
          : `/members/bank-accounts/${target.id}`;

      const response = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.removeAccountErrorFallback);
      }

      // Re-fetches the shared profile rather than splicing a local copy
      // — the account still shows here afterward (marked Inactive by the
      // backend, not removed from the list) so the member can reactivate
      // it or delete it permanently below, rather than disappearing into
      // a state with no way back in.
      onChanged();

      setToast({ variant: "success", message: t.removeAccountSuccess });
    } catch (err) {
      setToast({
        variant: "error",
        message: err instanceof Error ? err.message : t.removeAccountErrorFallback,
      });
    } finally {
      setRemoving(false);
      setTarget(null);
    }
  };

  const handleReactivate = async (kind: AccountKind, id: number) => {
    const headers = getAuthHeaders();
    if (!headers) return;

    const key = `${kind}:${id}`;
    setReactivatingKey(key);

    try {
      const path =
        kind === "phone"
          ? `/members/phone-numbers/${id}/reactivate`
          : `/members/bank-accounts/${id}/reactivate`;

      const response = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.reactivateAccountErrorFallback);
      }

      onChanged();

      setToast({ variant: "success", message: t.reactivateAccountSuccess });
    } catch (err) {
      setToast({
        variant: "error",
        message:
          err instanceof Error ? err.message : t.reactivateAccountErrorFallback,
      });
    } finally {
      setReactivatingKey(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const headers = getAuthHeaders();
    if (!headers) return;

    setDeleting(true);

    try {
      const path =
        deleteTarget.kind === "phone"
          ? `/members/phone-numbers/${deleteTarget.id}/permanent`
          : `/members/bank-accounts/${deleteTarget.id}/permanent`;

      const response = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.deleteAccountErrorFallback);
      }

      // Here it really does come out of the list — unlike remove above,
      // this is a real row DELETE, so there's nothing left to reactivate.
      onChanged();

      setToast({ variant: "success", message: t.deleteAccountSuccess });
    } catch (err) {
      setToast({
        variant: "error",
        message: err instanceof Error ? err.message : t.deleteAccountErrorFallback,
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (!profile) {
    return null;
  }

  // Every member has at least one phone number from registration, so
  // this is realistically never empty — kept as a guard rather than an
  // assumption.
  if (profile.phoneNumbers.length === 0 && profile.bankAccounts.length === 0) {
    return null;
  }

  return (
    <div>
      <SubHeading title={t.linkedAccountsTitle} description={t.linkedAccountsDescription} />

      <ul className="mt-4 divide-y divide-gray-200 rounded-lg bg-white">
        {profile.phoneNumbers.map((phone) => {
          const inactive = phone.phoneStatus === "Inactive";
          const reactivateKey = `phone:${phone.phoneId}`;

          return (
            <li
              key={`phone-${phone.phoneId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 first:pt-3 last:pb-3"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone
                  className={`h-4 w-4 shrink-0 ${inactive ? "text-gray-300" : "text-gray-400"}`}
                  aria-hidden
                />
                <div>
                  <p className={`font-semibold ${inactive ? "text-gray-500" : "text-gray-900"}`}>
                    {phone.phoneNumber}
                    {phone.isPrimary && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-[#064E3B]">
                        {t.primary}
                      </span>
                    )}
                    {phone.simType === "M2M" && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {t.m2mBadge}
                      </span>
                    )}
                    {inactive && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                        {t.inactiveBadge}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{operatorName(phone.operatorId)}</p>
                </div>
              </div>

              {profile.canManageAccounts && (
                <div className="flex items-center gap-3">
                  {inactive ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReactivate("phone", phone.phoneId)}
                          disabled={reactivatingKey === reactivateKey}
                          className="text-sm font-semibold text-[#064E3B] hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reactivatingKey === reactivateKey ? t.reactivating : t.reactivate}
                        </button>
                        <InfoTooltip text={t.reactivateAccountTooltip} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "phone",
                              id: phone.phoneId,
                              label: phone.phoneNumber,
                            })
                          }
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          {t.deletePermanently}
                        </button>
                        <InfoTooltip text={t.deleteAccountTooltip} />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTarget({ kind: "phone", id: phone.phoneId, label: phone.phoneNumber })
                        }
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        {t.remove}
                      </button>
                      <InfoTooltip text={t.removeAccountTooltip} />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}

        {profile.bankAccounts.map((account) => {
          const inactive = account.accountStatus === "Inactive";
          const reactivateKey = `bank:${account.memberBankAccountId}`;
          const label = `···· ${account.accountNumber.slice(-4)}`;

          return (
            <li
              key={`bank-${account.memberBankAccountId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 first:pt-3 last:pb-3"
            >
              <div className="flex items-center gap-2.5">
                <Landmark
                  className={`h-4 w-4 shrink-0 ${inactive ? "text-gray-300" : "text-gray-400"}`}
                  aria-hidden
                />
                <div>
                  <p className={`font-semibold ${inactive ? "text-gray-500" : "text-gray-900"}`}>
                    {bankName(account.bankId)} · {label}
                    {account.isPrimary && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-[#064E3B]">
                        {t.primary}
                      </span>
                    )}
                    {inactive && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                        {t.inactiveBadge}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {account.accountStatus} · {account.currency} · {account.accountCapacity}
                  </p>
                </div>
              </div>

              {profile.canManageAccounts && (
                <div className="flex items-center gap-3">
                  {inactive ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReactivate("bank", account.memberBankAccountId)}
                          disabled={reactivatingKey === reactivateKey}
                          className="text-sm font-semibold text-[#064E3B] hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reactivatingKey === reactivateKey ? t.reactivating : t.reactivate}
                        </button>
                        <InfoTooltip text={t.reactivateAccountTooltip} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "bank",
                              id: account.memberBankAccountId,
                              label,
                            })
                          }
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          {t.deletePermanently}
                        </button>
                        <InfoTooltip text={t.deleteAccountTooltip} />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTarget({
                            kind: "bank",
                            id: account.memberBankAccountId,
                            label,
                          })
                        }
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        {t.remove}
                      </button>
                      <InfoTooltip text={t.removeAccountTooltip} />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {target && (
        <ConfirmDialog
          title={t.removeAccountConfirmTitle}
          message={t.removeAccountConfirmMessageTemplate.replace("{account}", target.label)}
          confirmLabel={removing ? t.removing : t.remove}
          cancelLabel={t.cancel}
          busy={removing}
          onConfirm={handleConfirmRemove}
          onCancel={() => setTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t.deleteAccountConfirmTitle}
          message={t.deleteAccountConfirmMessageTemplate.replace("{account}", deleteTarget.label)}
          confirmLabel={deleting ? t.deleting : t.deletePermanently}
          cancelLabel={t.cancel}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && (
        <Toast variant={toast.variant} onDismiss={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
    </div>
  );
}

// =====================================================
// Add Phone Number — an income source for the wallet
// (mobile money). The registration number can be re-entered here too;
// the backend treats that as already-linked instead of an error.
// =====================================================

// TCRA-aligned caps a member can hold under one NIDA — mirrors
// MembersService.assertSimSlotAvailable. Frontend-side so the "Add
// Phone Number" button can disable itself once a network/SIM-type
// combination is full, instead of only failing after submit; the
// backend check is still the real boundary (same UX-shortcut caveat as
// the saving-consent gate above).
const STANDARD_SIM_LIMIT_PER_OPERATOR = 1;
const M2M_SIM_LIMIT_PER_OPERATOR = 4;

function AddPhoneNumberSection({
  blocked,
  profile,
  onAdded,
}: {
  blocked: boolean;
  // Owned by SettingsPage — see walletProfile's doc comment there. Used
  // for the per-operator SIM-slot count below, so it needs to reflect
  // removals/reactivations made from LinkedAccountsSection too, not just
  // this section's own adds.
  profile: MemberProfile | null;
  onAdded: () => void;
}) {
  const getAuthHeaders = useAuthHeaders();
  const { language } = useLanguage();
  const t = memberSettingsTranslations[language];

  const [operators, setOperators] = useState<TelecomOperator[]>([]);
  const [form, setForm] = useState({
    operatorId: "",
    phoneNumber: "",
    simType: "Standard",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const linkedPhones = profile?.phoneNumbers ?? [];

  useEffect(() => {
    const loadOperators = async () => {
      try {
        const response = await fetch(
          `${API_URL}/members/telecom-operators`
        );
        if (response.ok) setOperators(await response.json());
      } catch {
        // Options list is a nice-to-have here; the form still submits.
      }
    };
    loadOperators();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  };

  const selectedOperator = operators.find(
    (operator) => String(operator.operator_id) === form.operatorId
  );

  const limitForSelection =
    form.simType === "M2M"
      ? M2M_SIM_LIMIT_PER_OPERATOR
      : STANDARD_SIM_LIMIT_PER_OPERATOR;

  const activeCountForSelection = selectedOperator
    ? linkedPhones.filter(
        (phone) =>
          phone.operatorId === selectedOperator.operator_id &&
          phone.simType === form.simType &&
          phone.phoneStatus !== "Inactive"
      ).length
    : 0;

  const slotFull = !!selectedOperator && activeCountForSelection >= limitForSelection;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Mirrors the backend's own check (MembersService.addPhoneNumber) —
    // this is a UX shortcut, not the real boundary, so a request that
    // somehow reaches the API anyway is still rejected there.
    if (blocked) {
      setError(t.savingConsentRequiredAlert);
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/members/phone-numbers`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            phoneNumber: form.phoneNumber,
            simType: form.simType,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.addPhoneErrorFallback);
      }

      setSuccess(t.addPhoneSuccessTemplate.replace("{phoneNumber}", data.phoneNumber));
      // Refetches the shared profile — updates this section's own
      // per-operator slot count AND LinkedAccountsSection's list from the
      // same round trip, instead of only patching a local copy here.
      onAdded();
      setForm({ operatorId: "", phoneNumber: "", simType: "Standard" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.genericErrorFallback
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SubHeading
        icon={Smartphone}
        title={t.addPhoneTitle}
        description={t.addPhoneDescription}
        tooltip={t.addAccountTooltip}
      />

      {blocked && <Alert variant="error">{t.savingConsentRequiredAlert}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">

        <SelectField
          id="operatorId"
          name="operatorId"
          label={t.network}
          value={form.operatorId}
          onChange={handleChange}
          required
        >
          <option value="" disabled>
            {t.selectNetwork}
          </option>
          {operators.map((operator) => (
            <option key={operator.operator_id} value={operator.operator_id}>
              {operator.operator_name}
            </option>
          ))}
        </SelectField>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <label
              htmlFor="simType"
              className="block text-sm font-semibold text-gray-700"
            >
              {t.simType}
            </label>
            <InfoTooltip
              text={
                form.simType === "M2M"
                  ? t.simTypeTooltipM2M
                  : t.simTypeTooltipStandard
              }
            />
          </div>
          <div className="relative">
            <select
              id="simType"
              name="simType"
              value={form.simType}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="Standard">{t.simTypeStandard}</option>
              <option value="M2M">{t.simTypeM2M}</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="phoneNumber"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            {t.phoneNumber}
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder={t.phoneNumberPlaceholder}
            required
            className={inputClass}
          />
        </div>

        {slotFull && selectedOperator && (
          <Alert variant="error">
            {(form.simType === "M2M" ? t.simSlotFullM2M : t.simSlotFullStandard)
              .replace("{operator}", selectedOperator.operator_name)
              .replace("{limit}", String(limitForSelection))}
          </Alert>
        )}

        <Button type="submit" disabled={loading || blocked || slotFull} size="sm">
          {loading ? t.adding : t.addPhoneButton}
        </Button>

      </form>

    </div>
  );
}

// =====================================================
// Add Bank Account — another income source for the wallet.
// =====================================================

function AddBankAccountSection({
  blocked,
  onAdded,
}: {
  blocked: boolean;
  // Triggers SettingsPage's shared profile refetch — see
  // walletProfile's doc comment there. LinkedAccountsSection needs this
  // to show a bank account added here without a page reload.
  onAdded: () => void;
}) {
  const getAuthHeaders = useAuthHeaders();
  const { language } = useLanguage();
  const t = memberSettingsTranslations[language];

  const [banks, setBanks] = useState<Bank[]>([]);
  const [form, setForm] = useState({
    bankId: "",
    accountNumber: "",
    accountType: "",
    currency: "TZS",
    accountCapacity: "Individual",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const response = await fetch(`${API_URL}/members/banks`);
        if (response.ok) setBanks(await response.json());
      } catch {
        // Options list is a nice-to-have here; the form still submits.
      }
    };
    loadBanks();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Mirrors the backend's own check (MembersService.addBankAccount) —
    // this is a UX shortcut, not the real boundary, so a request that
    // somehow reaches the API anyway is still rejected there.
    if (blocked) {
      setError(t.savingConsentRequiredAlert);
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/members/bank-accounts`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            bankId: Number(form.bankId),
            accountNumber: form.accountNumber,
            accountType: form.accountType,
            currency: form.currency,
            accountCapacity: form.accountCapacity,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.addBankErrorFallback);
      }

      setSuccess(t.addBankSuccessTemplate.replace("{accountNumber}", data.accountNumber));
      onAdded();
      setForm({
        bankId: "",
        accountNumber: "",
        accountType: "",
        currency: "TZS",
        accountCapacity: "Individual",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.genericErrorFallback
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SubHeading
        icon={Landmark}
        title={t.addBankTitle}
        description={t.addBankDescription}
        tooltip={t.addAccountTooltip}
      />

      {blocked && <Alert variant="error">{t.savingConsentRequiredAlert}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">

        <SelectField
          id="bankId"
          name="bankId"
          label={t.bank}
          value={form.bankId}
          onChange={handleChange}
          required
        >
          <option value="" disabled>
            {t.selectBank}
          </option>
          {banks.map((bank) => (
            <option key={bank.bank_id} value={bank.bank_id}>
              {bank.bank_name}
            </option>
          ))}
        </SelectField>

        <div>
          <label
            htmlFor="accountNumber"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            {t.accountNumber}
          </label>
          <input
            id="accountNumber"
            name="accountNumber"
            type="text"
            value={form.accountNumber}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <SelectField
          id="accountType"
          name="accountType"
          label={t.accountType}
          value={form.accountType}
          onChange={handleChange}
          required
        >
          <option value="" disabled>
            {t.selectAccountType}
          </option>
          <option value="Savings">{t.savings}</option>
          <option value="Current">{t.current}</option>
        </SelectField>

        <SelectField
          id="currency"
          name="currency"
          label={t.currency}
          value={form.currency}
          onChange={handleChange}
          required
        >
          <option value="TZS">TZS</option>
          <option value="USD">USD</option>
        </SelectField>

        <SelectField
          id="accountCapacity"
          name="accountCapacity"
          label={t.accountCapacity}
          value={form.accountCapacity}
          onChange={handleChange}
          required
        >
          <option value="Individual">{t.capacityIndividual}</option>
          <option value="Joint">{t.capacityJoint}</option>
        </SelectField>

        <Button type="submit" disabled={loading || blocked} size="sm">
          {loading ? t.adding : t.addBankButton}
        </Button>

      </form>

    </div>
  );
}

// =====================================================
// Automatic Micro-Savings consent — off by request only; every member
// starts opted in, matching the backend default (absence of a
// member_saving_consents row means consented).
// =====================================================

function SavingConsentSection({
  onConsentChange,
}: {
  // Notified on both the initial fetch and every successful toggle so
  // SettingsPage — which renders the Add Phone/Bank forms in a separate
  // panel — can gate them on the same consent value without this section
  // giving up its own self-contained fetch/toggle state.
  onConsentChange?: (consented: boolean) => void;
}) {
  const getAuthHeaders = useAuthHeaders();
  const { language } = useLanguage();
  const t = memberSettingsTranslations[language];

  const [consented, setConsented] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers) return;

    fetch(`${API_URL}/members/saving-consent`, { headers })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setConsented(data.consented);
          onConsentChange?.(data.consented);
        }
      })
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;

    const previousValue = consented;
    const nextValue = !consented;
    setError("");
    setSuccess("");
    setSaving(true);

    // Optimistic: flip the switch (and notify the parent) the instant
    // the click happens, rather than waiting on the PATCH round-trip.
    // Previously `consented` only updated inside the success branch
    // below, so on any real network latency the switch — and the whole
    // button, dimmed via disabled:opacity-60 while `saving` is true —
    // looked stuck in its old position for the entire request instead
    // of responding to the click. Rolled back in the catch block below
    // if the request actually fails, so this never leaves the UI
    // showing a state the backend didn't accept.
    setConsented(nextValue);
    onConsentChange?.(nextValue);

    try {
      const response = await fetch(`${API_URL}/members/saving-consent`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ consented: nextValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.savingConsentUpdateErrorFallback);
      }

      setSuccess(t.savingConsentUpdateSuccess);
    } catch (err) {
      setConsented(previousValue);
      onConsentChange?.(previousValue);
      setError(err instanceof Error ? err.message : t.genericErrorFallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SubHeading title={t.savingConsentTitle} description={t.savingConsentDescription} />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-white p-4">
        <span id="saving-consent-label" className="text-sm font-medium text-gray-700">
          {consented ? t.savingConsentOn : t.savingConsentOff}
        </span>

        {/* aria-labelledby (not just the visible text next to it) gives
            this its accessible name — a bare role="switch" button
            otherwise announces only "switch, on/off" with nothing
            saying what it controls. aria-busy mirrors the optimistic
            update above: the switch has already visually moved by the
            time this is true, but a screen reader user still benefits
            from knowing the change is being confirmed with the server. */}
        <button
          type="button"
          role="switch"
          aria-checked={consented}
          aria-labelledby="saving-consent-label"
          aria-busy={saving}
          disabled={!loaded || saving}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            consented ? "bg-[#064E3B]" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
              consented ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Page shell — two tabs (User Settings / Security Settings), each
// holding its own set of grouped panels.
// =====================================================

type TabKey = "user" | "security";

function SettingsTabs({
  active,
  onChange,
  userLabel,
  securityLabel,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  userLabel: string;
  securityLabel: string;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "user", label: userLabel },
    { key: "security", label: securityLabel },
  ];

  return (
    <div role="tablist" className="mt-6 flex gap-6 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = active === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 rounded-t ${
              isActive ? "text-[#064E3B]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#064E3B]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const getAuthHeaders = useAuthHeaders();
  const { language } = useLanguage();
  const t = memberSettingsTranslations[language];
  const [activeTab, setActiveTab] = useState<TabKey>("user");
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  // null while SavingConsentSection's own fetch is still in flight —
  // treated as "not blocked" below so the Add forms don't flash a false
  // warning before the real value is known.
  const [savingConsent, setSavingConsent] = useState<boolean | null>(null);

  // Owned here (not by each section individually) so LinkedAccountsSection,
  // AddPhoneNumberSection, and AddBankAccountSection all read the same
  // snapshot and can all trigger the same refetch. Previously each of the
  // three fetched its own copy of /members/me and never told the others
  // about a change — adding a phone number in AddPhoneNumberSection didn't
  // appear in LinkedAccountsSection's list (and didn't update its own
  // per-operator SIM-slot count either) until a full page reload.
  const [walletProfile, setWalletProfile] = useState<MemberProfile | null>(null);

  const refreshWalletProfile = useCallback(() => {
    const headers = getAuthHeaders();
    if (!headers) return;

    fetch(`${API_URL}/members/me`, { headers })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: MemberProfile | null) => {
        if (data) setWalletProfile(data);
      })
      .catch(() => {
        // Leaves the previous snapshot in place — a transient refetch
        // failure shouldn't blank out an already-loaded list.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getAuthHeaders is a fresh closure every render (see its own definition); intentionally excluded so this identity is stable across renders.
  }, []);

  useEffect(() => {
    refreshWalletProfile();
  }, [refreshWalletProfile]);

  // Same requireComplete gate the Dashboard uses — an incomplete member
  // is redirected to /onboarding/mobile-money before any of this page's
  // own data (change password, linked accounts) ever fetches.
  const membershipComplete = useMembershipGate("requireComplete");

  // One-shot banner set by MobileMoneyAccountForm right after it finishes
  // (see permissions.ts's MEMBERSHIP_JUST_COMPLETED_STORAGE_KEY doc
  // comment) — read once and cleared immediately so it doesn't reappear
  // on a later visit to this page.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(MEMBERSHIP_JUST_COMPLETED_STORAGE_KEY) === "1") {
        sessionStorage.removeItem(MEMBERSHIP_JUST_COMPLETED_STORAGE_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external signal (sessionStorage flag set by a prior page), not derivable during render
        setShowOnboardingBanner(true);
      }
    } catch {
      // sessionStorage can throw in a locked-down browsing context — the
      // banner just won't show, no functional loss.
    }
  }, []);

  if (membershipComplete !== true) {
    return <MembershipGateSpinner label={t.loadingSettings} />;
  }

  return (
    <PageContainer>

      <div className="mx-auto max-w-2xl">

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          {t.title}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {t.description}
        </p>

        {showOnboardingBanner && (
          <Alert variant="success">{t.onboardingCompleteBanner}</Alert>
        )}

        <SettingsTabs
          active={activeTab}
          onChange={setActiveTab}
          userLabel={t.userSettingsTab}
          securityLabel={t.securitySettingsTab}
        />

        <div className="mt-8 space-y-6">

          {activeTab === "user" ? (

            <>
              <SettingsPanel
                icon={Sparkles}
                title={t.microSavingsGroupTitle}
                description={t.microSavingsGroupDescription}
              >
                <SavingConsentSection onConsentChange={setSavingConsent} />
              </SettingsPanel>

              <SettingsPanel
                icon={Phone}
                title={t.walletSourcesGroupTitle}
                description={t.walletSourcesGroupDescription}
              >
                <div className="space-y-8">
                  <LinkedAccountsSection
                    profile={walletProfile}
                    onChanged={refreshWalletProfile}
                  />
                  <div className="border-t border-gray-200 pt-8">
                    <AddPhoneNumberSection
                      blocked={savingConsent === false}
                      profile={walletProfile}
                      onAdded={refreshWalletProfile}
                    />
                  </div>
                  <div className="border-t border-gray-200 pt-8">
                    <AddBankAccountSection
                      blocked={savingConsent === false}
                      onAdded={refreshWalletProfile}
                    />
                  </div>
                </div>
              </SettingsPanel>
            </>

          ) : (

            <SettingsPanel
              icon={ShieldCheck}
              title={t.accountSecurityGroupTitle}
              description={t.accountSecurityGroupDescription}
            >
              <ChangePasswordSection />
            </SettingsPanel>

          )}

        </div>

      </div>

    </PageContainer>
  );
}
