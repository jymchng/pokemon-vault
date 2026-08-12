import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { QUEUES } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";

/**
 * Queue observability (§45): STAFF+ can inspect live queue depth (waiting/
 * active/completed/failed/delayed) for every domain queue.
 */
@Controller("admin/queues")
@UseGuards(AuthGuard, RolesGuard)
@Roles("STAFF")
export class QueueController {
  constructor(private readonly queues: QueueService) {}

  @Get()
  async index() {
    const counts: Record<string, Record<string, number>> = {};
    for (const name of QUEUES) {
      counts[name] = await this.queues.getCounts(name);
    }
    return { data: counts };
  }
}
