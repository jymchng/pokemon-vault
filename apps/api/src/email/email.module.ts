import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import { ConsoleEmailProvider } from "./providers/console.provider";
import { EmailService } from "./email.service";

@Module({
  imports: [QueueModule],
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: () => {
        // Real providers (resend/postmark/sendgrid/ses) implement EmailProvider
        // and are selected via EMAIL_PROVIDER; console is the local default.
        return new ConsoleEmailProvider();
      },
    },
  ],
  exports: [EmailService, EMAIL_PROVIDER],
})
export class EmailModule {}
