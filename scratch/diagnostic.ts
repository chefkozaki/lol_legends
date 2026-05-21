import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    include: {
      gameState: true,
    }
  });
  console.log("=== USERS & GAME STATES ===");
  for (const u of users) {
    console.log(`User: ${u.username} (ID: ${u.id}, Role: ${u.role})`);
    if (u.gameState) {
      console.log(`  GameState: Date = ${u.gameState.currentDate}, State = ${u.gameState.seasonState}, TeamId = ${u.gameState.userTeamId}, Week = ${u.gameState.week}`);
      
      const unplayedUser = await db.match.count({
        where: {
          userId: u.id,
          played: false,
          OR: [
            { homeTeamId: u.gameState.userTeamId || "" },
            { awayTeamId: u.gameState.userTeamId || "" }
          ]
        }
      });
      const playedUser = await db.match.count({
        where: {
          userId: u.id,
          played: true,
          OR: [
            { homeTeamId: u.gameState.userTeamId || "" },
            { awayTeamId: u.gameState.userTeamId || "" }
          ]
        }
      });
      const unplayedAll = await db.match.count({
        where: {
          userId: u.id,
          played: false,
        }
      });
      console.log(`  Matches: User Unplayed = ${unplayedUser}, User Played = ${playedUser}, Total Unplayed = ${unplayedAll}`);
      
      if (unplayedAll > 0) {
        const nextMatches = await db.match.findMany({
          where: { userId: u.id, played: false },
          orderBy: { date: "asc" },
          take: 5,
          include: {
            homeTeam: true,
            awayTeam: true
          }
        });
        console.log("  Earliest unplayed matches:");
        for (const m of nextMatches) {
          const isUserMatch = m.homeTeamId === u.gameState.userTeamId || m.awayTeamId === u.gameState.userTeamId;
          console.log(`    Date: ${m.date} | ${m.homeTeam.name} vs ${m.awayTeam.name} | Tournament: ${m.tournament} | User Match: ${isUserMatch}`);
        }
      }
    } else {
      console.log("  No GameState");
    }
  }
}

main().catch(console.error);
