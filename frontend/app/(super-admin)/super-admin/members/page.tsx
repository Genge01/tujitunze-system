import UserAccountListPage from "@/components/super-admin/UserAccountListPage";

export default function MembersPage() {
  return (
    <UserAccountListPage
      category="members"
      title="Members"
      description="View and manage registered Tujitunze members. You can deactivate, reactivate, or delete member accounts."
    />
  );
}
