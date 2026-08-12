/**
 * Ambient declarations for the OPTIONAL observability SDKs (§68-69). These
 * packages are only installed in production deployments that enable OTel /
 * Sentry; local dev and tests never require them. Keeping the declarations
 * here keeps `tsc --noEmit` green without the dependencies present.
 */
declare module "@opentelemetry/sdk-node" {
  export class NodeSDK {
    constructor(options: {
      traceExporter: unknown;
      instrumentations: unknown[];
      serviceName?: string;
    });
    start(): void;
  }
}
declare module "@opentelemetry/exporter-trace-otlp-http" {
  export class OTLPTraceExporter {
    constructor(options: { url: string });
  }
}
declare module "@opentelemetry/instrumentation-http" {
  export class HttpInstrumentation {
    constructor();
  }
}
declare module "@sentry/node" {
  export function init(options: {
    dsn: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
  }): void;
  export function withScope(cb: (scope: { setTag(k: string, v: string): void; setUser(u: { id: string }): void }) => void): void;
  export function captureException(err: unknown): void;
}
