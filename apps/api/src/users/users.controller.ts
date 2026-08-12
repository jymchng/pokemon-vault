import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import * as argon2 from "argon2";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./users.dto";

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
    // Password hashing (Argon2id) happens here at the boundary — the service
    // never sees plaintext beyond what it passes to the repository as a hash.
    const passwordHash = await argon2.hash(body.password);
    return { data: await this.service.create(body, passwordHash) };
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return { data: await this.service.get(id) };
  }
}
