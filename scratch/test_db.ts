import { db } from "../src/lib/db";

async function main() {
  const mails = await db.mail.findMany();
  console.log(`Total mails in db: ${mails.length}`);
  
  const userGroups: Record<string, number> = {};
  for (const m of mails) {
    const key = m.userId || "null (global)";
    userGroups[key] = (userGroups[key] || 0) + 1;
  }
  console.log("Mails grouped by userId:", userGroups);

  console.log("\nSample mails list:");
  for (const m of mails) {
    console.log(`ID: ${m.id} | Title: ${m.title} | UserID: ${m.userId} | Read: ${m.read}`);
  }
}

main().catch(console.error);
