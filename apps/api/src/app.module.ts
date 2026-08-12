import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queue/queue.module";
import { CommonModule } from "./common/common.module";
import { ObservabilityModule } from "./observability/observability.module";
import { SecurityModule } from "./security/security.module";
import { ConfigModule } from "./config/config.module";
import { EmailModule } from "./email/email.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProductsModule } from "./products/products.module";
import { CardsModule } from "./cards/cards.module";
import { SetsModule } from "./sets/sets.module";
import { InventoryModule } from "./inventory/inventory.module";
import { CartModule } from "./cart/cart.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { ShippingModule } from "./shipping/shipping.module";
import { CollectionModule } from "./collection/collection.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { PacksModule } from "./packs/packs.module";
import { RewardsModule } from "./rewards/rewards.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SearchModule } from "./search/search.module";
import { MediaModule } from "./media/media.module";
import { AdminModule } from "./admin/admin.module";
import { AuditModule } from "./audit/audit.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";

/**
 * Pokémon Vault — modular monolith API.
 * Domain modules are boundaries; services own business logic; controllers are
 * thin (HTTP in/out only). See docs/architecture.md.
 */
@Module({
  imports: [
    CommonModule,
    ObservabilityModule,
    SecurityModule,
    ConfigModule,
    PrismaModule,
    QueueModule,
    EmailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CardsModule,
    SetsModule,
    InventoryModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    CollectionModule,
    WishlistModule,
    PacksModule,
    RewardsModule,
    NotificationsModule,
    SearchModule,
    MediaModule,
    AdminModule,
    AuditModule,
    PrivacyModule,
    MaintenanceModule,
  ],
})
export class AppModule {}
