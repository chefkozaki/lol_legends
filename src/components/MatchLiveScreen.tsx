"use client";

import React, { useState, useEffect, useRef } from "react";
import { MatchSimulationResult, PlayerStats } from "@/lib/game/engine";
import { CHAMPIONS } from "@/lib/game/champions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Swords, Eye, Award, ArrowLeft, Play, Pause, ChevronRight } from "lucide-react";

interface MatchLiveScreenProps {
  result: MatchSimulationResult;
  homeTeamName: string;
  awayTeamName: string;
  isUserHome: boolean;
  onClose: () => void;
}

export default function MatchLiveScreen({
  result,
  homeTeamName,
  awayTeamName,
  isUserHome,
  onClose
}: MatchLiveScreenProps) {
  const [currentMinute, setCurrentMinute] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1000); // ms cho mỗi phút trong game
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commentaryEndRef = useRef<HTMLDivElement | null>(null);

  // Auto play logic
  useEffect(() => {
    if (isPlaying && currentMinute < 40) {
      timerRef.current = setTimeout(() => {
        setCurrentMinute(prev => {
          const next = prev + 1;
          // Tìm xem game thực sự kết thúc ở phút nào dựa trên event END
          const endEvent = result.events.find(e => e.type === "END");
          const endMin = endEvent ? endEvent.time : 40;
          if (next >= endMin) {
            setIsPlaying(false);
            return endMin;
          }
          return next;
        });
      }, speed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentMinute, speed, result.events]);

  // Cuộn bình luận xuống dưới
  useEffect(() => {
    if (commentaryEndRef.current) {
      commentaryEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMinute]);

  const handleSkip = () => {
    setIsPlaying(false);
    const endEvent = result.events.find(e => e.type === "END");
    setCurrentMinute(endEvent ? endEvent.time : 40);
  };

  const isFinished = currentMinute >= (result.events.find(e => e.type === "END")?.time || 40);

  // Trích xuất các sự kiện diễn ra đến phút hiện tại
  const visibleEvents = result.events.filter(e => e.time <= currentMinute);

  // Tính toán số liệu thống kê hiện tại đến phút currentMinute
  let currentHomeKills = 0;
  let currentAwayKills = 0;
  let currentHomeDragons = 0;
  let currentAwayDragons = 0;
  let currentHomeBarons = 0;
  let currentAwayBarons = 0;
  let currentHomeTowers = 0;
  let currentAwayTowers = 0;

  // Mô phỏng KDA tuyển thủ tăng dần theo phút
  // Để đơn giản, ta lấy KDA cuối cùng nhân với tỷ lệ thời gian trôi qua, hoặc lọc từ events
  // Ở đây chúng ta sẽ hiển thị KDA cuối cùng khi trận đấu kết thúc, và trong trận đấu hiển thị KDA tăng dần ước lượng
  const getSimulatedPlayerStats = (stats: PlayerStats[], teamKills: number, totalTeamKills: number) => {
    if (isFinished) {
      return stats;
    }
    return stats.map(s => {
      const progressRatio = Math.min(1, currentMinute / 35); // Giới hạn tối đa là 1
      return {
        ...s,
        kills: Math.round(s.kills * progressRatio),
        deaths: Math.round(s.deaths * progressRatio),
        assists: Math.round(s.assists * progressRatio)
      };
    });
  };

  visibleEvents.forEach(e => {
    if (e.type === "KILL") {
      if (e.side === "HOME") {
        currentHomeKills += e.kills || 1;
      } else if (e.side === "AWAY") {
        currentAwayKills += e.kills || 1;
      } else {
        // Fallback cũ cho các trận đấu cũ
        if (e.text.includes(homeTeamName)) currentHomeKills++;
        else currentAwayKills++;
      }
    } else if (e.type === "OBJECTIVE") {
      const side = e.side || (e.text.includes(homeTeamName) ? "HOME" : "AWAY");
      if (side === "HOME") {
        if (e.dragons !== undefined) currentHomeDragons += e.dragons;
        else if (e.text.includes("Rồng")) currentHomeDragons++;

        if (e.barons !== undefined) currentHomeBarons += e.barons;
        else if (e.text.includes("Baron")) currentHomeBarons++;

        if (e.towers !== undefined) currentHomeTowers += e.towers;
        else if (e.text.includes("trụ") || e.text.includes("Trụ")) currentHomeTowers++;
      } else {
        if (e.dragons !== undefined) currentAwayDragons += e.dragons;
        else if (e.text.includes("Rồng")) currentAwayDragons++;

        if (e.barons !== undefined) currentAwayBarons += e.barons;
        else if (e.text.includes("Baron")) currentAwayBarons++;

        if (e.towers !== undefined) currentAwayTowers += e.towers;
        else if (e.text.includes("trụ") || e.text.includes("Trụ")) currentAwayTowers++;
      }
    } else if (e.type === "TEAMFIGHT") {
      if (e.side === "HOME") {
        currentHomeKills += e.kills || 4;
        currentAwayKills += 1;
      } else if (e.side === "AWAY") {
        currentAwayKills += e.kills || 4;
        currentHomeKills += 1;
      }
      if (e.towers) {
        if (e.side === "HOME") currentHomeTowers += e.towers;
        else if (e.side === "AWAY") currentAwayTowers += e.towers;
      }
    }
  });

  const totalHomeKills = result.homePlayerStats.reduce((sum, p) => sum + p.kills, 0);
  const totalAwayKills = result.awayPlayerStats.reduce((sum, p) => sum + p.kills, 0);

  const currentHomePlayerStats = getSimulatedPlayerStats(result.homePlayerStats, currentHomeKills, totalHomeKills);
  const currentAwayPlayerStats = getSimulatedPlayerStats(result.awayPlayerStats, currentAwayKills, totalAwayKills);

  // Tạo dữ liệu biểu đồ vàng chênh lệch đến phút hiện tại
  const chartData = result.goldDiffHistory.slice(0, currentMinute + 1).map((diff, index) => ({
    minute: `Phút ${index}`,
    "Chênh lệch Vàng (Home - Away)": diff,
    // Giá trị hiển thị tuyệt đối cho tooltip
    value: diff
  }));

  // Xác định MVP (Tuyển thủ có điểm performanceScore cao nhất của đội thắng)
  const winningStats = result.winner === "HOME" ? result.homePlayerStats : result.awayPlayerStats;
  const mvpPlayer = [...winningStats].sort((a, b) => b.performanceScore - a.performanceScore)[0];
  const mvpChamp = CHAMPIONS.find(c => c.id === mvpPlayer?.championId);

  return (
    <div className="w-full max-h-[90vh] bg-zinc-950 text-zinc-100 p-4 lg:p-5 rounded-xl border border-zinc-800 shadow-2xl flex flex-col space-y-3.5 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/15 via-transparent to-transparent pointer-events-none -z-10" />

      {/* 1. SCOREBOARD */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-6 relative shadow-lg">
        {/* Home Team */}
        <div className="flex items-center gap-4 w-full sm:w-1/3 justify-end">
          <div className="text-right">
            <h3 className="text-xl font-black text-zinc-100 tracking-tight">{homeTeamName}</h3>
            <div className="flex gap-2 justify-end text-xs text-zinc-400 font-semibold mt-1">
              <span>🏰 Trụ: {currentHomeTowers}</span>
              <span>🐉 Rồng: {currentHomeDragons}</span>
              <span>👾 Baron: {currentHomeBarons}</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-lg bg-blue-900/20 border-2 flex items-center justify-center font-black text-blue-400 text-lg ${isUserHome ? "border-blue-500 shadow-md shadow-blue-500/20" : "border-zinc-700"}`}>
            {homeTeamName.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Kills & Time */}
        <div className="flex flex-col items-center justify-center w-full sm:w-1/3 text-center border-y sm:border-y-0 sm:border-x border-zinc-800 py-3 sm:py-0">
          <div className="text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-1">KILLS</div>
          <div className="flex items-center gap-4 mb-1">
            <span className="text-4xl font-extrabold text-blue-500">{currentHomeKills}</span>
            <span className="text-zinc-600 font-bold text-lg">VS</span>
            <span className="text-4xl font-extrabold text-red-500">{currentAwayKills}</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-emerald-400">
            Phút {currentMinute}
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-4 w-full sm:w-1/3 justify-start">
          <div className={`w-12 h-12 rounded-lg bg-red-900/20 border-2 flex items-center justify-center font-black text-red-400 text-lg ${!isUserHome ? "border-red-500 shadow-md shadow-red-500/20" : "border-zinc-700"}`}>
            {awayTeamName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-100 tracking-tight">{awayTeamName}</h3>
            <div className="flex gap-2 text-xs text-zinc-400 font-semibold mt-1">
              <span>🏰 Trụ: {currentAwayTowers}</span>
              <span>🐉 Rồng: {currentAwayDragons}</span>
              <span>👾 Baron: {currentAwayBarons}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-500 font-semibold px-1">
          <span>Tiến trình trận đấu</span>
          <span>{Math.round((currentMinute / 35) * 100)}%</span>
        </div>
        <Progress value={(currentMinute / 35) * 100} className="h-2 bg-zinc-900 border border-zinc-800" />
      </div>

      {/* 2. CHÍNH GIỮA: BÌNH LUẬN & BIỂU ĐỒ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live Commentary (3/5) */}
        <div className="lg:col-span-3 flex flex-col h-[240px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Diễn biến trực tiếp</h4>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-3 font-mono text-xs scrollbar-thin">
            {visibleEvents.map((e, idx) => {
              let textColors = "text-zinc-300";
              let badgeBg = "bg-zinc-800 text-zinc-400";
              if (e.type === "KILL") {
                textColors = "text-amber-300 font-semibold";
                badgeBg = "bg-amber-950/40 text-amber-500 border border-amber-900/50";
              } else if (e.type === "OBJECTIVE") {
                textColors = "text-emerald-400 font-semibold";
                badgeBg = "bg-emerald-950/40 text-emerald-500 border border-emerald-900/50";
              } else if (e.type === "TEAMFIGHT") {
                textColors = "text-purple-400 font-bold";
                badgeBg = "bg-purple-950/40 text-purple-400 border border-purple-900/50";
              } else if (e.type === "START" || e.type === "END") {
                textColors = "text-blue-400 font-extrabold";
                badgeBg = "bg-blue-950/40 text-blue-400 border border-blue-900/50";
              }

              return (
                <div key={idx} className="flex gap-3 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <Badge className={`${badgeBg} font-mono px-1.5 py-0.5 rounded text-[10px] h-fit`}>
                    Phút {e.time}
                  </Badge>
                  <p className={textColors}>{e.text}</p>
                </div>
              );
            })}
            <div ref={commentaryEndRef} />
          </div>
        </div>

        {/* Gold Graph (2/5) */}
        <div className="lg:col-span-2 flex flex-col h-[240px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Chênh lệch Vàng</h4>
            </div>
            {chartData.length > 0 && (
              <Badge className={`font-mono text-[10px] ${chartData[chartData.length-1]["Chênh lệch Vàng (Home - Away)"] >= 0 ? "bg-blue-950 text-blue-400 border-blue-900" : "bg-red-950 text-red-400 border-red-900"} border`}>
                {chartData[chartData.length-1]["Chênh lệch Vàng (Home - Away)"] >= 0 ? `+${chartData[chartData.length-1]["Chênh lệch Vàng (Home - Away)"].toLocaleString()}` : `${chartData[chartData.length-1]["Chênh lệch Vàng (Home - Away)"].toLocaleString()}`} Gold
              </Badge>
            )}
          </div>
          <div className="flex-grow p-4 bg-zinc-950/30 flex items-center justify-center">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="minute" stroke="#52525b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: 11, fontWeight: "bold" }}
                    itemStyle={{ color: "#3b82f6", fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Chênh lệch Vàng (Home - Away)"
                    stroke={chartData[chartData.length-1]["Chênh lệch Vàng (Home - Away)"] >= 0 ? "#3b82f6" : "#ef4444"}
                    fill={chartData[chartData.length-1]["Chênh lệch Vàng (Home - Away)"] >= 0 ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)"}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-600 text-xs font-semibold flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                Đang nạp dữ liệu kinh tế...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. DƯỚI CÙNG: CHI TIẾT KDA KÈM TƯỚNG CHỌN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg">
        {/* Home Players */}
        <div>
          <h5 className="text-xs font-bold text-blue-400 mb-2.5 uppercase tracking-wider">{homeTeamName}</h5>
          <div className="space-y-1.5 text-xs">
            {currentHomePlayerStats.map(p => (
              <div key={p.role} className="flex justify-between items-center bg-zinc-950/60 border border-zinc-800/40 p-2 rounded-lg hover:bg-zinc-950">
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-800 text-[9px] px-1 py-0 border-zinc-700 text-zinc-400 font-mono w-7 justify-center">{p.role}</Badge>
                  <span className="font-bold text-zinc-200">{p.name}</span>
                  <span className="text-zinc-500">({CHAMPIONS.find(c=>c.id===p.championId)?.name})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-zinc-300 font-semibold">{p.kills} / {p.deaths} / {p.assists}</span>
                  <Badge className="bg-zinc-800 text-[10px] font-bold border-zinc-700 text-zinc-400 w-9 justify-center">{p.performanceScore}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Away Players */}
        <div>
          <h5 className="text-xs font-bold text-red-400 mb-2.5 uppercase tracking-wider">{awayTeamName}</h5>
          <div className="space-y-1.5 text-xs">
            {currentAwayPlayerStats.map(p => (
              <div key={p.role} className="flex justify-between items-center bg-zinc-950/60 border border-zinc-800/40 p-2 rounded-lg hover:bg-zinc-950">
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-800 text-[9px] px-1 py-0 border-zinc-700 text-zinc-400 font-mono w-7 justify-center">{p.role}</Badge>
                  <span className="font-bold text-zinc-200">{p.name}</span>
                  <span className="text-zinc-500">({CHAMPIONS.find(c=>c.id===p.championId)?.name})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-zinc-300 font-semibold">{p.kills} / {p.deaths} / {p.assists}</span>
                  <Badge className="bg-zinc-800 text-[10px] font-bold border-zinc-700 text-zinc-400 w-9 justify-center">{p.performanceScore}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. ĐIỀU KHIỂN HOẶC BẢNG TỔNG KẾT CHUNG CUỘC */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
        {!isFinished ? (
          <>
            <div className="text-xs text-zinc-400 font-medium">
              Bạn có thể Tạm dừng hoặc Bỏ qua (Skip) để xem trực tiếp kết quả chung cuộc.
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="font-bold border-zinc-700 hover:bg-zinc-800 flex items-center gap-2"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Tạm Dừng" : "Tiếp Tục"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSpeed(speed === 1000 ? 300 : 1000)}
                className="font-bold border-zinc-700 hover:bg-zinc-800 text-xs"
              >
                Tốc độ: {speed === 1000 ? "1x" : "3x"}
              </Button>
              <Button
                onClick={handleSkip}
                className="bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-1.5 text-xs px-4"
              >
                Bỏ qua (Skip)
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 animate-in fade-in zoom-in duration-300">
            {/* MVP Showcase */}
            <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800 w-full md:w-auto shadow-inner">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <Badge className="bg-amber-600 hover:bg-amber-600 font-extrabold text-[9px] mb-1">MVP TRẬN ĐẤU</Badge>
                <h6 className="font-extrabold text-zinc-100 text-sm">
                  {mvpPlayer?.name} <span className="text-xs text-zinc-500 font-semibold">({mvpChamp?.name})</span>
                </h6>
                <p className="text-[10px] text-zinc-400 font-medium">
                  KDA: {mvpPlayer?.kills}/{mvpPlayer?.deaths}/{mvpPlayer?.assists} - Chấm điểm: {mvpPlayer?.performanceScore}/10
                </p>
              </div>
            </div>

            <div className="text-center md:text-right">
              <div className="text-xs text-zinc-400 font-semibold mb-2">Trận đấu đã khép lại thành công!</div>
              <Button
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8 py-5 rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30 w-full md:w-auto justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại Bàn Làm Việc
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loader icon component
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
