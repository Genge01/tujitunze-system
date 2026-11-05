import InstitutionStaffManagementPage from "@/components/super-admin/InstitutionStaffManagementPage";

export default function InsuranceStaffPage() {
  return (
    <InstitutionStaffManagementPage
    category="insurance-staff"
    role="Insurance"
    title="Insurance Staff"
    description="View, create and manage insurance staff accounts registered in Tujitunze."
    institutionEndpoint="/super-admin/institutions/insurance-providers"
    institutionLabel="Insurance Provider"
    />
  );
}
