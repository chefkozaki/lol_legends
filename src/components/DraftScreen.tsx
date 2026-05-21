"use client";

import React, { useState } from "react";
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

// Client-side AI choice generator
function generateAIChoice(opponentPlayers: any[], championTiers: Record<string, string>) {
  const bans: string[] = [];
  const picks: Record<string, string> = {};

  const roles = ["TOP", "JUG", "MID", "BOT", "SUP"] as const;

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
  // Trạng thái cấm (tối đa 5 tướng)
  const [bans, setBans] = useState<string[]>([]);
  // Trạng thái chọn cho 5 role
  const [picks, setPicks] = useState<Record<string, string>>({
    TOP: "",
    JUG: "",
    MID: "",
    BOT: "",
    SUP: ""
  });

  // Khởi tạo lượt cấm/chọn của AI
  const [opponentDraft] = useState<{ bans: string[]; picks: Record<string, string> }>(() => {
    return generateAIChoice(opponentPlayers, championTiers);
  });

  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [isBanningPhase, setIsBanningPhase] = useState<boolean>(true);

  const handleSelectChampForBan = (champId: string) => {
    if (bans.includes(champId)) {
      setBans(bans.filter(id => id !== champId));
      return;
    }
    if (bans.length >= 5) return;
    setBans([...bans, champId]);
  };

  const handleSelectChampForPick = (role: string, champId: string) => {
    // Nếu tướng đã được pick cho role khác, gỡ ra
    const newPicks = { ...picks };
    Object.keys(newPicks).forEach(r => {
      if (newPicks[r] === champId) {
        newPicks[r] = "";
      }
    });

    newPicks[role] = champId;
    setPicks(newPicks);
    setActiveRole(null);
  };

  // Danh sách các tướng khả dụng (chưa bị cấm)
  const availableChamps = CHAMPIONS.filter(c => !bans.includes(c.id) && !opponentDraft.bans.includes(c.id));

  // Kiểm tra cấm chọn hợp lệ
  const isValid = bans.length === 5 && Object.values(picks).every(p => p !== "");

  const handleSubmit = () => {
    if (!isValid) return;
    onDraftComplete({ bans, picks }, opponentDraft);
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 z-10 relative">
        {/* Cột trái: Lượt cấm & Chọn của bạn */}
        <div className="lg:col-span-1 space-y-4">
          <Card className={`bg-zinc-900/90 border-zinc-800 ${isUserHome ? 'border-blue-900/30' : 'border-red-900/30'}`}>
            <CardHeader className="py-3 border-b border-zinc-800 bg-zinc-900">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-zinc-200">
                <div className="flex items-center gap-2">
                  <TeamLogo teamName={userTeamName} size={36} />
                  <span>LƯỢT CẤM CỦA BẠN ({bans.length}/5)</span>
                </div>
                {isBanningPhase && <Badge className="bg-amber-600 animate-pulse text-[10px]">Đang Cấm</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map(idx => {
                const champId = bans[idx];
                const champ = CHAMPIONS.find(c => c.id === champId);
                return (
                  <div
                    key={idx}
                    className="aspect-square bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:border-red-950 group"
                    onClick={() => {
                      if (champId) handleSelectChampForBan(champId);
                      else setIsBanningPhase(true);
                    }}
                  >
                    {champ ? (
                      <>
                        <div className="text-[10px] font-bold text-red-500 truncate px-0.5 z-10">{champ.name}</div>
                        <XCircle className="w-4 h-4 text-red-700 absolute opacity-0 group-hover:opacity-100 transition-opacity z-20" />
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
                const champId = picks[role];
                const champ = CHAMPIONS.find(c => c.id === champId);
                const isActive = activeRole === role;

                // Opponent's champ at this role
                const oppChampId = opponentDraft.picks[role];
                const oppChamp = CHAMPIONS.find(c => c.id === oppChampId);

                // Counters check
                const isUserCounter = champ && oppChamp && champ.counters.includes(oppChamp.id);
                const isOpponentCounter = champ && oppChamp && oppChamp.counters.includes(champ.id);

                return (
                  <div
                    key={role}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-950/20 shadow-md shadow-blue-950/50"
                        : "border-zinc-800 bg-zinc-950/50 hover:bg-zinc-800/30"
                    }`}
                    onClick={() => {
                      setIsBanningPhase(false);
                      setActiveRole(role);
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
                        <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 flex-shrink-0">
                          {role}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-zinc-400">{role}</div>
                        <div className="text-sm font-bold text-zinc-200">
                          {champ ? champ.name : <span className="text-zinc-650 font-medium">Chưa Chọn</span>}
                        </div>
                      </div>
                    </div>
                    {champ && (
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-zinc-800 text-[10px] border-zinc-700 text-zinc-400 font-normal">
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
            <CardHeader className="py-4 border-b border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-zinc-200">
                  {isBanningPhase ? "CHỌN TƯỚNG ĐỂ CẤM" : `CHỌN TƯỚNG CHO VỊ TRÍ: ${activeRole || "HÃY CLICK VÀO MỘT VỊ TRÍ BÊN TRÁI"}`}
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Click vào tướng bên dưới để {isBanningPhase ? "Cấm" : "Chọn cho vị trí đã chọn"}.
                </p>
              </div>

              <div className="flex gap-2 text-xs">
                <Button
                  size="sm"
                  variant={isBanningPhase ? "destructive" : "outline"}
                  onClick={() => {
                    setIsBanningPhase(true);
                    setActiveRole(null);
                  }}
                  className="font-bold text-xs"
                >
                  Giai đoạn Cấm
                </Button>
                <Button
                  size="sm"
                  variant={!isBanningPhase && activeRole ? "default" : "outline"}
                  onClick={() => {
                    setIsBanningPhase(false);
                    if (!activeRole) setActiveRole("TOP");
                  }}
                  className="font-bold text-xs bg-blue-600 hover:bg-blue-500"
                >
                  Giai đoạn Chọn
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-6">
              {/* Lọc tướng theo vị trí nếu đang ở chế độ chọn */}
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[360px] overflow-y-auto pr-2">
                {CHAMPIONS.map(champ => {
                  const isUserBanned = bans.includes(champ.id);
                  const isOpponentBanned = opponentDraft.bans.includes(champ.id);
                  const isBanned = isUserBanned || isOpponentBanned;

                  const isUserPicked = Object.values(picks).includes(champ.id);
                  const isOpponentPicked = Object.values(opponentDraft.picks).includes(champ.id);
                  const isPicked = isUserPicked || isOpponentPicked;
                  
                  // Chỉ hiển thị tướng hợp vị trí nếu đang chọn role (hoặc hiển thị tất cả để linh hoạt)
                  const isRoleMatch = !isBanningPhase && activeRole && champ.role === activeRole;
                  const champTier = championTiers[champ.id] || "B";

                  return (
                    <div
                      key={champ.id}
                      className={`relative rounded-lg p-2 border flex flex-col items-center justify-between cursor-pointer transition-all text-center h-[135px] w-full ${
                        isBanned
                          ? "border-red-950/85 bg-red-950/15 opacity-40 cursor-not-allowed"
                          : isUserPicked
                          ? "border-blue-500 bg-blue-950/30 opacity-70"
                          : isOpponentPicked
                          ? "border-rose-500 bg-rose-950/30 opacity-70 cursor-not-allowed"
                          : isRoleMatch
                          ? "border-emerald-700 bg-emerald-950/20 hover:border-emerald-500"
                          : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700"
                      }`}
                      onClick={() => {
                        if (isBanned || isOpponentPicked) return;
                        if (isBanningPhase) {
                          handleSelectChampForBan(champ.id);
                        } else if (activeRole) {
                          handleSelectChampForPick(activeRole, champ.id);
                        }
                      }}
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
                      {/* Type Icon / Custom Image (LARGER SIZES) */}
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
                      
                      {/* Thể hiện Tier ở một ô nhỏ phía dưới */}
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
                          <span className="text-[9px] font-black text-rose-450 uppercase bg-rose-950/80 px-1 py-0.5 rounded border border-rose-900/30">
                            Đã Chọn (Địch)
                          </span>
                        </div>
                      )}

                      {!isBanned && isUserPicked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
                          <span className="text-[9px] font-black text-blue-400 uppercase bg-blue-950/80 px-1 py-0.5 rounded border border-blue-900/30">
                            Đã Chọn (Ta)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Thông tin tướng được chọn */}
              {!isBanningPhase && activeRole && picks[activeRole] && (() => {
                const selectedChamp = CHAMPIONS.find(c => c.id === picks[activeRole]);
                const selectedChampTier = selectedChamp ? (championTiers[selectedChamp.id] || "B") : "B";
                
                // Opponent's champion in this role
                const oppChampId = opponentDraft.picks[activeRole];
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
                <span>Hãy cấm đủ 5 tướng và chọn đủ 5 vị trí để tiếp tục thi đấu!</span>
              )}
              {isValid && <span className="text-emerald-400 font-semibold">Đội hình sẵn sàng! Bấm nút bên phải để vào trận đấu.</span>}
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
                  <span>LƯỢT CẤM ĐỐI THỦ ({opponentDraft.bans.length}/5)</span>
                </div>
                {!isBanningPhase && <Badge className="bg-red-900 text-red-200 text-[10px]">Cấm xong</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map(idx => {
                const champId = opponentDraft.bans[idx];
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
                const champId = opponentDraft.picks[role];
                const champ = CHAMPIONS.find(c => c.id === champId);

                // User's champ at this role to show counter perspective from opponent
                const userChampId = picks[role];
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
