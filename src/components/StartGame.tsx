"use client";

import React, { useState, useTransition } from "react";
import { selectTeamAction } from "@/lib/game/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShieldAlert, Award, User, Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  role: string;
  age: number;
  nationality: string;
  laning: number;
  teamfight: number;
  macro: number;
  mentality: number;
  championPool: number;
}

interface Team {
  id: string;
  name: string;
  region: string;
  budget: number;
  salaryCap: number;
  players: Player[];
}

interface StartGameProps {
  teams: Team[];
}

export default function StartGame({ teams }: StartGameProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSelectTeam = (teamId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await selectTeamAction(teamId);
      if (!res.success) {
        setError(res.error || "Có lỗi xảy ra khi chọn đội.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent mb-2">
            LOL LEGEND '26
          </h1>
          <p className="text-zinc-400 text-lg font-medium">
            Chọn đội tuyển khởi nghiệp huấn luyện viên chuyên nghiệp của bạn
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-400 max-w-2xl mx-auto">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {teams.map((team) => {
            const avgRating = Math.round(
              team.players.reduce(
                (sum, p) => sum + (p.laning + p.teamfight + p.macro + p.mentality + p.championPool) / 5,
                0
              ) / team.players.length
            );

            const isSelected = selectedTeam?.id === team.id;

            return (
              <Card
                key={team.id}
                className={`cursor-pointer transition-all duration-300 bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:shadow-lg hover:shadow-zinc-950/50 flex flex-col relative overflow-hidden ${
                  isSelected ? "ring-2 ring-blue-500 border-transparent bg-zinc-900" : ""
                }`}
                onClick={() => setSelectedTeam(team)}
              >
                {/* Region Ribbon */}
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-tl-none rounded-br-none bg-blue-600 hover:bg-blue-600 font-bold px-2 py-0.5">
                    {team.region}
                  </Badge>
                </div>

                <CardHeader className="pb-3 pt-6">
                  <CardTitle className="text-lg font-bold text-zinc-100 truncate">{team.name}</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">Đánh giá chung: {avgRating}/100</CardDescription>
                </CardHeader>

                <CardContent className="flex-grow pb-4 text-xs space-y-3">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>$${(team.budget / 1000000).toFixed(1)}M Ngân sách</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Đội hình ra sân</div>
                    {team.players.map((p) => {
                      const pRating = Math.round((p.laning + p.teamfight + p.macro + p.mentality + p.championPool) / 5);
                      return (
                        <div key={p.id} className="flex justify-between items-center text-zinc-400 py-0.5 border-b border-zinc-800/40">
                          <span className="font-semibold text-zinc-500 w-7">{p.role}</span>
                          <span className="truncate flex-grow text-zinc-300 pl-1">{p.name}</span>
                          <span className="font-medium text-zinc-400">{pRating}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedTeam && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 max-w-4xl mx-auto shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h3 className="text-2xl font-bold text-zinc-100">{selectedTeam.name}</h3>
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-bold">{selectedTeam.region}</Badge>
              </div>
              <p className="text-zinc-400 text-sm max-w-xl">
                Bằng việc chọn {selectedTeam.name}, bạn sẽ tiếp quản đội hình gồm 5 tuyển thủ trên và trực tiếp thi đấu giải {selectedTeam.region} quốc nội. Hãy dẫn dắt họ tới chức vô địch khu vực và đoạt tấm vé đi thẳng tới đấu trường quốc tế First Stand và Worlds!
              </p>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-500 text-zinc-50 font-bold px-8 py-6 rounded-lg text-base shadow-lg shadow-blue-900/30 flex items-center gap-2 w-full md:w-auto"
              onClick={() => handleSelectTeam(selectedTeam.id)}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang khởi tạo game...
                </>
              ) : (
                <>
                  Bắt đầu sự nghiệp với {selectedTeam.name}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
