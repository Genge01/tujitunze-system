"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import UserAccountListPage from "@/components/super-admin/UserAccountListPage";
import { getAccessToken } from "@/lib/utils/permissions";
import { formatNidaNumber, NIDA_FORMATTED_LENGTH } from "@/lib/utils/nida";
import { API_URL } from "@/lib/utils/api";

type StaffRole = "Bank" | "Telecom" | "Insurance";

interface InstitutionOption {
    id: number;
    name: string;
    status?: string | null;
}

interface StaffForm {
    firstName: string;
    secondName: string;
    surname: string;
    email: string;
    nidaNumber: string;
    password: string;
    tenantId: string;
}

interface InstitutionStaffManagementPageProps {
    category: "bank-staff" | "telecom-staff" | "insurance-staff";
    role: StaffRole;
    title: string;
    description: string;
    institutionEndpoint: string;
    institutionLabel: string;
    embedded?: boolean;
    totalCount?: number;
    onStaffCreated?: () => void;
}

const EMPTY_FORM: StaffForm = {
    firstName: "",
    secondName: "",
    surname: "",
    email: "",
    nidaNumber: "",
    password: "",
    tenantId: "",
};

function extractMessage(body: unknown, fallback: string): string {
    if (body && typeof body === "object" && "message" in body) {
        const message = (body as { message: unknown }).message;

        if (Array.isArray(message)) {
            return message.join(" ");
        }

        if (typeof message === "string") {
            return message;
        }
    }

    return fallback;
}

async function readResponse(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export default function InstitutionStaffManagementPage({
    category,
    role,
    title,
    description,
    institutionEndpoint,
    institutionLabel,
    embedded = false,
    totalCount = 0,
    onStaffCreated,
}: InstitutionStaffManagementPageProps) {
    const router = useRouter();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [form, setForm] = useState<StaffForm>(EMPTY_FORM);

    const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
    const [loadingInstitutions, setLoadingInstitutions] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [listVersion, setListVersion] = useState(0);

    useEffect(() => {
        if (!showCreateForm) return;

        const controller = new AbortController();

        async function loadInstitutions() {
            const token = getAccessToken();

            if (!token) {
                router.push("/login");
                return;
            }

            setLoadingInstitutions(true);
            setFormError("");

            try {
                const params = new URLSearchParams({
                    page: "1",
                    pageSize: "100",
                });

                const response = await fetch(
                    `${API_URL}${institutionEndpoint}?${params.toString()}`,
                                             {
                                                 method: "GET",
                                                 headers: {
                                                     Authorization: `Bearer ${token}`,
                                                 },
                                                 signal: controller.signal,
                                             }
                );

                if (response.status === 401 || response.status === 403) {
                    router.push("/login");
                    return;
                }

                const body = await readResponse(response);

                if (!response.ok) {
                    throw new Error(
                        extractMessage(body, "Unable to load registered institutions.")
                    );
                }

                if (
                    !body ||
                    typeof body !== "object" ||
                    !Array.isArray((body as { data?: unknown }).data)
                ) {
                    throw new Error("The server returned an unexpected institution response.");
                }

                const rows = (body as { data: InstitutionOption[] }).data;

                const activeInstitutions = rows.filter(
                    (institution) =>
                    Number.isInteger(Number(institution.id)) &&
                    Number(institution.id) > 0 &&
                    typeof institution.name === "string" &&
                    institution.name.trim().length > 0 &&
                    String(institution.status ?? "").toLowerCase() === "active"
                );

                setInstitutions(activeInstitutions);

                if (activeInstitutions.length === 0) {
                    setFormError(
                        `No active ${institutionLabel.toLowerCase()} are available. Register or activate an institution before creating its staff account.`
                    );
                }
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                setFormError(
                    error instanceof Error
                    ? error.message
                    : "An unexpected error occurred while loading institutions."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingInstitutions(false);
                }
            }
        }

        loadInstitutions();

        return () => controller.abort();
    }, [showCreateForm, institutionEndpoint, institutionLabel, router]);

    function updateForm<K extends keyof StaffForm>(
        field: K,
        value: StaffForm[K]
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function closeCreateForm() {
        if (submitting) return;

        setShowCreateForm(false);
        setForm(EMPTY_FORM);
        setFormError("");
    }

    async function handleCreateStaff(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setFormError("");
        setSuccessMessage("");

        const token = getAccessToken();

        if (!token) {
            router.push("/login");
            return;
        }

        const firstName = form.firstName.trim();
        const secondName = form.secondName.trim();
        const surname = form.surname.trim();
        const email = form.email.trim().toLowerCase();
        const nidaNumber = form.nidaNumber.trim();
        const tenantId = Number(form.tenantId);

        if (!firstName || !surname || !email || !nidaNumber || !form.password) {
            setFormError("Please complete all required fields.");
            return;
        }

        if (!Number.isInteger(tenantId) || tenantId <= 0) {
            setFormError(`Please select a registered ${institutionLabel.toLowerCase()}.`);
            return;
        }

        if (!/^\d{8}-\d{5}-\d{5}-\d{2}$/.test(nidaNumber)) {
            setFormError("Enter a valid NIDA number in the format 19900101-12345-12345-12.");
            return;
        }

        if (form.password.length < 8) {
            setFormError("Password must contain at least 8 characters.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/super-admin/administrators`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    firstName,
                    secondName: secondName || undefined,
                    surname,
                    email,
                    nidaNumber,
                    password: form.password,
                    role,
                    tenantId,
                }),
            });

            if (response.status === 401 || response.status === 403) {
                router.push("/login");
                return;
            }

            const body = await readResponse(response);

            if (!response.ok) {
                throw new Error(
                    extractMessage(body, `Unable to create ${title.toLowerCase()} account.`)
                );
            }

            setSuccessMessage(`${title} account created successfully.`);
            setForm(EMPTY_FORM);
            setShowCreateForm(false);

            // Remount the account list so it retrieves the newly created account.
            setListVersion((current) => current + 1);
            onStaffCreated?.();
        } catch (error) {
            setFormError(
                error instanceof Error
                ? error.message
                : "An unexpected error occurred while creating the account."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
      <section
        className={
          embedded
            ? "mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md"
            : ""
        }
      >
        <div
          className={
            embedded
              ? "flex flex-col justify-between gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center"
              : "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          }
        >
          <div>
            {embedded && (
              <h2 className="text-lg font-bold text-gray-900">
                {title} Management
              </h2>
            )}
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {embedded && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                {totalCount} {role} Staff
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSuccessMessage("");
                setFormError("");
                setShowCreateForm((current) => !current);
              }}
              className={
                embedded
                  ? "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  : "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              }
            >
              <span className="text-lg leading-none">+</span>
              {showCreateForm ? "Close Form" : `Create ${role} Staff`}
            </button>

            {embedded && (
              <button
                type="button"
                onClick={() => {
                  setListVersion((current) => current + 1);
                  onStaffCreated?.();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
              >
                <span aria-hidden="true">↻</span>
                Refresh
              </button>
            )}
          </div>
        </div>

        {successMessage && (
          <div
            className={
              embedded
                ? "mx-6 mt-5 rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800"
                : "mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            }
          >
            {successMessage}
          </div>
        )}

        {showCreateForm && (
          <div className="border-b border-gray-100 bg-slate-50 px-6 py-6">
            <h3 className="text-base font-bold text-gray-900">
              Create {role} Staff
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Enter the details of the new {role} staff account and select
              the institution to which the account belongs.
            </p>

            <form
              onSubmit={handleCreateStaff}
              className="mt-5 grid gap-5 sm:grid-cols-2"
            >
              {/* INSTITUTION */}
              <div className="sm:col-span-2">
                <label
                  htmlFor={`${category}-institution`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Select {institutionLabel}
                </label>

                <select
                  id={`${category}-institution`}
                  value={form.tenantId}
                  onChange={(event) =>
                    updateForm("tenantId", event.target.value)
                  }
                  required
                  disabled={
                    loadingInstitutions ||
                    submitting ||
                    institutions.length === 0
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingInstitutions
                      ? "Loading institutions..."
                      : `Choose ${institutionLabel}`}
                  </option>

                  {institutions.map((institution) => (
                    <option
                      key={institution.id}
                      value={institution.id}
                    >
                      {institution.name}
                    </option>
                  ))}
                </select>

                {!loadingInstitutions && institutions.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    No active institutions are available for assignment.
                  </p>
                )}
              </div>

              {/* FIRST NAME */}
              <div>
                <label
                  htmlFor={`${category}-first-name`}
                  className="block text-sm font-medium text-slate-700"
                >
                  First Name
                </label>

                <input
                  id={`${category}-first-name`}
                  type="text"
                  value={form.firstName}
                  onChange={(event) =>
                    updateForm("firstName", event.target.value)
                  }
                  required
                  maxLength={100}
                  autoComplete="given-name"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="Enter first name"
                />
              </div>

              {/* SECOND NAME */}
              <div>
                <label
                  htmlFor={`${category}-second-name`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Second Name
                </label>

                <input
                  id={`${category}-second-name`}
                  type="text"
                  value={form.secondName}
                  onChange={(event) =>
                    updateForm("secondName", event.target.value)
                  }
                  maxLength={100}
                  autoComplete="additional-name"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="Enter second name"
                />
              </div>

              {/* SURNAME */}
              <div>
                <label
                  htmlFor={`${category}-surname`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Surname
                </label>

                <input
                  id={`${category}-surname`}
                  type="text"
                  value={form.surname}
                  onChange={(event) =>
                    updateForm("surname", event.target.value)
                  }
                  required
                  maxLength={100}
                  autoComplete="family-name"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="Enter surname"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor={`${category}-email`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id={`${category}-email`}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm("email", event.target.value)
                  }
                  required
                  maxLength={254}
                  autoComplete="email"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="Enter email address"
                />
              </div>

              {/* NIDA */}
              <div>
                <label
                  htmlFor={`${category}-nida`}
                  className="block text-sm font-medium text-slate-700"
                >
                  NIDA Number
                </label>

                <input
                  id={`${category}-nida`}
                  type="text"
                  value={form.nidaNumber}
                  onChange={(event) =>
                    updateForm(
                      "nidaNumber",
                      formatNidaNumber(event.target.value)
                    )
                  }
                  required
                  maxLength={NIDA_FORMATTED_LENGTH}
                  autoComplete="off"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="00000000-00000-00000-00"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor={`${category}-password`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <input
                  id={`${category}-password`}
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateForm("password", event.target.value)
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Use at least 8 characters.
                </p>
              </div>

              {/* ASSIGNED ROLE AND INSTITUTION */}
              <div className="sm:col-span-2">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    Assigned role: {role}
                  </p>

                  <p className="mt-1 text-xs text-emerald-800">
                    Assigned institution:{" "}
                    {institutions.find(
                      (institution) =>
                        String(institution.id) === form.tenantId
                    )?.name || "Select an institution above."}
                  </p>
                </div>
              </div>

              {/* FORM ERROR */}
              {formError && (
                <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 sm:col-span-2">
                  {formError}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-col gap-3 pt-2 sm:col-span-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingInstitutions ||
                    institutions.length === 0
                  }
                  className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? `Creating ${role} Staff...`
                    : `Create ${role} Staff`}
                </button>

                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

                <UserAccountListPage
          key={`${category}-${listVersion}`}
          category={category}
          title={title}
          description={description}
          embedded={embedded}
        />
      </section>
    );
}
