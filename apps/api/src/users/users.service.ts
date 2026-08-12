import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { CreateUserDto, UserDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async list(): Promise<UserDto[]> {
    // Never exposes passwordHash (repository SAFE_SELECT).
    return this.repo.findAll();
  }

  async create(dto: CreateUserDto, passwordHash: string): Promise<UserDto> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }
    return this.repo.create({ ...dto, passwordHash });
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    return this.repo.findByEmail(email);
  }

  async get(id: string): Promise<UserDto> {
    const users = await this.repo.findAll();
    const user = users.find((u) => u.id === id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateLastLogin(id: string): Promise<UserDto> {
    const user = await this.repo.updateLastLogin(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.repo.softDelete(id);
    if (!user) throw new NotFoundException("User not found");
  }
}
