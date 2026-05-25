import { db } from "@/lib/db";

async function test() {
  try {
    const user = await db.user.create({
      data: {
        username: "test_multi_fk",
        displayName: "Test User",
        password: "pwd",
        role: "NORMAL"
      }
    });

    const team1 = await db.team.create({
      data: { name: "Team A", region: "LCK", budget: 1000, salaryCap: 1000, userId: user.id }
    });

    const team2 = await db.team.create({
      data: { name: "Team B", region: "LCK", budget: 1000, salaryCap: 1000, userId: user.id }
    });

    // Create match between Team A and Team B
    await db.match.create({
      data: {
        tournament: "CUP",
        homeTeamId: team1.id,
        awayTeamId: team2.id,
        date: "2026-01-05",
        userId: user.id
      }
    });

    console.log("Created successfully. Now deleting Team 1...");
    await db.team.delete({ where: { id: team1.id } });
    console.log("Deleted Team 1 successfully.");

    console.log("Now deleting user...");
    await db.user.delete({ where: { id: user.id } });
    console.log("Deleted user successfully.");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}

test();
