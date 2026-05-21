"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface PlayerRadarChartProps {
  stats: {
    subject: string;
    value: number;
  }[];
}

export default function PlayerRadarChart({ stats }: PlayerRadarChartProps) {
  return (
    <div className="w-full h-[240px] flex items-center justify-center bg-zinc-950 rounded-lg p-2 border border-zinc-800">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis 
            dataKey="subject" 
            stroke="#a1a1aa" 
            tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 500 }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            stroke="#52525b" 
            tick={{ fill: "#71717a", fontSize: 9 }} 
          />
          <Radar
            name="Tuyển thủ"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
