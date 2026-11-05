
import type { ComponentType, SVGProps } from "react";
import type { navLabelTranslations } from "@/constants/translations/common";

type IconProps = SVGProps<SVGSVGElement>;

// One shared line-icon set (24x24, stroke=currentColor, 1.8 weight)
// for every staff sidebar's nav items and the Super-admin dashboard's
// stat/quick action cards.
function Icon({
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
    >
    {children}
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="3.75" y="3.75" width="7.5" height="7.5" rx="1.5" />
    <rect x="12.75" y="3.75" width="7.5" height="7.5" rx="1.5" />
    <rect x="3.75" y="12.75" width="7.5" height="7.5" rx="1.5" />
    <rect x="12.75" y="12.75" width="7.5" height="7.5" rx="1.5" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17" cy="9" r="2.25" />
    <path d="M15.5 14.25c2.3.4 4 2 4 5.25" />
    </Icon>
  );
}

export function UserCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <circle cx="12" cy="12" r="8.25" />
    <circle cx="12" cy="10" r="2.75" />
    <path d="M6.75 18.25c.75-2.5 2.75-3.75 5.25-3.75s4.5 1.25 5.25 3.75" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <path d="M12 3.5l6.5 2.4v5.3c0 4.2-2.7 7.4-6.5 9.3-3.8-1.9-6.5-5.1-6.5-9.3V5.9L12 3.5z" />
    <polyline points="9.25 12 11.25 14 15 10" />
    </Icon>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <circle cx="7.5" cy="14.5" r="3.25" />
    <path d="M9.75 12.25L17.5 4.5M15 7l2 2M17.5 4.5l2.25 2.25" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </Icon>
  );
}

export function CoinsIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <ellipse cx="9" cy="8" rx="5.25" ry="3" />
    <path d="M3.75 8v4c0 1.66 2.35 3 5.25 3s5.25-1.34 5.25-3V8" />
    <path d="M11 14.75c.9 1.1 2.65 1.85 4.5 1.85 2.9 0 5.25-1.34 5.25-3v4c0 1.66-2.35 3-5.25 3-2.05 0-3.83-.68-4.7-1.68" />
    </Icon>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="5.5" y="4.5" width="13" height="16" rx="1.5" />
    <rect x="9" y="3" width="6" height="3" rx="1" />
    <line x1="8.25" y1="10.5" x2="15.75" y2="10.5" />
    <line x1="8.25" y1="14" x2="15.75" y2="14" />
    <line x1="8.25" y1="17.5" x2="12.5" y2="17.5" />
    </Icon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="3.5" y="6" width="17" height="13" rx="2" />
    <path d="M3.5 10h17" />
    <rect x="14" y="12.25" width="4" height="3" rx="0.75" />
    </Icon>
  );
}

export function SignalIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <line x1="5" y1="19" x2="5" y2="14" />
    <line x1="10.5" y1="19" x2="10.5" y2="10" />
    <line x1="16" y1="19" x2="16" y2="7" />
    <line x1="4" y1="19" x2="20" y2="19" />
    </Icon>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <polyline points="5 8 5 5 20 5" />
    <polyline points="16 3 20 5 16 7" />
    <polyline points="19 16 19 19 4 19" />
    <polyline points="8 21 4 19 8 17" />
    </Icon>
  );
}

export function ChartBarIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="13" width="3" height="7" />
    <rect x="10.5" y="9" width="3" height="11" />
    <rect x="15" y="5" width="3" height="15" />
    </Icon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="6" y="2.5" width="12" height="19" rx="2" />
    <line x1="10" y1="18" x2="14" y2="18" />
    </Icon>
  );
}

export function BadgeCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <circle cx="12" cy="12" r="8.25" />
    <polyline points="8.5 12.25 10.75 14.5 15.5 9.5" />
    </Icon>
  );
}

export function QrIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
    <rect x="14.25" y="14.25" width="2.5" height="2.5" />
    <rect x="18" y="14.25" width="2.5" height="2.5" />
    <rect x="14.25" y="18" width="2.5" height="2.5" />
    <rect x="18" y="18" width="2.5" height="2.5" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </Icon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="8.5" cy="6" r="1.75" />
    <circle cx="15.5" cy="12" r="1.75" />
    <circle cx="10.5" cy="18" r="1.75" />
    </Icon>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="10" y2="21" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
    <line x1="20" y1="12" x2="10.5" y2="12" />
    <polyline points="16.5 8 20 12 16.5 16" />
    </Icon>
  );
}

export function ChevronDoubleLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <polyline points="13 5 7 12 13 19" />
    <polyline points="18.5 5 12.5 12 18.5 19" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}

export function DotIcon(props: IconProps) {
  return (
    <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

type NavLabelKey = keyof (typeof navLabelTranslations)["en"];

// Maps every navigation label to its icon.
export const NAV_ICONS: Record<NavLabelKey, ComponentType<IconProps>> = {
  dashboard: GridIcon,
  members: UsersIcon,
  auditLogs: ClipboardIcon,
  auditSecurity: ClipboardIcon,
  claims: ClipboardIcon,
  payments: SwapIcon,
  reports: ChartBarIcon,
  bankProfile: UserCircleIcon,
  fundAccounts: WalletIcon,
  transactions: SwapIcon,
  settlements: SwapIcon,
  reconciliation: ClipboardIcon,
  operatorProfile: UserCircleIcon,
  registeredMembers: UsersIcon,
  contributionTransactions: SwapIcon,
  resourceConversions: SwapIcon,
  outgoingDiversions: SwapIcon,
  contributionRules: CoinsIcon,
  savingRules: CoinsIcon,
  administrators: UsersIcon,
  bankStaff: BuildingIcon,
  telecomStaff: PhoneIcon,
  insuranceStaff: ShieldIcon,
  rolesPermissions: KeyIcon,
  financialReports: ChartBarIcon,
  savings: CoinsIcon,
  insurance: ShieldIcon,
  membership: UsersIcon,
  notifications: BellIcon,
  qrCode: QrIcon,
  profile: UserCircleIcon,
  settings: SlidersIcon,
  completeMembership: PhoneIcon,
};
