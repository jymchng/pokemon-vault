/**
 * OpenTelemetry tracing (§68) — lazy + optional. The SDK is only initialized
 * when OTEL_EXPORTER_OTLP_ENDPOINT is set (prod/observability); local dev and
 * tests are untouched. Traces export to the OTLP endpoint (collector/Tempo/
 * Jaeger). Correlation: the request_id is attached as a span attribute so
 * traces can be joined to logs.
 *
 * Requires (prod only): pnpm --filter @pokemon-vault/api add
 *   @opentelemetry/sdk-node @opentelemetry/api
 *   @opentelemetry/exporter-trace-otlp-http
 *   @opentelemetry/instrumentation-http
 * (see apps/api/src/observability/otel.d.ts for the ambient declaration).
 */
export interface TracingInit {
  /** True when the SDK was started (OTEL endpoint configured). */
  started: boolean;
}

export function initTracing(): TracingInit {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return { started: false };

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require("@opentelemetry/sdk-node");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");

  const traceExporter = new OTLPTraceExporter({ url: endpoint });
  const nodeSdk = new sdk.NodeSDK({
    traceExporter,
    instrumentations: [new HttpInstrumentation()],
    serviceName: "pokemon-vault-api",
  });
  nodeSdk.start();
  console.log(`[tracing] OpenTelemetry started → ${endpoint}`);
  return { started: true };
}
