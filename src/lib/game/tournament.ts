import { db } from "@/lib/db";

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

// Generate Random Knockout (Quarterfinal, Semifinal, Final)
export async function generateRandomKnockoutBracket(userId: string, tournament: string, teams: string[], date: string) {
  const shuffled = shuffleArray(teams);
  const numMatches = Math.floor(shuffled.length / 2);
  for (let i = 0; i < numMatches; i++) {
    await db.match.create({
      data: {
        tournament,
        homeTeamId: shuffled[i * 2],
        awayTeamId: shuffled[i * 2 + 1],
        date,
        played: false,
        userId
      }
    });
  }
}

// Chuyển Next Round cho Knockout (tự động lấy người thắng của vòng trước)
export async function generateNextKnockoutRound(userId: string, tournament: string, prevDate: string, nextDate: string) {
  const matches = await db.match.findMany({
    where: { userId, tournament, date: prevDate, played: true }
  });
  
  const winners = matches.map(m => m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId);
  if (winners.length >= 2) {
    for (let i = 0; i < winners.length / 2; i++) {
      await db.match.create({
        data: {
          tournament,
          homeTeamId: winners[i * 2],
          awayTeamId: winners[i * 2 + 1],
          date: nextDate,
          played: false,
          userId
        }
      });
    }
  }
}

// Xử lý Double Elimination 4 đội
// Round 1: 1v4 (M1), 2v3 (M2)
// Round 2: W1vW2 (M4 - tranh vé 1), L1vL2 (M3 - loại)
// Round 3: L4vW3 (M5 - tranh vé 2)
export async function generateDoubleElimR1(userId: string, tournament: string, teams: string[], date: string) {
  if (teams.length < 4) return;
  await db.match.create({ data: { tournament, homeTeamId: teams[0], awayTeamId: teams[3], date, played: false, userId } });
  await db.match.create({ data: { tournament, homeTeamId: teams[1], awayTeamId: teams[2], date, played: false, userId } });
}

export async function generateDoubleElimR2(userId: string, tournament: string, prevDate: string, date: string) {
  const matches = await db.match.findMany({
    where: { userId, tournament, date: prevDate, played: true },
    orderBy: { id: 'asc' } // Giả định theo thứ tự create
  });
  if (matches.length < 2) return;
  
  const m1 = matches[0];
  const m2 = matches[1];
  
  const w1 = m1.homeScore > m1.awayScore ? m1.homeTeamId : m1.awayTeamId;
  const l1 = m1.homeScore > m1.awayScore ? m1.awayTeamId : m1.homeTeamId;
  const w2 = m2.homeScore > m2.awayScore ? m2.homeTeamId : m2.awayTeamId;
  const l2 = m2.homeScore > m2.awayScore ? m2.awayTeamId : m2.homeTeamId;
  
  // M4: W1vW2 (Winner Bracket)
  await db.match.create({ data: { tournament, homeTeamId: w1, awayTeamId: w2, date, played: false, userId } });
  // M3: L1vL2 (Loser Bracket)
  await db.match.create({ data: { tournament, homeTeamId: l1, awayTeamId: l2, date, played: false, userId } });
}

export async function generateDoubleElimR3(userId: string, tournament: string, prevDate: string, date: string) {
  const matches = await db.match.findMany({
    where: { userId, tournament, date: prevDate, played: true },
    orderBy: { id: 'asc' }
  });
  if (matches.length < 2) return;
  
  const m4 = matches[0]; // M4 là trận đầu tạo ra ở R2
  const m3 = matches[1];
  
  const l4 = m4.homeScore > m4.awayScore ? m4.awayTeamId : m4.homeTeamId;
  const w3 = m3.homeScore > m3.awayScore ? m3.homeTeamId : m3.awayTeamId;
  
  // M5: L4vW3
  await db.match.create({ data: { tournament, homeTeamId: l4, awayTeamId: w3, date, played: false, userId } });
}

// Nếu Double Elim cần đánh tới chung kết tổng (dành cho LPL Playoffs, Play-in LCK, LPL Split 2 Playoffs)
export async function generateDoubleElimR4(userId: string, tournament: string, r2Date: string, r3Date: string, date: string) {
  const r2Matches = await db.match.findMany({ where: { userId, tournament, date: r2Date, played: true }, orderBy: { id: 'asc' } });
  const r3Matches = await db.match.findMany({ where: { userId, tournament, date: r3Date, played: true } });
  
  if (r2Matches.length < 1 || r3Matches.length < 1) return;
  
  const m4 = r2Matches[0];
  const m5 = r3Matches[0];
  
  const w4 = m4.homeScore > m4.awayScore ? m4.homeTeamId : m4.awayTeamId;
  const w5 = m5.homeScore > m5.awayScore ? m5.homeTeamId : m5.awayTeamId;
  
  // M6: W4vW5 (Chung Kết Tổng)
  await db.match.create({ data: { tournament, homeTeamId: w4, awayTeamId: w5, date, played: false, userId } });
}

// Lấy 2 vé đi tiếp từ nhánh Double Elim 3 round
export async function getDoubleElimTickets(userId: string, tournament: string, r2Date: string, r3Date: string): Promise<string[]> {
  const r2Matches = await db.match.findMany({ where: { userId, tournament, date: r2Date, played: true }, orderBy: { id: 'asc' } });
  const r3Matches = await db.match.findMany({ where: { userId, tournament, date: r3Date, played: true } });
  
  const tickets: string[] = [];
  if (r2Matches.length >= 1) {
    const m4 = r2Matches[0];
    tickets.push(m4.homeScore > m4.awayScore ? m4.homeTeamId : m4.awayTeamId); // Vé 1
  }
  if (r3Matches.length >= 1) {
    const m5 = r3Matches[0];
    tickets.push(m5.homeScore > m5.awayScore ? m5.homeTeamId : m5.awayTeamId); // Vé 2
  }
  return tickets;
}
