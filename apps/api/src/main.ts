import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  const port = Number(process.env.API_PORT || process.env.PORT || 3001);
  await app.listen(port);
  console.log(`Pokémon Vault API listening on :${port} (api/v1)`);
}
void bootstrap();
