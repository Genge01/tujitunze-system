
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/utils/permissions";
import { formatNidaNumber } from "@/lib/utils/nida";
import { API_URL } from "@/lib/utils/api";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PageContainer from "@/components/dashboard/PageContainer";
import StatGroup from "@/components/dashboard/StatGroup";
import StatisticCard from "@/components/cards/StatisticCard";
import InstitutionStaffManagementPage from "@/components/super-admin/InstitutionStaffManagementPage";

import { useLanguage } from "@/lib/context/LanguageContext";
import { superAdminDashboardTranslations } from "@/constants/translations/super-admin-dashboard";

import {
  BuildingIcon,
  PlusIcon,
  ShieldIcon,
  SignalIcon,
  UserCircleIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/common/SidebarIcons";

interface SuperAdminDashboardData {
  usersByRole: Record<string, number>;
  banksByStatus: Record<string, number>;
  operatorsByStatus: Record<string, number>;
  providersByStatus: Record<string, number>;
}

type AccountStatus = "Active" | "Deactivated" | "Deleted" | string;

interface Administrator {
  userId: number;
  firstName: string;
  secondName: string | null;
  surname: string;
  email: string | null;
  status?: string;
  accountStatus?: AccountStatus;
  createdAt: string;
  role: string;
}

interface AdminForm {
  firstName: string;
  secondName: string;
  surname: string;
  email: string;
  nidaNumber: string;
  password: string;
}

type AccountAction = "deactivate" | "activate" | "delete";

type StaffPanel =
  | "bank-staff"
  | "telecom-staff"
  | "insurance-staff";

const EMPTY_ADMIN_FORM: AdminForm = {
  firstName: "",
  secondName: "",
  surname: "",
  email: "",
  nidaNumber: "",
  password: "",
};

function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce(
    (sum, count) => sum + count,
                                      0
  );
}

function extractErrorMessage(
  body: unknown,
  fallback: string
): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body
  ) {
    const message = (body as { message: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

function getAccountStatus(admin: Administrator): AccountStatus {
  return admin.accountStatus ?? admin.status ?? "Unknown";
}

function getStatusClasses(status: AccountStatus): string {
  switch (status) {
    case "Active":
      return "bg-emerald-100 text-emerald-800";

    case "Deactivated":
      return "bg-amber-100 text-amber-800";

    case "Deleted":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const t = superAdminDashboardTranslations[language];

  // Dashboard statistics.
  const [data, setData] =
  useState<SuperAdminDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Normal administrator listing.
  const [showAdmins, setShowAdmins] = useState(false);

  // Inline institutional staff management.
  const [activeStaffPanel, setActiveStaffPanel] =
    useState<StaffPanel | null>(null);

  const [administrators, setAdministrators] =
  useState<Administrator[]>([]);

  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [adminsError, setAdminsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Administrator account lifecycle actions.
  const [processingUserId, setProcessingUserId] =
  useState<number | null>(null);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Inline administrator creation.
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<AdminForm>(EMPTY_ADMIN_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load dashboard statistics.
  const loadDashboard = async () => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/super-admin/dashboard`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(body, t.errorFallback)
        );
      }

      setData(body);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
        ? err.message
        : t.errorFallback
      );
    } finally {
      setLoading(false);
    }
  };

  // Load administrator accounts.
  const loadAdministrators = async () => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setAdminsLoading(true);
      setAdminsError("");

      const response = await fetch(
        `${API_URL}/super-admin/administrators`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            body,
            "Unable to load normal administrators."
          )
        );
      }

      if (!Array.isArray(body)) {
        throw new Error(
          "Unexpected administrator response from server."
        );
      }

      const normalAdmins = body.filter(
        (user: Administrator) => user.role === "Admin"
      );

      setAdministrators(normalAdmins);
      setAdminsLoaded(true);
    } catch (err) {
      setAdminsError(
        err instanceof Error
        ? err.message
        : "Unable to load normal administrators."
      );
    } finally {
      setAdminsLoading(false);
    }
  };

  // Expand or collapse administrator listing.
  const handleAdminsClick = async () => {
    if (showAdmins) {
      setShowAdmins(false);
      return;
    }

    setActiveStaffPanel(null);
    setShowAdmins(true);

    if (!adminsLoaded) {
      await loadAdministrators();
    }
  };

  // Refresh dashboard and administrator records.
  const handleRefresh = async () => {
    await Promise.all([
      loadDashboard(),
                      loadAdministrators(),
    ]);
  };

  // Execute administrator account lifecycle action.
  const handleAccountAction = async (
    admin: Administrator,
    action: AccountAction
  ) => {
    const currentStatus = getAccountStatus(admin);

    if (processingUserId !== null) {
      return;
    }

    if (action === "deactivate" && currentStatus !== "Active") {
      setActionError(
        "Only active administrator accounts can be deactivated."
      );
      return;
    }

    if (action === "activate" && currentStatus !== "Deactivated") {
      setActionError(
        "Only deactivated administrator accounts can be reactivated."
      );
      return;
    }

    const fullName = [
      admin.firstName,
      admin.secondName,
      admin.surname,
    ]
    .filter(Boolean)
    .join(" ");

    let confirmationMessage = "";

    if (action === "deactivate") {
      confirmationMessage =
      `Deactivate ${fullName}?\n\n` +
      "The administrator will lose access to Tujitunze. " +
      "Their account information and historical records will be retained.";
    }

    if (action === "activate") {
      confirmationMessage =
      `Reactivate ${fullName}?\n\n` +
      "The administrator will regain access to Tujitunze.";
    }

    if (action === "delete") {
      confirmationMessage =
      `PERMANENT ACCOUNT RETIREMENT\n\n` +
      `Are you sure you want to delete ${fullName}?\n\n` +
      "The account will be anonymized and cannot be reactivated. " +
      "Historical records will be retained. " +
      "The original email address and NIDA number will be released " +
      "for future registration.\n\n" +
      "This operation cannot be reversed.";
    }

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setProcessingUserId(admin.userId);
    setActionError("");
    setActionSuccess("");
    setSuccessMessage("");

    try {
      let url = "";
      let method = "PATCH";

      if (action === "deactivate") {
        url =
        `${API_URL}/super-admin/administrators/` +
        `${admin.userId}/deactivate`;
      }

      if (action === "activate") {
        url =
        `${API_URL}/super-admin/administrators/` +
        `${admin.userId}/activate`;
      }

      if (action === "delete") {
        url =
        `${API_URL}/super-admin/administrators/` +
        `${admin.userId}`;
        method = "DELETE";
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseText = await response.text();

      let body: unknown = {};

      if (responseText) {
        try {
          body = JSON.parse(responseText);
        } catch {
          body = { message: responseText };
        }
      }

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            body,
            `Unable to ${action} administrator account.`
          )
        );
      }

      if (action === "deactivate") {
        setActionSuccess(
          `${fullName} has been deactivated successfully.`
        );
      }

      if (action === "activate") {
        setActionSuccess(
          `${fullName} has been reactivated successfully.`
        );
      }

      if (action === "delete") {
        setActionSuccess(
          `${fullName}'s account has been anonymized and retired successfully.`
        );
      }

      // Refresh administrator records and dashboard statistics.
      await Promise.all([
        loadAdministrators(),
                        loadDashboard(),
      ]);
    } catch (err) {
      setActionError(
        err instanceof Error
        ? err.message
        : "The administrator account operation failed."
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  // Create a normal Admin account.
  const handleCreateAdmin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");
    setActionError("");
    setActionSuccess("");

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/super-admin/administrators`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
                               secondName: form.secondName.trim() || undefined,
                               surname: form.surname.trim(),
                               email: form.email.trim(),
                               nidaNumber: form.nidaNumber,
                               password: form.password,
                               role: "Admin",
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            body,
            "Unable to create administrator."
          )
        );
      }

      setSuccessMessage(
        "Normal administrator account created successfully."
      );

      setForm(EMPTY_ADMIN_FORM);
      setShowCreateForm(false);

      setAdminsLoaded(false);

      await Promise.all([
        loadAdministrators(),
                        loadDashboard(),
      ]);
    } catch (err) {
      setFormError(
        err instanceof Error
        ? err.message
        : "Unable to create administrator."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Initial dashboard loading.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, t.errorFallback]);

  // Refresh data when browser tab regains focus.
  useEffect(() => {
    const handleFocus = () => {
      loadDashboard();

      if (showAdmins) {
        setAdminsLoaded(false);
        loadAdministrators();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdmins]);

  // Search administrator accounts.
  const filteredAdmins = administrators.filter((admin) => {
    const fullName = [
      admin.firstName,
      admin.secondName,
      admin.surname,
    ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

    const search = searchTerm.toLowerCase();

    const status = getAccountStatus(admin).toLowerCase();

    return (
      fullName.includes(search) ||
      (admin.email ?? "").toLowerCase().includes(search) ||
      status.includes(search)
    );
  });

  return (
    <div>
    <DashboardHeader title={t.title} />

    <PageContainer maxWidth="6xl">

    {/* DASHBOARD ERROR */}
    {error && (
      <div className="mb-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
      {error}
      </div>
    )}

    {loading ? (
      <p className="text-slate-500">{t.loading}</p>
    ) : data ? (
      <>

      {/* USER MANAGEMENT */}
      <StatGroup title="User Management">

      <StatisticCard
      label={t.members}
      value={data.usersByRole["Member"] ?? 0}
      icon={UsersIcon}
      hint="View and manage registered members"
      onClick={() =>
        router.push("/super-admin/members")
      }
      />

      <StatisticCard
      label={t.admins}
      value={data.usersByRole["Admin"] ?? 0}
      icon={UserCircleIcon}
      hint={
        showAdmins
        ? "Hide normal administrators"
        : "Click to view normal administrators"
      }
      onClick={() => {
        void handleAdminsClick();
      }}
      />

      <StatisticCard
      label={t.bankStaff}
      value={data.usersByRole["Bank"] ?? 0}
      icon={WalletIcon}
      hint="View and manage bank staff"
      onClick={() => {
        setShowAdmins(false);
        setActiveStaffPanel((current) =>
          current === "bank-staff" ? null : "bank-staff"
        );
      }}
      />

      <StatisticCard
      label={t.telecomStaff}
      value={data.usersByRole["Telecom"] ?? 0}
      icon={SignalIcon}
      hint="View and manage telecom staff"
      onClick={() => {
        setShowAdmins(false);
        setActiveStaffPanel((current) =>
          current === "telecom-staff" ? null : "telecom-staff"
        );
      }}
      />

      <StatisticCard
      label={t.insuranceStaff}
      value={data.usersByRole["Insurance"] ?? 0}
      icon={ShieldIcon}
      hint="View and manage insurance staff"
      onClick={() => {
        setShowAdmins(false);
        setActiveStaffPanel((current) =>
          current === "insurance-staff" ? null : "insurance-staff"
        );
      }}
      />

      </StatGroup>

      {/* NORMAL ADMINISTRATOR MANAGEMENT */}
      {showAdmins && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">

        {/* SECTION HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center">

        <div>
        <h2 className="text-lg font-bold text-gray-900">
        Normal Administrator Management
        </h2>

        <p className="mt-1 text-sm text-slate-500">
        Manage accounts assigned specifically to the Admin role.
        Institutional staff and Super Admin accounts are excluded.
        </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
        {administrators.length} Admins
        </span>

        <button
        type="button"
        onClick={() => {
          setShowCreateForm((current) => !current);
          setFormError("");
          setSuccessMessage("");
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
        <PlusIcon className="h-4 w-4" />
        {showCreateForm ? "Close Form" : "Create Admin"}
        </button>

        <button
        type="button"
        onClick={() => {
          void handleRefresh();
        }}
        disabled={adminsLoading || processingUserId !== null}
        aria-label="Refresh administrators"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
        <span aria-hidden="true">↻</span>
        Refresh
        </button>

        </div>
        </div>

        {/* CREATE SUCCESS MESSAGE */}
        {successMessage && (
          <div className="mx-6 mt-5 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
          </div>
        )}

        {/* ACCOUNT ACTION SUCCESS */}
        {actionSuccess && (
          <div className="mx-6 mt-5 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          {actionSuccess}
          </div>
        )}

        {/* ACCOUNT ACTION ERROR */}
        {actionError && (
          <div className="mx-6 mt-5 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
          {actionError}
          </div>
        )}

        {/* CREATE ADMIN FORM */}
        {showCreateForm && (
          <div className="border-b border-gray-100 bg-slate-50 px-6 py-6">

          <h3 className="text-base font-bold text-gray-900">
          Create Normal Administrator
          </h3>

          <p className="mt-1 text-sm text-slate-500">
          Enter the details of the new Admin account.
          </p>

          <form
          onSubmit={handleCreateAdmin}
          className="mt-5 grid gap-5 sm:grid-cols-2"
          >

          <div>
          <label className="block text-sm font-medium text-slate-700">
          First Name
          </label>

          <input
          required
          value={form.firstName}
          onChange={(event) =>
            setForm({
              ...form,
              firstName: event.target.value,
            })
          }
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-slate-700">
          Second Name
          </label>

          <input
          value={form.secondName}
          onChange={(event) =>
            setForm({
              ...form,
              secondName: event.target.value,
            })
          }
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-slate-700">
          Surname
          </label>

          <input
          required
          value={form.surname}
          onChange={(event) =>
            setForm({
              ...form,
              surname: event.target.value,
            })
          }
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-slate-700">
          Email Address
          </label>

          <input
          required
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm({
              ...form,
              email: event.target.value,
            })
          }
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-slate-700">
          NIDA Number
          </label>

          <input
          required
          value={form.nidaNumber}
          onChange={(event) =>
            setForm({
              ...form,
              nidaNumber: formatNidaNumber(
                event.target.value
              ),
            })
          }
          placeholder="00000000-00000-00000-00"
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-slate-700">
          Password
          </label>

          <input
          required
          type="password"
          minLength={8}
          value={form.password}
          onChange={(event) =>
            setForm({
              ...form,
              password: event.target.value,
            })
          }
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <p className="mt-1 text-xs text-slate-500">
          Use at least 8 characters.
          </p>
          </div>

          <div className="sm:col-span-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">

          <p className="text-sm font-semibold text-emerald-900">
          Assigned role: Admin
          </p>

          <p className="mt-1 text-xs text-emerald-800">
          This form creates a normal Admin account only.
          It cannot create Super Admin or institutional staff.
          </p>

          </div>
          </div>

          {formError && (
            <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 sm:col-span-2">
            {formError}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:col-span-2 sm:flex-row">

          <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
          {submitting
            ? "Creating Admin..."
            : "Create Administrator"}
            </button>

            <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              setForm(EMPTY_ADMIN_FORM);
              setFormError("");
            }}
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-100"
            >
            Cancel
            </button>

            </div>

            </form>
            </div>
        )}

        {/* ADMIN LIST ERROR */}
        {adminsError && (
          <div className="mx-6 mt-5 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
          {adminsError}
          </div>
        )}

        {/* SEARCH */}
        <div className="border-b border-gray-100 px-6 py-4">
        <input
        type="search"
        value={searchTerm}
        onChange={(event) =>
          setSearchTerm(event.target.value)
        }
        placeholder="Search Admin by name, email or status..."
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        </div>

        {/* ADMIN TABLE */}
        {adminsLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
          Loading normal administrators...
          </div>
        ) : adminsError ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
          Administrator records could not be loaded.
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="px-6 py-10 text-center">

          <UserCircleIcon className="mx-auto h-10 w-10 text-slate-300" />

          <p className="mt-3 font-medium text-gray-700">
          {administrators.length === 0
            ? "No normal administrators found."
            : "No matching administrators found."}
            </p>

            <p className="mt-1 text-sm text-slate-500">
            {administrators.length === 0
              ? "There are currently no accounts assigned the Admin role."
              : "Try a different search term."}
              </p>

              </div>
        ) : (
          <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

          <thead className="bg-gray-50 text-xs uppercase text-slate-500">
          <tr>
          <th className="px-6 py-4 font-semibold">
          Name
          </th>

          <th className="px-6 py-4 font-semibold">
          Email
          </th>

          <th className="px-6 py-4 font-semibold">
          Role
          </th>

          <th className="px-6 py-4 font-semibold">
          Account Status
          </th>

          <th className="px-6 py-4 font-semibold">
          Created
          </th>

          <th className="px-6 py-4 font-semibold">
          Actions
          </th>
          </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
          {filteredAdmins.map((admin) => {
            const accountStatus = getAccountStatus(admin);
            const isProcessing =
            processingUserId === admin.userId;

            return (
              <tr
              key={admin.userId}
              className="transition hover:bg-gray-50"
              >
              <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
              {admin.firstName}{" "}
              {admin.secondName
                ? `${admin.secondName} `
                : ""}
                {admin.surname}
                </td>

                <td className="px-6 py-4 text-slate-600">
                {admin.email ?? "—"}
                </td>

                <td className="px-6 py-4 text-slate-600">
                Admin
                </td>

                <td className="px-6 py-4">
                <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(accountStatus)}`}
                >
                {accountStatus}
                </span>
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                {admin.createdAt
                  ? new Date(
                    admin.createdAt
                  ).toLocaleDateString("en-TZ")
                  : "—"}
                  </td>

                  <td className="min-w-[250px] px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">

                  {accountStatus === "Active" && (
                    <button
                    type="button"
                    onClick={() => {
                      void handleAccountAction(
                        admin,
                        "deactivate"
                      );
                    }}
                    disabled={processingUserId !== null}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                    {isProcessing
                      ? "Processing..."
                      : "Deactivate"}
                      </button>
                  )}

                  {accountStatus === "Deactivated" && (
                    <button
                    type="button"
                    onClick={() => {
                      void handleAccountAction(
                        admin,
                        "activate"
                      );
                    }}
                    disabled={processingUserId !== null}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                    {isProcessing
                      ? "Processing..."
                      : "Reactivate"}
                      </button>
                  )}

                  {(accountStatus === "Active" ||
                    accountStatus === "Deactivated") && (
                      <button
                      type="button"
                      onClick={() => {
                        void handleAccountAction(
                          admin,
                          "delete"
                        );
                      }}
                      disabled={processingUserId !== null}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                      {isProcessing
                        ? "Processing..."
                        : "Delete"}
                        </button>
                    )}

                    {accountStatus !== "Active" &&
                      accountStatus !== "Deactivated" && (
                        <span className="text-xs text-slate-400">
                        No available actions
                        </span>
                      )}

                      </div>
                      </td>
                      </tr>
            );
          })}
          </tbody>

          </table>
          </div>
        )}
        </section>
      )}

      {/* INLINE INSTITUTIONAL STAFF MANAGEMENT */}
      {activeStaffPanel === "bank-staff" && (
        <InstitutionStaffManagementPage
          category="bank-staff"
          role="Bank"
          title="Bank Staff"
          description="View, create and manage bank staff accounts registered in Tujitunze."
          institutionEndpoint="/super-admin/institutions/banks"
          institutionLabel="Bank"
          embedded
          totalCount={data.usersByRole["Bank"] ?? 0}
          onStaffCreated={() => {
            void loadDashboard();
          }}
        />
      )}

      {activeStaffPanel === "telecom-staff" && (
        <InstitutionStaffManagementPage
          category="telecom-staff"
          role="Telecom"
          title="Telecom Staff"
          description="View, create and manage telecom staff accounts registered in Tujitunze."
          institutionEndpoint="/super-admin/institutions/telecom-operators"
          institutionLabel="Telecom operator"
          embedded
          totalCount={data.usersByRole["Telecom"] ?? 0}
          onStaffCreated={() => {
            void loadDashboard();
          }}
        />
      )}

      {activeStaffPanel === "insurance-staff" && (
        <InstitutionStaffManagementPage
          category="insurance-staff"
          role="Insurance"
          title="Insurance Staff"
          description="View, create and manage insurance staff accounts registered in Tujitunze."
          institutionEndpoint="/super-admin/institutions/insurance-providers"
          institutionLabel="Insurance provider"
          embedded
          totalCount={data.usersByRole["Insurance"] ?? 0}
          onStaffCreated={() => {
            void loadDashboard();
          }}
        />
      )}

      {/* INSTITUTION MANAGEMENT */}
      <StatGroup title={t.sectionInstitutions}>

      <StatisticCard
      label={t.banks}
      value={sumValues(data.banksByStatus)}
      icon={BuildingIcon}
      hint="View and manage registered banks"
      onClick={() =>
        router.push("/super-admin/banks")
      }
      />

      <StatisticCard
      label={t.telecomOperators}
      value={sumValues(data.operatorsByStatus)}
      icon={SignalIcon}
      hint="View and manage telecom operators"
      onClick={() =>
        router.push("/super-admin/telecom-operators")
      }
      />

      <StatisticCard
      label={t.insuranceProviders}
      value={sumValues(data.providersByStatus)}
      icon={ShieldIcon}
      hint="View and manage insurance providers"
      onClick={() =>
        router.push("/super-admin/insurance-providers")
      }
      />

      </StatGroup>

      </>
    ) : null}

    </PageContainer>
    </div>
  );
}
