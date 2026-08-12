/**
 * Ambient declaration for the optional AWS SDK (SECRETS_PROVIDER=aws only).
 * The package is imported lazily at runtime so local/dev never installs it;
 * production deployments that use AWS Secrets Manager add it via
 *   pnpm --filter @pokemon-vault/api add @aws-sdk/client-secrets-manager
 * This declaration keeps typecheck green without the dependency present.
 */
declare module "@aws-sdk/client-secrets-manager" {
  export class SecretsManagerClient {
    constructor(config: { region: string });
    send(command: { input: unknown }): Promise<{ SecretString?: string }>;
  }
  export class GetSecretValueCommand {
    constructor(input: { SecretId: string });
    readonly input: { SecretId: string };
  }
}
