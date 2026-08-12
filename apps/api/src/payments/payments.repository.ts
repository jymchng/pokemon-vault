import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface PaymentRecordDto {
  id: string;
  orderId: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrderId(orderId: string): Promise<PaymentRecordDto | null> {
    const row = await this.prisma.payment.findUnique({ where: { orderId } });
    return row ? this.map(row) : null;
  }

  async findByProviderRef(providerRef: string): Promise<PaymentRecordDto | null> {
    const row = await this.prisma.payment.findFirst({ where: { providerRef } });
    return row ? this.map(row) : null;
  }

  async createPayment(data: {
    orderId: string;
    provider: string;
    providerRef: string;
    amount: number;
    currency: string;
    status: string;
    idempotencyKey: string;
  }): Promise<PaymentRecordDto> {
    const row = await this.prisma.payment.create({ data });
    return this.map(row);
  }

  async findByIdempotencyKey(key: string): Promise<PaymentRecordDto | null> {
    const row = await this.prisma.payment.findUnique({ where: { idempotencyKey: key } });
    return row ? this.map(row) : null;
  }

  async updateStatus(id: string, status: string, providerRef?: string): Promise<PaymentRecordDto> {
    const row = await this.prisma.payment.update({
      where: { id },
      data: { status, ...(providerRef !== undefined ? { providerRef } : {}) },
    });
    return this.map(row);
  }

  /** Idempotent webhook-event record: unique providerEventId; returns existing on replay. */
  async recordWebhookEvent(data: {
    providerEventId: string;
    paymentId?: string | null;
    type: string;
    payload: Record<string, unknown>;
  }) {
    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { providerEventId: data.providerEventId },
    });
    if (existing) return { event: existing, replayed: true };
    const event = await this.prisma.paymentWebhookEvent.create({
      data: {
        providerEventId: data.providerEventId,
        paymentId: data.paymentId ?? null,
        type: data.type,
        payload: data.payload as any,
        processedAt: new Date(),
      },
    });
    return { event, replayed: false };
  }

  async markProcessed(eventId: string, paymentId?: string): Promise<void> {
    await this.prisma.paymentWebhookEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date(), ...(paymentId !== undefined ? { paymentId } : {}) },
    });
  }

  async findUnprocessedEvents(): Promise<any[]> {
    return this.prisma.paymentWebhookEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  }

  private map(row: any): PaymentRecordDto {
    return {
      id: row.id,
      orderId: row.orderId,
      provider: row.provider,
      providerRef: row.providerRef,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
