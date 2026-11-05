"use client";

import InstitutionListPage from "@/components/super-admin/InstitutionListPage";

export default function SuperAdminBanksPage() {
  return (
    <InstitutionListPage
      type="banks"
      title="Registered Banks"
      description="View and monitor banks registered in the Tujitunze system."
      endpoint="/super-admin/institutions/banks"
    />
  );
}
