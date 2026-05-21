import { CHAMPIONS, Champion } from "./champions";

export interface TeamDraft {
  bans: string[]; // 5 ids
  picks: Record<string, string>; // role -> champion id
}

export interface PlayerStats {
  id: string;
  name: string;
  role: string;
  kills: number;
  deaths: number;
  assists: number;
  championId: string;
  performanceScore: number; // 1-10 chấm điểm trận đấu
}

export interface MatchSimulationResult {
  winner: "HOME" | "AWAY";
  homeScore: number;
  awayScore: number;
  homeKills: number;
  awayKills: number;
  homeTowers: number;
  awayTowers: number;
  homeDragons: number;
  awayDragons: number;
  homeBarons: number;
  awayBarons: number;
  events: {
    time: number;
    text: string;
    type: "KILL" | "OBJECTIVE" | "TEAMFIGHT" | "SYSTEM" | "START" | "END";
    side?: "HOME" | "AWAY";
    kills?: number;
    towers?: number;
    dragons?: number;
    barons?: number;
  }[];
  goldDiffHistory: number[]; // homeGold - awayGold qua từng phút
  homePlayerStats: PlayerStats[];
  awayPlayerStats: PlayerStats[];
}

interface SimulatedPlayer {
  id: string;
  name: string;
  role: string;
  laning: number;
  teamfight: number;
  macro: number;
  mentality: number;
  championPool: number;
  champion: Champion;
  // Stats in game
  kills: number;
  deaths: number;
  assists: number;
  draftPower: number; // Sức mạnh tính toán sau cấm chọn
}

// Tính toán sức mạnh của từng tuyển thủ sau Draft
export function calculatePlayerDraftPower(
  player: { id: string; name: string; role: string; laning: number; teamfight: number; macro: number; mentality: number; championPool: number },
  champId: string,
  opponentChampId?: string,
  championTiers?: Record<string, string>
): number {
  const champion = CHAMPIONS.find(c => c.id === champId);
  if (!champion) return 50; // default safe power

  // Chỉ số trung bình của tuyển thủ
  let basePower = (player.laning * 0.25) + (player.teamfight * 0.25) + (player.macro * 0.2) + (player.mentality * 0.15) + (player.championPool * 0.15);

  // 1. Meta bonus: tướng mạnh/yếu theo meta (+/- 7.5%)
  let metaPower = champion.metaPower;
  if (championTiers && championTiers[champId]) {
    const tier = championTiers[champId];
    if (tier === "S") metaPower = 10;
    else if (tier === "A") metaPower = 8;
    else if (tier === "B") metaPower = 7;
    else if (tier === "C") metaPower = 6;
    else if (tier === "D") metaPower = 5;
    else if (tier === "F") metaPower = 3;
  }
  const metaBonus = (metaPower - 5) * 1.5; 

  // 2. Counter bonus: khắc chế đối phương (+6%)
  let counterBonus = 0;
  if (opponentChampId) {
    const oppChamp = CHAMPIONS.find(c => c.id === opponentChampId);
    if (oppChamp && champion.counters.includes(oppChamp.id)) {
      counterBonus = 6.0;
    }
  }

  // 3. Bể tướng bonus: tuyển thủ thuần thục tướng (+/- 2%)
  const poolBonus = (player.championPool - 75) * 0.1;

  // 4. Role mismatch penalty: phạt rất nặng nếu chọn lệch vai trò (-30%)
  const roleMismatchPenalty = champion.role !== player.role ? -30 : 0;

  const totalPower = basePower + metaBonus + counterBonus + poolBonus + roleMismatchPenalty;
  return Math.max(10, Math.min(120, totalPower)); // Giới hạn chỉ số trong khoảng [10, 120]
}

// Bình luận ngẫu nhiên cho các sự kiện hạ gục
const KILL_MESSAGES = [
  (k: string, d: string, r: string) => `[${r}] ${k} có pha solo kill chuẩn chỉ, tiễn ${d} lên bảng đếm số!`,
  (k: string, d: string, r: string) => `[${r}] Rừng gank thành công! ${k} phối hợp hạ gục ${d}.`,
  (k: string, d: string, r: string) => `[${r}] Sai lầm vị trí! ${k} chớp thời cơ dứt điểm ${d} nhanh chóng.`,
  (k: string, d: string, r: string) => `[${r}] Giao tranh nhỏ nổ ra ở lane! ${k} vượt trội hoàn toàn và hạ gục ${d}.`,
  (k: string, d: string, r: string) => `[${r}] ${k} băng trụ thần sầu, tiễn ${d} lên bảng đếm số và rút ra an toàn.`
];

// Mô phỏng một trận đấu LoL (1 ván đấu Bo1)
export function simulateLoLGame(
  homeTeamName: string,
  homePlayers: any[],
  homeDraft: TeamDraft,
  awayTeamName: string,
  awayPlayers: any[],
  awayDraft: TeamDraft,
  championTiers?: Record<string, string>
): MatchSimulationResult {
  // Chuẩn bị danh sách tuyển thủ với tướng tương ứng
  const homeSims: SimulatedPlayer[] = homePlayers.map(p => {
    const champId = homeDraft.picks[p.role] || CHAMPIONS.find(c => c.role === p.role)!.id;
    const oppChampId = awayDraft.picks[p.role];
    const draftPower = calculatePlayerDraftPower(p, champId, oppChampId, championTiers);
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      laning: p.laning,
      teamfight: p.teamfight,
      macro: p.macro,
      mentality: p.mentality,
      championPool: p.championPool,
      champion: CHAMPIONS.find(c => c.id === champId)!,
      kills: 0,
      deaths: 0,
      assists: 0,
      draftPower
    };
  });

  const awaySims: SimulatedPlayer[] = awayPlayers.map(p => {
    const champId = awayDraft.picks[p.role] || CHAMPIONS.find(c => c.role === p.role)!.id;
    const oppChampId = homeDraft.picks[p.role];
    const draftPower = calculatePlayerDraftPower(p, champId, oppChampId, championTiers);
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      laning: p.laning,
      teamfight: p.teamfight,
      macro: p.macro,
      mentality: p.mentality,
      championPool: p.championPool,
      champion: CHAMPIONS.find(c => c.id === champId)!,
      kills: 0,
      deaths: 0,
      assists: 0,
      draftPower
    };
  });

  const events: MatchSimulationResult["events"] = [];
  const goldDiffHistory: number[] = [0];

  let homeGold = 2500;
  let awayGold = 2500;
  let homeKills = 0;
  let awayKills = 0;
  let homeTowers = 0;
  let awayTowers = 0;
  let homeDragons = 0;
  let awayDragons = 0;
  let homeBarons = 0;
  let awayBarons = 0;

  events.push({ time: 0, text: `Trận đấu bắt đầu! ${homeTeamName} (Xanh) đối đầu với ${awayTeamName} (Đỏ).`, type: "START" });
  events.push({
    time: 0,
    text: `Đội hình cấm chọn: 
- ${homeTeamName}: TOP ${homeSims.find(s=>s.role==="TOP")!.champion.name}, JUG ${homeSims.find(s=>s.role==="JUG")!.champion.name}, MID ${homeSims.find(s=>s.role==="MID")!.champion.name}, BOT ${homeSims.find(s=>s.role==="BOT")!.champion.name}, SUP ${homeSims.find(s=>s.role==="SUP")!.champion.name}.
- ${awayTeamName}: TOP ${awaySims.find(s=>s.role==="TOP")!.champion.name}, JUG ${awaySims.find(s=>s.role==="JUG")!.champion.name}, MID ${awaySims.find(s=>s.role==="MID")!.champion.name}, BOT ${awaySims.find(s=>s.role==="BOT")!.champion.name}, SUP ${awaySims.find(s=>s.role==="SUP")!.champion.name}.`,
    type: "SYSTEM"
  });

  // Chạy mô phỏng từng phút
  let gameEnded = false;
  let time = 1;

  while (!gameEnded && time <= 40) {
    // 1. Tính toán sức mạnh hiện tại của mỗi đội ở phút này
    // Sức mạnh = Tổng chỉ số draft + vàng chênh lệch + mục tiêu
    const homeTeamBasePower = homeSims.reduce((acc, p) => acc + p.draftPower, 0);
    const awayTeamBasePower = awaySims.reduce((acc, p) => acc + p.draftPower, 0);

    const homePower = homeTeamBasePower + (homeGold * 0.05) + (homeDragons * 40) + (homeBarons * 80);
    const awayPower = awayTeamBasePower + (awayGold * 0.05) + (awayDragons * 40) + (awayBarons * 80);

    const winRatio = homePower / (homePower + awayPower); // Xác suất bên home thắng thế trong các sự kiện

    // 2. Sự kiện ngẫu nhiên theo phút
    const rand = Math.random();

    // Phút 1-15: Đi đường (Laning phase)
    if (time <= 15) {
      // 20% xảy ra solo kill/gank
      if (rand < 0.22) {
        // Chọn lane ngẫu nhiên
        const roles = ["TOP", "JUG", "MID", "BOT", "SUP"];
        const role = roles[Math.floor(Math.random() * roles.length)];
        const homeP = homeSims.find(s => s.role === role)!;
        const awayP = awaySims.find(s => s.role === role)!;

        // Tính tỉ lệ hạ gục dựa trên chỉ số laning và draftPower
        const laneRatio = (homeP.draftPower + homeP.laning) / (homeP.draftPower + homeP.laning + awayP.draftPower + awayP.laning);
        const killerIsHome = Math.random() < laneRatio;

        if (killerIsHome) {
          homeP.kills++;
          awayP.deaths++;
          homeKills++;
          homeGold += 350;
          awayGold += 100;
          // Tìm hỗ trợ ngẫu nhiên
          const helpers = homeSims.filter(s => s.role !== role && s.role !== "TOP");
          if (helpers.length > 0) {
            const helper = helpers[Math.floor(Math.random() * helpers.length)];
            helper.assists++;
          }
          const msgIdx = Math.floor(Math.random() * KILL_MESSAGES.length);
          events.push({
            time,
            text: KILL_MESSAGES[msgIdx](`${homeTeamName} ${homeP.name}`, `${awayTeamName} ${awayP.name}`, role),
            type: "KILL",
            side: "HOME",
            kills: 1
          });
        } else {
          awayP.kills++;
          homeP.deaths++;
          awayKills++;
          awayGold += 350;
          homeGold += 100;
          const helpers = awaySims.filter(s => s.role !== role && s.role !== "TOP");
          if (helpers.length > 0) {
            const helper = helpers[Math.floor(Math.random() * helpers.length)];
            helper.assists++;
          }
          const msgIdx = Math.floor(Math.random() * KILL_MESSAGES.length);
          events.push({
            time,
            text: KILL_MESSAGES[msgIdx](`${awayTeamName} ${awayP.name}`, `${homeTeamName} ${homeP.name}`, role),
            type: "KILL",
            side: "AWAY",
            kills: 1
          });
        }
      }

      // Phút 8: Sứ Giả Khe Nứt
      if (time === 8) {
        const isHome = Math.random() < winRatio;
        if (isHome) {
          homeGold += 400;
          homeTowers++; // Giả định dùng sứ giả đẩy được 1 trụ
          events.push({
            time,
            text: `${homeTeamName} ăn thành công Sứ Giả Khe Nứt và thả ra Đường Giữa, lấy đi trụ đầu tiên!`,
            type: "OBJECTIVE",
            side: "HOME",
            towers: 1
          });
        } else {
          awayGold += 400;
          awayTowers++;
          events.push({
            time,
            text: `${awayTeamName} hạ gục Sứ Giả Khe Nứt, tiến hành đẩy nát trụ 1 Đường Giữa của đối phương!`,
            type: "OBJECTIVE",
            side: "AWAY",
            towers: 1
          });
        }
      }
    }

    // Phút 15-30: Mid Game (Kiểm soát mục tiêu & đẩy trụ)
    if (time > 15 && time < 30) {
      // 15% xảy ra hạ gục đơn lẻ
      if (rand < 0.15) {
        const role = ["TOP", "MID", "BOT"][Math.floor(Math.random() * 3)];
        const homeP = homeSims.find(s => s.role === role)!;
        const awayP = awaySims.find(s => s.role === role)!;
        const killerIsHome = Math.random() < winRatio;

        if (killerIsHome) {
          homeP.kills++;
          awayP.deaths++;
          homeKills++;
          homeGold += 300;
          events.push({
            time,
            text: `[Bắt lẻ] ${homeTeamName} ${homeP.name} bắt bài hướng di chuyển của ${awayTeamName} ${awayP.name} và hạ gục thành công!`,
            type: "KILL",
            side: "HOME",
            kills: 1
          });
        } else {
          awayP.kills++;
          homeP.deaths++;
          awayKills++;
          awayGold += 300;
          events.push({
            time,
            text: `[Bắt lẻ] ${awayTeamName} ${awayP.name} tổ chức phục kích hạ gục ${homeTeamName} ${homeP.name} trong rừng!`,
            type: "KILL",
            side: "AWAY",
            kills: 1
          });
        }
      }

      // Phá trụ (Tầm phút 16, 21, 26)
      if (time % 5 === 0 && Math.random() < 0.6) {
        const isHome = Math.random() < winRatio;
        if (isHome && homeTowers < 9) {
          homeTowers++;
          homeGold += 500;
          events.push({
            time,
            text: `${homeTeamName} tổ chức đẩy đường và phá hủy thành công thêm 1 Trụ của đối phương.`,
            type: "OBJECTIVE",
            side: "HOME",
            towers: 1
          });
        } else if (!isHome && awayTowers < 9) {
          awayTowers++;
          awayGold += 500;
          events.push({
            time,
            text: `${awayTeamName} tận dụng tốt ưu thế lính để bào đi thêm 1 Trụ của ${homeTeamName}.`,
            type: "OBJECTIVE",
            side: "AWAY",
            towers: 1
          });
        }
      }

      // Baron Nashor (Xuất hiện phút 20, cứ mỗi 6 phút mô phỏng cướp Baron)
      if (time >= 20 && time % 6 === 0 && Math.random() < 0.45) {
        const isHome = Math.random() < winRatio;
        if (isHome) {
          homeBarons++;
          homeGold += 1500;
          events.push({
            time,
            text: `${homeTeamName} khởi động Baron thành công! Họ lấy được bùa lợi Baron danh giá!`,
            type: "OBJECTIVE",
            side: "HOME",
            barons: 1
          });
        } else {
          awayBarons++;
          awayGold += 1500;
          events.push({
            time,
            text: `${awayTeamName} nhanh tay ăn được bùa lợi Baron sau pha tranh chấp cân não!`,
            type: "OBJECTIVE",
            side: "AWAY",
            barons: 1
          });
        }
      }
    }

    // Sự kiện Rồng (Cứ mỗi 6 phút bắt đầu từ phút 6)
    if (time % 6 === 0 && time < 35 && rand > 0.3) {
      const isHome = Math.random() < winRatio;
      if (isHome) {
        homeDragons++;
        homeGold += 200;
        events.push({
          time,
          text: `${homeTeamName} hạ gục Rồng Nguyên Tố thành công (Tích lũy: ${homeDragons} Rồng).`,
          type: "OBJECTIVE",
          side: "HOME",
          dragons: 1
        });
      } else {
        awayDragons++;
        awayGold += 200;
        events.push({
          time,
          text: `${awayTeamName} kiểm soát hang rồng tốt và ăn thành công Rồng (Tích lũy: ${awayDragons} Rồng).`,
          type: "OBJECTIVE",
          side: "AWAY",
          dragons: 1
        });
      }
    }

    // Phút 25+: Giao tranh tổng quyết định (Teamfights)
    if (time >= 25) {
      if (rand < 0.25) {
        // Combat lớn nổ ra
        const homeTFStrength = homeSims.reduce((acc, p) => acc + p.teamfight + p.draftPower, 0) + (homeGold * 0.05);
        const awayTFStrength = awaySims.reduce((acc, p) => acc + p.teamfight + p.draftPower, 0) + (awayGold * 0.05);
        const tfWinRatio = homeTFStrength / (homeTFStrength + awayTFStrength);
        const homeWinsTF = Math.random() < tfWinRatio;

        if (homeWinsTF) {
          // Home quét sạch
          homeGold += 1200;
          homeKills += 4;
          awayKills += 1;
          // Cộng KDA ngẫu nhiên
          homeSims[0].kills += 1; homeSims[3].kills += 2; homeSims[2].kills += 1;
          awaySims[1].deaths += 1; awaySims[2].deaths += 1; awaySims[3].deaths += 1; awaySims[4].deaths += 1;
          
          events.push({
            time,
            text: `[GIAO TRANH TỔNG] Combat lớn nổ ra ở Đường Giữa! ${homeTeamName} có pha phối hợp xuất sắc quét sạch 4 thành viên của ${awayTeamName}!`,
            type: "TEAMFIGHT",
            side: "HOME",
            kills: 4
          });

          // Phá hủy trụ sau giao tranh
          const towersDestroyed = Math.min(Math.floor(Math.random() * 2) + 1, 11 - homeTowers);
          if (towersDestroyed > 0) {
            homeTowers += towersDestroyed;
            homeGold += towersDestroyed * 500;
            events.push({
              time,
              text: `${homeTeamName} tận dụng ưu thế quét sạch đối phương, phá hủy thành công thêm ${towersDestroyed} Trụ.`,
              type: "OBJECTIVE",
              side: "HOME",
              towers: towersDestroyed
            });
          }
          
          // Điều kiện kết thúc game
          if (homeTowers >= 5 && (homeTowers >= 9 || homeGold - awayGold > 8000 || Math.random() < 0.4)) {
            const remainingTowers = 11 - homeTowers;
            if (remainingTowers > 0) {
              events.push({
                time: time + 1,
                text: `${homeTeamName} tràn thẳng vào Đường Giữa, phá hủy nốt ${remainingTowers} Trụ bảo vệ nhà chính!`,
                type: "OBJECTIVE",
                side: "HOME",
                towers: remainingTowers
              });
              homeTowers = 11;
            }
            events.push({
              time: time + 1,
              text: `NHÀ CHÍNH CỦA ${awayTeamName} ĐÃ VỠ! CHIẾN THẮNG DÀNH CHO ${homeTeamName}!`,
              type: "END",
              side: "HOME"
            });
            gameEnded = true;
          }
        } else {
          // Away quét sạch
          awayGold += 1200;
          awayKills += 4;
          homeKills += 1;
          awaySims[0].kills += 1; awaySims[3].kills += 2; awaySims[2].kills += 1;
          homeSims[1].deaths += 1; homeSims[2].deaths += 1; homeSims[3].deaths += 1; homeSims[4].deaths += 1;
          
          events.push({
            time,
            text: `[GIAO TRANH TỔNG] ${awayTeamName} phản công cực mạnh! Cú wombo-combo chuẩn xác khiến ${homeTeamName} vỡ trận hoàn toàn!`,
            type: "TEAMFIGHT",
            side: "AWAY",
            kills: 4
          });

          // Phá hủy trụ sau giao tranh
          const towersDestroyed = Math.min(Math.floor(Math.random() * 2) + 1, 11 - awayTowers);
          if (towersDestroyed > 0) {
            awayTowers += towersDestroyed;
            awayGold += towersDestroyed * 500;
            events.push({
              time,
              text: `${awayTeamName} tận dụng ưu thế quét sạch đối phương, phá hủy thành công thêm ${towersDestroyed} Trụ.`,
              type: "OBJECTIVE",
              side: "AWAY",
              towers: towersDestroyed
            });
          }
          
          if (awayTowers >= 5 && (awayTowers >= 9 || awayGold - homeGold > 8000 || Math.random() < 0.4)) {
            const remainingTowers = 11 - awayTowers;
            if (remainingTowers > 0) {
              events.push({
                time: time + 1,
                text: `${awayTeamName} phản công chớp nhoáng đẩy thẳng vào đường giữa, phá hủy nốt ${remainingTowers} Trụ bảo vệ nhà chính!`,
                type: "OBJECTIVE",
                side: "AWAY",
                towers: remainingTowers
              });
              awayTowers = 11;
            }
            events.push({
              time: time + 1,
              text: `NHÀ CHÍNH CỦA ${homeTeamName} BỊ PHÁ HỦY! ${awayTeamName} CHIẾN THẮNG!`,
              type: "END",
              side: "AWAY"
            });
            gameEnded = true;
          }
        }
      }
    }

    // Tích lũy vàng thụ động theo thời gian
    homeGold += 1000;
    awayGold += 1000;
    goldDiffHistory.push(homeGold - awayGold);

    time++;
  }

  // Nếu hết 40 phút mà game chưa kết thúc thì quyết định bằng chênh lệch vàng cuối cùng
  if (!gameEnded) {
    const finalDiff = homeGold - awayGold;
    if (finalDiff > 0) {
      const remainingTowers = 11 - homeTowers;
      if (remainingTowers > 0) {
        events.push({
          time: 40,
          text: `${homeTeamName} với lượng tiền chênh lệch tốt hơn (+${finalDiff} Gold) đã tổ chức đẩy thẳng, phá hủy nốt ${remainingTowers} Trụ cuối cùng!`,
          type: "OBJECTIVE",
          side: "HOME",
          towers: remainingTowers
        });
      }
      events.push({
        time: 40,
        text: `Thế trận giằng co kéo dài. CHIẾN THẮNG DÀNH CHO ${homeTeamName}!`,
        type: "END",
        side: "HOME"
      });
      homeTowers = 11;
    } else {
      const remainingTowers = 11 - awayTowers;
      if (remainingTowers > 0) {
        events.push({
          time: 40,
          text: `${awayTeamName} đẩy lính tốt hơn ở late game (+${Math.abs(finalDiff)} Gold) đã tổ chức đẩy thẳng, phá hủy nốt ${remainingTowers} Trụ cuối cùng!`,
          type: "OBJECTIVE",
          side: "AWAY",
          towers: remainingTowers
        });
      }
      events.push({
        time: 40,
        text: `Trận đấu quá căng thẳng. CHIẾN THẮNG DÀNH CHO ${awayTeamName}!`,
        type: "END",
        side: "AWAY"
      });
      awayTowers = 11;
    }
  }

  const finalWinner = homeTowers >= 11 ? "HOME" : "AWAY";

  // Tạo Performance Score & KDA cho các tuyển thủ
  const homePlayerStats: PlayerStats[] = homeSims.map(s => {
    let performanceScore = 6.0 + (s.kills * 0.8) + (s.assists * 0.4) - (s.deaths * 0.6);
    if (finalWinner === "HOME") performanceScore += 1.0;
    else performanceScore -= 1.0;
    performanceScore = Math.max(2.0, Math.min(10.0, performanceScore));
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      championId: s.champion.id,
      performanceScore: parseFloat(performanceScore.toFixed(1))
    };
  });

  const awayPlayerStats: PlayerStats[] = awaySims.map(s => {
    let performanceScore = 6.0 + (s.kills * 0.8) + (s.assists * 0.4) - (s.deaths * 0.6);
    if (finalWinner === "AWAY") performanceScore += 1.0;
    else performanceScore -= 1.0;
    performanceScore = Math.max(2.0, Math.min(10.0, performanceScore));
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      championId: s.champion.id,
      performanceScore: parseFloat(performanceScore.toFixed(1))
    };
  });

  return {
    winner: finalWinner,
    homeScore: homeKills,
    awayScore: awayKills,
    homeKills,
    awayKills,
    homeTowers: Math.min(11, homeTowers),
    awayTowers: Math.min(11, awayTowers),
    homeDragons,
    awayDragons,
    homeBarons,
    awayBarons,
    events,
    goldDiffHistory,
    homePlayerStats,
    awayPlayerStats
  };
}
