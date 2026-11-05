import InstitutionStaffManagementPage from "@/components/super-admin/InstitutionStaffManagementPage";

export default function TelecomStaffPage() {
  return (
    <InstitutionStaffManagementPage
    category="telecom-staff"
    role="Telecom"
    title="Telecom Staff"
    description="View, create and manage telecom staff accounts registered in Tujitunze."
    institutionEndpoint="/super-admin/institutions/telecom-operators"
    institutionLabel="Telecom Operator"
    />
  );
}
