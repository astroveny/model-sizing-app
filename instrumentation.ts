import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { getDb } = await import("./lib/db/client");
    migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "lib/db/migrations") });
  }
}
