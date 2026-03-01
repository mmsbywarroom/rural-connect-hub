/**
 * One-time: create default "all users" chat group and add all active app users.
 * Run after db:push: npx tsx script/init-chat-group.ts
 */
import "dotenv/config";
import { storage } from "../server/storage";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env");
    process.exit(1);
  }
  console.log("Creating default chat group and adding all app users...");
  const group = await storage.getOrCreateDefaultChatGroup();
  const memberIds = await storage.getGroupMemberIds(group.id);
  console.log("Done. Group:", group.name, "| Members:", memberIds.length);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
