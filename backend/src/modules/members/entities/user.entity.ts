import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PhoneNumber } from './phone-number.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({
    name: 'user_id',
  })
  userId!: number;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 50,
  })
  firstName!: string;

  @Column({
    name: 'second_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  secondName!: string | null;

  @Column({
    name: 'surname',
    type: 'varchar',
    length: 50,
  })
  surname!: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
  })
  email!: string | null;

  @Column({
    name: 'nida_number',
    type: 'varchar',
    length: 23,
    unique: true,
  })
  nidaNumber!: string;

  @Column({
    name: 'gender',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  gender!: string | null;

  @Column({
    name: 'date_of_birth',
    type: 'date',
    nullable: true,
  })
  dateOfBirth!: Date | null;

  @Column({
    name: 'address',
    type: 'text',
    nullable: true,
  })
  address!: string | null;

  @Column({
    name: 'region',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  region!: string | null;

  @Column({
    name: 'district',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  district!: string | null;

  @Column({
    name: 'password_hash',
    type: 'text',
  })
  passwordHash!: string;

  @Column({
    name: 'member_status',
    type: 'varchar',
    length: 20,
    default: 'Pending',
  })
  memberStatus!: string;

  @Column({
    name: 'account_status',
    type: 'varchar',
    length: 20,
    default: 'Active',
  })
  accountStatus!: 'Active' | 'Deactivated' | 'Deleted';

  @Column({
    name: 'email_verified',
    type: 'boolean',
    default: false,
  })
  emailVerified!: boolean;

  @Column({
    name: 'phone_verified',
    type: 'boolean',
    default: false,
  })
  phoneVerified!: boolean;

  @Column({
    name: 'bank_id',
    type: 'int',
    nullable: true,
  })
  bankId!: number | null;

  @Column({
    name: 'telecom_operator_id',
    type: 'int',
    nullable: true,
  })
  telecomOperatorId!: number | null;

  @Column({
    name: 'insurance_provider_id',
    type: 'int',
    nullable: true,
  })
  insuranceProviderId!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;

  @OneToMany(() => PhoneNumber, (phoneNumber) => phoneNumber.user)
  phoneNumbers!: PhoneNumber[];
}
