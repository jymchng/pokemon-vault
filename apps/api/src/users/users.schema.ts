import { CreateUserSchema } from "./users.dto";

export const CreateUserPayloadSchema = CreateUserSchema;

export const UserQuerySchema = CreateUserSchema.pick({ email: true }).partial();
