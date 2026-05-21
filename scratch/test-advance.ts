import { db } from "../src/lib/db";

// Helper to add days
function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function testAdvance(username: string) {
  console.log(`\n=== SIMULATING ADVANCE DAY FOR USER: ${username} ===`);
  const user = await db.user.findUnique({
    where: { username },
    include: { gameState: true }
  });

  if (!user || !user.gameState) {
    console.log("No user or gameState found.");
    return;
  }

  const userTeamId = user.gameState.userTeamId;
  if (!userTeamId) {
    console.log("No userTeamId found.");
    return;
  }

  const userId = user.id;
  const currentDate = user.gameState.currentDate;

  // Kiểm tra hôm nay có trận của user không
  const userMatchToday = await db.match.findFirst({
    where: {
      date: currentDate,
      played: false,
      userId,
      OR: [
        { homeTeamId: userTeamId },
        { awayTeamId: userTeamId }
      ]
    }
  });

  if (userMatchToday) {
    console.log(`[EXIT] User match today: ${userMatchToday.id} on date ${currentDate}`);
    return;
  }

  let tempDate = currentDate;
  let tempSeasonState = user.gameState.seasonState;
  let loopCount = 0;
  const maxLoops = 200;

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`\n--- Loop ${loopCount} ---`);
    console.log(`Current Date: ${tempDate}, SeasonState: ${tempSeasonState}`);

    if (tempSeasonState === "OFF_SEASON") {
      const nextDate = addDays(tempDate, 7);
      console.log(`[OFF_SEASON] Next date would be ${nextDate}`);
      break;
    }

    const nextDate = addDays(tempDate, 1);
    console.log(`Incremented Date: ${nextDate}`);

    // Check matches to simulate
    const otherMatches = await db.match.findMany({
      where: {
        date: nextDate,
        played: false,
        userId,
        NOT: {
          OR: [
            { homeTeamId: userTeamId },
            { awayTeamId: userTeamId }
          ]
        }
      }
    });
    console.log(`Matches to simulate: ${otherMatches.length}`);

    tempDate = nextDate;

    // Check if player has match
    const userMatchNext = await db.match.findFirst({
      where: {
        date: nextDate,
        played: false,
        userId,
        OR: [
          { homeTeamId: userTeamId },
          { awayTeamId: userTeamId }
        ]
      }
    });

    if (userMatchNext) {
      console.log(`[BREAK] User match found on ${nextDate}: ID ${userMatchNext.id}`);
      break;
    }

    // Check if all matches in stage done
    let currentTournament = "";
    if (tempSeasonState.startsWith("FIRST_STAND")) currentTournament = "FIRST_STAND";
    else if (tempSeasonState.startsWith("REGIONAL")) currentTournament = "REGIONAL";
    else if (tempSeasonState.startsWith("MSI")) currentTournament = "MSI";
    else if (tempSeasonState.startsWith("EWC")) currentTournament = "EWC";
    else if (tempSeasonState.startsWith("WORLDS")) currentTournament = "WORLDS";

    const unplayedMatchesInStage = await db.match.findFirst({
      where: {
        userId,
        tournament: currentTournament,
        played: false
      }
    });

    console.log(`Unplayed matches in stage (${currentTournament}): ${unplayedMatchesInStage ? 'Yes' : 'No'}`);

    if (!unplayedMatchesInStage && currentTournament !== "") {
      console.log(`[TRANSITION] Transitioning from ${tempSeasonState}...`);
      // Since we are simulating, we just log what transitionTournament would do
      if (tempSeasonState === "REGIONAL_SEASON" || tempSeasonState === "REGIONAL_REGULAR") {
        console.log(`  -> Would generate Regional Playoff SF`);
        tempSeasonState = "REGIONAL_PLAYOFF_SF";
      } else {
        console.log(`  -> Transition for ${tempSeasonState} not handled or mock default`);
        tempSeasonState = "NEXT_STAGE";
      }
    }

    // Fast forward optimization
    const nextUnplayedMatch = await db.match.findFirst({
      where: { userId, played: false },
      orderBy: { date: "asc" }
    });

    if (nextUnplayedMatch) {
      const nextMatchDateStr = nextUnplayedMatch.date;
      const ffDiffTime = new Date(nextMatchDateStr).getTime() - new Date(tempDate).getTime();
      const ffDiffDays = Math.floor(ffDiffTime / (1000 * 60 * 60 * 24));
      console.log(`Next unplayed match date: ${nextMatchDateStr}. Diff days: ${ffDiffDays}`);
      
      if (ffDiffDays > 7) {
        const fastForwardDate = addDays(nextMatchDateStr, -1);
        console.log(`[FAST FORWARD] Jumping to ${fastForwardDate}`);
        tempDate = fastForwardDate;
      }
    } else {
      console.log("No next unplayed match.");
    }
  }

  console.log(`\n[RESULT] Loop finished. Final date: ${tempDate}, Final state: ${tempSeasonState}`);
}

async function run() {
  await testAdvance("admin");
  await testAdvance("kozaki");
}

run().catch(console.error);
