/**
 * Secrets management (§56): environment variables locally, AWS Secrets Manager
 * or Doppler in production. Secrets are resolved through a single provider
 * abstraction selected by POKE_VAULT_SECRETS_PROVIDER:
 *
 *   - "env"     (default, local/dev)  — plain process.env
 *   - "doppler" — Doppler API v3 (Bearer POKE_VAULT_DOPPLER_TOKEN), fetched + cached
 *   - "aws"     — AWS Secrets Manager (GetSecretValue on POKE_VAULT_SECRETS_ARN), cached
 *
 * Hard rules: secrets never live in git, container images, or logs. Connection
 * strings are masked before logging (see maskConnectionString). Missing
 * secrets fail startup with the variable NAME only — never its value.
 */

export interface SecretProvider {
  readonly name: "env" | "aws" | "doppler";
  get(name: string): Promise<string>;
}

/** Plain environment-variable provider (local/dev default). */
export class EnvSecretProvider implements SecretProvider {
  readonly name = "env" as const;
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}
  async get(name: string): Promise<string> {
    const value = this.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
  }
}

/** Minimal fetch signature so tests can inject a stub without network. */
export interface SecretFetcher {
  (url: string, init: { headers: Record<string, string> }): Promise<{
    ok: boolean;
    status: number;
    json(): Promise<Record<string, string>>;
  }>;
}

/**
 * Doppler provider: GET /v3/configs/config/secrets/download?format=json returns
 * a flat { NAME: value } map; it is fetched once per process and cached.
 */
export class DopplerSecretProvider implements SecretProvider {
  readonly name = "doppler" as const;
  private cache: Record<string, string> | null = null;

  constructor(
    private readonly opts: {
      token: string;
      project?: string;
      config?: string;
      fetcher?: SecretFetcher;
    },
  ) {}

  private async load(): Promise<Record<string, string>> {
    if (this.cache) return this.cache;
    const base = "https://api.doppler.com/v3/configs/config/secrets/download?format=json";
    const url = this.opts.project
      ? `${base}&project=${encodeURIComponent(this.opts.project)}&config=${encodeURIComponent(
          this.opts.config ?? "prd",
        )}`
      : base;
    const fetchImpl: SecretFetcher =
      this.opts.fetcher ?? ((u, init) => fetch(u, { headers: init.headers } as any));
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${this.opts.token}` } });
    if (!res.ok) {
      throw new Error(`Doppler secrets download failed (HTTP ${res.status})`);
    }
    this.cache = await res.json();
    return this.cache;
  }

  async get(name: string): Promise<string> {
    const all = await this.load();
    const value = all[name];
    if (!value) throw new Error(`Secret not found in Doppler config: ${name}`);
    return value;
  }
}

/** Minimal AWS SDK surface so tests inject a fake client (no network/SDK). */
export interface AwsSecretsClient {
  send(command: { input: unknown }): Promise<{ SecretString?: string }>;
}

/**
 * AWS Secrets Manager provider: reads the JSON SecretString of POKE_VAULT_SECRETS_ARN once
 * per process and caches the name→value map. The SDK is lazily imported so the
 * package is only required in production deployments that actually use it.
 */
export class AwsSecretsManagerProvider implements SecretProvider {
  readonly name = "aws" as const;
  private cache: Record<string, string> | null = null;

  constructor(
    private readonly opts: {
      arn: string;
      region: string;
      loadClient?: () => Promise<{ client: AwsSecretsClient; send: (name: string, arn: string) => Promise<string> }>;
    },
  ) {}

  private async makeClient(): Promise<{ client: AwsSecretsClient; send: (name: string, arn: string) => Promise<string> }> {
    if (this.opts.loadClient) return this.opts.loadClient();
    let mod: any;
    try {
      mod = await import("@aws-sdk/client-secrets-manager");
    } catch {
      throw new Error(
        "POKE_VAULT_SECRETS_PROVIDER=aws requires @aws-sdk/client-secrets-manager — run " +
          "`pnpm --filter @pokemon-vault/api add @aws-sdk/client-secrets-manager`",
      );
    }
    const client = new mod.SecretsManagerClient({ region: this.opts.region });
    return {
      client,
      send: async (name: string, arn: string) => {
        const resp = await client.send(
          new mod.GetSecretValueCommand({ SecretId: arn }),
        );
        return resp.SecretString ?? "";
      },
    };
  }

  private async load(): Promise<Record<string, string>> {
    if (this.cache) return this.cache;
    const { send } = await this.makeClient();
    const raw = await send(this.opts.arn, this.opts.arn);
    if (!raw) throw new Error(`Secrets Manager returned empty SecretString for ${this.opts.arn}`);
    this.cache = JSON.parse(raw) as Record<string, string>;
    return this.cache;
  }

  async get(name: string): Promise<string> {
    const all = await this.load();
    const value = all[name];
    if (!value) throw new Error(`Secret not found in AWS Secrets Manager (${this.opts.arn}): ${name}`);
    return value;
  }
}

export type SecretsProviderName = "env" | "aws" | "doppler";

/** Select the active provider from POKE_VAULT_SECRETS_PROVIDER (default "env"). */
export function getSecretProvider(env: NodeJS.ProcessEnv = process.env): SecretProvider {
  const provider = (env.POKE_VAULT_SECRETS_PROVIDER || "env").trim().toLowerCase();
  switch (provider) {
    case "env":
      return new EnvSecretProvider(env);
    case "doppler": {
      const token = env.POKE_VAULT_DOPPLER_TOKEN;
      if (!token) throw new Error("POKE_VAULT_SECRETS_PROVIDER=doppler requires POKE_VAULT_DOPPLER_TOKEN");
      return new DopplerSecretProvider({ token, project: env.POKE_VAULT_DOPPLER_PROJECT, config: env.POKE_VAULT_DOPPLER_CONFIG });
    }
    case "aws":
    case "aws-sm":
    case "awssecretsmanager": {
      const arn = env.POKE_VAULT_SECRETS_ARN;
      const region = env.POKE_VAULT_AWS_REGION || env.POKE_VAULT_AWS_DEFAULT_REGION;
      if (!arn || !region)
        throw new Error("POKE_VAULT_SECRETS_PROVIDER=aws requires POKE_VAULT_SECRETS_ARN and POKE_VAULT_AWS_REGION");
      return new AwsSecretsManagerProvider({ arn, region });
    }
    default:
      throw new Error(
        `Unknown POKE_VAULT_SECRETS_PROVIDER '${provider}' (expected env | aws | doppler)`,
      );
  }
}

/** Resolve one secret, wrapping failures with the variable name only. */
export async function getRequiredSecret(
  provider: SecretProvider,
  name: string,
): Promise<string> {
  try {
    return await provider.get(name);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to resolve secret '${name}' from ${provider.name}: ${reason}`);
  }
}

/**
 * Mask credentials in a connection string for logging — passwords must never
 * appear in logs (§56). "postgres://u:pw@host/db" → "postgres://u:***@host/db".
 */
export function maskConnectionString(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "<unparseable connection string>";
  }
}
