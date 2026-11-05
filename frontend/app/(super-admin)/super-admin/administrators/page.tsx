import UserAccountListPage from "@/components/super-admin/UserAccountListPage";

export default function AdministratorsPage() {
  return (
    <UserAccountListPage
      category="administrators"
      title="Administrators"
      description="Manage system administrator accounts. Super Admin accounts are excluded from this list."
    />
  );
}
