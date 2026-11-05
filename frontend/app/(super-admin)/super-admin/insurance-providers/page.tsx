"use client";

import InstitutionListPage from "@/components/super-admin/InstitutionListPage";

export default function SuperAdminInsurancePage() {
  return (
    <InstitutionListPage
      type="insurance-providers"
      title="Insurance Providers"
      description="View and monitor insurance providers registered in the Tujitunze system."
      endpoint="/super-admin/institutions/insurance-providers"
    />
  );
}
