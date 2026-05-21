"use client";

import React, { useState, useEffect } from "react";
import { CHAMPIONS, Champion } from "@/lib/game/champions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, HelpCircle, XCircle, Play, Shield, Sword, Skull, Flame, Target, Wand2 } from "lucide-react";
import { TeamLogo } from "@/components/ui/game-logo";

interface DraftScreenProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  isUserHome: boolean;
  userTeamName: string;
  opponentTeamName: string;
  opponentPlayers: any[];
  onDraftComplete: (
    draft: { bans: string[]; picks: Record<string, string> },
    opponentDraft: { bans: string[]; picks: Record<string, string> }
  ) => void;
  isPending: boolean;
  championTiers: Record<string, string>;
  championImages?: Record<string, string>;
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

export default function DraftScreen({
  matchId,
  homeTeamName,
  awayTeamName,
  isUserHome,
  userTeamName,
  opponentTeamName,
  opponentPlayers,
  onDraftComplete,
  isPending,
  championTiers,
  championImages
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

  // Đọc thông tin bước hiện tại
  const currentStep = currentStepIndex < DRAFT_STEPS.length ? DRAFT_STEPS[currentStepIndex] : null;
  const isUserTurn = currentStep ? currentStep.side === (isUserHome ? "BLUE" : "RED") : false;

  // Lấy dữ liệu thuộc về người chơi (Ta) và đối thủ (Địch)
  const userBans = isUserHome ? blueBans : redBans;
  const oppBans = isUserHome ? redBans : blueBans;
  const userPicks = isUserHome ? bluePicks : redPicks;
  const oppPicks = isUserHome ? redPicks : bluePicks;

  // Tự động tìm vai trò trống đầu tiên cho người chơi khi đến lượt pick
  const autoSelectActiveRole = (currentPicks: Record<string, string>) => {
    const roles = ["TOP", "JUG", "MID", "BOT", "SUP"];
    for (const r of roles) {
      if (!currentPicks[r]) {
        setActiveRole(r);
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
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        executeAITurn(step);
        setIsAiThinking(false);
      }, 1200); // 1.2 giây trì hoãn tự nhiên
      return () => clearTimeout(timer);
    } else {
      // Đến lượt người chơi: Tự động trỏ vào vai trò trống đầu tiên nếu chưa chọn
      if (step.type === "PICK") {
        const uPicks = isUserHome ? bluePicks : redPicks;
        if (!activeRole || uPicks[activeRole]) {
          autoSelectActiveRole(uPicks);
        }
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

  // Tạo thông báo trạng thái
  const getStatusMessage = () => {
    if (!currentStep) {
      return "Cấm chọn hoàn tất! Hãy bấm nút Xác Nhận bên dưới để bắt đầu thi đấu.";
    }

    const sideName = currentStep.side === "BLUE" ? "Bên Xanh (Blue)" : "Bên Đỏ (Red)";
    const typeName = currentStep.type === "BAN" ? "CẤM" : "CHỌN";
    
    // Map index sang số thứ tự tương ứng (1 đến 5)
    const phaseNum = currentStep.type === "BAN"
      ? `lượt cấm thứ ${currentStep.index + 1}`
      : `lượt chọn thứ ${currentStep.index + 1}`;

    if (isAiThinking) {
      return `Đối thủ đang suy nghĩ (${sideName} thực hiện ${typeName})...`;
    }

    if (isUserTurn) {
      return `Lượt của bạn: Thực hiện ${typeName} tướng cho ${sideName} (${phaseNum}).`;
    }

    return `Lượt đối thủ: Đang chờ ${sideName} thực hiện ${typeName} (${phaseNum})...`;
  };

  return (
    <div className="w-full bg-zinc-950 text-zinc-100 p-6 rounded-xl border border-zinc-800 shadow-2xl relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6 z-10 relative">
        <div className="flex items-center gap-4">
          <TeamLogo teamName={userTeamName} size={60} />
          <div>
            <Badge className="bg-red-600 font-bold mb-1">DRAFT PHASE</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight">CẤM CHỌN TƯỚNG</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Đối thủ: <span className="font-semibold text-zinc-300">{opponentTeamName}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-zinc-400 font-bold">PHÂN KHU: {isUserHome ? "Bên Xanh (Xanh)" : "Bên Đỏ (Đỏ)"}</div>
            <div className="text-xs text-zinc-500">Người chơi: {userTeamName}</div>
          </div>
          <TeamLogo teamName={opponentTeamName} size={80} />
        </div>
      </div>

      {/* Timeline Tiến trình Cấm Chọn */}
      <div className="w-full bg-zinc-900/80 border border-zinc-850 rounded-xl p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative shadow-inner">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            !currentStep 
              ? "bg-emerald-500" 
              : isAiThinking 
              ? "bg-amber-500 animate-ping" 
              : isUserTurn 
              ? "bg-blue-500 animate-pulse" 
              : "bg-red-500"
          }`} />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              {currentStep ? `Tiến trình: Lượt ${currentStepIndex + 1} / 20` : "Trạng thái"}
            </div>
            <div className="text-sm font-black text-zinc-200">
              {getStatusMessage()}
            </div>
          </div>
        </div>
        
        {/* Thanh dấu tròn các bước cấm chọn */}
        <div className="flex gap-1 flex-wrap justify-center">
          {DRAFT_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isBlue = step.side === "BLUE";
            
            return (
              <div
                key={idx}
                title={`${step.side === "BLUE" ? "Bên Xanh" : "Bên Đỏ"} - ${step.type === "BAN" ? "Cấm" : "Chọn"}`}
                className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-extrabold select-none transition-all ${
                  isActive
                    ? "ring-2 ring-white scale-110 z-10 font-black shadow-lg"
                    : ""
                } ${
                  isCompleted
                    ? "bg-zinc-800 text-zinc-500 opacity-30 border border-zinc-700/50"
                    : isBlue
                    ? isActive
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-blue-950/40 text-blue-400 border border-blue-900/40"
                    : isActive
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-rose-950/40 text-rose-450 border border-rose-900/40"
                }`}
              >
                {step.type === "BAN" ? "C" : "P"}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 z-10 relative">
        {/* Cột trái: Lượt cấm & Chọn của bạn */}
        <div className="lg:col-span-1 space-y-4">
          <Card className={`bg-zinc-900/90 border-zinc-800 ${isUserHome ? 'border-blue-900/30' : 'border-red-900/30'}`}>
            <CardHeader className="py-3 border-b border-zinc-800 bg-zinc-900">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-zinc-200">
                <div className="flex items-center gap-2">
                  <TeamLogo teamName={userTeamName} size={36} />
                  <span>CẤM CỦA BẠN ({userBans.length}/5)</span>
                </div>
                {isUserTurn && currentStep?.type === "BAN" && (
                  <Badge className="bg-amber-600 animate-pulse text-[10px]">Đang Cấm</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map(idx => {
                const champId = userBans[idx];
                const champ = CHAMPIONS.find(c => c.id === champId);
                return (
                  <div
                    key={idx}
                    className="aspect-square bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    {champ ? (
                      <>
                        <div className="text-[10px] font-bold text-red-500 truncate px-0.5 z-10">{champ.name}</div>
                        <div className="absolute inset-0 bg-red-950/20" />
                      </>
                    ) : (
                      <HelpCircle className="w-5 h-5 text-zinc-700" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className={`bg-zinc-900/90 border-zinc-800 ${isUserHome ? 'border-blue-900/30' : 'border-red-900/30'}`}>
            <CardHeader className="py-3 border-b border-zinc-800 bg-zinc-900">
              <CardTitle className="text-sm font-bold text-zinc-200">ĐỘI HÌNH RA SÂN</CardTitle>
            </CardHeader>
            <CardContent className="py-3 space-y-3">
              {["TOP", "JUG", "MID", "BOT", "SUP"].map(role => {
                const champId = userPicks[role];
                const champ = CHAMPIONS.find(c => c.id === champId);
                const isActive = activeRole === role;

                // Tướng tương ứng của đối thủ
                const oppChampId = oppPicks[role];
                const oppChamp = CHAMPIONS.find(c => c.id === oppChampId);

                // Kiểm tra khắc chế
                const isUserCounter = champ && oppChamp && champ.counters.includes(oppChamp.id);
                const isOpponentCounter = champ && oppChamp && oppChamp.counters.includes(champ.id);

                return (
                  <div
                    key={role}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-950/20 shadow-md shadow-blue-950/50"
                        : champId
                        ? "border-zinc-850 bg-zinc-950/70"
                        : "border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/50 cursor-pointer"
                    }`}
                    onClick={() => {
                      // Chỉ cho phép đổi active role nếu đó là vị trí trống và đang trong lượt pick của người chơi
                      if (!champId && isUserTurn && currentStep?.type === "PICK") {
                        setActiveRole(role);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {champ && championImages?.[champ.id] ? (
                        <div className="w-14 h-14 rounded overflow-hidden border border-zinc-800 relative z-10 flex-shrink-0">
                          <img src={championImages[champ.id]} alt={champ.name} className="w-full h-full object-cover" />
                        </div>
                      ) : champ ? (
                        <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                          {champ.type === "Tank" && <Shield className="w-7 h-7 text-blue-400/70" />}
                          {champ.type === "Fighter" && <Sword className="w-7 h-7 text-orange-400/70" />}
                          {champ.type === "Assassin" && <Skull className="w-7 h-7 text-purple-400/70" />}
                          {champ.type === "Mage" && <Flame className="w-7 h-7 text-violet-400/70" />}
                          {champ.type === "Marksman" && <Target className="w-7 h-7 text-amber-400/70" />}
                          {champ.type === "Enchanter" && <Wand2 className="w-7 h-7 text-emerald-400/70" />}
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-850 flex items-center justify-center font-bold text-xs text-zinc-500 flex-shrink-0">
                          {role}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-zinc-555">{role}</div>
                        <div className="text-sm font-bold text-zinc-200">
                          {champ ? champ.name : <span className="text-zinc-650 font-medium">Chưa Chọn</span>}
                        </div>
                      </div>
                    </div>
                    {champ && (
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-zinc-850 text-[10px] border-zinc-800 text-zinc-400 font-normal">
                          {champ.type}
                        </Badge>
                        {isUserCounter && (
                          <Badge className="bg-emerald-950 text-emerald-400 border-emerald-900/50 text-[9px] font-bold px-1.5 py-0">
                            Khắc chế (+6%)
                          </Badge>
                        )}
                        {isOpponentCounter && (
                          <Badge className="bg-red-950 text-red-400 border-red-900/50 text-[9px] font-bold px-1.5 py-0">
                            Bị khắc chế (-6%)
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Khu vực giữa: Bảng tướng để chọn */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-zinc-900/90 border-zinc-800 flex-grow">
            <CardHeader className="py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold text-zinc-200">
                  {currentStep 
                    ? (currentStep.type === "BAN" 
                      ? "DANH SÁCH TƯỚNG CẤM" 
                      : `CHỌN TƯỚNG CHO VỊ TRÍ: ${activeRole || "HÃY CHỌN VỊ TRÍ"}`)
                    : "CẤM CHỌN HOÀN TẤT"}
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {currentStep 
                    ? (currentStep.type === "BAN" 
                      ? "Lượt cấm: Click vào tướng để cấm thi đấu." 
                      : "Lượt chọn: Click vào tướng hợp lệ để xác nhận.")
                    : "Tất cả các lượt cấm chọn đã được hoàn tất."}
                </p>
              </div>
              <div>
                {currentStep && (
                  <Badge className={currentStep.type === "BAN" ? "bg-red-950 text-red-400 border border-red-800/40" : "bg-blue-950 text-blue-400 border border-blue-800/40"}>
                    {currentStep.type === "BAN" ? "GIAI ĐOẠN CẤM" : "GIAI ĐOẠN CHỌN"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[360px] overflow-y-auto pr-2">
                {CHAMPIONS.map(champ => {
                  const isUserBanned = userBans.includes(champ.id);
                  const isOpponentBanned = oppBans.includes(champ.id);
                  const isBanned = isUserBanned || isOpponentBanned;

                  const isUserPicked = Object.values(userPicks).includes(champ.id);
                  const isOpponentPicked = Object.values(oppPicks).includes(champ.id);
                  const isPicked = isUserPicked || isOpponentPicked;
                  
                  const isRoleMatch = currentStep?.type === "PICK" && activeRole && champ.role === activeRole;
                  const champTier = championTiers[champ.id] || "B";

                  // Lớp CSS màu viền/nền tương ứng với màu phe (Xanh/Đỏ) của người chọn
                  const userColorClass = isUserHome
                    ? "border-blue-500 bg-blue-950/30 opacity-70 cursor-not-allowed"
                    : "border-rose-500 bg-rose-950/30 opacity-70 cursor-not-allowed";

                  const opponentColorClass = isUserHome
                    ? "border-rose-500 bg-rose-950/30 opacity-70 cursor-not-allowed"
                    : "border-blue-500 bg-blue-950/30 opacity-70 cursor-not-allowed";

                  return (
                    <div
                      key={champ.id}
                      className={`relative rounded-lg p-2 border flex flex-col items-center justify-between cursor-pointer transition-all text-center h-[135px] w-full ${
                        isBanned
                          ? "border-red-950/85 bg-red-950/15 opacity-40 cursor-not-allowed"
                          : isUserPicked
                          ? userColorClass
                          : isOpponentPicked
                          ? opponentColorClass
                          : isRoleMatch
                          ? "border-emerald-700 bg-emerald-950/20 hover:border-emerald-500"
                          : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700"
                      }`}
                      onClick={() => handleChampClick(champ)}
                    >
                      <div className="flex justify-between items-center w-full px-0.5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">{champ.role}</span>
                        <span className={`text-[9px] font-extrabold px-1 rounded bg-black/60 ${
                          champTier === "S" ? "text-rose-400" :
                          champTier === "A" ? "text-amber-400" :
                          champTier === "B" ? "text-blue-400" :
                          champTier === "C" ? "text-emerald-400" : "text-slate-400"
                        }`}>{champTier}</span>
                      </div>
                      
                      {championImages?.[champ.id] ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 my-0.5 relative z-10 shadow-md">
                          <img src={championImages[champ.id]} alt={champ.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 my-0.5 relative z-10 shadow-md">
                          {champ.type === "Tank" && <Shield className="w-9 h-9 text-blue-400/70" />}
                          {champ.type === "Fighter" && <Sword className="w-9 h-9 text-orange-400/70" />}
                          {champ.type === "Assassin" && <Skull className="w-9 h-9 text-purple-400/70" />}
                          {champ.type === "Mage" && <Flame className="w-9 h-9 text-violet-400/70" />}
                          {champ.type === "Marksman" && <Target className="w-9 h-9 text-amber-400/70" />}
                          {champ.type === "Enchanter" && <Wand2 className="w-9 h-9 text-emerald-400/70" />}
                        </div>
                      )}
                      
                      <div className="text-[10px] font-bold text-zinc-200 leading-tight">{champ.name}</div>
                      
                      <div className="w-full mt-0.5">
                        <span className={`text-[10px] font-black px-2 py-0.25 rounded-sm block w-full shadow-sm text-center select-none ${
                          champTier === "S" ? "bg-rose-600/90 text-white" :
                          champTier === "A" ? "bg-orange-500/95 text-white" :
                          champTier === "B" ? "bg-amber-500/95 text-white" :
                          champTier === "C" ? "bg-emerald-500/95 text-white" :
                          champTier === "D" ? "bg-cyan-500/95 text-white" :
                          "bg-blue-600/95 text-white"
                        }`}>
                          Tier {champTier}
                        </span>
                      </div>

                      {isBanned && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg">
                          <XCircle className="w-6 h-6 text-red-600 mb-0.5" />
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">
                            {isUserBanned ? "Bạn Cấm" : "Địch Cấm"}
                          </span>
                        </div>
                      )}
                      
                      {!isBanned && isOpponentPicked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
                          <span className={`text-[9px] font-black uppercase px-1 py-0.5 rounded border ${
                            isUserHome 
                              ? "text-rose-450 bg-rose-950/80 border-rose-900/30" 
                              : "text-blue-400 bg-blue-950/80 border-blue-900/30"
                          }`}>
                            Đã Chọn (Địch)
                          </span>
                        </div>
                      )}

                      {!isBanned && isUserPicked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
                          <span className={`text-[9px] font-black uppercase px-1 py-0.5 rounded border ${
                            isUserHome 
                              ? "text-blue-400 bg-blue-950/80 border-blue-900/30" 
                              : "text-rose-450 bg-rose-950/80 border-rose-900/30"
                          }`}>
                            Đã Chọn (Ta)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Thông tin tướng được chọn */}
              {currentStep?.type === "PICK" && activeRole && userPicks[activeRole] && (() => {
                const selectedChamp = CHAMPIONS.find(c => c.id === userPicks[activeRole]);
                const selectedChampTier = selectedChamp ? (championTiers[selectedChamp.id] || "B") : "B";
                
                const oppChampId = oppPicks[activeRole];
                const oppChamp = CHAMPIONS.find(c => c.id === oppChampId);

                const isCountering = selectedChamp && oppChamp && selectedChamp.counters.includes(oppChamp.id);
                const isCountered = selectedChamp && oppChamp && oppChamp.counters.includes(selectedChamp.id);

                return (
                  <div className="mt-6 p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-grow">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="font-bold text-zinc-300">
                          Tướng được chọn: {selectedChamp?.name} ({activeRole}) - <span className="text-emerald-400 font-extrabold">Tier {selectedChampTier}</span>
                        </h4>
                        
                        {isCountering && (
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Lợi thế: Khắc chế đối thủ (+6.0% sức mạnh)
                          </span>
                        )}
                        {isCountered && (
                          <span className="bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Bất lợi: Bị đối thủ khắc chế (-6.0% sức mạnh)
                          </span>
                        )}
                      </div>
                      
                      <div className="text-zinc-500 mt-2">
                        Khắc chế các tướng: {selectedChamp?.counters.join(", ") || "Không có"}. 
                        {oppChamp ? (
                          <>
                            <br className="my-1"/>
                            Đối thủ ở lane này đã chọn: <span className="text-zinc-300 font-bold">{oppChamp.name}</span>.
                            {isCountering && ` Tướng của bạn (${selectedChamp?.name}) khắc chế cứng ${oppChamp.name}, bạn sẽ nhận +6.0% sức mạnh đi đường!`}
                            {isCountered && ` Tướng đối phương (${oppChamp.name}) khắc chế cứng bạn, bạn bị phạt -6.0% sức mạnh đi đường!`}
                            {!isCountering && !isCountered && ` Đây là kèo đấu cân bằng, không có buff khắc chế.`}
                          </>
                        ) : (
                          " Đang chờ đối phương lộ diện hoặc bạn có thể cấm chọn trước."
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Bảng nút Xác nhận */}
          <div className="flex justify-end items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="text-xs text-zinc-400">
              {!isValid && (
                <span>Đang trong giai đoạn cấm chọn. Hãy hoàn thành tất cả các lượt để tiếp tục.</span>
              )}
              {isValid && <span className="text-emerald-400 font-semibold">Đội hình sẵn sàng! Bấm nút bên phải để bắt đầu trận đấu.</span>}
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8 py-5 rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30"
              onClick={handleSubmit}
              disabled={!isValid || isPending}
            >
              <Play className="w-4 h-4 fill-zinc-100" />
              Xác Nhận & Thi Đấu
            </Button>
          </div>
        </div>

        {/* Cột phải: Lượt cấm & Chọn của đối thủ */}
        <div className="lg:col-span-1 space-y-4">
          <Card className={`bg-zinc-900/90 border-zinc-800 ${!isUserHome ? 'border-blue-900/30' : 'border-red-900/30'}`}>
            <CardHeader className="py-3 border-b border-zinc-800 bg-zinc-900">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-zinc-200">
                <div className="flex items-center gap-2">
                  <TeamLogo teamName={opponentTeamName} size={36} />
                  <span>CẤM ĐỐI THỦ ({oppBans.length}/5)</span>
                </div>
                {!isUserTurn && currentStep?.type === "BAN" && (
                  <Badge className="bg-rose-600 animate-pulse text-[10px]">Đang Cấm</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map(idx => {
                const champId = oppBans[idx];
                const champ = CHAMPIONS.find(c => c.id === champId);
                return (
                  <div
                    key={idx}
                    className="aspect-square bg-zinc-950 border border-zinc-850 rounded flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    {champ ? (
                      <>
                        <div className="text-[10px] font-bold text-red-500 truncate px-0.5 z-10">{champ.name}</div>
                        <div className="absolute inset-0 bg-red-950/20" />
                      </>
                    ) : (
                      <HelpCircle className="w-5 h-5 text-zinc-800" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className={`bg-zinc-900/90 border-zinc-800 ${!isUserHome ? 'border-blue-900/30' : 'border-red-900/30'}`}>
            <CardHeader className="py-3 border-b border-zinc-800 bg-zinc-900">
              <CardTitle className="text-sm font-bold text-zinc-200">ĐỘI HÌNH ĐỐI THỦ</CardTitle>
            </CardHeader>
            <CardContent className="py-3 space-y-3">
              {["TOP", "JUG", "MID", "BOT", "SUP"].map(role => {
                const champId = oppPicks[role];
                const champ = CHAMPIONS.find(c => c.id === champId);

                // Tướng tương ứng của người chơi để tính khắc chế theo góc nhìn của địch
                const userChampId = userPicks[role];
                const userChamp = CHAMPIONS.find(c => c.id === userChampId);

                const isOpponentCounter = champ && userChamp && champ.counters.includes(userChamp.id);
                const isUserCounter = champ && userChamp && userChamp.counters.includes(champ.id);

                return (
                  <div
                    key={role}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-850 bg-zinc-950/30"
                  >
                    <div className="flex items-center gap-3">
                      {champ && championImages?.[champ.id] ? (
                        <div className="w-14 h-14 rounded overflow-hidden border border-zinc-800 relative z-10 flex-shrink-0">
                          <img src={championImages[champ.id]} alt={champ.name} className="w-full h-full object-cover" />
                        </div>
                      ) : champ ? (
                        <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                          {champ.type === "Tank" && <Shield className="w-7 h-7 text-blue-400/70" />}
                          {champ.type === "Fighter" && <Sword className="w-7 h-7 text-orange-400/70" />}
                          {champ.type === "Assassin" && <Skull className="w-7 h-7 text-purple-400/70" />}
                          {champ.type === "Mage" && <Flame className="w-7 h-7 text-violet-400/70" />}
                          {champ.type === "Marksman" && <Target className="w-7 h-7 text-amber-400/70" />}
                          {champ.type === "Enchanter" && <Wand2 className="w-7 h-7 text-emerald-400/70" />}
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-550 flex-shrink-0">
                          {role}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-zinc-500">{role}</div>
                        <div className="text-sm font-bold text-zinc-300">
                          {champ ? champ.name : <span className="text-zinc-650 font-medium">Chưa Chọn</span>}
                        </div>
                      </div>
                    </div>
                    {champ && (
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-zinc-800 text-[10px] border-zinc-700 text-zinc-400 font-normal">
                          {champ.type}
                        </Badge>
                        {isOpponentCounter && (
                          <Badge className="bg-emerald-950 text-emerald-400 border-emerald-900/50 text-[9px] font-bold px-1.5 py-0">
                            Khắc chế (+6%)
                          </Badge>
                        )}
                        {isUserCounter && (
                          <Badge className="bg-red-950 text-red-400 border-red-900/50 text-[9px] font-bold px-1.5 py-0">
                            Bị khắc chế (-6%)
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
