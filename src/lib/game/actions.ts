"use server";

import { db } from "@/lib/db";
import { simulateLoLGame, TeamDraft } from "./engine";
import { CHAMPIONS } from "./champions";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

// Cộng ngày an toàn tránh lệch múi giờ
function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Hàm khởi tạo Save Game độc lập cho một User bằng cách nhân bản dữ liệu mẫu (userId = null)
async function initializeUserSaveGame(userId: string, templateTeamId: string) {
  // 1. Kiểm tra xem user đã có GameState chưa
  const existing = await db.gameState.findUnique({ where: { userId } });
  if (existing) return existing;

  // 2. Lấy tất cả các Team mẫu và Player mẫu
  const templateTeams = await db.team.findMany({
    where: { userId: null },
    include: { players: true }
  });

  const teamIdMap: Record<string, string> = {};

  // 3. Nhân bản Team và Player
  for (const t of templateTeams) {
    const newTeam = await db.team.create({
      data: {
        name: t.name,
        logoUrl: t.logoUrl,
        region: t.region,
        budget: t.budget,
        salaryCap: t.salaryCap,
        isUser: t.id === templateTeamId, // Đánh dấu đội user chọn
        points: 0,
        wins: 0,
        losses: 0,
        userId: userId
      }
    });
    teamIdMap[t.id] = newTeam.id;

    for (const p of t.players) {
      await db.player.create({
        data: {
          name: p.name,
          realName: p.realName,
          role: p.role,
          age: p.age,
          nationality: p.nationality,
          laning: p.laning,
          teamfight: p.teamfight,
          macro: p.macro,
          mentality: p.mentality,
          championPool: p.championPool,
          form: p.form,
          value: p.value,
          salary: p.salary,
          contractEnd: p.contractEnd,
          teamId: newTeam.id,
          userId: userId
        }
      });
    }
  }

  // 4. Nhân bản tuyển thủ tự do (Free Agents) mẫu
  const templateFreeAgents = await db.player.findMany({
    where: { userId: null, teamId: null }
  });
  for (const fa of templateFreeAgents) {
    await db.player.create({
      data: {
        name: fa.name,
        realName: fa.realName,
        role: fa.role,
        age: fa.age,
        nationality: fa.nationality,
        laning: fa.laning,
        teamfight: fa.teamfight,
        macro: fa.macro,
        mentality: fa.mentality,
        championPool: fa.championPool,
        form: fa.form,
        value: fa.value,
        salary: fa.salary,
        contractEnd: fa.contractEnd,
        teamId: null,
        userId: userId
      }
    });
  }

  // 4b. Nhân bản email mẫu (ví dụ: email chào mừng) cho người dùng mới
  const templateMails = await db.mail.findMany({
    where: { userId: null }
  });
  for (const tm of templateMails) {
    await db.mail.create({
      data: {
        title: tm.title,
        content: tm.content,
        date: tm.date,
        sender: tm.sender,
        category: tm.category,
        read: false,
        userId: userId
      }
    });
  }

  // 5. Thay vì nhân bản Match mẫu tĩnh, tạo lịch thi đấu động cho giải FIRST_STAND_QF!
  await generateFirstStandQF(userId, "2026");

  // 6. Tạo GameState
  const newGameState = await db.gameState.create({
    data: {
      currentDate: "2026-01-05",
      userTeamId: teamIdMap[templateTeamId],
      seasonState: "FIRST_STAND_QF",
      week: 1,
      dayOfSeason: 1,
      userId: userId
    }
  });

  return newGameState;
}

export async function selectTeamAction(templateTeamId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước.");

    await initializeUserSaveGame(currentUser.id, templateTeamId);

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi chọn đội tuyển:", error);
    return { success: false, error: error.message };
  }
}

// --- HELPER FUNCTIONS FOR TOURNAMENT GENERATION ---

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRoundRobin(teamIds: string[]): { home: { id: string }, away: { id: string } }[][] {
  const n = teamIds.length;
  const rounds: { home: { id: string }, away: { id: string } }[][] = [];
  const list = [...teamIds];

  for (let r = 0; r < n - 1; r++) {
    const roundMatches: { home: { id: string }, away: { id: string } }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = (r + i) % (n - 1);
      let awayIdx = (r + n - 1 - i) % (n - 1);
      if (i === 0) {
        awayIdx = n - 1;
      }
      
      const homeId = list[homeIdx];
      const awayId = list[awayIdx];

      if (Math.random() > 0.5) {
        roundMatches.push({ home: { id: homeId }, away: { id: awayId } });
      } else {
        roundMatches.push({ home: { id: awayId }, away: { id: homeId } });
      }
    }
    rounds.push(roundMatches);
  }
  return rounds;
}

function generateOddRoundRobin(teamIds: string[]): { home: { id: string }, away: { id: string } }[][] {
  const list = [...teamIds, "BYE"];
  const n = list.length;
  const rounds: { home: { id: string }, away: { id: string } }[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const roundMatches: { home: { id: string }, away: { id: string } }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = (r + i) % (n - 1);
      let awayIdx = (r + n - 1 - i) % (n - 1);
      if (i === 0) {
        awayIdx = n - 1;
      }
      
      const homeId = list[homeIdx];
      const awayId = list[awayIdx];

      if (homeId !== "BYE" && awayId !== "BYE") {
        if (Math.random() > 0.5) {
          roundMatches.push({ home: { id: homeId }, away: { id: awayId } });
        } else {
          roundMatches.push({ home: { id: awayId }, away: { id: homeId } });
        }
      }
    }
    rounds.push(roundMatches);
  }
  return rounds;
}

async function getRegionalRankings(userId: string, year: string): Promise<Record<string, string[]>> {
  const regions = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  const rankings: Record<string, string[]> = {};

  for (const region of regions) {
    const teams = await db.team.findMany({
      where: { region, userId }
    });

    const finalsMatch = await db.match.findFirst({
      where: {
        userId,
        tournament: "REGIONAL",
        date: `${year}-04-04`,
        homeTeam: { region }
      }
    });

    let rank1Id = "";
    let rank2Id = "";
    let rank3Id = "";
    let rank4Id = "";

    if (finalsMatch && finalsMatch.played) {
      if (finalsMatch.homeScore > finalsMatch.awayScore) {
        rank1Id = finalsMatch.homeTeamId;
        rank2Id = finalsMatch.awayTeamId;
      } else {
        rank1Id = finalsMatch.awayTeamId;
        rank2Id = finalsMatch.homeTeamId;
      }
    }

    const sfMatches = await db.match.findMany({
      where: {
        userId,
        tournament: "REGIONAL",
        date: `${year}-03-28`,
        homeTeam: { region }
      }
    });

    const sfLosers: string[] = [];
    for (const match of sfMatches) {
      if (match.played) {
        if (match.homeScore > match.awayScore) {
          sfLosers.push(match.awayTeamId);
        } else {
          sfLosers.push(match.homeTeamId);
        }
      }
    }

    const sfLoserTeams = await db.team.findMany({
      where: { id: { in: sfLosers } },
      orderBy: [
        { wins: "desc" },
        { points: "desc" }
      ]
    });

    if (sfLoserTeams.length >= 1) rank3Id = sfLoserTeams[0].id;
    if (sfLoserTeams.length >= 2) rank4Id = sfLoserTeams[1].id;

    const excludedIds = [rank1Id, rank2Id, rank3Id, rank4Id].filter(Boolean);
    const otherTeams = await db.team.findMany({
      where: {
        region,
        userId,
        id: { notIn: excludedIds }
      },
      orderBy: [
        { wins: "desc" },
        { points: "desc" }
      ]
    });

    const sortedIds = [
      rank1Id,
      rank2Id,
      rank3Id,
      rank4Id,
      ...otherTeams.map(t => t.id)
    ].filter(Boolean);

    if (sortedIds.length < teams.length) {
      const allSorted = await db.team.findMany({
        where: { region, userId },
        orderBy: [
          { wins: "desc" },
          { points: "desc" }
        ]
      });
      rankings[region] = allSorted.map(t => t.id);
    } else {
      rankings[region] = sortedIds;
    }
  }

  return rankings;
}

async function resetTeamStats(userId: string) {
  await db.team.updateMany({
    where: { userId },
    data: { wins: 0, losses: 0, points: 0 }
  });
}

async function generateFirstStandQF(userId: string, year: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const teams = await db.team.findMany({
      where: { region, userId }
    });
    const shuffled = shuffleArray(teams);
    const date = `${year}-01-10`;
    for (let i = 0; i < 4; i++) {
      await db.match.create({
        data: {
          tournament: "FIRST_STAND",
          homeTeamId: shuffled[i * 2].id,
          awayTeamId: shuffled[i * 2 + 1].id,
          date,
          played: false,
          homeScore: 0,
          awayScore: 0,
          userId
        }
      });
    }
  }
}

async function generateFirstStandSF(userId: string, year: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const qfMatches = await db.match.findMany({
      where: {
        userId,
        tournament: "FIRST_STAND",
        date: `${year}-01-10`,
        homeTeam: { region }
      }
    });

    const winners: string[] = [];
    for (const m of qfMatches) {
      if (m.homeScore > m.awayScore) {
        winners.push(m.homeTeamId);
      } else {
        winners.push(m.awayTeamId);
      }
    }

    if (winners.length >= 4) {
      const date = `${year}-01-17`;
      await db.match.create({
        data: {
          tournament: "FIRST_STAND",
          homeTeamId: winners[0],
          awayTeamId: winners[1],
          date,
          played: false,
          userId
        }
      });
      await db.match.create({
        data: {
          tournament: "FIRST_STAND",
          homeTeamId: winners[2],
          awayTeamId: winners[3],
          date,
          played: false,
          userId
        }
      });
    }
  }
}

async function generateFirstStandF(userId: string, year: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const sfMatches = await db.match.findMany({
      where: {
        userId,
        tournament: "FIRST_STAND",
        date: `${year}-01-17`,
        homeTeam: { region }
      }
    });

    const winners: string[] = [];
    for (const m of sfMatches) {
      if (m.homeScore > m.awayScore) {
        winners.push(m.homeTeamId);
      } else {
        winners.push(m.awayTeamId);
      }
    }

    if (winners.length >= 2) {
      await db.match.create({
        data: {
          tournament: "FIRST_STAND",
          homeTeamId: winners[0],
          awayTeamId: winners[1],
          date: `${year}-01-24`,
          played: false,
          userId
        }
      });
    }
  }
}

async function generateRegionalRegularSchedule(userId: string, year: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  const REGIONAL_DATES = ["02-07", "02-14", "02-21", "02-28", "03-07", "03-14", "03-21"];

  for (const region of REGIONS) {
    const teams = await db.team.findMany({
      where: { region, userId }
    });
    const shuffled = shuffleArray(teams);
    const teamIds = shuffled.map(t => t.id);
    const rounds = generateRoundRobin(teamIds);

    for (let r = 0; r < 7; r++) {
      const roundDate = `${year}-${REGIONAL_DATES[r]}`;
      for (const match of rounds[r]) {
        await db.match.create({
          data: {
            tournament: "REGIONAL",
            homeTeamId: match.home.id,
            awayTeamId: match.away.id,
            date: roundDate,
            played: false,
            userId
          }
        });
      }
    }
  }
}

async function generateRegionalPlayoffsSF(userId: string, year: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const teams = await db.team.findMany({
      where: { region, userId },
      orderBy: [
        { wins: "desc" },
        { points: "desc" }
      ]
    });

    if (teams.length >= 4) {
      const date = `${year}-03-28`;
      await db.match.create({
        data: {
          tournament: "REGIONAL",
          homeTeamId: teams[0].id,
          awayTeamId: teams[3].id,
          date,
          played: false,
          userId
        }
      });
      await db.match.create({
        data: {
          tournament: "REGIONAL",
          homeTeamId: teams[1].id,
          awayTeamId: teams[2].id,
          date,
          played: false,
          userId
        }
      });
    }
  }
}

async function generateRegionalPlayoffsF(userId: string, year: string) {
  const REGIONS = ["LCK", "LCP", "LPL", "LEC", "CBLOL"];
  for (const region of REGIONS) {
    const sfMatches = await db.match.findMany({
      where: {
        userId,
        tournament: "REGIONAL",
        date: `${year}-03-28`,
        homeTeam: { region }
      }
    });

    const winners: string[] = [];
    for (const m of sfMatches) {
      if (m.homeScore > m.awayScore) {
        winners.push(m.homeTeamId);
      } else {
        winners.push(m.awayTeamId);
      }
    }

    if (winners.length >= 2) {
      await db.match.create({
        data: {
          tournament: "REGIONAL",
          homeTeamId: winners[0],
          awayTeamId: winners[1],
          date: `${year}-04-04`,
          played: false,
          userId
        }
      });
    }
  }
}

async function generateMSIGroupsSchedule(userId: string, year: string) {
  const rankings = await getRegionalRankings(userId, year);

  const groupATeams = [
    rankings["LCK"][0],
    rankings["LPL"][1],
    rankings["LEC"][0],
    rankings["LCP"][1],
    rankings["CBLOL"][0]
  ].filter(Boolean);

  const groupBTeams = [
    rankings["LPL"][0],
    rankings["LCK"][1],
    rankings["LEC"][1],
    rankings["LCP"][0],
    rankings["CBLOL"][1]
  ].filter(Boolean);

  const groupARounds = generateOddRoundRobin(groupATeams);
  const groupBRounds = generateOddRoundRobin(groupBTeams);

  const MSI_DATES = ["05-02", "05-09", "05-16", "05-23", "05-30"];

  for (let r = 0; r < 5; r++) {
    const roundDate = `${year}-${MSI_DATES[r]}`;
    for (const match of groupARounds[r]) {
      await db.match.create({
        data: {
          tournament: "MSI",
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          date: roundDate,
          played: false,
          userId
        }
      });
    }
    for (const match of groupBRounds[r]) {
      await db.match.create({
        data: {
          tournament: "MSI",
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          date: roundDate,
          played: false,
          userId
        }
      });
    }
  }
}

async function generateMSIPlayoffsSF(userId: string, year: string) {
  const rankings = await getRegionalRankings(userId, year);

  const groupATeamsIds = [
    rankings["LCK"][0],
    rankings["LPL"][1],
    rankings["LEC"][0],
    rankings["LCP"][1],
    rankings["CBLOL"][0]
  ].filter(Boolean);

  const groupBTeamsIds = [
    rankings["LPL"][0],
    rankings["LCK"][1],
    rankings["LEC"][1],
    rankings["LCP"][0],
    rankings["CBLOL"][1]
  ].filter(Boolean);

  const groupATeams = await db.team.findMany({
    where: { id: { in: groupATeamsIds } },
    orderBy: [
      { wins: "desc" },
      { points: "desc" }
    ]
  });

  const groupBTeams = await db.team.findMany({
    where: { id: { in: groupBTeamsIds } },
    orderBy: [
      { wins: "desc" },
      { points: "desc" }
    ]
  });

  if (groupATeams.length >= 2 && groupBTeams.length >= 2) {
    const date = `${year}-06-06`;
    await db.match.create({
      data: {
        tournament: "MSI",
        homeTeamId: groupATeams[0].id,
        awayTeamId: groupBTeams[1].id,
        date,
        played: false,
        userId
      }
    });
    await db.match.create({
      data: {
        tournament: "MSI",
        homeTeamId: groupBTeams[0].id,
        awayTeamId: groupATeams[1].id,
        date,
        played: false,
        userId
      }
    });
  }
}

async function generateMSIPlayoffsF(userId: string, year: string) {
  const sfMatches = await db.match.findMany({
    where: {
      userId,
      tournament: "MSI",
      date: `${year}-06-06`
    }
  });

  const winners: string[] = [];
  for (const m of sfMatches) {
    if (m.homeScore > m.awayScore) {
      winners.push(m.homeTeamId);
    } else {
      winners.push(m.awayTeamId);
    }
  }

  if (winners.length >= 2) {
    await db.match.create({
      data: {
        tournament: "MSI",
        homeTeamId: winners[0],
        awayTeamId: winners[1],
        date: `${year}-06-13`,
        played: false,
        userId
      }
    });
  }
}

async function generateEWCSchedule(userId: string, year: string) {
  const rankings = await getRegionalRankings(userId, year);

  const ewcTeams = [
    rankings["LCK"][0], rankings["LCK"][1],
    rankings["LPL"][0], rankings["LPL"][1],
    rankings["LEC"][0], rankings["LEC"][1],
    rankings["LCP"][0],
    rankings["CBLOL"][0]
  ].filter(Boolean);

  if (ewcTeams.length >= 8) {
    const date = `${year}-07-04`;
    await db.match.create({ data: { tournament: "EWC", homeTeamId: ewcTeams[0], awayTeamId: ewcTeams[5], date, played: false, userId } });
    await db.match.create({ data: { tournament: "EWC", homeTeamId: ewcTeams[2], awayTeamId: ewcTeams[6], date, played: false, userId } });
    await db.match.create({ data: { tournament: "EWC", homeTeamId: ewcTeams[4], awayTeamId: ewcTeams[3], date, played: false, userId } });
    await db.match.create({ data: { tournament: "EWC", homeTeamId: ewcTeams[7], awayTeamId: ewcTeams[1], date, played: false, userId } });
  }
}

async function generateEWCSF(userId: string, year: string) {
  const qfMatches = await db.match.findMany({
    where: {
      userId,
      tournament: "EWC",
      date: `${year}-07-04`
    }
  });

  const winners: string[] = [];
  for (const m of qfMatches) {
    if (m.homeScore > m.awayScore) {
      winners.push(m.homeTeamId);
    } else {
      winners.push(m.awayTeamId);
    }
  }

  if (winners.length >= 4) {
    const date = `${year}-07-11`;
    await db.match.create({ data: { tournament: "EWC", homeTeamId: winners[0], awayTeamId: winners[1], date, played: false, userId } });
    await db.match.create({ data: { tournament: "EWC", homeTeamId: winners[2], awayTeamId: winners[3], date, played: false, userId } });
  }
}

async function generateEWCF(userId: string, year: string) {
  const sfMatches = await db.match.findMany({
    where: {
      userId,
      tournament: "EWC",
      date: `${year}-07-11`
    }
  });

  const winners: string[] = [];
  for (const m of sfMatches) {
    if (m.homeScore > m.awayScore) {
      winners.push(m.homeTeamId);
    } else {
      winners.push(m.awayTeamId);
    }
  }

  if (winners.length >= 2) {
    await db.match.create({
      data: {
        tournament: "EWC",
        homeTeamId: winners[0],
        awayTeamId: winners[1],
        date: `${year}-07-18`,
        played: false,
        userId
      }
    });
  }
}

async function generateWorldsGroupsSchedule(userId: string, year: string) {
  const rankings = await getRegionalRankings(userId, year);

  const groupATeams = [rankings["LCK"][0], rankings["LPL"][2], rankings["LEC"][1], rankings["LCP"][2]].filter(Boolean);
  const groupBTeams = [rankings["LPL"][0], rankings["LCK"][2], rankings["LCP"][1], rankings["CBLOL"][1]].filter(Boolean);
  const groupCTeams = [rankings["LEC"][0], rankings["LPL"][1], rankings["LCK"][3], rankings["CBLOL"][0]].filter(Boolean);
  const groupDTeams = [rankings["LCP"][0], rankings["LEC"][2], rankings["LPL"][3], rankings["LCK"][1]].filter(Boolean);

  const groupARounds = generateRoundRobin(groupATeams);
  const groupBRounds = generateRoundRobin(groupBTeams);
  const groupCRounds = generateRoundRobin(groupCTeams);
  const groupDRounds = generateRoundRobin(groupDTeams);

  const WORLDS_DATES = ["10-03", "10-10", "10-17"];

  for (let r = 0; r < 3; r++) {
    const roundDate = `${year}-${WORLDS_DATES[r]}`;
    const allRoundMatches = [
      ...groupARounds[r],
      ...groupBRounds[r],
      ...groupCRounds[r],
      ...groupDRounds[r]
    ];
    for (const match of allRoundMatches) {
      await db.match.create({
        data: {
          tournament: "WORLDS",
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          date: roundDate,
          played: false,
          userId
        }
      });
    }
  }
}

async function generateWorldsPlayoffsQF(userId: string, year: string) {
  const rankings = await getRegionalRankings(userId, year);

  const groupATeamsIds = [rankings["LCK"][0], rankings["LPL"][2], rankings["LEC"][1], rankings["LCP"][2]].filter(Boolean);
  const groupBTeamsIds = [rankings["LPL"][0], rankings["LCK"][2], rankings["LCP"][1], rankings["CBLOL"][1]].filter(Boolean);
  const groupCTeamsIds = [rankings["LEC"][0], rankings["LPL"][1], rankings["LCK"][3], rankings["CBLOL"][0]].filter(Boolean);
  const groupDTeamsIds = [rankings["LCP"][0], rankings["LEC"][2], rankings["LPL"][3], rankings["LCK"][1]].filter(Boolean);

  const groupATeams = await db.team.findMany({ where: { id: { in: groupATeamsIds } }, orderBy: [{ wins: "desc" }, { points: "desc" }] });
  const groupBTeams = await db.team.findMany({ where: { id: { in: groupBTeamsIds } }, orderBy: [{ wins: "desc" }, { points: "desc" }] });
  const groupCTeams = await db.team.findMany({ where: { id: { in: groupCTeamsIds } }, orderBy: [{ wins: "desc" }, { points: "desc" }] });
  const groupDTeams = await db.team.findMany({ where: { id: { in: groupDTeamsIds } }, orderBy: [{ wins: "desc" }, { points: "desc" }] });

  if (groupATeams.length >= 2 && groupBTeams.length >= 2 && groupCTeams.length >= 2 && groupDTeams.length >= 2) {
    const date = `${year}-10-24`;
    await db.match.create({ data: { tournament: "WORLDS", homeTeamId: groupATeams[0].id, awayTeamId: groupBTeams[1].id, date, played: false, userId } });
    await db.match.create({ data: { tournament: "WORLDS", homeTeamId: groupBTeams[0].id, awayTeamId: groupATeams[1].id, date, played: false, userId } });
    await db.match.create({ data: { tournament: "WORLDS", homeTeamId: groupCTeams[0].id, awayTeamId: groupDTeams[1].id, date, played: false, userId } });
    await db.match.create({ data: { tournament: "WORLDS", homeTeamId: groupDTeams[0].id, awayTeamId: groupCTeams[1].id, date, played: false, userId } });
  }
}

async function generateWorldsPlayoffsSF(userId: string, year: string) {
  const qfMatches = await db.match.findMany({
    where: {
      userId,
      tournament: "WORLDS",
      date: `${year}-10-24`
    }
  });

  const winners: string[] = [];
  for (const m of qfMatches) {
    if (m.homeScore > m.awayScore) {
      winners.push(m.homeTeamId);
    } else {
      winners.push(m.awayTeamId);
    }
  }

  if (winners.length >= 4) {
    const date = `${year}-10-31`;
    await db.match.create({ data: { tournament: "WORLDS", homeTeamId: winners[0], awayTeamId: winners[1], date, played: false, userId } });
    await db.match.create({ data: { tournament: "WORLDS", homeTeamId: winners[2], awayTeamId: winners[3], date, played: false, userId } });
  }
}

async function generateWorldsPlayoffsF(userId: string, year: string) {
  const sfMatches = await db.match.findMany({
    where: {
      userId,
      tournament: "WORLDS",
      date: `${year}-10-31`
    }
  });

  const winners: string[] = [];
  for (const m of sfMatches) {
    if (m.homeScore > m.awayScore) {
      winners.push(m.homeTeamId);
    } else {
      winners.push(m.awayTeamId);
    }
  }

  if (winners.length >= 2) {
    await db.match.create({
      data: {
        tournament: "WORLDS",
        homeTeamId: winners[0],
        awayTeamId: winners[1],
        date: `${year}-11-07`,
        played: false,
        userId
      }
    });
  }
}

async function transitionTournament(userId: string, userTeamId: string, currentDate: string, currentSeasonState: string): Promise<string> {
  const year = currentDate.split("-")[0];
  let nextSeasonState = currentSeasonState;

  if (currentSeasonState === "FIRST_STAND_QF") {
    await generateFirstStandSF(userId, year);
    nextSeasonState = "FIRST_STAND_SF";
  } else if (currentSeasonState === "FIRST_STAND_SF") {
    await generateFirstStandF(userId, year);
    nextSeasonState = "FIRST_STAND_F";
  } else if (currentSeasonState === "FIRST_STAND_F") {
    await resetTeamStats(userId);
    await generateRegionalRegularSchedule(userId, year);
    nextSeasonState = "REGIONAL_REGULAR";

    await db.mail.create({
      data: {
        title: "Khởi tranh Mùa Giải Khu Vực!",
        content: `Kính gửi HLV,

Mùa giải khu vực đã chính thức bắt đầu. 8 đội tuyển trong khu vực sẽ thi đấu vòng tròn 1 lượt (7 trận) để tìm ra 4 đội xuất sắc nhất lọt vào vòng Playoff.

Hãy cố gắng đạt thứ hạng cao để giành vé tham dự các giải đấu quốc tế lớn tiếp theo!`,
        date: currentDate,
        sender: "Ban Tổ Chức Giải Đấu",
        category: "GENERAL",
        userId
      }
    });
  } else if (currentSeasonState === "REGIONAL_REGULAR") {
    await generateRegionalPlayoffsSF(userId, year);
    nextSeasonState = "REGIONAL_PLAYOFF_SF";
  } else if (currentSeasonState === "REGIONAL_PLAYOFF_SF") {
    await generateRegionalPlayoffsF(userId, year);
    nextSeasonState = "REGIONAL_PLAYOFF_F";
  } else if (currentSeasonState === "REGIONAL_PLAYOFF_F") {
    await resetTeamStats(userId);
    await generateMSIGroupsSchedule(userId, year);
    nextSeasonState = "MSI_GROUPS";

    await db.mail.create({
      data: {
        title: "Mid-Season Invitational (MSI) chính thức khởi tranh!",
        content: `Chào HLV,

Giải đấu MSI năm nay quy tụ 10 đội tuyển mạnh nhất từ các khu vực.
Các đội tuyển được chia làm 2 bảng thi đấu vòng tròn tính điểm. 2 đội đứng đầu mỗi bảng sẽ lọt vào Bán kết.

Chúc đội tuyển thi đấu thành công!`,
        date: currentDate,
        sender: "Ban Tổ Chức MSI",
        category: "GENERAL",
        userId
      }
    });
  } else if (currentSeasonState === "MSI_GROUPS") {
    await generateMSIPlayoffsSF(userId, year);
    nextSeasonState = "MSI_PLAYOFF_SF";
  } else if (currentSeasonState === "MSI_PLAYOFF_SF") {
    await generateMSIPlayoffsF(userId, year);
    nextSeasonState = "MSI_PLAYOFF_F";
  } else if (currentSeasonState === "MSI_PLAYOFF_F") {
    await resetTeamStats(userId);
    await generateEWCSchedule(userId, year);
    nextSeasonState = "EWC_QF";

    await db.mail.create({
      data: {
        title: "Esports World Cup (EWC) chính thức bắt đầu!",
        content: `Chào HLV,

Giải đấu EWC đã khởi tranh với sự góp mặt của 8 đội tuyển hàng đầu thế giới. Thể thức loại trực tiếp vô cùng khốc liệt, sảy chân một bước là phải ra về!`,
        date: currentDate,
        sender: "Ban Tổ Chức EWC",
        category: "GENERAL",
        userId
      }
    });
  } else if (currentSeasonState === "EWC_QF") {
    await generateEWCSF(userId, year);
    nextSeasonState = "EWC_SF";
  } else if (currentSeasonState === "EWC_SF") {
    await generateEWCF(userId, year);
    nextSeasonState = "EWC_F";
  } else if (currentSeasonState === "EWC_F") {
    await resetTeamStats(userId);
    await generateWorldsGroupsSchedule(userId, year);
    nextSeasonState = "WORLDS_GROUPS";

    await db.mail.create({
      data: {
        title: "Chung Kết Thế Giới (Worlds) chính thức khai mạc!",
        content: `Kính gửi HLV,

Giải đấu lớn nhất trong năm - Chung Kết Thế Giới đã bắt đầu! 16 đội tuyển xuất sắc nhất sẽ cạnh tranh cho chiếc cúp vô địch danh giá.

Chúc đội tuyển có những trận đấu cống hiến và chạm tay vào đỉnh vinh quang!`,
        date: currentDate,
        sender: "Ban Tổ Chức Worlds",
        category: "GENERAL",
        userId
      }
    });
  } else if (currentSeasonState === "WORLDS_GROUPS") {
    await generateWorldsPlayoffsQF(userId, year);
    nextSeasonState = "WORLDS_PLAYOFF_QF";
  } else if (currentSeasonState === "WORLDS_PLAYOFF_QF") {
    await generateWorldsPlayoffsSF(userId, year);
    nextSeasonState = "WORLDS_PLAYOFF_SF";
  } else if (currentSeasonState === "WORLDS_PLAYOFF_SF") {
    await generateWorldsPlayoffsF(userId, year);
    nextSeasonState = "WORLDS_PLAYOFF_F";
  } else if (currentSeasonState === "WORLDS_PLAYOFF_F") {
    nextSeasonState = "OFF_SEASON";

    await db.mail.create({
      data: {
        title: "Bắt đầu Mùa Chuyển Nhượng (Off-season)!",
        content: `Kính gửi HLV,

Mùa giải thi đấu chuyên nghiệp của năm nay đã khép lại. 
Đây là khoảng thời gian để bạn tái cấu trúc đội hình, đàm phán hợp đồng, ký kết với các tuyển thủ tự do hoặc sa thải các tuyển thủ không còn nằm trong kế hoạch.

Bấm "Tiếp Tục (Advance)" sẽ tiến nhanh qua từng tuần để đi tới mùa giải tiếp theo!`,
        date: currentDate,
        sender: "Ban Lãnh Đạo CLB",
        category: "TRANSFER",
        userId
      }
    });
  }

  await db.gameState.update({
    where: { userId },
    data: { seasonState: nextSeasonState }
  });

  return nextSeasonState;
}

async function simulateOtherMatches(date: string, userTeamId: string, userId: string) {
  const otherMatches = await db.match.findMany({
    where: {
      date,
      played: false,
      userId,
      NOT: {
        OR: [
          { homeTeamId: userTeamId },
          { awayTeamId: userTeamId }
        ]
      }
    },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } }
    }
  });

  if (otherMatches.length === 0) return;

  const championTiers = await getChampionTiersMap();

  for (const match of otherMatches) {
    const homeDraft = generateAIChoice(match.homeTeam.players, championTiers);
    const awayDraft = generateAIChoice(match.awayTeam.players, championTiers);

    const result = simulateLoLGame(
      match.homeTeam.name,
      match.homeTeam.players,
      homeDraft,
      match.awayTeam.name,
      match.awayTeam.players,
      awayDraft,
      championTiers
    );

    await db.match.update({
      where: { id: match.id },
      data: {
        played: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        matchEvents: JSON.stringify(result)
      }
    });

    if (result.winner === "HOME") {
      await db.team.update({
        where: { id: match.homeTeamId },
        data: { wins: { increment: 1 }, points: { increment: 3 } }
      });
      await db.team.update({
        where: { id: match.awayTeamId },
        data: { losses: { increment: 1 } }
      });
    } else {
      await db.team.update({
        where: { id: match.awayTeamId },
        data: { wins: { increment: 1 }, points: { increment: 3 } }
      });
      await db.team.update({
        where: { id: match.homeTeamId },
        data: { losses: { increment: 1 } }
      });
    }
  }
}

// 2. Action tiến ngày (Next Day)
export async function advanceDayAction() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước.");

    const gameState = await db.gameState.findUnique({
      where: { userId: currentUser.id }
    });
    if (!gameState) throw new Error("Không tìm thấy dữ liệu game");
    if (!gameState.userTeamId) throw new Error("Vui lòng chọn đội tuyển trước");

    const userTeamId = gameState.userTeamId;
    const userId = currentUser.id;
    const currentDate = gameState.currentDate;
    
    // Kiểm tra xem hôm nay có trận đấu chưa đá của người chơi không
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
      return { status: "MATCH_DAY", matchId: userMatchToday.id, date: currentDate };
    }

    let tempDate = currentDate;
    let tempSeasonState = gameState.seasonState;
    let loopCount = 0;
    const maxLoops = 200;

    while (loopCount < maxLoops) {
      loopCount++;

      // A. Nếu đang trong KỲ CHUYỂN NHƯỢNG (OFF_SEASON):
      if (tempSeasonState === "OFF_SEASON") {
        const nextDate = addDays(tempDate, 7);
        const nextYear = nextDate.split("-")[0];
        const currentYear = tempDate.split("-")[0];

        if (nextYear !== currentYear || nextDate >= `${nextYear}-12-20`) {
          // Sang năm mới!
          const startYear = String(Number(currentYear) + 1);
          const startNewYearDate = `${startYear}-01-05`;

          await resetTeamStats(userId);
          await generateFirstStandQF(userId, startYear);

          await db.gameState.update({
            where: { id: gameState.id },
            data: {
              currentDate: startNewYearDate,
              seasonState: "FIRST_STAND_QF",
              dayOfSeason: 1,
              week: 1
            }
          });

          await db.mail.create({
            data: {
              title: `Chào mừng mùa giải mới ${startYear}!`,
              content: `Kính gửi HLV,

Chào mừng bạn đến với năm thi đấu ${startYear}!
Giải đấu Tiền Mùa Giải First Stand Kickoff đã chính thức quay trở lại. Hãy chuẩn bị đội hình và cấm chọn thật tốt cho trận đấu Quarterfinals diễn ra vào thứ Bảy tuần này!`,
              date: startNewYearDate,
              sender: "Ban Tổ Chức Giải Đấu",
              category: "GENERAL",
              userId
            }
          });

          tempDate = startNewYearDate;
          tempSeasonState = "FIRST_STAND_QF";
          break;
        } else {
          const nextDayOfSeason = gameState.dayOfSeason + 7;
          const nextWeek = Math.floor((nextDayOfSeason - 1) / 7) + 1;

          await db.gameState.update({
            where: { id: gameState.id },
            data: {
              currentDate: nextDate,
              dayOfSeason: nextDayOfSeason,
              week: nextWeek
            }
          });

          if (Math.random() < 0.25) {
            await generateRandomEmail(nextDate, userTeamId, userId);
          }

          tempDate = nextDate;
          break;
        }
      }

      // B. Nếu đang trong các giải đấu:
      const nextDate = addDays(tempDate, 1);

      // Giả lập tất cả các trận đấu khác trong ngày tiếp theo
      await simulateOtherMatches(nextDate, userTeamId, userId);

      const nextDayOfSeason = gameState.dayOfSeason + (loopCount); // Cập nhật tịnh tiến theo ngày loop
      // Thực tế tính dynamic:
      const diffTime = new Date(nextDate).getTime() - new Date("2026-01-05").getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const nextWeek = Math.floor((diffDays - 1) / 7) + 1;

      await db.gameState.update({
        where: { id: gameState.id },
        data: {
          currentDate: nextDate,
          dayOfSeason: diffDays,
          week: nextWeek
        }
      });

      if (Math.random() < 0.1) {
        await generateRandomEmail(nextDate, userTeamId, userId);
      }

      tempDate = nextDate;

      // Kiểm tra xem người chơi có trận đấu hôm đó không
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
        break;
      }

      // Kiểm tra xem tất cả trận đấu của giai đoạn hiện tại đã hoàn thành chưa
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

      if (!unplayedMatchesInStage && currentTournament !== "") {
        const newSeasonState = await transitionTournament(userId, userTeamId, tempDate, tempSeasonState);
        tempSeasonState = newSeasonState;
        break;
      }

      // Tối ưu hóa hiệu năng: Nhảy nhanh nếu không có lịch đấu nào trong 7 ngày tới
      const nextUnplayedMatch = await db.match.findFirst({
        where: { userId, played: false },
        orderBy: { date: "asc" }
      });

      if (nextUnplayedMatch) {
        const nextMatchDateStr = nextUnplayedMatch.date;
        const ffDiffTime = new Date(nextMatchDateStr).getTime() - new Date(tempDate).getTime();
        const ffDiffDays = Math.floor(ffDiffTime / (1000 * 60 * 60 * 24));
        
        if (ffDiffDays > 7) {
          const fastForwardDate = addDays(nextMatchDateStr, -1);
          const ffParts = fastForwardDate.split("-").map(Number);
          const startOfYear = new Date(ffParts[0], 0, 5);
          const targetDate = new Date(ffParts[0], ffParts[1] - 1, ffParts[2]);
          const targetDiffTime = targetDate.getTime() - startOfYear.getTime();
          const targetDiffDays = Math.floor(targetDiffTime / (1000 * 60 * 60 * 24)) + 1;
          const targetWeek = Math.floor((targetDiffDays - 1) / 7) + 1;

          await db.gameState.update({
            where: { id: gameState.id },
            data: {
              currentDate: fastForwardDate,
              dayOfSeason: targetDiffDays,
              week: targetWeek
            }
          });
          
          tempDate = fastForwardDate;
        }
      }
    }

    revalidatePath("/");

    // Kiểm tra xem ngày hiện tại mới có trận đấu của người chơi không
    const userMatchFinal = await db.match.findFirst({
      where: {
        date: tempDate,
        played: false,
        userId,
        OR: [
          { homeTeamId: userTeamId },
          { awayTeamId: userTeamId }
        ]
      }
    });

    if (userMatchFinal) {
      return { status: "MATCH_DAY", matchId: userMatchFinal.id, date: tempDate };
    }

    return { status: "SUCCESS", date: tempDate };
  } catch (error: any) {
    console.error("Lỗi chuyển ngày:", error);
    return { success: false, error: error.message };
  }
}

// 3. Action cấm chọn và thi đấu cho trận của người chơi
export async function submitDraftAndPlayAction(matchId: string, userDraft: TeamDraft, opponentDraft?: TeamDraft) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước.");

    const match = await db.match.findUnique({
      where: { id: matchId, userId: currentUser.id },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } }
      }
    });

    if (!match) throw new Error("Không tìm thấy trận đấu của bạn");
    if (match.played) throw new Error("Trận đấu này đã diễn ra rồi");

    const gameState = await db.gameState.findUnique({
      where: { userId: currentUser.id }
    });
    const userTeamId = gameState?.userTeamId;
    if (!userTeamId) throw new Error("Không tìm thấy đội tuyển của bạn");

    const championTiers = await getChampionTiersMap();
    const isUserHome = match.homeTeamId === userTeamId;
    
    // Đội AI tự động sinh cấm chọn
    const aiPlayers = isUserHome ? match.awayTeam.players : match.homeTeam.players;
    const aiDraft = opponentDraft || generateAIChoice(aiPlayers, championTiers);

    const homePlayers = match.homeTeam.players;
    const awayPlayers = match.awayTeam.players;
    const homeDraft = isUserHome ? userDraft : aiDraft;
    const awayDraft = isUserHome ? aiDraft : userDraft;

    // Chạy mô phỏng trận đấu
    const result = simulateLoLGame(
      match.homeTeam.name,
      homePlayers,
      homeDraft,
      match.awayTeam.name,
      awayPlayers,
      awayDraft,
      championTiers
    );

    // Cập nhật kết quả vào database
    await db.match.update({
      where: { id: matchId },
      data: {
        played: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        matchEvents: JSON.stringify(result)
      }
    });

    // Cập nhật điểm số BXH của 2 đội
    if (result.winner === "HOME") {
      await db.team.update({
        where: { id: match.homeTeamId },
        data: { wins: { increment: 1 }, points: { increment: 3 } }
      });
      await db.team.update({
        where: { id: match.awayTeamId },
        data: { losses: { increment: 1 } }
      });
    } else {
      await db.team.update({
        where: { id: match.awayTeamId },
        data: { wins: { increment: 1 }, points: { increment: 3 } }
      });
      await db.team.update({
        where: { id: match.homeTeamId },
        data: { losses: { increment: 1 } }
      });
    }

    // Tạo thư báo cáo kết quả trận đấu gửi cho ban giám đốc/HLV
    const userScore = isUserHome ? result.homeScore : result.awayScore;
    const aiScore = isUserHome ? result.awayScore : result.homeScore;
    const isWin = result.winner === (isUserHome ? "HOME" : "AWAY");
    const oppName = isUserHome ? match.awayTeam.name : match.homeTeam.name;

    await db.mail.create({
      data: {
        title: `Báo cáo trận đấu: ${isWin ? "Chiến thắng" : "Thất bại"} trước ${oppName}!`,
        content: `Chào HLV,

Trận đấu vừa qua với ${oppName} đã khép lại với tỷ số ${userScore} - ${aiScore} nghiêng về phía ${isWin ? "chúng ta" : oppName}.

Đánh giá tổng quan trận đấu:
- Kills: ${isUserHome ? result.homeKills : result.awayKills} (Ta) - ${isUserHome ? result.awayKills : result.homeKills} (Đối thủ)
- Trụ: ${isUserHome ? result.homeTowers : result.awayTowers} (Ta) - ${isUserHome ? result.awayTowers : result.homeTowers} (Đối thủ)
- Rồng: ${isUserHome ? result.homeDragons : result.awayDragons} (Ta) - ${isUserHome ? result.awayDragons : result.homeDragons} (Đối thủ)
- Baron: ${isUserHome ? result.homeBarons : result.awayBarons} (Ta) - ${isUserHome ? result.awayBarons : result.homeBarons} (Đối thủ)

Điểm số các tuyển thủ của chúng ta:
${(isUserHome ? result.homePlayerStats : result.awayPlayerStats).map(p => `- ${p.role} ${p.name}: KDA ${p.kills}/${p.deaths}/${p.assists} (Chấm điểm: ${p.performanceScore})`).join("\n")}

Hãy tiếp tục tập luyện và chuẩn bị thật tốt cho trận đấu tiếp theo.

Thân ái,
Trợ lý Huấn luyện viên`,
        date: match.date,
        sender: "Trợ Lý HLV",
        category: "MATCH",
        read: false,
        userId: currentUser.id
      }
    });

    revalidatePath("/");
    return { success: true, result };
  } catch (error: any) {
    console.error("Lỗi thi đấu:", error);
    return { success: false, error: error.message };
  }
}

// 4. Action đọc thư
export async function readMailAction(mailId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước.");

    const mail = await db.mail.findUnique({
      where: { id: mailId }
    });

    if (!mail) throw new Error("Không tìm thấy thư.");
    
    // Chỉ cho phép đọc nếu thư thuộc về user hiện tại hoặc là thư global template (userId === null)
    if (mail.userId !== currentUser.id && mail.userId !== null) {
      throw new Error("Bạn không có quyền đọc thư này.");
    }

    await db.mail.update({
      where: { id: mailId },
      data: { read: true }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Action đàm phán chuyển nhượng tuyển thủ tự do
export async function signFreeAgentAction(playerId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước.");

    const gameState = await db.gameState.findUnique({
      where: { userId: currentUser.id }
    });
    if (!gameState || !gameState.userTeamId) throw new Error("Chưa chọn đội tuyển");

    const player = await db.player.findUnique({
      where: { id: playerId, userId: currentUser.id }
    });

    if (!player) throw new Error("Không tìm thấy tuyển thủ");
    if (player.teamId) throw new Error("Tuyển thủ này đã có đội");

    const team = await db.team.findUnique({
      where: { id: gameState.userTeamId, userId: currentUser.id },
      include: { players: true }
    });

    if (!team) throw new Error("Không tìm thấy đội của bạn");

    // 1. Kiểm tra ngân sách chuyển nhượng
    const transferFee = Math.round(player.value * 0.8);
    if (team.budget < transferFee) {
      throw new Error(`Không đủ ngân sách chuyển nhượng. Chi phí lót tay yêu cầu: $${transferFee.toLocaleString()} (Ngân sách của bạn: $${team.budget.toLocaleString()})`);
    }

    // 2. Kiểm tra quỹ lương
    const currentSalaries = team.players.reduce((sum, p) => sum + p.salary, 0);
    if (currentSalaries + player.salary > team.salaryCap) {
      throw new Error(`Vượt quá quỹ lương tối đa (Salary Cap). Lương tuyển thủ: $${player.salary.toLocaleString()} (Quỹ lương trống: $${(team.salaryCap - currentSalaries).toLocaleString()})`);
    }

    // 3. Tiến hành ký hợp đồng
    await db.player.update({
      where: { id: playerId },
      data: {
        teamId: team.id,
        salary: player.salary,
        contractEnd: 2028
      }
    });

    // Trừ ngân sách
    await db.team.update({
      where: { id: team.id },
      data: { budget: { decrement: transferFee } }
    });

    // Tạo email báo cáo
    await db.mail.create({
      data: {
        title: `Hợp đồng thành công: Chào mừng ${player.name} gia nhập đội!`,
        content: `Kính gửi HLV,

Chúng tôi rất vui mừng thông báo rằng tuyển thủ tự do ${player.name} (${player.role}) đã chính thức đặt bút ký vào bản hợp đồng có thời hạn đến năm 2028 với ${team.name}.

Chi tiết hợp đồng:
- Chi phí lót tay: $${transferFee.toLocaleString()}
- Lương hàng năm: $${player.salary.toLocaleString()}
- Chỉ số đi đường: ${player.laning}
- Chỉ số giao tranh: ${player.teamfight}
- Chỉ số kiểm soát (macro): ${player.macro}

Ban lãnh đạo đánh giá đây là một sự bổ sung vô cùng chất lượng cho đội hình của chúng ta. Chúc bạn và tuyển thủ mới gặt hái nhiều thành công!

Trân trọng,
Trưởng ban chuyển nhượng CLB`,
        date: gameState.currentDate,
        sender: "Ban Chuyển Nhượng CLB",
        category: "TRANSFER",
        read: false,
        userId: currentUser.id
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi ký hợp đồng:", error);
    return { success: false, error: error.message };
  }
}

// 6. Action sa thải tuyển thủ
export async function releasePlayerAction(playerId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước.");

    const gameState = await db.gameState.findUnique({
      where: { userId: currentUser.id }
    });
    if (!gameState || !gameState.userTeamId) throw new Error("Chưa chọn đội");

    const player = await db.player.findUnique({
      where: { id: playerId, userId: currentUser.id }
    });

    if (!player || player.teamId !== gameState.userTeamId) {
      throw new Error("Tuyển thủ không thuộc đội của bạn");
    }

    // Sa thải cầu thủ, biến họ thành tự do (teamId = null)
    await db.player.update({
      where: { id: playerId },
      data: { teamId: null }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- HÀM TRỢ GIÚP (HELPERS) ---

// AI tự động sinh cấm chọn ngẫu nhiên hợp lý
function generateAIChoice(players: any[], championTiers?: Record<string, string>): TeamDraft {
  const bans: string[] = [];
  const picks: Record<string, string> = {};

  const roles: ("TOP" | "JUG" | "MID" | "BOT" | "SUP")[] = ["TOP", "JUG", "MID", "BOT", "SUP"];

  // 1. AI cấm ngẫu nhiên 5 tướng
  const allChamps = [...CHAMPIONS];
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * allChamps.length);
    bans.push(allChamps[idx].id);
    allChamps.splice(idx, 1);
  }

  // 2. AI chọn tướng cho từng vai trò trong danh sách tướng không bị cấm
  for (const role of roles) {
    const roleChamps = CHAMPIONS.filter(c => c.role === role && !bans.includes(c.id));
    if (roleChamps.length > 0) {
      if (championTiers) {
        roleChamps.sort((a, b) => {
          const getPower = (cid: string) => {
            const t = championTiers[cid] || "B";
            if (t === "S") return 10;
            if (t === "A") return 8;
            if (t === "B") return 7;
            if (t === "C") return 6;
            if (t === "D") return 5;
            return 3;
          };
          return getPower(b.id) - getPower(a.id);
        });
      } else {
        roleChamps.sort((a, b) => b.metaPower - a.metaPower);
      }
      const topCount = Math.min(3, roleChamps.length);
      const chosen = roleChamps[Math.floor(Math.random() * topCount)];
      picks[role] = chosen.id;
    } else {
      picks[role] = CHAMPIONS.find(c => c.role === role)!.id;
    }
  }

  return { bans, picks };
}

// Sinh email tin tức ngẫu nhiên gửi đến inbox của người chơi
async function generateRandomEmail(date: string, userTeamId: string, userId: string) {
  const newsList = [
    {
      title: "Tin tức chuyển nhượng: LCK rúng động trước tin đồn thương vụ lớn",
      content: `Theo các nguồn tin uy tín tại Hàn Quốc, thị trường chuyển nhượng tự do đang diễn ra vô cùng sôi động. Nhiều đội tuyển lớn đang âm thầm liên hệ với các siêu sao tự do như TheShy và SofM nhằm gia cố đội hình cho giai đoạn lượt về.
Chúng tôi sẽ tiếp tục cập nhật những diễn biến mới nhất của thương vụ này.`,
      sender: "Esports News Network"
    },
    {
      title: "Bản cập nhật meta 16.2: Sát thủ trỗi dậy ở Đường Giữa!",
      content: `Riot Games vừa công bố chi tiết bản cập nhật mới nhất. Theo đó, hàng loạt sát thủ đường giữa và tướng đi rừng ăn thịt được gia tăng đáng kể sát thương cơ bản.
Các chuyên gia nhận định meta giải đấu sẽ chuyển dịch từ kiểm soát nuôi rùa sang các pha cướp rừng và giao tranh nhỏ liên tục ở đầu trận. Các HLV hãy chú ý điều chỉnh lượt Cấm/Chọn của mình!`,
      sender: "Ban Tổ Chức Giải Đấu"
    },
    {
      title: "Lời khuyên từ Trợ lý: Cải thiện tâm lý tuyển thủ",
      content: `Chào HLV,

Tôi nhận thấy phong độ tập luyện của đội gần đây có chút biến động. Một số tuyển thủ trẻ đang gặp áp lực tâm lý khá lớn.
Tôi đề nghị chúng ta nên bổ sung thêm các hoạt động bonding nhẹ nhàng giữa các tuần thi đấu hoặc tập trung rèn luyện chỉ số "Tâm lý (Mentality)" cho toàn đội trong các buổi training tiếp theo.

Chúc HLV một ngày làm việc hiệu quả!`,
      sender: "Trợ Lý HLV"
    }
  ];

  const news = newsList[Math.floor(Math.random() * newsList.length)];

  await db.mail.create({
    data: {
      title: news.title,
      content: news.content,
      date,
      sender: news.sender,
      category: "GENERAL",
      read: false,
      userId: userId
    }
  });
}

async function getChampionTiersMap(): Promise<Record<string, string>> {
  const res = await getChampionTiersAction();
  return res.tiers;
}

export async function getChampionTiersAction() {
  try {
    const dbTiers = await db.championTier.findMany();
    const tierMap: Record<string, string> = {};
    const imageMap: Record<string, string> = {};
    for (const t of dbTiers) {
      tierMap[t.id] = t.tier;
      imageMap[t.id] = t.imageUrl || "";
    }
    
    for (const champ of CHAMPIONS) {
      if (!tierMap[champ.id]) {
        let defaultTier = "B";
        if (champ.metaPower >= 9) defaultTier = "S";
        else if (champ.metaPower === 8) defaultTier = "A";
        else if (champ.metaPower === 7) defaultTier = "B";
        else if (champ.metaPower === 6) defaultTier = "C";
        else if (champ.metaPower === 5) defaultTier = "D";
        else defaultTier = "F";
        
        await db.championTier.create({
          data: { id: champ.id, tier: defaultTier, imageUrl: null }
        });
        tierMap[champ.id] = defaultTier;
        imageMap[champ.id] = "";
      }
    }
    
    return { success: true, tiers: tierMap, images: imageMap };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách tier tướng:", error);
    const tierMap: Record<string, string> = {};
    const imageMap: Record<string, string> = {};
    for (const champ of CHAMPIONS) {
      let defaultTier = "B";
      if (champ.metaPower >= 9) defaultTier = "S";
      else if (champ.metaPower === 8) defaultTier = "A";
      else if (champ.metaPower === 7) defaultTier = "B";
      else if (champ.metaPower === 6) defaultTier = "C";
      else if (champ.metaPower === 5) defaultTier = "D";
      else defaultTier = "F";
      tierMap[champ.id] = defaultTier;
      imageMap[champ.id] = "";
    }
    return { success: true, tiers: tierMap, images: imageMap };
  }
}

export async function getTournamentsAction() {
  try {
    const defaultTournaments = [
      { id: "REGIONAL", name: "Regional Season (Giải đấu khu vực)" },
      { id: "FIRST_STAND", name: "First Stand" },
      { id: "MSI", name: "Mid-Season Invitational (MSI)" },
      { id: "EWC", name: "Esports World Cup (EWC)" },
      { id: "WORLDS", name: "League of Legends World Championship (Worlds)" }
    ];

    const dbTournaments = await db.tournament.findMany();
    const tournamentMap: Record<string, { name: string; imageUrl: string | null }> = {};
    for (const t of dbTournaments) {
      tournamentMap[t.id] = { name: t.name, imageUrl: t.imageUrl };
    }

    for (const t of defaultTournaments) {
      if (!tournamentMap[t.id]) {
        const created = await db.tournament.create({
          data: { id: t.id, name: t.name, imageUrl: null }
        });
        tournamentMap[t.id] = { name: created.name, imageUrl: null };
      }
    }

    return { success: true, tournaments: tournamentMap };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách giải đấu:", error);
    return { success: false, error: error.message };
  }
}


