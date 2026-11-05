
import { redirect } from "next/navigation";

export default function CreateAdministratorRedirect() {
    redirect("/super-admin/dashboard");
}
