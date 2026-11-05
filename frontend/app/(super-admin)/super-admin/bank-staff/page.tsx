import InstitutionStaffManagementPage from "@/components/super-admin/InstitutionStaffManagementPage";

export default function BankStaffPage() {
  return (
    <InstitutionStaffManagementPage
    category="bank-staff"
    role="Bank"
    title="Bank Staff"
    description="View, create and manage bank staff accounts registered in Tujitunze."
    institutionEndpoint="/super-admin/institutions/banks"
    institutionLabel="Bank"
    />
  );
}
