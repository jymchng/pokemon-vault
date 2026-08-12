import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserDto } from "./users.dto";

const SAFE_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  // passwordHash deliberately excluded — never returned.
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): Promise<UserDto> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        displayName: data.displayName ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
      select: SAFE_SELECT,
    });
    return user as UserDto;
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: SAFE_SELECT,
    });
    return (user as UserDto) ?? null;
  }

  /** Returns the full row INCLUDING passwordHash — for auth only; never exposed via DTO. */
  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateLastLogin(id: string): Promise<UserDto | null> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: SAFE_SELECT,
    });
    return (user as UserDto) ?? null;
  }

  /** Soft-delete (status DELETED + deletedAt); row remains for audit/GDPR. */
  async softDelete(id: string): Promise<UserDto | null> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date() },
      select: SAFE_SELECT,
    });
    return (user as UserDto) ?? null;
  }

  async findAll(): Promise<UserDto[]> {
    return (await this.prisma.user.findMany({ select: SAFE_SELECT })) as UserDto[];
  }
}
