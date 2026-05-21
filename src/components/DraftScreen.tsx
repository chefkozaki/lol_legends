"use client";

import React, { useState, useEffect } from "react";
import { CHAMPIONS, Champion } from "@/lib/game/champions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Info, 
  HelpCircle, 
  XCircle, 
  Play, 
  Shield, 
  Sword, 
  Skull, 
  Flame, 
  Target, 
  Wand2, 
  Sparkles, 
  Heart, 
  Search,
  AlertTriangle 
} from "lucide-react";
import { TeamLogo } from "@/components/ui/game-logo";

export interface DraftPlayer {
  id: string;
  name: string;
  role: string;
  realName?: string | null;
  avatarUrl?: string | null;
}

interface DraftScreenProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  isUserHome: boolean;
  userTeamName: string;
  opponentTeamName: string;
  opponentPlayers: DraftPlayer[];
  userPlayers: DraftPlayer[];
  onDraftComplete: (
    draft: { bans: string[]; picks: Record<string, string> },
    opponentDraft: { bans: string[]; picks: Record<string, string> }
  ) => void;
  isPending: boolean;
  championTiers: Record<string, string>;
  championImages?: Record<string, string>;
  currentDate?: string;
  currentWeek?: number;
  homeWins?: number;
  homeLosses?: number;
  awayWins?: number;
  awayLosses?: number;
}

type DraftStep = {
  type: "BAN" | "PICK";
  side: "BLUE" | "RED";
  index: number; // 0-based index of ban or pick for that side
};

const DRAFT_STEPS: DraftStep[] = [
  // Phase 1 Bans (3 each)
  { type: "BAN", side: "BLUE", index: 0 },
  { type: "BAN", side: "RED", index: 0 },
  { type: "BAN", side: "BLUE", index: 1 },
  { type: "BAN", side: "RED", index: 1 },
  { type: "BAN", side: "BLUE", index: 2 },
  { type: "BAN", side: "RED", index: 2 },

  // Phase 1 Picks (3 each)
  { type: "PICK", side: "BLUE", index: 0 },
  { type: "PICK", side: "RED", index: 0 },
  { type: "PICK", side: "RED", index: 1 },
  { type: "PICK", side: "BLUE", index: 1 },
  { type: "PICK", side: "BLUE", index: 2 },
  { type: "PICK", side: "RED", index: 2 },

  // Phase 2 Bans (2 each)
  { type: "BAN", side: "BLUE", index: 3 },
  { type: "BAN", side: "RED", index: 3 },
  { type: "BAN", side: "BLUE", index: 4 },
  { type: "BAN", side: "RED", index: 4 },

  // Phase 2 Picks (2 each)
  { type: "PICK", side: "BLUE", index: 3 },
  { type: "PICK", side: "RED", index: 3 },
  { type: "PICK", side: "RED", index: 4 },
  { type: "PICK", side: "BLUE", index: 4 },
];

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// DDragon Names Mapping
const DDRAGON_NAMES: Record<string, string> = {
  aatrox: "Aatrox",
  ornn: "Ornn",
  ksante: "KSante",
  renekton: "Renekton",
  jax: "Jax",
  fiora: "Fiora",
  jayce: "Jayce",
  leesin: "LeeSin",
  viego: "Viego",
  maokai: "Maokai",
  sejuani: "Sejuani",
  graves: "Graves",
  nidalee: "Nidalee",
  xinzhao: "XinZhao",
  azir: "Azir",
  orianna: "Orianna",
  ahri: "Ahri",
  yone: "Yone",
  syndra: "Syndra",
  taliyah: "Taliyah",
  sylas: "Sylas",
  zeri: "Zeri",
  jinx: "Jinx",
  aphelios: "Aphelios",
  kaisa: "KaiSa",
  lucian: "Lucian",
  ezreal: "Ezreal",
  kalista: "Kalista",
  thresh: "Thresh",
  nautilus: "Nautilus",
  rakan: "Rakan",
  lulu: "Lulu",
  milio: "Milio",
  leona: "Leona",
  senna: "Senna",
};

function getDDragonName(champId: string): string {
  return DDRAGON_NAMES[champId] || (champId.charAt(0).toUpperCase() + champId.slice(1));
}

function getChampionSplashUrl(champId: string): string {
  const dDragonName = getDDragonName(champId);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${dDragonName}_0.jpg`;
}

function getChampionIconUrl(champId: string): string {
  const dDragonName = getDDragonName(champId);
  return `https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/${dDragonName}.png`;
}

export default function DraftScreen({
  matchId,
  homeTeamName,
  awayTeamName,
  isUserHome,
  userTeamName,
  opponentTeamName,
  opponentPlayers,
  userPlayers,
  onDraftComplete,
  isPending,
  championTiers,
  championImages,
  currentDate = "2026-01-05",
  currentWeek = 1,
  homeWins = 0,
  homeLosses = 0,
  awayWins = 0,
  awayLosses = 0,
}: DraftScreenProps) {
  // Trạng thái cấm/chọn riêng cho từng bên
  const [blueBans, setBlueBans] = useState<string[]>([]);
  const [redBans, setRedBans] = useState<string[]>([]);
  const [bluePicks, setBluePicks] = useState<Record<string, string>>({
    TOP: "", JUG: "", MID: "", BOT: "", SUP: ""
  });
  const [redPicks, setRedPicks] = useState<Record<string, string>>({
    TOP: "", JUG: "", MID: "", BOT: "", SUP: ""
  });

  // Tiến trình hiện tại (0 -> 19)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  
  // Thứ tự chọn vị trí của AI đối phương (được xáo ngẫu nhiên để tăng tính thực tế)
  const [opponentRoleOrder] = useState<string[]>(() => {
    return shuffleArray(["TOP", "JUG", "MID", "BOT", "SUP"]);
  });

  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Search và Filter ở danh sách tướng
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Đọc thông tin bước hiện tại
  const currentStep = currentStepIndex < DRAFT_STEPS.length ? DRAFT_STEPS[currentStepIndex] : null;
  const isUserTurn = currentStep ? currentStep.side === (isUserHome ? "BLUE" : "RED") : false;

  // Lấy dữ liệu thuộc về người chơi (Ta) và đối thủ (Địch)
  const userBans = isUserHome ? blueBans : redBans;
  const oppBans = isUserHome ? redBans : blueBans;
  const userPicks = isUserHome ? bluePicks : redPicks;
  const oppPicks = isUserHome ? redPicks : bluePicks;

  // Sắp xếp các danh sách tuyển thủ
  const bluePlayers = isUserHome ? userPlayers : opponentPlayers;
  const redPlayers = isUserHome ? opponentPlayers : userPlayers;

  // Tự động tìm vai trò trống đầu tiên cho người chơi khi đến lượt pick
  const autoSelectActiveRole = (currentPicks: Record<string, string>) => {
    const roles = ["TOP", "JUG", "MID", "BOT", "SUP"];
    for (const r of roles) {
      if (!currentPicks[r]) {
        setActiveRole(r);
        setSelectedRoleFilter(r); // Tự động nhảy filter tướng theo vai trò đang chọn
        return r;
      }
    }
    return null;
  };


  // Thực hiện lượt cấm/chọn tự động của AI
  const executeAITurn = (step: DraftStep) => {
    const bPicks = Object.values(bluePicks);
    const rPicks = Object.values(redPicks);
    
    // Tìm các tướng chưa bị cấm hoặc chọn bởi cả 2 bên
    const available = CHAMPIONS.filter(
      c => !blueBans.includes(c.id) &&
           !redBans.includes(c.id) &&
           !bPicks.includes(c.id) &&
           !rPicks.includes(c.id)
    );

    if (available.length === 0) return;

    // Phân tích sức mạnh tướng dựa trên bảng xếp hạng (championTiers)
    const getPower = (cid: string) => {
      const t = championTiers[cid] || "B";
      if (t === "S") return 10;
      if (t === "A") return 8;
      if (t === "B") return 7;
      if (t === "C") return 6;
      if (t === "D") return 5;
      return 3;
    };

    if (step.type === "BAN") {
      // AI cấm: Lọc tướng theo sức mạnh và chọn ngẫu nhiên trong top 5 tướng mạnh nhất
      const sorted = [...available].sort((a, b) => getPower(b.id) - getPower(a.id));
      const topCount = Math.min(5, sorted.length);
      const chosen = sorted[Math.floor(Math.random() * topCount)];

      if (step.side === "BLUE") {
        setBlueBans(prev => [...prev, chosen.id]);
      } else {
        setRedBans(prev => [...prev, chosen.id]);
      }
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // AI chọn: Tìm tướng thích hợp cho vai trò (role) được chỉ định trong opponentRoleOrder
      const role = opponentRoleOrder[step.index];
      let roleChamps = available.filter(c => c.role === role);
      if (roleChamps.length === 0) {
        roleChamps = available; // Dự phòng nếu hết tướng hợp vị trí
      }

      roleChamps.sort((a, b) => getPower(b.id) - getPower(a.id));
      const topCount = Math.min(3, roleChamps.length);
      const chosen = roleChamps[Math.floor(Math.random() * topCount)];

      if (step.side === "BLUE") {
        setBluePicks(prev => ({ ...prev, [role]: chosen.id }));
      } else {
        setRedPicks(prev => ({ ...prev, [role]: chosen.id }));
      }
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Quản lý luồng thời gian thực cho lượt của AI và Người chơi
  useEffect(() => {
    if (currentStepIndex >= DRAFT_STEPS.length) return;

    const step = DRAFT_STEPS[currentStepIndex];
    const isUserSide = step.side === (isUserHome ? "BLUE" : "RED");

    if (!isUserSide) {
      const thinkingTimer = setTimeout(() => {
        setIsAiThinking(true);
      }, 0);
      const timer = setTimeout(() => {
        executeAITurn(step);
        setIsAiThinking(false);
      }, 1200); // 1.2 giây trì hoãn tự nhiên
      return () => {
        clearTimeout(thinkingTimer);
        clearTimeout(timer);
      };
    } else {
      // Đến lượt người chơi: Tự động trỏ vào vai trò trống đầu tiên nếu chưa chọn
      if (step.type === "PICK") {
        const uPicks = isUserHome ? bluePicks : redPicks;
        if (!activeRole || uPicks[activeRole]) {
          setTimeout(() => {
            autoSelectActiveRole(uPicks);
          }, 0);
        }
      } else {
        // Giai đoạn ban: không cần khóa role
        setTimeout(() => {
          setActiveRole(null);
          setSelectedRoleFilter("ALL");
        }, 0);
      }
    }
  }, [currentStepIndex, isUserHome, bluePicks, redPicks, activeRole]);

  // Người chơi bấm cấm tướng
  const handleSelectChampForBan = (champId: string) => {
    const step = DRAFT_STEPS[currentStepIndex];
    if (!step || step.type !== "BAN") return;
    const isUserSide = step.side === (isUserHome ? "BLUE" : "RED");
    if (!isUserSide) return;

    if (isUserHome) {
      setBlueBans(prev => [...prev, champId]);
    } else {
      setRedBans(prev => [...prev, champId]);
    }
    setSearchQuery("");
    setCurrentStepIndex(prev => prev + 1);
  };

  // Người chơi bấm chọn tướng cho vai trò
  const handleSelectChampForPick = (role: string, champId: string) => {
    const step = DRAFT_STEPS[currentStepIndex];
    if (!step || step.type !== "PICK") return;
    const isUserSide = step.side === (isUserHome ? "BLUE" : "RED");
    if (!isUserSide) return;

    if (isUserHome) {
      setBluePicks(prev => ({ ...prev, [role]: champId }));
    } else {
      setRedPicks(prev => ({ ...prev, [role]: champId }));
    }
    setSearchQuery("");
    setActiveRole(null); // Reset vai trò để useEffect chọn cái tiếp theo
    setCurrentStepIndex(prev => prev + 1);
  };

  // Click chọn tướng ở bảng danh sách
  const handleChampClick = (champ: Champion) => {
    if (isAiThinking || !currentStep || !isUserTurn) return;

    const isBanned = blueBans.includes(champ.id) || redBans.includes(champ.id);
    const isPicked = Object.values(bluePicks).includes(champ.id) || Object.values(redPicks).includes(champ.id);
    if (isBanned || isPicked) return;

    if (currentStep.type === "BAN") {
      handleSelectChampForBan(champ.id);
    } else {
      const uPicks = isUserHome ? bluePicks : redPicks;
      let targetRole = activeRole;
      
      // Nếu chưa kích hoạt vai trò hoặc vai trò đã có tướng, tự tìm vị trí trống
      if (!targetRole || uPicks[targetRole]) {
        targetRole = autoSelectActiveRole(uPicks);
      }
      
      if (targetRole) {
        handleSelectChampForPick(targetRole, champ.id);
      }
    }
  };

  // Kiểm tra cấm chọn hoàn thành (đã cấm đủ 5 tướng mỗi bên và chọn đủ 5 vị trí mỗi bên)
  const isValid = currentStepIndex >= DRAFT_STEPS.length &&
                  blueBans.length === 5 &&
                  redBans.length === 5 &&
                  Object.values(bluePicks).every(p => p !== "") &&
                  Object.values(redPicks).every(p => p !== "");

  const handleSubmit = () => {
    if (!isValid) return;
    if (isUserHome) {
      onDraftComplete(
        { bans: blueBans, picks: bluePicks },
        { bans: redBans, picks: redPicks }
      );
    } else {
      onDraftComplete(
        { bans: redBans, picks: redPicks },
        { bans: blueBans, picks: bluePicks }
      );
    }
  };

  // Tạo thông báo trạng thái dạng LCK Broadcast Banner
  const getBannerMessage = () => {
    if (!currentStep) {
      return "DRAFT COMPLETED";
    }

    const sideName = currentStep.side === "BLUE" ? "BLUE TEAM" : "RED TEAM";
    const typeName = currentStep.type === "BAN" ? "BANNING" : "PICKING";
    return `${sideName} ${typeName}`;
  };

  const getSubBannerMessage = () => {
    if (!currentStep) {
      return "Click confirmation button below to start match simulation";
    }
    const typeName = currentStep.type === "BAN" ? "CẤM TƯỚNG" : "CHỌN TƯỚNG";
    const phaseText = currentStep.type === "BAN" 
      ? `Lượt cấm thứ ${currentStep.index + 1}/5` 
      : `Lượt chọn thứ ${currentStep.index + 1}/5`;

    if (isAiThinking) {
      return `Máy đang phân tích lượt ${currentStep.type === "BAN" ? "cấm" : "chọn"}...`;
    }
    if (isUserTurn) {
      return `LƯỢT CỦA BẠN: Thực hiện ${typeName} (${phaseText})`;
    }
    return `Lượt của đối thủ: Chờ ${currentStep.side === "BLUE" ? "Bên Xanh" : "Bên Đỏ"} thực hiện...`;
  };

  // Lọc danh sách tướng hiển thị ở Grid
  const filteredChampions = CHAMPIONS.filter(champ => {
    const matchesSearch = champ.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === "ALL" || champ.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Helper hiển thị icon vai trò
  const renderRoleIcon = (role: string, className = "w-4 h-4") => {
    switch (role.toUpperCase()) {
      case "TOP": return <Sword className={className} />;
      case "JUG": return <Sparkles className={className} />;
      case "MID": return <Flame className={className} />;
      case "BOT": return <Target className={className} />;
      case "SUP": return <Heart className={className} />;
      default: return <HelpCircle className={className} />;
    }
  };

  // Xác định player theo role
  const getPlayerNameByRole = (players: DraftPlayer[], role: string) => {
    const p = players.find(x => x.role === role);
    return p ? p.name : role;
  };

  // Xác định vị trí active pick hiện tại của mỗi bên
  const activeBlueRole = (currentStep && currentStep.side === "BLUE" && currentStep.type === "PICK")
    ? (isUserHome ? activeRole : opponentRoleOrder[currentStep.index])
    : null;

  const activeRedRole = (currentStep && currentStep.side === "RED" && currentStep.type === "PICK")
    ? (!isUserHome ? activeRole : opponentRoleOrder[currentStep.index])
    : null;

  return (
    <div className="w-full min-h-screen bg-zinc-950 flex flex-col justify-between select-none font-sans overflow-hidden text-zinc-100">
      
      {/* 1. TOP BROADCAST STAGE OVERLAY */}
      <div 
        className="relative flex-grow flex flex-col justify-between p-6 bg-cover bg-center overflow-hidden min-h-[460px]"
        style={{ backgroundImage: "url('/esports_stage.png')" }}
      >
        {/* Darkened stadium background overlays */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />
        
        {/* Top-level grid for broadcast content */}
        <div className="w-full flex flex-col justify-between h-full z-10 gap-4 flex-grow">
          
          {/* Header Row: Live Turn Banner */}
          <div className="flex flex-col items-center justify-center text-center mt-2 animate-fade-in">
            <h2 className={`text-4xl font-black tracking-widest ${
              !currentStep ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' :
              currentStep.side === 'BLUE' ? 'text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)] animate-pulse' :
              'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)] animate-pulse'
            }`}>
              {getBannerMessage()}
            </h2>
            <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase mt-1">
              {getSubBannerMessage()}
            </p>
          </div>

          {/* Middle Row: Floating Bans + Center Selector */}
          <div className="flex flex-row items-center justify-between w-full gap-4 my-auto">
            
            {/* Left Box: Blue Bans */}
            <div className="flex flex-col items-start bg-black/40 border border-blue-900/20 rounded-lg p-3 backdrop-blur-sm w-[260px] shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TeamLogo teamName={homeTeamName} size={32} />
                <div>
                  <h4 className="text-xs font-black text-blue-400 tracking-wider">BLUE BANS</h4>
                  <p className="text-[10px] text-zinc-500 font-medium font-mono">OKSavingsBank BRION</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(idx => {
                  const champId = blueBans[idx];
                  const champ = CHAMPIONS.find(c => c.id === champId);
                  
                  return (
                    <div
                      key={idx}
                      className="w-10 h-10 bg-zinc-950/80 border border-zinc-800 rounded relative overflow-hidden flex items-center justify-center"
                      title={champ ? `Banned: ${champ.name}` : "Empty Ban Slot"}
                    >
                      {champ ? (
                        <>
                          <img src={getChampionIconUrl(champ.id)} alt={champ.name} className="w-full h-full object-cover grayscale opacity-60" />
                          <div className="absolute inset-0 bg-red-950/20" />
                          {/* Red ban slash */}
                          <div className="absolute w-[140%] h-[2px] bg-red-600 rotate-45 transform origin-center" />
                        </>
                      ) : (
                        <div className="w-full h-full border-[1px] border-dashed border-zinc-800 flex items-center justify-center">
                          <span className="text-[10px] text-zinc-700">/</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center Box: Glassmorphic Selector (Only shows when drafting) */}
            <div className="flex-grow max-w-xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-2xl flex flex-col self-center min-h-[300px]">
              {currentStepIndex < DRAFT_STEPS.length ? (
                <>
                  {/* Selector Header */}
                  <div className="flex items-center justify-between gap-3 mb-3 border-b border-zinc-800 pb-2.5">
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                      {currentStep?.type === "BAN" ? (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>Chọn tướng muốn CẤM</span>
                        </>
                      ) : (
                        <>
                          {renderRoleIcon(activeRole || "ALL", "w-4 h-4 text-emerald-400")}
                          <span>Chọn tướng cho vai trò: <strong className="text-emerald-400 font-black">{activeRole}</strong></span>
                        </>
                      )}
                    </span>
                    
                    {/* Search Bar */}
                    <div className="relative w-44">
                      <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Tìm tướng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-8 py-1.5 rounded text-zinc-200 outline-none focus:border-zinc-700 transition"
                      />
                    </div>
                  </div>

                  {/* Role Tabs */}
                  <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                    {["ALL", "TOP", "JUG", "MID", "BOT", "SUP"].map(role => (
                      <button
                        key={role}
                        onClick={() => setSelectedRoleFilter(role)}
                        className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 border transition-all ${
                          selectedRoleFilter === role
                            ? "bg-emerald-950 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/30"
                            : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900"
                        }`}
                      >
                        {role !== "ALL" && renderRoleIcon(role, "w-3 h-3")}
                        <span>{role}</span>
                      </button>
                    ))}
                  </div>

                  {/* Champion Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[175px] overflow-y-auto pr-1">
                    {filteredChampions.map(champ => {
                      const isBlueBanned = blueBans.includes(champ.id);
                      const isRedBanned = redBans.includes(champ.id);
                      const isBanned = isBlueBanned || isRedBanned;

                      const isBluePicked = Object.values(bluePicks).includes(champ.id);
                      const isRedPicked = Object.values(redPicks).includes(champ.id);
                      const isPicked = isBluePicked || isRedPicked;

                      const champTier = championTiers[champ.id] || "B";
                      
                      return (
                        <div
                          key={champ.id}
                          className={`relative rounded p-1.5 border flex flex-col items-center justify-between cursor-pointer transition h-[84px] text-center select-none ${
                            isBanned
                              ? "border-red-950/40 bg-red-950/5 opacity-30 cursor-not-allowed"
                              : isPicked
                              ? "border-zinc-850 bg-zinc-950 opacity-40 cursor-not-allowed"
                              : (currentStep?.type === "PICK" && activeRole && champ.role === activeRole)
                              ? "border-emerald-600 bg-emerald-950/20 hover:border-emerald-400"
                              : "border-zinc-850 bg-zinc-900/30 hover:border-zinc-700"
                          }`}
                          onClick={() => handleChampClick(champ)}
                        >
                          {/* Top Tag & Tier */}
                          <div className="flex justify-between items-center w-full px-0.5 text-[8px] font-bold text-zinc-500">
                            <span>{champ.role}</span>
                            <span className={
                              champTier === "S" ? "text-rose-400" :
                              champTier === "A" ? "text-amber-400" :
                              champTier === "B" ? "text-blue-400" : "text-zinc-500"
                            }>{champTier}</span>
                          </div>

                          {/* Image */}
                          <div className="w-9 h-9 rounded overflow-hidden border border-zinc-850 my-1">
                            <img src={getChampionIconUrl(champ.id)} alt={champ.name} className="w-full h-full object-cover" />
                          </div>

                          {/* Name */}
                          <div className="text-[9px] font-bold text-zinc-300 truncate w-full">{champ.name}</div>

                          {/* Overlay Mask for state */}
                          {isBanned && (
                            <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center rounded">
                              <span className="text-[8px] font-black text-red-400 tracking-tighter">BANNED</span>
                            </div>
                          )}
                          {!isBanned && isPicked && (
                            <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center rounded">
                              <span className="text-[8px] font-black text-zinc-500 tracking-tighter">LOCKED</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredChampions.length === 0 && (
                      <div className="col-span-full py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-zinc-600" />
                        <span>Không tìm thấy tướng nào phù hợp.</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // When draft is completed, show play confirmation
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Play className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  </div>
                  <h3 className="text-lg font-black text-zinc-150 uppercase tracking-widest">Đội Hình Đã Sẵn Sàng</h3>
                  <p className="text-zinc-400 text-xs mt-1 max-w-sm">
                    Tất cả các lượt cấm/chọn đã được chốt. Nhấn nút bên dưới để tiến hành cấm chọn chiến thuật và thi đấu.
                  </p>
                  
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 text-white font-bold px-10 py-5 rounded-lg text-xs tracking-wider uppercase mt-5 shadow-lg shadow-emerald-950/40 transition-all duration-200"
                    onClick={handleSubmit}
                    disabled={isPending}
                  >
                    {isPending ? "Đang Khởi Chạy..." : "Xác Nhận & Thi Đấu"}
                  </Button>
                </div>
              )}
            </div>

            {/* Right Box: Red Bans */}
            <div className="flex flex-col items-end bg-black/40 border border-red-900/20 rounded-lg p-3 backdrop-blur-sm w-[260px] shadow-lg">
              <div className="flex items-center gap-2 mb-2 flex-row-reverse text-right">
                <TeamLogo teamName={awayTeamName} size={32} />
                <div>
                  <h4 className="text-xs font-black text-red-400 tracking-wider">RED BANS</h4>
                  <p className="text-[10px] text-zinc-500 font-medium font-mono">Dplus KIA</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(idx => {
                  const champId = redBans[idx];
                  const champ = CHAMPIONS.find(c => c.id === champId);
                  
                  return (
                    <div
                      key={idx}
                      className="w-10 h-10 bg-zinc-950/80 border border-zinc-800 rounded relative overflow-hidden flex items-center justify-center"
                      title={champ ? `Banned: ${champ.name}` : "Empty Ban Slot"}
                    >
                      {champ ? (
                        <>
                          <img src={getChampionIconUrl(champ.id)} alt={champ.name} className="w-full h-full object-cover grayscale opacity-60" />
                          <div className="absolute inset-0 bg-red-950/20" />
                          {/* Red ban slash */}
                          <div className="absolute w-[140%] h-[2px] bg-red-600 rotate-45 transform origin-center" />
                        </>
                      ) : (
                        <div className="w-full h-full border-[1px] border-dashed border-zinc-800 flex items-center justify-center">
                          <span className="text-[10px] text-zinc-700">/</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Bottom Area (Reserved for layout spacing) */}
          <div className="h-2" />

        </div>
      </div>

      {/* 2. BOTTOM HORIZONTAL LCK PICKS BAR */}
      <div className="w-full bg-zinc-950 border-t border-zinc-900 flex flex-row items-stretch justify-between h-56 text-zinc-150 relative z-20">
        
        {/* Left Side: BLUE TEAM PICKS (5 Slots) */}
        <div className="w-[38%] flex flex-row items-stretch select-none">
          {["TOP", "JUG", "MID", "BOT", "SUP"].map((role) => {
            const champId = bluePicks[role];
            const champ = CHAMPIONS.find(c => c.id === champId);
            const isPicking = activeBlueRole === role;
            const playerName = getPlayerNameByRole(bluePlayers, role);
            
            // Check counters info if both picked
            const oppChampId = redPicks[role];
            const oppChamp = CHAMPIONS.find(c => c.id === oppChampId);
            const isCountering = champ && oppChamp && champ.counters.includes(oppChamp.id);
            const isCountered = champ && oppChamp && oppChamp.counters.includes(champ.id);

            return (
              <div
                key={role}
                className={`flex-1 border-r border-zinc-900 relative group flex flex-col justify-end p-3 transition-all duration-300 ${
                  isPicking ? 'bg-blue-950/20 ring-1 ring-blue-500/50 ring-inset' : 'bg-zinc-950'
                }`}
              >
                {/* Background vertical splash art */}
                {champ ? (
                  <>
                    <img 
                      src={getChampionSplashUrl(champ.id)} 
                      alt={champ.name}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Bottom gradient mask for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0" />
                  </>
                ) : (
                  // Empty slot background
                  <div className="absolute inset-0 flex items-center justify-center z-0 bg-zinc-950">
                    <div className="opacity-10 text-zinc-500">
                      {renderRoleIcon(role, "w-10 h-10")}
                    </div>
                  </div>
                )}

                {/* Active pick glow border */}
                {isPicking && (
                  <div className="absolute inset-0 border-t-2 border-blue-500 shadow-[inset_0_0_15px_rgba(59,130,246,0.25)] animate-pulse z-10" />
                )}

                {/* Text details */}
                <div className="z-10 flex flex-col select-none relative">
                  {/* Flashing picking state */}
                  {isPicking && (
                    <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase animate-pulse mb-1">
                      PICKING...
                    </span>
                  )}

                  {/* Counter badge tag */}
                  {!isPicking && isCountering && (
                    <span className="text-[8px] font-black tracking-wider text-emerald-400 bg-emerald-950/90 border border-emerald-500/30 rounded px-1.5 py-0.5 w-fit mb-1.5">
                      COUNTER (+6%)
                    </span>
                  )}
                  {!isPicking && isCountered && (
                    <span className="text-[8px] font-black tracking-wider text-red-400 bg-red-950/90 border border-red-500/30 rounded px-1.5 py-0.5 w-fit mb-1.5">
                      COUNTERED (-6%)
                    </span>
                  )}

                  {/* Role Icon & Player Name */}
                  <div className="flex items-center gap-1 text-zinc-400 mb-0.5">
                    {renderRoleIcon(role, "w-3 h-3 text-zinc-550")}
                    <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">{role}</span>
                  </div>

                  <h3 className="text-sm font-black text-zinc-100 tracking-tight truncate leading-tight uppercase">
                    {playerName}
                  </h3>

                  <p className="text-[10px] font-bold text-zinc-400 mt-0.5 truncate leading-tight uppercase font-mono">
                    {champ ? champ.name : "Chưa Chọn"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Middle Section: CENTER MATCH INFO PANEL */}
        <div className="w-[24%] bg-zinc-950/95 flex flex-col items-center justify-between py-3.5 px-5 border-r border-l border-zinc-900 text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full bg-indigo-950/15 blur-2xl pointer-events-none" />

          {/* Date & Week Header */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[8px] tracking-[0.25em] text-zinc-500 font-black uppercase font-mono">
              2026 LCK SUMMER
            </span>
            <span className="text-[9px] tracking-wider text-zinc-400 font-bold font-mono mt-0.5">
              WEEK {currentWeek} • {currentDate}
            </span>
          </div>

          {/* Teams and Logos VS Row */}
          <div className="flex items-center justify-between w-full px-2">
            {/* Blue Logo */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <TeamLogo teamName={homeTeamName} size={42} />
              <span className="text-[10px] font-black text-zinc-350 tracking-wider font-mono">
                {bluePlayers.length > 0 ? `${homeWins}W-${homeLosses}L` : "0W-0L"}
              </span>
            </div>

            {/* VS text */}
            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-[11px] font-black text-zinc-500 tracking-widest italic uppercase">
                VS
              </span>
              <div className="h-[1px] w-6 bg-zinc-800 my-1" />
              <span className="text-[9px] font-black text-zinc-550 uppercase">
                BO1
              </span>
            </div>

            {/* Red Logo */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <TeamLogo teamName={awayTeamName} size={42} />
              <span className="text-[10px] font-black text-zinc-350 tracking-wider font-mono">
                {redPlayers.length > 0 ? `${awayWins}W-${awayLosses}L` : "0W-0L"}
              </span>
            </div>
          </div>

          {/* Live Turn indicator */}
          <div className="flex flex-col items-center">
            <div className="h-[2px] w-12 rounded bg-zinc-800 mb-1.5" />
            <span className="text-[8px] font-black text-zinc-600 tracking-widest font-mono uppercase">
              PATCH 26.10
            </span>
          </div>
        </div>

        {/* Right Side: RED TEAM PICKS (5 Slots) */}
        <div className="w-[38%] flex flex-row items-stretch select-none">
          {["TOP", "JUG", "MID", "BOT", "SUP"].map((role) => {
            const champId = redPicks[role];
            const champ = CHAMPIONS.find(c => c.id === champId);
            const isPicking = activeRedRole === role;
            const playerName = getPlayerNameByRole(redPlayers, role);

            // Check counters info if both picked
            const oppChampId = bluePicks[role];
            const oppChamp = CHAMPIONS.find(c => c.id === oppChampId);
            const isCountering = champ && oppChamp && champ.counters.includes(oppChamp.id);
            const isCountered = champ && oppChamp && oppChamp.counters.includes(champ.id);

            return (
              <div
                key={role}
                className={`flex-1 border-r border-zinc-900 last:border-none relative group flex flex-col justify-end p-3 transition-all duration-300 ${
                  isPicking ? 'bg-red-950/20 ring-1 ring-red-500/50 ring-inset' : 'bg-zinc-950'
                }`}
              >
                {/* Background vertical splash art */}
                {champ ? (
                  <>
                    <img 
                      src={getChampionSplashUrl(champ.id)} 
                      alt={champ.name}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Bottom gradient mask for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0" />
                  </>
                ) : (
                  // Empty slot background
                  <div className="absolute inset-0 flex items-center justify-center z-0 bg-zinc-950">
                    <div className="opacity-10 text-zinc-500">
                      {renderRoleIcon(role, "w-10 h-10")}
                    </div>
                  </div>
                )}

                {/* Active pick glow border */}
                {isPicking && (
                  <div className="absolute inset-0 border-t-2 border-red-500 shadow-[inset_0_0_15px_rgba(239,68,68,0.25)] animate-pulse z-10" />
                )}

                {/* Text details */}
                <div className="z-10 flex flex-col select-none relative">
                  {/* Flashing picking state */}
                  {isPicking && (
                    <span className="text-[9px] font-black text-red-400 tracking-widest uppercase animate-pulse mb-1">
                      PICKING...
                    </span>
                  )}

                  {/* Counter badge tag */}
                  {!isPicking && isCountering && (
                    <span className="text-[8px] font-black tracking-wider text-emerald-400 bg-emerald-950/90 border border-emerald-500/30 rounded px-1.5 py-0.5 w-fit mb-1.5">
                      COUNTER (+6%)
                    </span>
                  )}
                  {!isPicking && isCountered && (
                    <span className="text-[8px] font-black tracking-wider text-red-400 bg-red-950/90 border border-red-500/30 rounded px-1.5 py-0.5 w-fit mb-1.5">
                      COUNTERED (-6%)
                    </span>
                  )}

                  {/* Role Icon & Player Name */}
                  <div className="flex items-center gap-1 text-zinc-400 mb-0.5">
                    {renderRoleIcon(role, "w-3 h-3 text-zinc-555")}
                    <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">{role}</span>
                  </div>

                  <h3 className="text-sm font-black text-zinc-100 tracking-tight truncate leading-tight uppercase">
                    {playerName}
                  </h3>

                  <p className="text-[10px] font-bold text-zinc-400 mt-0.5 truncate leading-tight uppercase font-mono">
                    {champ ? champ.name : "Chưa Chọn"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
