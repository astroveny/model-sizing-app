export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const path = await import("path");
    const { getDb } = await import("./lib/db/client");
    migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "lib/db/migrations") });
  }
}
