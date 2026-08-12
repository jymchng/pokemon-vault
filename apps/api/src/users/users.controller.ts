import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { hashPassword } from "../common/password.policy";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard, AuthenticatedUser } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { UsersService } from "./users.service";
import { CreateUserSchema, CreateUserDto } from "./users.dto";

/**
 * User management. Server-side RBAC:
 *   - GET  /users       STAFF or higher (list users)
 *   - POST /users       ADMIN or higher (create users)
 *   - GET  /users/:id   authenticated; self OR STAFF or higher
 */
@Controller("users")
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles("STAFF")
  async index() {
    // Thin controller: delegates to the service.
    return { data: await this.service.list() };
  }

  @Post()
  @Roles("ADMIN")
  async create(@Body() body: CreateUserDto) {
    // Validate (email + password strength policy) before doing anything.
    const parsed = CreateUserSchema.parse(body);
    // Password hashing (Argon2id) happens here at the boundary — the service
    // never sees plaintext beyond what it passes to the repository as a hash.
    const passwordHash = await hashPassword(parsed.password);
    return { data: await this.service.create(parsed, passwordHash) };
  }

  @Get(":id")
  async get(@Req() req: { user: AuthenticatedUser }, @Param("id") id: string) {
    // Authenticated: self always allowed; staff+ may view any user.
    if (id !== req.user.id && req.user.role === "CUSTOMER") {
      throw new ForbiddenException("Cannot view other users");
    }
    return { data: await this.service.get(id) };
  }
}
