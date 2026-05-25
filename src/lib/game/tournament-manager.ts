import { db } from "@/lib/db";

// -- HELPERS --
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRoundRobin(teamIds: string[]): { home: { id: string }, away: { id: string } }[][] {
  const n = teamIds.length;
  const rounds: { home: { id: string }, away: { id: string } }[][] = [];
  const list = [...teamIds];

  for (let r = 0; r < n - 1; r++) {
    const roundMatches: { home: { id: string }, away: { id: string } }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = (r + i) % (n - 1);
      let awayIdx = (r + n - 1 - i) % (n - 1);
      if (i === 0) awayIdx = n - 1;
      
      const homeId = list[homeIdx];
      const awayId = list[awayIdx];

      if (Math.random() > 0.5) roundMatches.push({ home: { id: homeId }, away: { id: awayId } });
      else roundMatches.push({ home: { id: awayId }, away: { id: homeId } });
    }
    rounds.push(roundMatches);
  }
  return rounds;
}

export async function resetTeamStats(userId: string) {
  await db.team.updateMany({
    where: { userId },
    data: { wins: 0, losses: 0, points: 0 }
  });
}

export async function getStandings(userId: string, tournament: string, region?: string): Promise<string[]> {
  const matches = await db.match.findMany({
    where: { userId, tournament, played: true, ...(region ? { homeTeam: { region } } : {}) }
  });

  const scores: Record<string, { wins: number, losses: number }> = {};
  for (const match of matches) {
    if (!scores[match.homeTeamId]) scores[match.homeTeamId] = { wins: 0, losses: 0 };
    if (!scores[match.awayTeamId]) scores[match.awayTeamId] = { wins: 0, losses: 0 };
    if (match.homeScore > match.awayScore) {
      scores[match.homeTeamId].wins++;
      scores[match.awayTeamId].losses++;
    } else {
      scores[match.awayTeamId].wins++;
      scores[match.homeTeamId].losses++;
    }
  }

  const sorted = Object.keys(scores).sort((a, b) => {
    if (scores[b].wins !== scores[a].wins) return scores[b].wins - scores[a].wins;
    return scores[a].losses - scores[b].losses;
  });

  return sorted;
}

// -- RANDOM BRACKET --
export async function generateRandomKnockoutBracket(userId: string, tournament: string, teams: string[], date: string) {
  const shuffled = shuffleArray(teams);
  const numMatches = Math.floor(shuffled.length / 2);
  for (let i = 0; i < numMatches; i++) {
    await db.match.create({
      data: { tournament, homeTeamId: shuffled[i * 2], awayTeamId: shuffled[i * 2 + 1], date, played: false, userId }
    });
  }
}

export async function generateNextKnockoutRound(userId: string, tournament: string, prevDate: string, nextDate: string) {
  const matches = await db.match.findMany({ where: { userId, tournament, date: prevDate, played: true } });
  const winners = matches.map(m => m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId);
  if (winners.length >= 2) {
    for (let i = 0; i < winners.length / 2; i++) {
      await db.match.create({
        data: { tournament, homeTeamId: winners[i * 2], awayTeamId: winners[i * 2 + 1], date: nextDate, played: false, userId }
      });
    }
  }
}

// -- DOUBLE ELIMINATION --
export async function generateDoubleElimR1(userId: string, tournament: string, teams: string[], date: string) {
  if (teams.length < 4) return;
  await db.match.create({ data: { tournament, homeTeamId: teams[0], awayTeamId: teams[3], date, played: false, userId } });
  await db.match.create({ data: { tournament, homeTeamId: teams[1], awayTeamId: teams[2], date, played: false, userId } });
}

export async function generateDoubleElimR2(userId: string, tournament: string, prevDate: string, date: string) {
  const matches = await db.match.findMany({ where: { userId, tournament, date: prevDate, played: true }, orderBy: { id: 'asc' } });
  if (matches.length < 2) return;
  const w1 = matches[0].homeScore > matches[0].awayScore ? matches[0].homeTeamId : matches[0].awayTeamId;
  const l1 = matches[0].homeScore > matches[0].awayScore ? matches[0].awayTeamId : matches[0].homeTeamId;
  const w2 = matches[1].homeScore > matches[1].awayScore ? matches[1].homeTeamId : matches[1].awayTeamId;
  const l2 = matches[1].homeScore > matches[1].awayScore ? matches[1].awayTeamId : matches[1].homeTeamId;
  await db.match.create({ data: { tournament, homeTeamId: w1, awayTeamId: w2, date, played: false, userId } });
  await db.match.create({ data: { tournament, homeTeamId: l1, awayTeamId: l2, date, played: false, userId } });
}

export async function generateDoubleElimR3(userId: string, tournament: string, prevDate: string, date: string) {
  const matches = await db.match.findMany({ where: { userId, tournament, date: prevDate, played: true }, orderBy: { id: 'asc' } });
  if (matches.length < 2) return;
  const l4 = matches[0].homeScore > matches[0].awayScore ? matches[0].awayTeamId : matches[0].homeTeamId;
  const w3 = matches[1].homeScore > matches[1].awayScore ? matches[1].homeTeamId : matches[1].awayTeamId;
  await db.match.create({ data: { tournament, homeTeamId: l4, awayTeamId: w3, date, played: false, userId } });
}

export async function generateDoubleElimR4(userId: string, tournament: string, r2Date: string, r3Date: string, date: string) {
  const r2Matches = await db.match.findMany({ where: { userId, tournament, date: r2Date, played: true }, orderBy: { id: 'asc' } });
  const r3Matches = await db.match.findMany({ where: { userId, tournament, date: r3Date, played: true } });
  if (r2Matches.length < 1 || r3Matches.length < 1) return;
  const w4 = r2Matches[0].homeScore > r2Matches[0].awayScore ? r2Matches[0].homeTeamId : r2Matches[0].awayTeamId;
  const w5 = r3Matches[0].homeScore > r3Matches[0].awayScore ? r3Matches[0].homeTeamId : r3Matches[0].awayTeamId;
  await db.match.create({ data: { tournament, homeTeamId: w4, awayTeamId: w5, date, played: false, userId } });
}

export async function getDoubleElimTickets(userId: string, tournament: string, r2Date: string, r3Date: string): Promise<string[]> {
  const r2Matches = await db.match.findMany({ where: { userId, tournament, date: r2Date, played: true }, orderBy: { id: 'asc' } });
  const r3Matches = await db.match.findMany({ where: { userId, tournament, date: r3Date, played: true } });
  const tickets: string[] = [];
  if (r2Matches.length >= 1) tickets.push(r2Matches[0].homeScore > r2Matches[0].awayScore ? r2Matches[0].homeTeamId : r2Matches[0].awayTeamId);
  if (r3Matches.length >= 1) tickets.push(r3Matches[0].homeScore > r3Matches[0].awayScore ? r3Matches[0].homeTeamId : r3Matches[0].awayTeamId);
  return tickets;
}

// -- GENERATORS --
export async function generateCupSchedule(userId: string, startDate: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const teams = await db.team.findMany({ where: { region, userId } });
    if (teams.length === 0) continue;
    const shuffled = shuffleArray(teams);
    const teamIds = shuffled.map(t => t.id);
    const rounds = generateRoundRobin(teamIds); // 7 rounds
    const tournamentName = region === "LCK" ? "LCK_CUP" : `${region}_CUP`;

    for (let r = 0; r < rounds.length; r++) {
      const roundDate = addDays(startDate, r * 4);
      for (const match of rounds[r]) {
        await db.match.create({ data: { tournament: tournamentName, homeTeamId: match.home.id, awayTeamId: match.away.id, date: roundDate, played: false, userId } });
      }
    }
  }
}

export async function generateFST(userId: string, startDate: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  const champions: string[] = [];
  const runnerUps: string[] = [];

  for (const region of REGIONS) {
    const tournamentName = region === "LCK" ? "LCK_CUP" : `${region}_CUP`;
    const standings = await getStandings(userId, tournamentName, region);
    if (standings.length >= 1) champions.push(standings[0]);
    if (standings.length >= 2) runnerUps.push(standings[1]);
  }

  const fstTeams = shuffleArray([...champions, ...shuffleArray(runnerUps).slice(0, 3)]);
  if (fstTeams.length === 8) {
    await generateRandomKnockoutBracket(userId, "FST", fstTeams, startDate);
  }
}

export async function generateDomestic1Schedule(userId: string, startDate: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const teams = await db.team.findMany({ where: { region, userId } });
    if (teams.length === 0) continue;
    const teamIds = shuffleArray(teams).map(t => t.id);
    
    if (region === "LCK") {
      const rounds1 = generateRoundRobin(teamIds);
      const rounds2 = generateRoundRobin(teamIds);
      const totalRounds = [...rounds1, ...rounds2]; // 14 rounds
      for (let r = 0; r < totalRounds.length; r++) {
        const roundDate = addDays(startDate, r * 4);
        for (const match of totalRounds[r]) {
          await db.match.create({ data: { tournament: "LCK_ROUND_1_2", homeTeamId: match.home.id, awayTeamId: match.away.id, date: roundDate, played: false, userId } });
        }
      }
    } else {
      const rounds = generateRoundRobin(teamIds); // 7 rounds
      for (let r = 0; r < rounds.length; r++) {
        const roundDate = addDays(startDate, r * 4);
        for (const match of rounds[r]) {
          await db.match.create({ data: { tournament: `${region}_SPLIT_1`, homeTeamId: match.home.id, awayTeamId: match.away.id, date: roundDate, played: false, userId } });
        }
      }
    }
  }
}

// Tách hàm tạo cho LPL Split 1 Playoffs
export async function generateDomestic1PlayoffsR1(userId: string, startDate: string) {
  const REGIONS = ["LCP", "LPL", "LEC", "CBLOL"]; // Không LCK
  for (const region of REGIONS) {
    const standings = await getStandings(userId, `${region}_SPLIT_1`, region);
    if (standings.length >= 4) {
      const top4 = standings.slice(0, 4);
      await generateDoubleElimR1(userId, `${region}_SPLIT_1_PLAYOFFS`, top4, startDate);
    }
  }
}

export async function generateRoadToEWC_R1(userId: string, startDate: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    let top4: string[] = [];
    if (region === "LCK") {
      const standings = await getStandings(userId, "LCK_ROUND_1_2", region);
      top4 = standings.slice(0, 4);
    } else {
      const standings = await getStandings(userId, `${region}_SPLIT_1`, region);
      top4 = standings.slice(0, 4);
    }
    if (top4.length >= 4) {
      await generateDoubleElimR1(userId, `ROAD_TO_EWC_${region}`, top4, startDate);
    }
  }
}

export async function generateEWCSchedule(userId: string, startDate: string, r2Date: string, r3Date: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  const ewcTeams: string[] = [];
  for (const region of REGIONS) {
    const tickets = await getDoubleElimTickets(userId, `ROAD_TO_EWC_${region}`, r2Date, r3Date);
    ewcTeams.push(...tickets);
  }
  
  if (ewcTeams.length >= 8) { // 10 teams thực tế, nhưng ta chọn 8 đội ngẫu nhiên đánh hoặc chia playoff
    // Giả định Random Bracket 8 đội
    await generateRandomKnockoutBracket(userId, "EWC", shuffleArray(ewcTeams).slice(0, 8), startDate);
  }
}

export async function generateRoadToMSI_R1(userId: string, startDate: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    let top4: string[] = [];
    if (region === "LCK") {
      const standings = await getStandings(userId, "LCK_ROUND_1_2", region);
      top4 = standings.slice(0, 4);
    } else {
      const standings = await getStandings(userId, `${region}_SPLIT_1`, region);
      top4 = standings.slice(0, 4);
    }
    if (top4.length >= 4) {
      await generateDoubleElimR1(userId, `ROAD_TO_MSI_${region}`, top4, startDate);
    }
  }
}

export async function generateMSISchedule(userId: string, startDate: string, r2Date: string, r3Date: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  const msiTeams: string[] = [];
  for (const region of REGIONS) {
    const tickets = await getDoubleElimTickets(userId, `ROAD_TO_MSI_${region}`, r2Date, r3Date);
    msiTeams.push(...tickets);
  }
  
  if (msiTeams.length >= 8) {
    await generateRandomKnockoutBracket(userId, "MSI", shuffleArray(msiTeams).slice(0, 8), startDate);
  }
}

export async function generateDomestic2Schedule(userId: string, startDate: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    if (region === "LCK") {
      const standings = await getStandings(userId, "LCK_ROUND_1_2", region);
      const legend = standings.slice(0, 4);
      const rise = standings.slice(4, 8);
      
      const legendRounds1 = generateRoundRobin(legend);
      const legendRounds2 = generateRoundRobin(legend);
      const legendTotal = [...legendRounds1, ...legendRounds2]; // 6 rounds
      
      const riseRounds1 = generateRoundRobin(rise);
      const riseRounds2 = generateRoundRobin(rise);
      const riseTotal = [...riseRounds1, ...riseRounds2]; // 6 rounds

      for (let r = 0; r < 6; r++) {
        const roundDate = addDays(startDate, r * 4);
        for (const match of legendTotal[r]) {
          await db.match.create({ data: { tournament: "LCK_ROUND_3_4_LEGEND", homeTeamId: match.home.id, awayTeamId: match.away.id, date: roundDate, played: false, userId } });
        }
        for (const match of riseTotal[r]) {
          await db.match.create({ data: { tournament: "LCK_ROUND_3_4_RISE", homeTeamId: match.home.id, awayTeamId: match.away.id, date: roundDate, played: false, userId } });
        }
      }
    } else {
      const teams = await db.team.findMany({ where: { region, userId } });
      if (teams.length === 0) continue;
      const teamIds = shuffleArray(teams).map(t => t.id);
      const rounds = generateRoundRobin(teamIds); // 7 rounds
      for (let r = 0; r < rounds.length; r++) {
        const roundDate = addDays(startDate, r * 4);
        for (const match of rounds[r]) {
          await db.match.create({ data: { tournament: `${region}_SPLIT_2`, homeTeamId: match.home.id, awayTeamId: match.away.id, date: roundDate, played: false, userId } });
        }
      }
    }
  }
}

export async function generateDomestic2PlayoffsR1(userId: string, startDate: string) {
  const REGIONS = ["LCP", "LPL", "LEC", "CBLOL"]; 
  for (const region of REGIONS) {
    const standings = await getStandings(userId, `${region}_SPLIT_2`, region);
    if (standings.length >= 4) {
      const top4 = standings.slice(0, 4);
      await generateDoubleElimR1(userId, `${region}_SPLIT_2_PLAYOFFS`, top4, startDate);
    }
  }
  
  // LCK Playoff (Bottom 2 Legend vs Top 2 Rise)
  const legendStandings = await getStandings(userId, "LCK_ROUND_3_4_LEGEND", "LCK");
  const riseStandings = await getStandings(userId, "LCK_ROUND_3_4_RISE", "LCK");
  if (legendStandings.length >= 4 && riseStandings.length >= 2) {
    const b1 = legendStandings[2];
    const b2 = legendStandings[3];
    const t1 = riseStandings[0];
    const t2 = riseStandings[1];
    
    // Bán kết
    await db.match.create({ data: { tournament: "LCK_PLAYOFF", homeTeamId: b1, awayTeamId: t2, date: startDate, played: false, userId } });
    await db.match.create({ data: { tournament: "LCK_PLAYOFF", homeTeamId: b2, awayTeamId: t1, date: startDate, played: false, userId } });
  }
}

export async function generateLCKPlayinR1(userId: string, startDate: string, prevDate: string) {
  const legendStandings = await getStandings(userId, "LCK_ROUND_3_4_LEGEND", "LCK");
  const playoffFinal = await db.match.findFirst({ where: { userId, tournament: "LCK_PLAYOFF", date: prevDate, played: true } });
  
  if (legendStandings.length >= 3 && playoffFinal) {
    const winner = playoffFinal.homeScore > playoffFinal.awayScore ? playoffFinal.homeTeamId : playoffFinal.awayTeamId;
    const playinTeams = [legendStandings[0], legendStandings[1], legendStandings[2], winner];
    await generateDoubleElimR1(userId, "LCK_PLAYIN", playinTeams, startDate);
  }
}

export async function generateWorldsSchedule(userId: string, startDate: string, lckR3Date: string, lckR4Date: string) {
  // Worlds: LCK 4 teams (Playin), LPL/Others 3 teams each from Split 2 Playoffs
  const worldsTeams: string[] = [];
  
  const lckPlayinMatchesR3 = await db.match.findMany({ where: { userId, tournament: "LCK_PLAYIN", date: lckR3Date, played: true } });
  const lckPlayinMatchesR4 = await db.match.findMany({ where: { userId, tournament: "LCK_PLAYIN", date: lckR4Date, played: true } });
  // All 4 teams in play-in go to Worlds actually according to prompt ("Lấy ra 4 đội LCK vào playin -> Worlds")
  // For simplicity, just get the top 4 teams from Legend group + Playin winner. Wait, Playin HAS 4 teams. They ALL go to Worlds.
  // We can just get unique teams from LCK_PLAYIN matches.
  const playinMatches = await db.match.findMany({ where: { userId, tournament: "LCK_PLAYIN" } });
  const lckSet = new Set<string>();
  playinMatches.forEach(m => { lckSet.add(m.homeTeamId); lckSet.add(m.awayTeamId); });
  worldsTeams.push(...Array.from(lckSet).slice(0, 4));

  const REGIONS = ["LCP", "LPL", "LEC", "CBLOL"]; 
  for (const region of REGIONS) {
    // 3 teams: W4, W5, and Loser of M5 (which is actually 3rd place).
    // Or just grab top 3 from Split 2 Standings for simplicity since Double Elim logic is complex to extract 3.
    const standings = await getStandings(userId, `${region}_SPLIT_2`, region);
    worldsTeams.push(...standings.slice(0, 3));
  }
  
  if (worldsTeams.length >= 16) {
    await generateRandomKnockoutBracket(userId, "WORLDS", shuffleArray(worldsTeams).slice(0, 16), startDate);
  }
}

// ---------------- TRANSITION TOURNAMENT ----------------
export async function transitionTournament(userId: string, currentDate: string, currentSeasonState: string): Promise<string> {
  const year = currentDate.split("-")[0];
  let nextState = currentSeasonState;

  const R = (state: string, daysOffset: number = 4) => {
    return { state, date: addDays(currentDate, daysOffset) };
  };

  try {
    switch (currentSeasonState) {
      case "OFF_SEASON":
      case "START_YEAR":
        await resetTeamStats(userId);
        const cupDate = `${year}-01-05`;
        await generateCupSchedule(userId, cupDate);
        nextState = "CUP";
        break;

      case "CUP":
        await generateFST(userId, addDays(currentDate, 4));
        nextState = "FST_QF";
        break;

      case "FST_QF":
        await generateNextKnockoutRound(userId, "FST", currentDate, addDays(currentDate, 4));
        nextState = "FST_SF";
        break;

      case "FST_SF":
        await generateNextKnockoutRound(userId, "FST", currentDate, addDays(currentDate, 4));
        nextState = "FST_F";
        break;

      case "FST_F":
        await generateDomestic1Schedule(userId, addDays(currentDate, 4));
        nextState = "DOMESTIC_1";
        break;

      case "DOMESTIC_1":
        await generateDomestic1PlayoffsR1(userId, addDays(currentDate, 4));
        nextState = "DOMESTIC_1_PLAYOFFS_R1";
        break;

      case "DOMESTIC_1_PLAYOFFS_R1":
        for (const r of ["LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR2(userId, `${r}_SPLIT_1_PLAYOFFS`, currentDate, addDays(currentDate, 4));
        nextState = "DOMESTIC_1_PLAYOFFS_R2";
        break;

      case "DOMESTIC_1_PLAYOFFS_R2":
        for (const r of ["LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR3(userId, `${r}_SPLIT_1_PLAYOFFS`, currentDate, addDays(currentDate, 4));
        nextState = "DOMESTIC_1_PLAYOFFS_R3";
        break;

      case "DOMESTIC_1_PLAYOFFS_R3":
        for (const r of ["LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR4(userId, `${r}_SPLIT_1_PLAYOFFS`, addDays(currentDate, -4), currentDate, addDays(currentDate, 4));
        nextState = "DOMESTIC_1_PLAYOFFS_R4";
        break;

      case "DOMESTIC_1_PLAYOFFS_R4":
        await generateRoadToEWC_R1(userId, addDays(currentDate, 4));
        nextState = "ROAD_TO_EWC_R1";
        break;

      case "ROAD_TO_EWC_R1":
        for (const r of ["LCK", "LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR2(userId, `ROAD_TO_EWC_${r}`, currentDate, addDays(currentDate, 4));
        nextState = "ROAD_TO_EWC_R2";
        break;

      case "ROAD_TO_EWC_R2":
        for (const r of ["LCK", "LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR3(userId, `ROAD_TO_EWC_${r}`, currentDate, addDays(currentDate, 4));
        nextState = "ROAD_TO_EWC_R3";
        break;

      case "ROAD_TO_EWC_R3":
        await generateEWCSchedule(userId, addDays(currentDate, 4), addDays(currentDate, -4), currentDate);
        nextState = "EWC_QF";
        break;

      case "EWC_QF":
        await generateNextKnockoutRound(userId, "EWC", currentDate, addDays(currentDate, 4));
        nextState = "EWC_SF";
        break;

      case "EWC_SF":
        await generateNextKnockoutRound(userId, "EWC", currentDate, addDays(currentDate, 4));
        nextState = "EWC_F";
        break;

      case "EWC_F":
        await generateRoadToMSI_R1(userId, addDays(currentDate, 4));
        nextState = "ROAD_TO_MSI_R1";
        break;

      case "ROAD_TO_MSI_R1":
        for (const r of ["LCK", "LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR2(userId, `ROAD_TO_MSI_${r}`, currentDate, addDays(currentDate, 4));
        nextState = "ROAD_TO_MSI_R2";
        break;

      case "ROAD_TO_MSI_R2":
        for (const r of ["LCK", "LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR3(userId, `ROAD_TO_MSI_${r}`, currentDate, addDays(currentDate, 4));
        nextState = "ROAD_TO_MSI_R3";
        break;

      case "ROAD_TO_MSI_R3":
        await generateMSISchedule(userId, addDays(currentDate, 4), addDays(currentDate, -4), currentDate);
        nextState = "MSI_QF";
        break;

      case "MSI_QF":
        await generateNextKnockoutRound(userId, "MSI", currentDate, addDays(currentDate, 4));
        nextState = "MSI_SF";
        break;

      case "MSI_SF":
        await generateNextKnockoutRound(userId, "MSI", currentDate, addDays(currentDate, 4));
        nextState = "MSI_F";
        break;

      case "MSI_F":
        await generateDomestic2Schedule(userId, addDays(currentDate, 4));
        nextState = "DOMESTIC_2";
        break;

      case "DOMESTIC_2":
        await generateDomestic2PlayoffsR1(userId, addDays(currentDate, 4));
        nextState = "DOMESTIC_2_PLAYOFFS_R1";
        break;

      case "DOMESTIC_2_PLAYOFFS_R1":
        for (const r of ["LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR2(userId, `${r}_SPLIT_2_PLAYOFFS`, currentDate, addDays(currentDate, 4));
        // LCK Playoff (Chung kết LCK Playoff)
        const lckPfSemiWinners = await db.match.findMany({ where: { userId, tournament: "LCK_PLAYOFF", date: currentDate, played: true } });
        if (lckPfSemiWinners.length === 2) {
            const w1 = lckPfSemiWinners[0].homeScore > lckPfSemiWinners[0].awayScore ? lckPfSemiWinners[0].homeTeamId : lckPfSemiWinners[0].awayTeamId;
            const w2 = lckPfSemiWinners[1].homeScore > lckPfSemiWinners[1].awayScore ? lckPfSemiWinners[1].homeTeamId : lckPfSemiWinners[1].awayTeamId;
            await db.match.create({ data: { tournament: "LCK_PLAYOFF", homeTeamId: w1, awayTeamId: w2, date: addDays(currentDate, 4), played: false, userId } });
        }
        nextState = "DOMESTIC_2_PLAYOFFS_R2";
        break;

      case "DOMESTIC_2_PLAYOFFS_R2":
        for (const r of ["LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR3(userId, `${r}_SPLIT_2_PLAYOFFS`, currentDate, addDays(currentDate, 4));
        await generateLCKPlayinR1(userId, addDays(currentDate, 4), currentDate);
        nextState = "DOMESTIC_2_PLAYOFFS_R3"; // Cũng là Playin R1
        break;

      case "DOMESTIC_2_PLAYOFFS_R3":
        for (const r of ["LCP", "LPL", "LEC", "CBLOL"]) await generateDoubleElimR4(userId, `${r}_SPLIT_2_PLAYOFFS`, addDays(currentDate, -4), currentDate, addDays(currentDate, 4));
        await generateDoubleElimR2(userId, "LCK_PLAYIN", currentDate, addDays(currentDate, 4));
        nextState = "DOMESTIC_2_PLAYOFFS_R4"; // Playin R2
        break;

      case "DOMESTIC_2_PLAYOFFS_R4":
        await generateDoubleElimR3(userId, "LCK_PLAYIN", currentDate, addDays(currentDate, 4));
        nextState = "LCK_PLAYIN_R3";
        break;

      case "LCK_PLAYIN_R3":
        await generateDoubleElimR4(userId, "LCK_PLAYIN", addDays(currentDate, -4), currentDate, addDays(currentDate, 4));
        nextState = "LCK_PLAYIN_R4";
        break;

      case "LCK_PLAYIN_R4":
        await generateWorldsSchedule(userId, addDays(currentDate, 4), addDays(currentDate, -4), currentDate);
        nextState = "WORLDS_QF";
        break;

      case "WORLDS_QF":
        await generateNextKnockoutRound(userId, "WORLDS", currentDate, addDays(currentDate, 4));
        nextState = "WORLDS_SF";
        break;

      case "WORLDS_SF":
        await generateNextKnockoutRound(userId, "WORLDS", currentDate, addDays(currentDate, 4));
        nextState = "WORLDS_F";
        break;

      case "WORLDS_F":
        nextState = "OFF_SEASON";
        break;
    }
  } catch (error) {
    console.error("Lỗi transitionTournament", error);
  }

  await db.gameState.update({ where: { userId }, data: { seasonState: nextState } });
  return nextState;
}
