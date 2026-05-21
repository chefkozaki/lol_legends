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

  // 5. Nhân bản lịch thi đấu (Match) mẫu
  const templateMatches = await db.match.findMany({
    where: { userId: null }
  });
  for (const m of templateMatches) {
    await db.match.create({
      data: {
        tournament: m.tournament,
        homeTeamId: teamIdMap[m.homeTeamId],
        awayTeamId: teamIdMap[m.awayTeamId],
        date: m.date,
        played: false,
        homeScore: 0,
        awayScore: 0,
        userId: userId
      }
    });
  }

  // 6. Tạo GameState
  const newGameState = await db.gameState.create({
    data: {
      currentDate: "2026-01-05",
      userTeamId: teamIdMap[templateTeamId],
      seasonState: "REGIONAL_SEASON",
      week: 1,
      dayOfSeason: 1,
      userId: userId
    }
  });

  return newGameState;
}

// 1. Action chọn đội bắt đầu game
export async function selectTeamAction(teamId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước khi chơi.");

    // Khởi tạo toàn bộ dữ liệu Save Game cho tài khoản này
    const gameState = await initializeUserSaveGame(currentUser.id, teamId);

    const team = await db.team.findUnique({
      where: { id: gameState.userTeamId || "" },
      include: { players: true }
    });

    if (!team) throw new Error("Không tìm thấy đội tuyển đã chọn.");

    // Gửi email chào mừng từ Ban Lãnh Đạo đội tuyển cho riêng người chơi này
    await db.mail.create({
      data: {
        title: `Chào mừng HLV mới của ${team.name}!`,
        content: `Kính gửi HLV,

Thay mặt Ban lãnh đạo và toàn thể người hâm mộ của ${team.name}, tôi xin nhiệt liệt chào mừng bạn đã chính thức đảm nhiệm chiếc ghế Huấn luyện viên trưởng của đội tuyển.

Chúng tôi đặt kỳ vọng rất lớn vào tài cầm quân của bạn. Mục tiêu trước mắt của chúng ta là thi đấu thật tốt tại giải đấu khu vực ${team.region} để giành vé tham dự các giải đấu quốc tế.

Ngân sách chuyển nhượng hiện tại của chúng ta là $${team.budget.toLocaleString()}. Quỹ lương tối đa hàng năm là $${team.salaryCap.toLocaleString()}. 

Đội hình hiện tại có 5 tuyển thủ xuất sắc:
${team.players.map(p => `- ${p.role}: ${p.name} (Tuổi: ${p.age}, Chỉ số tb: ${Math.round((p.laning + p.teamfight + p.macro + p.mentality + p.championPool)/5)})`).join("\n")}

Vào ngày Thứ Bảy tuần này (${gameState.currentDate}), chúng ta sẽ có trận đấu khai màn mùa giải. Hãy chuẩn bị chiến thuật thật kỹ lưỡng!

Chúc bạn gặt hái được nhiều vinh quang!

Trân trọng,
Chủ tịch CLB ${team.name}`,
        date: gameState.currentDate,
        sender: "Ban Lãnh Đạo CLB",
        category: "BOARD",
        read: false,
        userId: currentUser.id
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi chọn đội:", error);
    return { success: false, error: error.message };
  }
}

// Hàm trợ giúp lấy map tier tướng
async function getChampionTiersMap() {
  const dbTiers = await db.championTier.findMany();
  const tierMap: Record<string, string> = {};
  for (const t of dbTiers) {
    tierMap[t.id] = t.tier;
  }
  
  let needsInit = false;
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
        data: { id: champ.id, tier: defaultTier }
      });
      tierMap[champ.id] = defaultTier;
      needsInit = true;
    }
  }
  return tierMap;
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

    const currentDate = gameState.currentDate;
    
    // Kiểm tra xem hôm nay (ngày currentDate) có trận đấu chưa đá của người chơi không
    const userMatchToday = await db.match.findFirst({
      where: {
        date: currentDate,
        played: false,
        userId: currentUser.id,
        OR: [
          { homeTeamId: gameState.userTeamId },
          { awayTeamId: gameState.userTeamId }
        ]
      }
    });

    if (userMatchToday) {
      // Bắt buộc người chơi phải thi đấu trước khi qua ngày mới
      return { status: "MATCH_DAY", matchId: userMatchToday.id, date: currentDate };
    }

    // Tiến tới ngày tiếp theo
    const nextDate = addDays(currentDate, 1);

    // Kiểm tra xem ngày tiếp theo (nextDate) có phải ngày thi đấu của người chơi không
    const userMatchNext = await db.match.findFirst({
      where: {
        date: nextDate,
        played: false,
        userId: currentUser.id,
        OR: [
          { homeTeamId: gameState.userTeamId },
          { awayTeamId: gameState.userTeamId }
        ]
      }
    });

    // Giả lập tất cả các trận đấu của các đội khác diễn ra vào ngày nextDate (lọc theo userId)
    const otherMatches = await db.match.findMany({
      where: {
        date: nextDate,
        played: false,
        userId: currentUser.id,
        NOT: {
          OR: [
            { homeTeamId: gameState.userTeamId },
            { awayTeamId: gameState.userTeamId }
          ]
        }
      },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } }
      }
    });

    const championTiers = await getChampionTiersMap();

    for (const match of otherMatches) {
      // AI cấm chọn tự động
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

      // Cập nhật kết quả trận đấu
      await db.match.update({
        where: { id: match.id },
        data: {
          played: true,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          matchEvents: JSON.stringify(result)
        }
      });

      // Cập nhật điểm số BXH của 2 đội (theo userId)
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

    // Sinh email ngẫu nhiên vào ngày mới (25% xác suất)
    if (Math.random() < 0.25) {
      await generateRandomEmail(nextDate, gameState.userTeamId, currentUser.id);
    }

    // Cập nhật GameState sang ngày mới
    const nextDayOfSeason = gameState.dayOfSeason + 1;
    const nextWeek = Math.floor((nextDayOfSeason - 1) / 7) + 1;

    await db.gameState.update({
      where: { id: gameState.id },
      data: {
        currentDate: nextDate,
        dayOfSeason: nextDayOfSeason,
        week: nextWeek
      }
    });

    revalidatePath("/");

    // Nếu ngày tiếp theo có trận đấu của người chơi, thông báo cho frontend biết để hiển thị nút "Match Day"
    if (userMatchNext) {
      return { status: "MATCH_DAY", matchId: userMatchNext.id, date: nextDate };
    }

    return { status: "SUCCESS", date: nextDate };
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

    await db.mail.update({
      where: { id: mailId, userId: currentUser.id },
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


