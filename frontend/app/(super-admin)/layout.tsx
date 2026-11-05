import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const NAV_ITEMS = [
  { labelKey: "dashboard", href: "/super-admin/dashboard" },
  { labelKey: "rolesPermissions", href: "/super-admin/roles" },
  { labelKey: "savingRules", href: "/super-admin/saving-rules" },
  { labelKey: "auditLogs", href: "/super-admin/audit-logs" },
] as const;

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["Super-admin"]}>
      <DashboardLayout roleLabel="Super-admin" navItems={NAV_ITEMS}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
