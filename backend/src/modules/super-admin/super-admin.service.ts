import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import { User } from '../members/entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CreateAdministratorDto,
  StaffRole,
} from './dto/create-administrator.dto';

// ==========================================
// INTERFACES
// ==========================================

interface RoleCountRow {
  role_name: string;
  count: number;
}

interface StatusCountRow {
  status: string;
  count: number;
}

interface TenantOption {
  id: number;
  name: string;
}

interface AccountRow {
  user_id: number;
  first_name: string;
  second_name: string | null;
  surname: string;
  email: string | null;
  nida_number: string;
  account_status: string;
}

interface ManagedAccountRow {
  user_id: number;
  first_name: string;
  second_name: string | null;
  surname: string;
  email: string | null;
  nida_number: string;
  gender: string | null;
  date_of_birth: Date | null;
  address: string | null;
  region: string | null;
  district: string | null;
  member_status: string;
  account_status: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
  role_name: string;
  bank_name: string | null;
  operator_name: string | null;
  provider_name: string | null;
  primary_phone: string | null;
  phone_status: string | null;
  sim_type: string | null;
}

type InstitutionType =
| 'banks'
| 'telecom-operators'
| 'insurance-providers';

type ManagedUserRole =
| 'Member'
| 'Admin'
| 'Bank'
| 'Telecom'
| 'Insurance';

interface InstitutionQueryConfig {
  table: string;
  searchColumns: string[];
  select: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const MANAGED_ROLES: ManagedUserRole[] = [
  'Member',
'Admin',
'Bank',
'Telecom',
'Insurance',
];

const INSTITUTION_QUERIES: Record<
InstitutionType,
InstitutionQueryConfig
> = {
  banks: {
    table: 'banks',
    searchColumns: ['bank_name', 'bank_code', 'swift_code'],
    select: `
    bank_id AS id,
    bank_name AS name,
    bank_code AS "bankCode",
    swift_code AS "swiftCode",
    country_code AS "countryCode",
    status,
    contact_phone AS "contactPhone",
    contact_email AS "contactEmail",
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    (
      api_endpoint IS NOT NULL
      AND api_endpoint <> ''
    ) AS "hasApiEndpoint",
    (
      api_key_hash IS NOT NULL
      AND api_key_hash <> ''
    ) AS "hasApiCredentials",
    (
      webhook_url IS NOT NULL
      AND webhook_url <> ''
    ) AS "hasWebhook"
    `,
  },

  'telecom-operators': {
    table: 'telecom_operators',
    searchColumns: ['operator_name', 'country_code'],
    select: `
    operator_id AS id,
    operator_name AS name,
    country_code AS "countryCode",
    status,
    contact_phone AS "contactPhone",
    contact_email AS "contactEmail",
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    (
      api_endpoint IS NOT NULL
      AND api_endpoint <> ''
    ) AS "hasApiEndpoint",
    (
      api_key_hash IS NOT NULL
      AND api_key_hash <> ''
    ) AS "hasApiCredentials",
    (
      webhook_url IS NOT NULL
      AND webhook_url <> ''
    ) AS "hasWebhook"
    `,
  },

  'insurance-providers': {
    table: 'insurance_providers',
    searchColumns: ['provider_name', 'license_number'],
    select: `
    provider_id AS id,
    provider_name AS name,
    license_number AS "licenseNumber",
    status,
    contact_phone AS "contactPhone",
    contact_email AS "contactEmail",
    address,
    created_at AS "createdAt"
    `,
  },
};

const TENANT_LOOKUP: Partial<
Record<StaffRole, { table: string; pkColumn: string }>
> = {
  Bank: {
    table: 'banks',
    pkColumn: 'bank_id',
  },
  Telecom: {
    table: 'telecom_operators',
    pkColumn: 'operator_id',
  },
  Insurance: {
    table: 'insurance_providers',
    pkColumn: 'provider_id',
  },
};

// ==========================================
// SERVICE
// ==========================================

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly dataSource: DataSource,
      private readonly auditLogsService: AuditLogsService,
  ) {}

  // ==========================================
  // SUPER ADMIN DASHBOARD
  // PRESERVED
  // ==========================================

  async getDashboard() {
    const [
      usersByRole,
      banksByStatus,
      operatorsByStatus,
      providersByStatus,
      [{ count: roleCount }],
      [{ count: permissionCount }],
      recentAuditLogCount,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT
        r.role_name,
        COUNT(*)::int AS count
        FROM member_roles mr
        JOIN roles r ON r.role_id = mr.role_id
        GROUP BY r.role_name`,
      ) as Promise<RoleCountRow[]>,

      this.countByStatus('banks'),

                          this.countByStatus('telecom_operators'),

                          this.countByStatus('insurance_providers'),

                          this.dataSource.query(
                            `SELECT COUNT(*)::int AS count FROM roles`,
                          ) as Promise<{ count: number }[]>,

                          this.dataSource.query(
                            `SELECT COUNT(*)::int AS count FROM permissions`,
                          ) as Promise<{ count: number }[]>,

                          this.auditLogsService.countRecent(24),
    ]);

    return {
      usersByRole: Object.fromEntries(
        usersByRole.map((row) => [
          row.role_name,
          row.count,
        ]),
      ),
      banksByStatus,
      operatorsByStatus,
      providersByStatus,
      roleCount,
      permissionCount,
      recentAuditLogCount,
    };
  }

  // ==========================================
  // LIST ACCOUNTS BY ROLE
  // MEMBERS / ADMIN / BANK / TELECOM / INSURANCE
  // ==========================================

  async listUsersByRole(
    role: ManagedUserRole,
    search?: string,
    status?: string,
    page = 1,
    pageSize = 20,
  ) {
    if (!MANAGED_ROLES.includes(role)) {
      throw new BadRequestException(
        'Invalid account category.',
      );
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(
      100,
      Math.max(1, pageSize),
    );

    const offset = (safePage - 1) * safePageSize;

    const conditions: string[] = [
      'r.role_name = $1',
      "u.account_status IS DISTINCT FROM 'Deleted'",
    ];

    const parameters: (string | number)[] = [role];

    if (search?.trim()) {
      parameters.push(`%${search.trim()}%`);

      const index = parameters.length;

      conditions.push(`
      (
        u.first_name ILIKE $${index}
        OR u.second_name ILIKE $${index}
        OR u.surname ILIKE $${index}
        OR u.email ILIKE $${index}
        OR u.nida_number ILIKE $${index}
        OR EXISTS (
          SELECT 1
          FROM phone_numbers pn_search
          WHERE pn_search.user_id = u.user_id
          AND pn_search.phone_number ILIKE $${index}
        )
      )
      `);
    }

    if (status?.trim()) {
      parameters.push(status.trim());

      conditions.push(
        `LOWER(u.account_status::text) = LOWER($${parameters.length})`,
      );
    }

    const whereClause = `
    WHERE ${conditions.join(' AND ')}
    `;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT u.user_id)::int AS total
      FROM users u
      INNER JOIN member_roles mr
      ON mr.member_id = u.user_id
      INNER JOIN roles r
      ON r.role_id = mr.role_id
      ${whereClause}`,
      parameters,
    ) as { total: number }[];

    const total = countRows[0]?.total ?? 0;

    const rows = await this.dataSource.query(
      `SELECT DISTINCT ON (u.user_id)
      u.user_id,
      u.first_name,
      u.second_name,
      u.surname,
      u.email,
      u.nida_number,
      u.gender,
      u.date_of_birth,
      u.address,
      u.region,
      u.district,
      u.member_status,
      u.account_status,
      u.email_verified,
      u.phone_verified,
      u.created_at,
      u.updated_at,
      r.role_name,
      b.bank_name,
      t.operator_name,
      ip.provider_name,
      phone.primary_phone,
      phone.phone_status,
      phone.sim_type

      FROM users u

      INNER JOIN member_roles mr
      ON mr.member_id = u.user_id

      INNER JOIN roles r
      ON r.role_id = mr.role_id

      LEFT JOIN banks b
      ON b.bank_id = u.bank_id

      LEFT JOIN telecom_operators t
      ON t.operator_id = u.telecom_operator_id

      LEFT JOIN insurance_providers ip
      ON ip.provider_id = u.insurance_provider_id

      LEFT JOIN LATERAL (
        SELECT
        pn.phone_number AS primary_phone,
        pn.phone_status,
        pn.sim_type
        FROM phone_numbers pn
        WHERE pn.user_id = u.user_id
        ORDER BY
        pn.is_primary DESC,
        pn.created_at DESC,
        pn.phone_id DESC
        LIMIT 1
      ) phone ON TRUE

      ${whereClause}

      ORDER BY
      u.user_id,
      u.created_at DESC

      LIMIT $${parameters.length + 1}
      OFFSET $${parameters.length + 2}`,
      [...parameters, safePageSize, offset],
    ) as ManagedAccountRow[];

    return {
      data: rows.map((row) => ({
        userId: row.user_id,

        firstName: row.first_name,
        secondName: row.second_name,
        surname: row.surname,

        fullName: [
          row.first_name,
          row.second_name,
          row.surname,
        ]
        .filter(Boolean)
        .join(' '),

                               email: row.email,
                               phoneNumber: row.primary_phone,

                               phoneStatus: row.phone_status,
                               simType: row.sim_type,

                               nidaNumber: row.nida_number,
                               gender: row.gender,
                               dateOfBirth: row.date_of_birth,

                               address: row.address,
                               region: row.region,
                               district: row.district,

                               memberStatus: row.member_status,
                               accountStatus: row.account_status,

                               emailVerified: row.email_verified,
                               phoneVerified: row.phone_verified,

                               createdAt: row.created_at,
                               updatedAt: row.updated_at,

                               role: row.role_name,

                               tenantName:
                               row.bank_name ??
                               row.operator_name ??
                               row.provider_name ??
                               null,
      })),
      pagination: {
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }

  // ==========================================
  // LIST ADMINISTRATORS
  // BACKWARD COMPATIBILITY
  // ==========================================

  async listAdministrators() {
    return this.listUsersByRole('Admin');
  }

  // ==========================================
  // LIST INSTITUTIONS
  // ==========================================

  async listInstitutions(
    type: InstitutionType,
    search?: string,
    status?: string,
    page = 1,
    pageSize = 20,
  ) {
    const config = INSTITUTION_QUERIES[type];

    if (!config) {
      throw new BadRequestException(
        'Invalid institution type.',
      );
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(
      100,
      Math.max(1, pageSize),
    );

    const offset = (safePage - 1) * safePageSize;

    const conditions: string[] = [];
    const parameters: (string | number)[] = [];

    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;

      const searchConditions = config.searchColumns.map(
        (column) => {
          parameters.push(searchTerm);

          return `${column} ILIKE $${parameters.length}`;
        },
      );

      conditions.push(
        `(${searchConditions.join(' OR ')})`,
      );
    }

    if (status?.trim()) {
      parameters.push(status.trim());

      conditions.push(
        `LOWER(status::text) = LOWER($${parameters.length})`,
      );
    }

    const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
      FROM ${config.table}
      ${whereClause}`,
      parameters,
    ) as { total: number }[];

    const total = countRows[0]?.total ?? 0;

    const rows = await this.dataSource.query(
      `SELECT ${config.select}
      FROM ${config.table}
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${parameters.length + 1}
      OFFSET $${parameters.length + 2}`,
      [...parameters, safePageSize, offset],
    );

    return {
      data: rows,
      pagination: {
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }

  // ==========================================
  // LIST AVAILABLE TENANTS
  // ==========================================

  async listTenants(): Promise<{
    banks: TenantOption[];
    telecomOperators: TenantOption[];
    insuranceProviders: TenantOption[];
  }> {
    const [
      banks,
      telecomOperators,
      insuranceProviders,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT
        bank_id AS id,
        bank_name AS name
        FROM banks
        ORDER BY bank_name`,
      ) as Promise<TenantOption[]>,

      this.dataSource.query(
        `SELECT
        operator_id AS id,
        operator_name AS name
        FROM telecom_operators
        ORDER BY operator_name`,
      ) as Promise<TenantOption[]>,

      this.dataSource.query(
        `SELECT
        provider_id AS id,
        provider_name AS name
        FROM insurance_providers
        ORDER BY provider_name`,
      ) as Promise<TenantOption[]>,
    ]);

    return {
      banks,
      telecomOperators,
      insuranceProviders,
    };
  }

  // ==========================================
  // CREATE ADMINISTRATOR
  // ==========================================

  async createAdministrator(
    dto: CreateAdministratorDto,
    actorId: number,
    ipAddress: string | null = null,
  ) {
    const tenantConfig = TENANT_LOOKUP[dto.role];

    if (tenantConfig && !dto.tenantId) {
      throw new BadRequestException(
        `A ${dto.role} account requires a tenantId.`,
      );
    }

    if (!tenantConfig && dto.tenantId) {
      throw new BadRequestException(
        `A ${dto.role} account must not have a tenantId.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      if (tenantConfig && dto.tenantId) {
        const tenantRows = await manager.query(
          `SELECT ${tenantConfig.pkColumn} AS id
          FROM ${tenantConfig.table}
          WHERE ${tenantConfig.pkColumn} = $1`,
          [dto.tenantId],
        ) as { id: number }[];

        if (!tenantRows[0]) {
          throw new NotFoundException(
            `No ${dto.role} tenant found with id ${dto.tenantId}.`,
          );
        }
      }

      const email = dto.email.trim().toLowerCase();
      const nidaNumber = dto.nidaNumber.trim();

      const existingNida = await manager.findOne(User, {
        where: { nidaNumber },
      });

      if (existingNida) {
        throw new ConflictException(
          'NIDA number is already registered.',
        );
      }

      const existingEmail = await manager.findOne(User, {
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException(
          'Email is already registered.',
        );
      }

      const passwordHash = await bcrypt.hash(
        dto.password,
        12,
      );

      const user = manager.create(User, {
        firstName: dto.firstName.trim(),
                                  secondName: dto.secondName?.trim() || null,
                                  surname: dto.surname.trim(),
                                  email,
                                  nidaNumber,
                                  passwordHash,
                                  memberStatus: 'Active',
                                  emailVerified: false,
                                  phoneVerified: false,

                                  bankId:
                                  dto.role === 'Bank'
      ? (dto.tenantId ?? null)
      : null,

      telecomOperatorId:
      dto.role === 'Telecom'
      ? (dto.tenantId ?? null)
      : null,

      insuranceProviderId:
      dto.role === 'Insurance'
      ? (dto.tenantId ?? null)
      : null,
      });

      const savedUser = await manager.save(User, user);

      const roleRows = await manager.query(
        `SELECT role_id
        FROM roles
        WHERE role_name = $1
        LIMIT 1`,
        [dto.role],
      ) as { role_id: number }[];

      const roleRow = roleRows[0];

      if (!roleRow) {
        throw new InternalServerErrorException(
          `${dto.role} role is not configured.`,
        );
      }

      await manager.query(
        `INSERT INTO member_roles (
          member_id,
          role_id
        )
        VALUES ($1, $2)`,
                          [savedUser.userId, roleRow.role_id],
      );

      await this.auditLogsService.record(manager, {
        memberId: actorId,
        actionType: 'staff_account.create',
        affectedTable: 'users',
        affectedRecordId: savedUser.userId,
        newValue: {
          email,
          role: dto.role,
          tenantId: dto.tenantId ?? null,
        },
        ipAddress,
      });

      const {
        passwordHash: _passwordHash,
        ...safeUser
      } = savedUser;

      return {
        ...safeUser,
        role: dto.role,
      };
    });
  }

  // ==========================================
  // DEACTIVATE ACCOUNT
  // ALL MANAGED ROLES
  // ==========================================

  async deactivateAdministrator(
    userId: number,
    actorId: number,
    ipAddress: string | null = null,
    expectedRole: ManagedUserRole = 'Admin',
  ) {
    if (userId === actorId) {
      throw new BadRequestException(
        'You cannot deactivate your own account.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const userRows = await manager.query(
        `SELECT
        user_id,
        first_name,
        second_name,
        surname,
        email,
        nida_number,
        account_status
        FROM users
        WHERE user_id = $1
        FOR UPDATE`,
        [userId],
      ) as AccountRow[];

      const user = userRows[0];

      if (!user) {
        throw new NotFoundException(
          'Account not found.',
        );
      }

      await this.assertManagedAccountRole(
        manager,
        userId,
        expectedRole,
      );

      if (user.account_status === 'Deleted') {
        throw new ConflictException(
          'This account has already been deleted.',
        );
      }

      if (user.account_status === 'Deactivated') {
        throw new ConflictException(
          'This account is already deactivated.',
        );
      }

      await this.protectLastActiveSuperAdmin(
        manager,
        userId,
      );

      await manager.query(
        `UPDATE users
        SET account_status = 'Deactivated',
        updated_at = NOW()
        WHERE user_id = $1`,
        [userId],
      );

      await this.revokeUserSessions(manager, userId);

      await this.auditLogsService.record(manager, {
        memberId: actorId,
        actionType: 'staff_account.deactivate',
        affectedTable: 'users',
        affectedRecordId: userId,
        oldValue: {
          accountStatus: user.account_status,
        },
        newValue: {
          accountStatus: 'Deactivated',
          role: expectedRole,
          sessionsRevoked: true,
        },
        ipAddress,
      });

      return {
        message: `${expectedRole} account deactivated successfully.`,
        userId,
        role: expectedRole,
        accountStatus: 'Deactivated',
      };
    });
  }

  // ==========================================
  // REACTIVATE ACCOUNT
  // ALL MANAGED ROLES
  // ==========================================

  async activateAdministrator(
    userId: number,
    actorId: number,
    ipAddress: string | null = null,
    expectedRole: ManagedUserRole = 'Admin',
  ) {
    return this.dataSource.transaction(async (manager) => {
      const userRows = await manager.query(
        `SELECT
        user_id,
        first_name,
        second_name,
        surname,
        email,
        nida_number,
        account_status
        FROM users
        WHERE user_id = $1
        FOR UPDATE`,
        [userId],
      ) as AccountRow[];

      const user = userRows[0];

      if (!user) {
        throw new NotFoundException(
          'Account not found.',
        );
      }

      await this.assertManagedAccountRole(
        manager,
        userId,
        expectedRole,
      );

      if (user.account_status === 'Deleted') {
        throw new ConflictException(
          'A deleted account cannot be reactivated. Register a new account instead.',
        );
      }

      if (user.account_status === 'Active') {
        throw new ConflictException(
          'This account is already active.',
        );
      }

      await manager.query(
        `UPDATE users
        SET account_status = 'Active',
        updated_at = NOW()
        WHERE user_id = $1`,
        [userId],
      );

      await this.auditLogsService.record(manager, {
        memberId: actorId,
        actionType: 'staff_account.activate',
        affectedTable: 'users',
        affectedRecordId: userId,
        oldValue: {
          accountStatus: user.account_status,
        },
        newValue: {
          accountStatus: 'Active',
          role: expectedRole,
        },
        ipAddress,
      });

      return {
        message: `${expectedRole} account reactivated successfully.`,
        userId,
        role: expectedRole,
        accountStatus: 'Active',
      };
    });
  }

  // ==========================================
  // DELETE / ANONYMIZE ACCOUNT
  // ALL MANAGED ROLES
  // ==========================================

  async deleteAdministrator(
    userId: number,
    actorId: number,
    ipAddress: string | null = null,
    expectedRole: ManagedUserRole = 'Admin',
  ) {
    if (userId === actorId) {
      throw new BadRequestException(
        'You cannot delete your own account.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const userRows = await manager.query(
        `SELECT
        user_id,
        first_name,
        second_name,
        surname,
        email,
        nida_number,
        account_status
        FROM users
        WHERE user_id = $1
        FOR UPDATE`,
        [userId],
      ) as AccountRow[];

      const user = userRows[0];

      if (!user) {
        throw new NotFoundException(
          'Account not found.',
        );
      }

      await this.assertManagedAccountRole(
        manager,
        userId,
        expectedRole,
      );

      if (user.account_status === 'Deleted') {
        throw new ConflictException(
          'This account has already been deleted.',
        );
      }

      await this.protectLastActiveSuperAdmin(
        manager,
        userId,
      );

      const syntheticNida = await this.generateSyntheticNida(
        manager,
        userId,
      );

      await this.revokeUserSessions(manager, userId);

      // Preserve historical foreign-key relationships.
      // Anonymize personal information instead of physically
      // deleting the user record.

      await manager.query(
        `UPDATE users
        SET first_name = 'Deleted',
        second_name = NULL,
        surname = 'Account',
        email = NULL,
        nida_number = $1,
        gender = NULL,
        date_of_birth = NULL,
        address = NULL,
        region = NULL,
        district = NULL,
        password_hash = $2,
        email_verified = FALSE,
        phone_verified = FALSE,
        account_status = 'Deleted',
        updated_at = NOW()
        WHERE user_id = $3`,
        [
          syntheticNida,
          randomBytes(64).toString('hex'),
                          userId,
        ],
      );

      await this.auditLogsService.record(manager, {
        memberId: actorId,
        actionType: 'staff_account.delete',
        affectedTable: 'users',
        affectedRecordId: userId,
        oldValue: {
          accountStatus: user.account_status,
        },
        newValue: {
          accountStatus: 'Deleted',
          role: expectedRole,
          identityAnonymized: true,
          emailReleased: true,
          nidaReleased: true,
          sessionsRevoked: true,
          historicalRecordsPreserved: true,
        },
        ipAddress,
      });

      return {
        message:
        `${expectedRole} account deleted and anonymized successfully.`,
        userId,
        role: expectedRole,
        accountStatus: 'Deleted',
        identityAnonymized: true,
        historicalRecordsPreserved: true,
      };
    });
  }

  // ==========================================
  // VALIDATE ACCOUNT ROLE
  // ==========================================

  private async assertManagedAccountRole(
    manager: EntityManager,
    userId: number,
    expectedRole: ManagedUserRole,
  ): Promise<void> {
    if (!MANAGED_ROLES.includes(expectedRole)) {
      throw new BadRequestException(
        'Invalid account category.',
      );
    }

    const roleRows = await manager.query(
      `SELECT r.role_name
      FROM member_roles mr
      INNER JOIN roles r
      ON r.role_id = mr.role_id
      WHERE mr.member_id = $1`,
      [userId],
    ) as { role_name: string }[];

    const hasExpectedRole = roleRows.some(
      (row) => row.role_name === expectedRole,
    );

    if (!hasExpectedRole) {
      throw new BadRequestException(
        'The selected account does not belong to this category.',
      );
    }

    const isSuperAdmin = roleRows.some(
      (row) => row.role_name === 'Super-admin',
    );

    if (isSuperAdmin) {
      throw new BadRequestException(
        'Super Admin accounts cannot be managed through these account categories.',
      );
    }
  }

  // ==========================================
  // REVOKE USER SESSIONS
  // ==========================================

  private async revokeUserSessions(
    manager: EntityManager,
    userId: number,
  ): Promise<void> {
    await manager.query(
      `UPDATE sessions
      SET session_status = 'Revoked',
      logout_time = COALESCE(logout_time, NOW())
      WHERE member_id = $1
      AND session_status = 'Active'`,
      [userId],
    );
  }

  // ==========================================
  // PROTECT LAST ACTIVE SUPER ADMIN
  // ==========================================

  private async protectLastActiveSuperAdmin(
    manager: EntityManager,
    targetUserId: number,
  ): Promise<void> {
    const targetRoleRows = await manager.query(
      `SELECT r.role_name
      FROM member_roles mr
      JOIN roles r ON r.role_id = mr.role_id
      WHERE mr.member_id = $1
      AND r.role_name = 'Super-admin'
      LIMIT 1`,
      [targetUserId],
    ) as { role_name: string }[];

    if (!targetRoleRows[0]) {
      return;
    }

    const activeAdmins = await manager.query(
      `SELECT u.user_id
      FROM users u
      JOIN member_roles mr
      ON mr.member_id = u.user_id
      JOIN roles r
      ON r.role_id = mr.role_id
      WHERE r.role_name = 'Super-admin'
    AND u.account_status = 'Active'
    FOR UPDATE OF u`,
    ) as { user_id: number }[];

    if (
      activeAdmins.length <= 1 &&
      activeAdmins.some(
        (admin) => admin.user_id === targetUserId,
      )
    ) {
      throw new BadRequestException(
        'You cannot deactivate or delete the last active Super Admin account.',
      );
    }
  }

  // ==========================================
  // GENERATE SYNTHETIC NIDA
  // ==========================================

  private async generateSyntheticNida(
    manager: EntityManager,
    userId: number,
  ): Promise<string> {
    const paddedId = String(userId).padStart(10, '0');

    for (let suffix = 0; suffix <= 99; suffix++) {
      const candidate =
      `99999999-${paddedId.slice(0, 5)}-` +
      `${paddedId.slice(5, 10)}-` +
      `${String(suffix).padStart(2, '0')}`;

      const existing = await manager.query(
        `SELECT user_id
        FROM users
        WHERE nida_number = $1
        AND user_id <> $2
        LIMIT 1`,
        [candidate, userId],
      ) as { user_id: number }[];

      if (existing.length === 0) {
        return candidate;
      }
    }

    throw new ConflictException(
      'Could not generate a unique anonymized NIDA identifier.',
    );
  }

  // ==========================================
  // COUNT INSTITUTIONS BY STATUS
  // ==========================================

  private async countByStatus(
    table:
    | 'banks'
    | 'telecom_operators'
    | 'insurance_providers',
  ): Promise<Record<string, number>> {
    const rows = await this.dataSource.query(
      `SELECT
      status,
      COUNT(*)::int AS count
      FROM ${table}
      GROUP BY status`,
    ) as StatusCountRow[];

    return Object.fromEntries(
      rows.map((row) => [
        row.status,
        row.count,
      ]),
    );
  }
}
