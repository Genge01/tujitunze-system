import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as crypto from 'crypto';

import { HealthWallet } from './entities/health-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

function formatTsh(amount: number): string {
  return `TSh ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 2 })}`;
}

@Injectable()
export class WalletsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getOrCreateWallet(
    manager: EntityManager,
    memberId: number,
  ): Promise<HealthWallet> {
    const existing = await manager.findOne(HealthWallet, {
      where: { memberId },
    });

    if (existing) {
      return existing;
    }

    // Lazily created on first visit/top-up rather than at registration —
    // most members will never earn interest on an idle wallet, so there's
    // nothing lost by not creating rows nobody has funded yet.
    const wallet = manager.create(HealthWallet, {
      memberId,
      walletNumber: `TW-${memberId}-${Date.now().toString(36).toUpperCase()}`,
      balance: 0,
      walletStatus: 'Active',
    });

    return manager.save(HealthWallet, wallet);
  }

  // TUJITUNZE's own allocation-level reference — distinct from the
  // contribution's own external (Telecom/Bank-issued) and internal
  // references, one more link in the traceability chain rather than a
  // copy of either. Mirrors Telecom/BankService.generateInternalReference.
  private generateAllocationReference(): string {
    return `ALLOC-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(4)
      .toString('hex')}`;
  }

  // Shared credit path for both real collection channels (Telecom
  // airtime, Bank transfer) — called from within THEIR OWN
  // dataSource.transaction() callback (hence taking `manager` rather than
  // opening its own transaction) so the wallet credit, the ledger row,
  // and the channel-specific record (telecom_contributions /
  // bank_transactions) all commit or roll back together. Mirrors
  // topUp()'s lazy-wallet + balance-credit + WalletTransaction-row
  // pattern exactly, just parameterized by source so it isn't duplicated
  // per caller.
  async creditContribution(
    manager: EntityManager,
    memberId: number,
    amount: number,
    opts: {
      contributionId?: number;
      bankTransactionId?: number;
      transactionType: string;
      transactionReference: string;
      remarks: string;
    },
  ): Promise<{
    walletTransaction: WalletTransaction;
    allocation: {
      allocationId: number;
      insuranceProviderId: number;
      providerName: string;
      status: 'Allocated' | 'Failed';
      allocationReference: string;
    } | null;
  }> {
    const wallet = await this.getOrCreateWallet(manager, memberId);

    if (wallet.walletStatus !== 'Active') {
      throw new BadRequestException(
        `Member's wallet is ${wallet.walletStatus.toLowerCase()} and cannot receive a contribution.`,
      );
    }

    wallet.balance = Number((wallet.balance + amount).toFixed(2));
    await manager.save(HealthWallet, wallet);

    const transaction = manager.create(WalletTransaction, {
      walletId: wallet.walletId,
      contributionId: opts.contributionId ?? null,
      bankTransactionId: opts.bankTransactionId ?? null,
      transactionType: opts.transactionType,
      amount,
      transactionReference: opts.transactionReference,
      remarks: opts.remarks,
    });
    const savedTransaction = await manager.save(WalletTransaction, transaction);

    // Per-contribution insurance allocation — answers "where did this
    // member's specific contribution go?" (as opposed to Bank's
    // settlements, which are pooled/aggregate payouts). Only possible
    // when the member has an active policy telling us which provider to
    // allocate to.
    let [activePolicy] = await manager.query<
      { provider_id: number; provider_name: string; provider_status: string }[]
    >(
      `SELECT prov.provider_id, prov.provider_name, prov.status AS provider_status
       FROM member_insurance mi
       JOIN insurance_plans ip ON ip.plan_id = mi.plan_id
       JOIN insurance_providers prov ON prov.provider_id = ip.provider_id
       WHERE mi.member_id = $1 AND mi.policy_status = 'Active'
       ORDER BY mi.start_date DESC
       LIMIT 1`,
      [memberId],
    );

    // A member with no active policy is auto-enrolled into the
    // platform's own fallback plan (migration 0029) rather than leaving
    // the contribution unallocated — this is the only insert into
    // member_insurance anywhere in the codebase today; nothing else
    // enrolls a member into a plan. Falls through silently (same as
    // before this existed) only if that seed is somehow missing.
    if (!activePolicy) {
      const [fallbackPlan] = await manager.query<
        {
          plan_id: number;
          provider_id: number;
          provider_name: string;
          provider_status: string;
        }[]
      >(
        `SELECT ip.plan_id, prov.provider_id, prov.provider_name, prov.status AS provider_status
         FROM insurance_plans ip
         JOIN insurance_providers prov ON prov.provider_id = ip.provider_id
         WHERE prov.provider_name = 'Tujitunze Insurance' AND ip.status = 'Active'
         ORDER BY ip.plan_id
         LIMIT 1`,
      );

      if (fallbackPlan) {
        const policyNumber = `TJZ-POL-${Date.now().toString(36).toUpperCase()}-${crypto
          .randomBytes(3)
          .toString('hex')}`;

        await manager.query(
          `INSERT INTO member_insurance (member_id, plan_id, policy_number, start_date, policy_status)
           VALUES ($1, $2, $3, CURRENT_DATE, 'Active')`,
          [memberId, fallbackPlan.plan_id, policyNumber],
        );

        await this.auditLogsService.record(manager, {
          memberId,
          actionType: 'member.insurance_auto_enroll',
          affectedTable: 'member_insurance',
          newValue: {
            planId: fallbackPlan.plan_id,
            providerId: fallbackPlan.provider_id,
            policyNumber,
          },
        });

        await this.notificationsService.create(manager, {
          memberId,
          notificationType: 'Contribution',
          title: 'Enrolled in Tujitunze Insurance',
          message: `You had no active insurance policy, so you were automatically enrolled in Tujitunze Insurance (policy ${policyNumber}). Your contributions will now be allocated to it.`,
        });

        activePolicy = {
          provider_id: fallbackPlan.provider_id,
          provider_name: fallbackPlan.provider_name,
          provider_status: fallbackPlan.provider_status,
        };
      }
    }

    let allocation: {
      allocationId: number;
      insuranceProviderId: number;
      providerName: string;
      status: 'Allocated' | 'Failed';
      allocationReference: string;
    } | null = null;

    if (activePolicy) {
      const allocationReference = this.generateAllocationReference();

      // A real, persisted PENDING -> PROCESSING -> ALLOCATED|FAILED
      // progression, mirroring the contribution ledger's own status
      // machine — not just a final label, so a failure between steps is
      // visible in the row itself, and traceable via its own audit
      // entry below. The UNIQUE constraint on wallet_transaction_id is
      // this row's duplicate protection: a given contribution-credit
      // event can never produce a second allocation.
      const [allocationRow] = await manager.query<{ allocation_id: number }[]>(
        `INSERT INTO insurance_allocations
           (wallet_transaction_id, member_id, insurance_provider_id, amount, currency, allocation_status, allocation_reference)
         VALUES ($1, $2, $3, $4, 'TZS', 'Pending', $5)
         RETURNING allocation_id`,
        [
          savedTransaction.walletTransactionId,
          memberId,
          activePolicy.provider_id,
          amount,
          allocationReference,
        ],
      );
      const allocationId = allocationRow.allocation_id;

      await manager.query(
        `UPDATE insurance_allocations SET allocation_status = 'Processing' WHERE allocation_id = $1`,
        [allocationId],
      );

      // The only real "processing" business rule today: the provider
      // itself must still be Active. The member's own policy_status was
      // already filtered to 'Active' above; this additionally guards
      // against allocating to a provider that has since been suspended.
      const succeeded = activePolicy.provider_status === 'Active';
      const finalAllocationStatus = succeeded ? 'Allocated' : 'Failed';

      await manager.query(
        `UPDATE insurance_allocations
         SET allocation_status = $2, completed_at = NOW()
         WHERE allocation_id = $1`,
        [allocationId, finalAllocationStatus],
      );

      await this.auditLogsService.record(manager, {
        memberId,
        actionType: succeeded
          ? 'insurance.allocation_create'
          : 'insurance.allocation_fail',
        affectedTable: 'insurance_allocations',
        affectedRecordId: allocationId,
        newValue: {
          insuranceProviderId: activePolicy.provider_id,
          amount,
          currency: 'TZS',
          allocationReference,
          allocationStatus: finalAllocationStatus,
          walletTransactionId: savedTransaction.walletTransactionId,
        },
      });

      allocation = {
        allocationId,
        insuranceProviderId: activePolicy.provider_id,
        providerName: activePolicy.provider_name,
        status: finalAllocationStatus,
        allocationReference,
      };
    }

    await this.notificationsService.create(manager, {
      memberId,
      notificationType: 'Contribution',
      title: 'Contribution received',
      message:
        allocation?.status === 'Allocated'
          ? `${formatTsh(amount)} was added to your Health Wallet and allocated to ${allocation.providerName}. ${opts.remarks} Reference: ${opts.transactionReference}.`
          : `${formatTsh(amount)} was added to your Health Wallet. ${opts.remarks} Reference: ${opts.transactionReference}.`,
    });

    return { walletTransaction: savedTransaction, allocation };
  }

  // Other half of creditContribution()'s lifecycle — debits back exactly
  // what was credited and refuses to leave the wallet negative (the only
  // thing that could cause that is a spend path debiting the wallet in
  // between, which doesn't exist yet, but this stays correct if one is
  // added later).
  //
  // Serves BOTH terminal-undo statuses with the same mechanics, because
  // "the money needs to come back out" is identical either way — they
  // differ only in why, which the caller (Telecom/BankService) already
  // enforces before calling this:
  //   - reason 'Reversed': undoes an already-Allocated contribution
  //     (money reached an insurer's allocation; this walks it back).
  //     Marks that insurance_allocations row Reversed too.
  //   - reason 'Failed': voids a Received/Validated contribution that
  //     was never allocated (no active policy yet) — there is no
  //     insurance_allocations row to touch in that case.
  async reverseContribution(
    manager: EntityManager,
    memberId: number,
    originalWalletTransactionId: number,
    amount: number,
    opts: {
      contributionId?: number;
      bankTransactionId?: number;
      transactionReference: string;
      remarks: string;
      reason: 'Reversed' | 'Failed';
    },
  ): Promise<{ reversalTransactionId: number }> {
    const wallet = await this.getOrCreateWallet(manager, memberId);
    const newBalance = Number((wallet.balance - amount).toFixed(2));

    if (newBalance < 0) {
      throw new BadRequestException(
        `${opts.reason === 'Failed' ? 'Failing' : 'Reversing'} this would leave the member's wallet balance negative.`,
      );
    }

    wallet.balance = newBalance;
    await manager.save(HealthWallet, wallet);

    // Carries the same contributionId/bankTransactionId forward as the
    // original credit so the Member's transaction history still labels
    // this row's channel correctly (AIRTIME/BANK_TRANSFER), not as a
    // plain wallet top-up.
    const reversal = manager.create(WalletTransaction, {
      walletId: wallet.walletId,
      contributionId: opts.contributionId ?? null,
      bankTransactionId: opts.bankTransactionId ?? null,
      transactionType: `Contribution ${opts.reason}`,
      amount: -amount,
      transactionReference: `${opts.transactionReference}-${opts.reason === 'Failed' ? 'FAIL' : 'REV'}`,
      remarks: opts.remarks,
    });
    const savedReversal = await manager.save(WalletTransaction, reversal);

    if (opts.reason === 'Reversed') {
      // Scoped to allocation_status = 'Allocated' so this is itself
      // idempotent/duplicate-protected: a second reversal attempt on the
      // same wallet_transaction_id (which the caller's own contribution-
      // status check should already have blocked) finds no row here and
      // simply logs nothing further, rather than silently re-reversing.
      const [allocation] = await manager.query<{ allocation_id: number }[]>(
        `SELECT allocation_id FROM insurance_allocations
         WHERE wallet_transaction_id = $1 AND allocation_status = 'Allocated'`,
        [originalWalletTransactionId],
      );

      if (allocation) {
        await manager.query(
          `UPDATE insurance_allocations SET allocation_status = 'Reversed' WHERE allocation_id = $1`,
          [allocation.allocation_id],
        );

        await this.auditLogsService.record(manager, {
          memberId,
          actionType: 'insurance.allocation_reverse',
          affectedTable: 'insurance_allocations',
          affectedRecordId: allocation.allocation_id,
          oldValue: { allocationStatus: 'Allocated' },
          newValue: { allocationStatus: 'Reversed' },
        });
      }
    }

    await this.notificationsService.create(manager, {
      memberId,
      notificationType: 'Contribution',
      title: `Contribution ${opts.reason.toLowerCase()}`,
      message: `${formatTsh(amount)} was ${opts.reason === 'Failed' ? 'removed from' : 'reversed from'} your Health Wallet. ${opts.remarks} Reference: ${opts.transactionReference}.`,
    });

    return { reversalTransactionId: savedReversal.walletTransactionId };
  }

  async getWallet(memberId: number) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.getOrCreateWallet(manager, memberId);

      return {
        walletId: wallet.walletId,
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        walletStatus: wallet.walletStatus,
      };
    });
  }

  // Backs both the "Contribution" history view and the general
  // "Transaction History" page — every row is a Telecom/Bank-collected
  // deduction credited via creditContribution(), or an insurance payment
  // debited via reverseContribution()/its future outbound counterpart.
  async listTransactions(memberId: number, page: number, pageSize: number) {
    const wallet = await this.dataSource.transaction((manager) =>
      this.getOrCreateWallet(manager, memberId),
    );

    const [items, total] = await this.dataSource.manager.findAndCount(
      WalletTransaction,
      {
        where: { walletId: wallet.walletId },
        order: { transactionDate: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      },
    );

    const sumRow = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(amount), 0)', 'sum')
      .from(WalletTransaction, 'wt')
      .where('wt.wallet_id = :walletId', { walletId: wallet.walletId })
      .getRawOne<{ sum: string }>();

    // Surfaces the collection channel per CLAUDE.md's Member Dashboard
    // requirement, derived purely from which FK is set on the row itself
    // — no extra query. A row with neither is a legacy self-service
    // top-up row from before that path was removed, not a real
    // Telecom/Bank-collected contribution.
    const itemsWithChannel = items.map((item) => ({
      ...item,
      channel: item.contributionId
        ? ('AIRTIME' as const)
        : item.bankTransactionId
          ? ('BANK_TRANSFER' as const)
          : ('WALLET_TOPUP' as const),
    }));

    return {
      items: itemsWithChannel,
      total,
      totalAmount: Number(sumRow?.sum ?? 0),
      page,
      pageSize,
    };
  }
}
