import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { hashPassword } from "../common/password.policy";
import { UsersService } from "./users.service";
import { CreateUserSchema, CreateUserDto } from "./users.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service.
    return { data: await this.service.list() };
  }

  @Post()
  async create(@Body() body: CreateUserDto) {
    // Validate (email + password strength policy) before doing anything.
    const parsed = CreateUserSchema.parse(body);
    // Password hashing (Argon2id) happens here at the boundary — the service
    // never sees plaintext beyond what it passes to the repository as a hash.
    const passwordHash = await hashPassword(parsed.password);
    return { data: await this.service.create(parsed, passwordHash) };
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return { data: await this.service.get(id) };
  }
}
