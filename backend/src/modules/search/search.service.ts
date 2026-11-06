import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { AuthenticatedUser } from '../auth/jwt.strategy';

const RESULT_LIMIT = 10;

export interface SearchResultItem {
  id: number;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResults {
  members: SearchResultItem[];
  wallet: SearchResultItem[];
  insurance: SearchResultItem[];
  telecom: SearchResultItem[];
  notifications: SearchResultItem[];
}

const EMPTY_RESULTS: SearchResults = {
  members: [],
  wallet: [],
  insurance: [],
  telecom: [],
  notifications: [],
};

// All queries below go through TypeORM's parameterized query() ($1, $2 —
// never string-concatenated SQL, per CLAUDE.md's SSDLC rule), so the
// request never reaches a place where the raw query text is influenced
// by user input. Parameterization is what actually prevents SQL
// injection — a separate "sanitize the string" pass would be redundant
// on top of it, and is exactly the kind of check that gives false
// confidence if the parameterization were ever accidentally dropped. The
// one real remaining input-handling concern is ILIKE's own wildcard
// characters (%, _) appearing *literally* in a user's search term (e.g.
// searching "50%") — escapeLikeTerm handles that so a literal % or _
// isn't mistaken for a wildcard.
function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toLikePattern(term: string): string {
  return `%${escapeLikeTerm(term.trim())}%`;
}

interface MemberSearchRow {
  user_id: number;
  first_name: string;
  second_name: string | null;
  surname: string;
  email: string | null;
  nida_number: string;
}

interface WalletSearchRow {
  wallet_transaction_id: number;
  transaction_type: string;
  amount: string;
  transaction_reference: string | null;
  transaction_date: Date;
}

interface InsuranceSearchRow {
  member_insurance_id: number;
  policy_number: string;
  policy_status: string;
  provider_name: string;
}

interface NotificationSearchRow {
  notification_id: number;
  title: string;
  message: string;
  sent_date: Date;
}

function formatTzs(amount: string): string {
  return `TSh ${Number(amount).toLocaleString('en-TZ', { minimumFractionDigits: 2 })}`;
}

// Threat model (see CLAUDE.md's Design phase requirement): this is one
// endpoint every authenticated role can call — @Roles() is deliberately
// omitted on the controller — but "who can call it" and "what can it
// return" are different questions. A single unscoped query across
// Members/Wallet/Insurance/Telecom/Notifications for every caller would
// let a Member look up other members' NIDA numbers, and let a
// tenant-scoped Bank/Telecom/Insurance staff account see data outside
// its own tenant — both real authorization bypasses this codebase
// otherwise guards carefully everywhere else (see the Bank/Telecom/
// Insurance "tenant-scoped, ForbiddenException if unset" pattern).
// Scoping happens here, per caller role, not by trusting the client.
@Injectable()
export class SearchService {
  constructor(private readonly dataSource: DataSource) {}

  async search(
    query: string,
    actor: AuthenticatedUser,
  ): Promise<SearchResults> {
    const pattern = toLikePattern(query);

    if (actor.roles.includes('Member')) {
      return this.searchAsMember(actor.userId, pattern, actor.permissions);
    }

    if (actor.roles.includes('Admin')) {
      if (!actor.permissions.includes('members:manage')) {
        return EMPTY_RESULTS;
      }

      return this.searchAsAdmin(pattern);
    }

    if (actor.roles.includes('Super-admin')) {
      // Not the same as Admin: the members search below links to
      // /admin/members/:id, and that route's ProtectedRoute only allows
      // the Admin role — a Super-admin following that link would just
      // land on /access-denied. There's no Super-admin-facing member
      // browsing page in this codebase to link to instead (its own route
      // group only has dashboard/administrators/roles/saving-rules/
      // audit-logs — see CLAUDE.md's role table), so this stays an
      // honest empty result rather than a link that's guaranteed to 403.
      return EMPTY_RESULTS;
    }

    // Bank/Telecom/Insurance staff: each is tenant-scoped (own bank /
    // own operator / own provider only — see CLAUDE.md), and none of
    // those services currently expose a text-search query this endpoint
    // could reuse without a dedicated per-tenant implementation for
    // each. Rather than guess at that scoping (or worse, return
    // cross-tenant results by accident), these roles get an honest
    // empty result for now — same "thin slice, extend as needed"
    // precedent already used throughout this codebase, not a silent gap.
    return EMPTY_RESULTS;
  }

  private async searchAsMember(
    memberId: number,
    pattern: string,
    permissions: string[],
  ): Promise<SearchResults> {
    const canSearchWallet = permissions.includes('wallet:manage');
    const canSearchInsurance = permissions.includes('member-insurance:view');
    const canSearchNotifications = permissions.includes('notifications:manage');

    const [walletRows, insuranceRows, notificationRows] = await Promise.all([
      canSearchWallet
        ? this.dataSource.query<WalletSearchRow[]>(
            `SELECT wt.wallet_transaction_id, wt.transaction_type, wt.amount,
                    wt.transaction_reference, wt.transaction_date
             FROM wallet_transactions wt
             INNER JOIN health_wallets hw ON hw.wallet_id = wt.wallet_id
             WHERE hw.member_id = $1
               AND (wt.transaction_type ILIKE $2 ESCAPE '\\'
                    OR wt.transaction_reference ILIKE $2 ESCAPE '\\'
                    OR wt.remarks ILIKE $2 ESCAPE '\\')
             ORDER BY wt.transaction_date DESC
             LIMIT ${RESULT_LIMIT}`,
            [memberId, pattern],
          )
        : Promise.resolve([] as WalletSearchRow[]),

      canSearchInsurance
        ? this.dataSource.query<InsuranceSearchRow[]>(
            `SELECT mi.member_insurance_id, mi.policy_number, mi.policy_status,
                    ipr.provider_name
             FROM member_insurance mi
             INNER JOIN insurance_plans ip ON ip.plan_id = mi.plan_id
             INNER JOIN insurance_providers ipr ON ipr.provider_id = ip.provider_id
             WHERE mi.member_id = $1
               AND (mi.policy_number ILIKE $2 ESCAPE '\\'
                    OR mi.policy_status ILIKE $2 ESCAPE '\\'
                    OR ipr.provider_name ILIKE $2 ESCAPE '\\')
             ORDER BY mi.start_date DESC
             LIMIT ${RESULT_LIMIT}`,
            [memberId, pattern],
          )
        : Promise.resolve([] as InsuranceSearchRow[]),

      canSearchNotifications
        ? this.dataSource.query<NotificationSearchRow[]>(
            `SELECT notification_id, title, message, sent_date
             FROM notifications
             WHERE member_id = $1
               AND (title ILIKE $2 ESCAPE '\\' OR message ILIKE $2 ESCAPE '\\')
             ORDER BY sent_date DESC
             LIMIT ${RESULT_LIMIT}`,
            [memberId, pattern],
          )
        : Promise.resolve([] as NotificationSearchRow[]),
    ]);

    return {
      members: [],
      telecom: [],
      wallet: walletRows.map((row) => ({
        id: row.wallet_transaction_id,
        title: row.transaction_type,
        subtitle: `${formatTzs(row.amount)} · ${new Date(row.transaction_date).toLocaleDateString('en-TZ')}`,
        href: '/wallet',
      })),
      insurance: insuranceRows.map((row) => ({
        id: row.member_insurance_id,
        title: row.policy_number,
        subtitle: `${row.provider_name} · ${row.policy_status}`,
        href: '/insurance/plans',
      })),
      notifications: notificationRows.map((row) => ({
        id: row.notification_id,
        title: row.title,
        subtitle: new Date(row.sent_date).toLocaleDateString('en-TZ'),
        href: '/notifications',
      })),
    };
  }


  private async searchAsAdmin(pattern: string): Promise<SearchResults> {
    const memberRows = await this.dataSource.query<MemberSearchRow[]>(
      `SELECT user_id, first_name, second_name, surname, email, nida_number
       FROM users
       WHERE first_name ILIKE $1 ESCAPE '\\'
          OR second_name ILIKE $1 ESCAPE '\\'
          OR surname ILIKE $1 ESCAPE '\\'
          OR email ILIKE $1 ESCAPE '\\'
          OR nida_number ILIKE $1 ESCAPE '\\'
       ORDER BY created_at DESC
       LIMIT ${RESULT_LIMIT}`,
      [pattern],
    );

    return {
      ...EMPTY_RESULTS,
      members: memberRows.map((row) => ({
        id: row.user_id,
        title: [row.first_name, row.second_name, row.surname]
          .filter(Boolean)
          .join(' '),
        subtitle: row.email ?? row.nida_number,
        href: `/admin/members/${row.user_id}`,
      })),
    };
  }
}
