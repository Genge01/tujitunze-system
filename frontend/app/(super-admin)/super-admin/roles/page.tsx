"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/utils/permissions";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PageContainer from "@/components/dashboard/PageContainer";
import StatGroup from "@/components/dashboard/StatGroup";
import StatisticCard from "@/components/cards/StatisticCard";
import QuickActions, {
  type QuickAction,
} from "@/components/dashboard/QuickActions";
import { useLanguage } from "@/lib/context/LanguageContext";
import { superAdminRolesTranslations } from "@/constants/translations/super-admin-roles";
import { superAdminDashboardTranslations } from "@/constants/translations/super-admin-dashboard";
import { API_URL } from "@/lib/utils/api";
import {
  ClipboardIcon,
  CoinsIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/common/SidebarIcons";

interface Permission {
  id: number;
  name: string;
  description: string | null;
}

interface Role {
  roleId: number;
  roleName: string;
  description: string | null;
  userCount: number;
  permissions: Permission[];
}

const EMPTY_FORM = {
  roleName: "",
  description: "",
};

// Mirrors CORE_ROLE_NAMES in super-admin-roles.service.ts — the backend is
// the real guard (returns 403), this only keeps the UI from offering an
// action that would just fail.
const CORE_ROLE_NAMES = [
  "Member",
  "Admin",
  "Bank",
  "Telecom",
  "Insurance",
  "Super-admin",
];

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function SuperAdminRolesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = superAdminRolesTranslations[language];
  const dt = superAdminDashboardTranslations[language];

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");

  const [savingDetailsRoleId, setSavingDetailsRoleId] = useState<
    number | null
  >(null);
  const [detailsError, setDetailsError] = useState("");

  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Deliberately no revalidate-on-focus here (unlike Administrators/Audit
  // Logs, which are read-only lists): a role's permission checkboxes and,
  // for a custom role, its name/description fields are locally edited
  // before an explicit Save — overwriting `roles` wholesale on tab focus
  // would silently discard an in-progress, unsaved edit. See the Saving
  // Rules page for the same call.
  useEffect(() => {
    const loadData = async () => {
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [rolesRes, permissionsRes] = await Promise.all([
          fetch(`${API_URL}/super-admin/roles`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/super-admin/permissions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (rolesRes.status === 401 || permissionsRes.status === 401) {
          router.push("/login");
          return;
        }

        const rolesBody = await rolesRes.json();
        const permissionsBody = await permissionsRes.json();

        if (!rolesRes.ok) {
          throw new Error(extractMessage(rolesBody, t.loadRolesError));
        }

        if (!permissionsRes.ok) {
          throw new Error(
            extractMessage(permissionsBody, t.loadPermissionsError)
          );
        }

        setRoles(rolesBody);
        setPermissions(permissionsBody);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t.loadPageError);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, t.loadRolesError, t.loadPermissionsError, t.loadPageError]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");

    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/super-admin/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roleName: form.roleName,
          description: form.description || undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(extractMessage(body, t.createError));
      }

      setRoles((prev) => [...prev, body as Role]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t.createError);
    } finally {
      setCreating(false);
    }
  };

  const togglePermission = (role: Role, permissionId: number) => {
    const has = role.permissions.some((p) => p.id === permissionId);
    const nextPermissionIds = has
      ? role.permissions.filter((p) => p.id !== permissionId).map((p) => p.id)
      : [...role.permissions.map((p) => p.id), permissionId];

    setRoles((prev) =>
      prev.map((r) =>
        r.roleId === role.roleId
          ? {
              ...r,
              permissions: permissions.filter((p) =>
                nextPermissionIds.includes(p.id)
              ),
            }
          : r
      )
    );
  };

  const saveRolePermissions = async (role: Role) => {
    setSaveError("");
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setSavingRoleId(role.roleId);

    try {
      const response = await fetch(
        `${API_URL}/super-admin/roles/${role.roleId}/permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            permissionIds: role.permissions.map((p) => p.id),
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(extractMessage(body, t.savePermissionsError));
      }

      setRoles((prev) =>
        prev.map((r) =>
          r.roleId === role.roleId
            ? { ...r, ...(body as Partial<Role>) }
            : r
        )
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.savePermissionsError);
    } finally {
      setSavingRoleId(null);
    }
  };

  const updateRoleField = (
    roleId: number,
    field: "roleName" | "description",
    value: string
  ) => {
    setRoles((prev) =>
      prev.map((r) => (r.roleId === roleId ? { ...r, [field]: value } : r))
    );
  };

  const saveRoleDetails = async (role: Role) => {
    setDetailsError("");
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setSavingDetailsRoleId(role.roleId);

    try {
      const response = await fetch(
        `${API_URL}/super-admin/roles/${role.roleId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roleName: role.roleName,
            description: role.description || undefined,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(extractMessage(body, t.saveDetailsError));
      }

      setRoles((prev) =>
        prev.map((r) =>
          r.roleId === role.roleId ? { ...r, ...(body as Role) } : r
        )
      );
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : t.saveDetailsError);
    } finally {
      setSavingDetailsRoleId(null);
    }
  };

  const deleteRole = async (role: Role) => {
    setDeleteError("");

    if (
      !window.confirm(t.deleteConfirm.replace("{roleName}", role.roleName))
    ) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setDeletingRoleId(role.roleId);

    try {
      const response = await fetch(
        `${API_URL}/super-admin/roles/${role.roleId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractMessage(body, t.deleteError));
      }

      setRoles((prev) => prev.filter((r) => r.roleId !== role.roleId));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.deleteError);
    } finally {
      setDeletingRoleId(null);
    }
  };

  const customRoleCount = roles.filter(
    (role) => !CORE_ROLE_NAMES.includes(role.roleName)
  ).length;

  const quickActions: QuickAction[] = [];

  return (
    <div>

      <DashboardHeader title={t.title} />

      <PageContainer maxWidth="6xl">

        <QuickActions actions={quickActions} />

        {loadError && (
          <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {!loading && (
          <StatGroup title={dt.sectionGovernance}>
            <StatisticCard
              label={dt.totalRoles}
              value={roles.length}
              icon={KeyIcon}
            />
            <StatisticCard
              label={dt.totalPermissions}
              value={permissions.length}
              icon={LockIcon}
            />
            <StatisticCard
              label={dt.customRoles}
              value={customRoleCount}
              icon={UsersIcon}
            />
          </StatGroup>
        )}

        {saveError && (
          <div className="mb-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {detailsError && (
          <div className="mb-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
            {detailsError}
          </div>
        )}

        {deleteError && (
          <div className="mb-6 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#064E3B]">
              <PlusIcon className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-gray-900">{t.createRoleTitle}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {t.createRoleSubtitle}
          </p>

          <form onSubmit={handleCreate} className="mt-6 grid gap-4 sm:grid-cols-2">

            <div>
              <label className="block text-sm font-medium text-slate-700">{t.roleName}</label>
              <input
                required
                maxLength={50}
                value={form.roleName}
                onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{t.description}</label>
              <input
                maxLength={255}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            {createError && (
              <div className="sm:col-span-2 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {creating ? t.creating : t.createRoleButton}
              </button>
            </div>

          </form>

        </div>

        <div className="mt-8 space-y-6">

          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-slate-500 shadow-md">
              {t.loading}
            </div>
          ) : (
            roles.map((role) => {
              const isCoreRole = CORE_ROLE_NAMES.includes(role.roleName);

              return (
              <div
                key={role.roleId}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition hover:shadow-lg"
              >

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[240px]">
                    {isCoreRole ? (
                      <>
                        <h3 className="text-base font-bold text-gray-900">
                          {role.roleName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {role.description ?? t.noDescription}
                        </p>
                      </>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={role.roleName}
                          maxLength={50}
                          onChange={(e) =>
                            updateRoleField(
                              role.roleId,
                              "roleName",
                              e.target.value
                            )
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-900"
                        />
                        <input
                          value={role.description ?? ""}
                          maxLength={255}
                          placeholder={t.description}
                          onChange={(e) =>
                            updateRoleField(
                              role.roleId,
                              "description",
                              e.target.value
                            )
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-600"
                        />
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {role.userCount}{" "}
                      {role.userCount === 1 ? t.accountSingular : t.accountPlural}
                      {isCoreRole && ` · ${t.corePlatformRole}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isCoreRole && (
                      <>
                        <button
                          type="button"
                          onClick={() => saveRoleDetails(role)}
                          disabled={savingDetailsRoleId === role.roleId}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {savingDetailsRoleId === role.roleId
                            ? t.saving
                            : t.saveDetails}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRole(role)}
                          disabled={deletingRoleId === role.roleId}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingRoleId === role.roleId
                            ? t.deleting
                            : t.delete}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => saveRolePermissions(role)}
                      disabled={savingRoleId === role.roleId}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {savingRoleId === role.roleId ? t.saving : t.savePermissions}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {permissions.map((permission) => {
                    const checked = role.permissions.some(
                      (p) => p.id === permission.id
                    );
                    return (
                      <label
                        key={permission.id}
                        className="flex items-start gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(role, permission.id)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-medium text-gray-900">
                            {permission.name}
                          </span>
                          {permission.description && (
                            <span className="block text-xs text-gray-500">
                              {permission.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>

              </div>
              );
            })
          )}

        </div>

      </PageContainer>

    </div>
  );
}
