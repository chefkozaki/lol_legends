"use client";

import React from "react";
import { TeamLogo } from "@/components/ui/game-logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Sword, 
  Sparkles, 
  Flame, 
  Target, 
  Heart, 
  Shield, 
  ArrowLeft, 
  Gamepad2, 
  Award,
  Zap
} from "lucide-react";

export interface MatchPrepPlayer {
  id: string;
  name: string;
  role: string;
  laning: number;
  teamfight: number;
  macro: number;
  mentality: number;
  championPool: number;
  age: number;
  nationality: string;
}

export interface MatchPrepTeam {
  id: string;
  name: string;
  logoUrl?: string | null;
  abbreviation?: string | null;
  wins: number;
  losses: number;
  players: MatchPrepPlayer[];
}

interface MatchPrepScreenProps {
  homeTeam: MatchPrepTeam;
  awayTeam: MatchPrepTeam;
  currentDate?: string;
  currentWeek?: number;
  onStartMatch: () => void;
  onClose: () => void;
}

export default function MatchPrepScreen({
  homeTeam,
  awayTeam,
  currentDate = "2026-01-05",
  currentWeek = 1,
  onStartMatch,
  onClose
}: MatchPrepScreenProps) {
  
  const getPlayerForRole = (team: MatchPrepTeam, role: string) => {
    return team.players.find(p => p.role.toUpperCase() === role.toUpperCase());
  };

  const getPlayerOVR = (player?: MatchPrepPlayer) => {
    if (!player) return 0;
    return Math.round((player.laning + player.teamfight + player.macro + player.mentality + player.championPool) / 5);
  };

  const getTeamStatAverage = (team: MatchPrepTeam, stat: "laning" | "teamfight" | "macro" | "mentality") => {
    if (team.players.length === 0) return 0;
    const sum = team.players.reduce((acc, p) => acc + p[stat], 0);
    return Math.round(sum / team.players.length);
  };

  // Helper to render role icons
  const renderRoleIcon = (role: string, className = "w-4 h-4") => {
    switch (role.toUpperCase()) {
      case "TOP": return <Sword className={`${className} text-rose-500`} />;
      case "JUG": return <Sparkles className={`${className} text-indigo-400`} />;
      case "MID": return <Flame className={`${className} text-amber-500`} />;
      case "BOT": return <Target className={`${className} text-emerald-400`} />;
      case "SUP": return <Heart className={`${className} text-pink-400`} />;
      default: return <Gamepad2 className={className} />;
    }
  };

  const roles = ["TOP", "JUG", "MID", "BOT", "SUP"];

  // Team averages
  const statsToCompare = [
    { key: "laning", label: "ĐI ĐƯỜNG (LANING)" },
    { key: "teamfight", label: "GIAO TRANH (TEAMFIGHT)" },
    { key: "macro", label: "CHIẾN THUẬT (MACRO)" },
    { key: "mentality", label: "TÂM LÝ (MENTALITY)" }
  ] as const;

  return (
    <div className="w-full min-h-screen bg-zinc-950 flex flex-col justify-between p-6 select-none font-sans text-zinc-100 relative overflow-y-auto">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-red-900/10 blur-[120px] pointer-events-none -z-10" />

      {/* Header Container */}
      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClose}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 flex items-center gap-2 h-9"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Button>
          <div>
            <span className="text-[10px] tracking-[0.2em] text-zinc-500 font-black uppercase font-mono block">
              2026 LCK SUMMER
            </span>
            <span className="text-xs text-zinc-400 font-semibold font-mono">
              WEEK {currentWeek} • {currentDate}
            </span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 bg-blue-950/20 border border-blue-900/30 px-4 py-1.5 rounded-full text-xs font-bold text-blue-400 flex items-center gap-2 shadow-sm animate-pulse">
          <Zap className="w-3.5 h-3.5" />
          <span>SẮP KHỞI TRANH • CHUẨN BỊ TRẬN ĐẤU</span>
        </div>
      </div>

      {/* Main Broadcast Stage Layout */}
      <div className="w-full max-w-6xl mx-auto flex-grow flex flex-col gap-6">
        
        {/* 1. MATCHUP SUMMARY HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-7 items-center bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-md relative shadow-xl">
          {/* Blue Corner Glow */}
          <div className="absolute top-0 left-0 w-32 h-full bg-blue-600/5 rounded-l-2xl filter blur-xl pointer-events-none" />
          {/* Red Corner Glow */}
          <div className="absolute top-0 right-0 w-32 h-full bg-red-600/5 rounded-r-2xl filter blur-xl pointer-events-none" />

          {/* Home Team (Blue) */}
          <div className="md:col-span-3 flex flex-row items-center gap-5 justify-center md:justify-end pr-2 md:pr-8 border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0">
            <div className="text-center md:text-right">
              <h1 className="text-2xl md:text-3xl font-black text-zinc-150 tracking-tight leading-none uppercase">
                {homeTeam.name}
              </h1>
              <p className="text-sm font-bold text-blue-400 tracking-wider font-mono mt-1.5 bg-blue-950/40 border border-blue-900/20 px-3 py-0.5 rounded w-fit md:ml-auto">
                WINS: {homeTeam.wins} - LOSSES: {homeTeam.losses}
              </p>
            </div>
            <TeamLogo teamName={homeTeam.name} size={72} imageUrl={homeTeam.logoUrl} abbreviation={homeTeam.abbreviation} />
          </div>

          {/* VS Center */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-4 md:py-0">
            <span className="text-sm font-black text-zinc-650 tracking-widest uppercase italic block mb-1">
              VS
            </span>
            <span className="bg-zinc-800 border border-zinc-750 px-3 py-1 rounded text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">
              BO1 MATCH
            </span>
          </div>

          {/* Away Team (Red) */}
          <div className="md:col-span-3 flex flex-row items-center gap-5 justify-center md:justify-start pl-2 md:pl-8 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0">
            <TeamLogo teamName={awayTeam.name} size={72} imageUrl={awayTeam.logoUrl} abbreviation={awayTeam.abbreviation} />
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-black text-zinc-150 tracking-tight leading-none uppercase">
                {awayTeam.name}
              </h1>
              <p className="text-sm font-bold text-red-400 tracking-wider font-mono mt-1.5 bg-red-950/40 border border-red-900/20 px-3 py-0.5 rounded w-fit">
                WINS: {awayTeam.wins} - LOSSES: {awayTeam.losses}
              </p>
            </div>
          </div>
        </div>

        {/* 2. PLAYER LANE MATCHUPS COMPARISON */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Block (3/5): Lane matchups */}
          <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-lg flex flex-col justify-between">
            <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
              <h3 className="text-xs font-black tracking-widest text-zinc-300 uppercase flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                SO SÁNH ĐỘI HÌNH CHI TIẾT TỪNG VỊ TRÍ
              </h3>
              <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">OVR Rating</span>
            </div>

            {/* Roster Matchups List */}
            <div className="space-y-3.5">
              {roles.map(role => {
                const pHome = getPlayerForRole(homeTeam, role);
                const pAway = getPlayerForRole(awayTeam, role);
                const ovrHome = getPlayerOVR(pHome);
                const ovrAway = getPlayerOVR(pAway);
                const diff = ovrHome - ovrAway;

                return (
                  <div 
                    key={role} 
                    className="bg-zinc-950/80 border border-zinc-900/60 rounded-xl p-3 flex flex-row items-center justify-between relative group hover:border-zinc-800 transition duration-200"
                  >
                    {/* Home player side */}
                    <div className="flex-1 flex items-center justify-end gap-3 text-right">
                      {pHome ? (
                        <>
                          <div>
                            <p className="text-xs font-black text-zinc-200 truncate max-w-[120px] md:max-w-none">{pHome.name}</p>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Tuổi: {pHome.age} • {pHome.nationality}</span>
                          </div>
                          <div className={`w-9 h-9 rounded bg-blue-900/10 border-2 font-bold font-mono flex items-center justify-center text-sm ${diff > 0 ? "border-blue-500 text-blue-400 font-black" : "border-zinc-800 text-zinc-400"}`}>
                            {ovrHome}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-600 font-bold">TRỐNG</span>
                      )}
                    </div>

                    {/* Role Icon Center Badge */}
                    <div className="w-16 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-md">
                        {renderRoleIcon(role, "w-4 h-4")}
                      </div>
                      <span className="text-[9px] font-black text-zinc-500 tracking-wider uppercase mt-1">
                        {role}
                      </span>
                    </div>

                    {/* Away player side */}
                    <div className="flex-1 flex items-center justify-start gap-3 text-left">
                      {pAway ? (
                        <>
                          <div className={`w-9 h-9 rounded bg-red-900/10 border-2 font-bold font-mono flex items-center justify-center text-sm ${diff < 0 ? "border-red-500 text-red-400 font-black" : "border-zinc-800 text-zinc-400"}`}>
                            {ovrAway}
                          </div>
                          <div>
                            <p className="text-xs font-black text-zinc-200 truncate max-w-[120px] md:max-w-none">{pAway.name}</p>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Tuổi: {pAway.age} • {pAway.nationality}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-600 font-bold">TRỐNG</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Block (2/5): Team Stat Compare Bars */}
          <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-lg flex flex-col justify-between">
            <div>
              <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-black tracking-widest text-zinc-300 uppercase">
                  SO SÁNH CHỈ SỐ ĐỒNG ĐỀU ĐỘI
                </h3>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed mb-4">
                Trung bình cộng thuộc tính cốt lõi của cả 5 tuyển thủ trong đội hình ra sân hiện tại.
              </p>

              {/* Stats Progress Bars */}
              <div className="space-y-4.5">
                {statsToCompare.map(({ key, label }) => {
                  const valHome = getTeamStatAverage(homeTeam, key);
                  const valAway = getTeamStatAverage(awayTeam, key);
                  
                  // Advantage calculation
                  const total = valHome + valAway;
                  const percentHome = total > 0 ? (valHome / total) * 100 : 50;

                  return (
                    <div key={key} className="space-y-2 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900">
                      <div className="flex justify-between text-xs font-bold font-mono">
                        <span className="text-blue-400">{valHome}</span>
                        <span className="text-[10px] text-zinc-400 tracking-wider">{label}</span>
                        <span className="text-red-400">{valAway}</span>
                      </div>
                      
                      {/* Bidirectional compare bar */}
                      <div className="h-2 rounded-full overflow-hidden flex bg-zinc-900 border border-zinc-800">
                        <div 
                          style={{ width: `${percentHome}%` }} 
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-500 rounded-l" 
                        />
                        <div 
                          style={{ width: `${100 - percentHome}%` }} 
                          className="bg-gradient-to-r from-red-400 to-red-600 h-full transition-all duration-500 rounded-r" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Summary Badge */}
            <div className="bg-zinc-950/90 border border-zinc-900 rounded-xl p-3.5 mt-5 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Chỉ số nổi bật:</span>
              <div className="font-bold flex items-center gap-1.5">
                {(() => {
                  const hOvr = homeTeam.players.reduce((s, p) => s + getPlayerOVR(p), 0);
                  const aOvr = awayTeam.players.reduce((s, p) => s + getPlayerOVR(p), 0);
                  if (Math.abs(hOvr - aOvr) < 5) return <span className="text-zinc-400">🔥 ĐỘI HÌNH CÂN BẰNG</span>;
                  return hOvr > aOvr 
                    ? <span className="text-blue-400 font-extrabold">👑 LỢI THẾ {homeTeam.name}</span>
                    : <span className="text-red-400 font-extrabold">👑 LỢI THẾ {awayTeam.name}</span>;
                })()}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Footer Navigation Buttons */}
      <div className="w-full max-w-6xl mx-auto border-t border-zinc-800/80 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 w-full sm:w-auto font-bold px-6 py-5 text-xs tracking-wider uppercase h-11"
        >
          Quay lại văn phòng
        </Button>
        <Button 
          onClick={onStartMatch}
          className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white w-full sm:w-auto font-black px-10 py-5 text-xs tracking-widest uppercase shadow-lg shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-11 animate-pulse"
        >
          Bắt đầu Cấm & Chọn
        </Button>
      </div>
    </div>
  );
}
