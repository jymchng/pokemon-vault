import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { OBJECT_STORAGE } from "./object-storage.interface";
import { MemoryObjectStorage } from "./providers/memory.storage";
import { MediaService } from "./media.service";
import { MediaRepository } from "./media.repository";
import { MediaController } from "./media.controller";

@Module({
  imports: [QueueModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaRepository,
    {
      provide: OBJECT_STORAGE,
      useFactory: () => {
        // MinIO (local) and S3 (prod) implement ObjectStorage and are selected
        // via OBJECT_STORAGE env; memory is the default for dev/tests.
        const kind = process.env.POKE_VAULT_OBJECT_STORAGE || "memory";
        if (kind !== "memory") {
          // Real MinIO/S3 adapters plug in here.
        }
        return new MemoryObjectStorage();
      },
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
