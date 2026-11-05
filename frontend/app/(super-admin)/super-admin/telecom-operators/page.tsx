"use client";

import InstitutionListPage from "@/components/super-admin/InstitutionListPage";

export default function SuperAdminTelecomPage() {
  return (
    <InstitutionListPage
      type="telecom-operators"
      title="Telecom Operators"
      description="View and monitor telecom operators registered in the Tujitunze system."
      endpoint="/super-admin/institutions/telecom-operators"
    />
  );
}
