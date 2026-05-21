"use client";

import React from "react";
import { 
  Shield, 
  Sword, 
  Flame, 
  Target, 
  Heart, 
  Sparkles, 
  Wand2, 
  Skull, 
  User 
} from "lucide-react";

// Hash function to consistently select style elements
const getHash = (str: string) => {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// Curated premium gradients
const LOGO_GRADIENTS = [
  { from: "#2563eb", to: "#06b6d4" }, // 0: Blue-Cyan (T1, PSG style)
  { from: "#d97706", to: "#facc15" }, // 1: Gold-Yellow (Gen.G style)
  { from: "#dc2626", to: "#f97316" }, // 2: Red-Orange (WBG style)
  { from: "#7c3aed", to: "#db2777" }, // 3: Purple-Pink (Dplus style)
  { from: "#059669", to: "#0d9488" }, // 4: Emerald-Teal (Hanwha style)
  { from: "#e11d48", to: "#be123c" }, // 5: Crimson-Rose (GAM/VCS style)
  { from: "#4f46e5", to: "#2563eb" }, // 6: Indigo-Blue (DK style)
  { from: "#475569", to: "#64748b" }, // 7: Slate-Silver (Neutral style)
];

// Curated badge shapes
const BADGE_SHAPES = [
  // 0: Shield
  "M50 5 L90 20 L90 55 C90 75, 50 95, 50 95 C50 95, 10 75, 10 55 L10 20 Z",
  // 1: Crest
  "M50 5 C75 5, 95 15, 95 40 C95 70, 70 90, 50 95 C30 90, 5 70, 5 40 C5 15, 25 5, 50 5 Z",
  // 2: Hexagon
  "M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z",
  // 3: Diamond
  "M50 5 L95 50 L50 95 L5 50 Z",
  // 4: Octagon
  "M35 5 L65 5 L95 35 L95 65 L65 95 L35 95 L5 65 L5 35 Z",
];

// Helper to extract initials
const getTeamInitials = (name: string) => {
  if (!name) return "";
  // Strip common suffixes
  const cleaned = name
    .replace(/Esports|Gaming|LCP|LPL|LEC|CBLOL|Team|Academy/gi, "")
    .trim();
  
  if (cleaned.length === 0) return name.slice(0, 2).toUpperCase();
  
  // Handled specialized teams
  if (cleaned.toLowerCase() === "t1") return "T1";
  if (cleaned.toLowerCase() === "gen.g") return "GEN";
  if (cleaned.toLowerCase() === "gam") return "GAM";
  if (cleaned.toLowerCase() === "g2") return "G2";
  if (cleaned.toLowerCase() === "psg talon" || cleaned.toLowerCase() === "psg") return "PSG";
  
  const words = cleaned.split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words.map(w => w[0]).join("").slice(0, 3).toUpperCase();
};

interface TeamLogoProps {
  teamName: string;
  size?: number;
  className?: string;
  imageUrl?: string | null;
  abbreviation?: string | null;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ teamName, size = 48, className = "", imageUrl, abbreviation }) => {
  const [imgError, setImgError] = React.useState(false);
  const hash = getHash(teamName);
  const gradient = LOGO_GRADIENTS[hash % LOGO_GRADIENTS.length];
  const path = BADGE_SHAPES[hash % BADGE_SHAPES.length];
  const initials = abbreviation || getTeamInitials(teamName);

  const gradId = `grad-${hash}`;

  // If custom imageUrl provided and not errored, show it
  if (imageUrl && !imgError) {
    return (
      <div
        className={`inline-flex items-center justify-center select-none rounded-md overflow-hidden border border-zinc-700 bg-zinc-900 ${className}`}
        style={{ width: size, height: size }}
        title={teamName}
      >
        <img
          src={imageUrl}
          alt={teamName}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      title={teamName}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Outer Shadow Shield */}
        <path 
          d={path} 
          fill="rgba(15, 23, 42, 0.9)" 
          stroke={`url(#${gradId})`} 
          strokeWidth="6" 
          strokeLinejoin="round"
        />

        {/* Inner Graphic Grid (Decorative lines) */}
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
          clipPath={`url(#clip-${gradId})`}
        />

        {/* Center Initial text with styled glow */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fill="#ffffff"
          fontSize={initials.length >= 3 ? "28" : "34"}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5"
          filter="url(#glow)"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
        >
          {initials}
        </text>

        {/* Small decorative dot at bottom */}
        <circle cx="50" cy="80" r="3" fill="#ffffff" opacity="0.7" />
      </svg>
    </div>
  );
};

interface PlayerAvatarProps {
  playerName: string;
  role: string;
  size?: number;
  className?: string;
  imageUrl?: string | null;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  playerName, 
  role, 
  size = 40, 
  className = "",
  imageUrl
}) => {
  const [imgError, setImgError] = React.useState(false);
  const hash = getHash(playerName);
  const gradient = LOGO_GRADIENTS[hash % LOGO_GRADIENTS.length];
  
  // Render role icon
  const renderRoleIcon = (iconClass: string) => {
    switch (role?.toUpperCase()) {
      case "TOP":
        return <Sword className={iconClass} />;
      case "JUG":
        return <Sparkles className={iconClass} />;
      case "MID":
        return <Flame className={iconClass} />;
      case "BOT":
        return <Target className={iconClass} />;
      case "SUP":
        return <Heart className={iconClass} />;
      default:
        return <User className={iconClass} />;
    }
  };

  const initial = playerName ? playerName.charAt(0).toUpperCase() : "?";

  // If custom imageUrl provided and not errored, show it
  if (imageUrl && !imgError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-900 overflow-hidden ${className}`}
        style={{ width: size, height: size }}
        title={playerName}
      >
        <img
          src={imageUrl}
          alt={playerName}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {/* Player Initial Badge */}
        <div 
          className="absolute -bottom-0.5 -right-0.5 z-20 flex items-center justify-center w-4 h-4 rounded-full border border-slate-950 font-bold text-[8px] text-white shadow-md select-none"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
          }}
        >
          {initial}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-950 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Gradient Ring */}
      <div 
        className="absolute inset-[2px] rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${gradient.from} 0%, ${gradient.to} 100%)`
        }}
      />

      {/* Role Icon In Center */}
      <div className="z-10 flex items-center justify-center text-slate-400">
        {renderRoleIcon("w-1/2 h-1/2 opacity-70")}
      </div>

      {/* Player Initial Badge */}
      <div 
        className="absolute -bottom-1 -right-1 z-20 flex items-center justify-center w-5 h-5 rounded-full border border-slate-950 font-bold text-[10px] text-white shadow-md select-none"
        style={{
          background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
        }}
      >
        {initial}
      </div>
    </div>
  );
};

interface ChampionLogoProps {
  championId: string;
  championName: string;
  role: string;
  type: string;
  tier?: string;
  size?: number;
  className?: string;
  imageUrl?: string | null;
}

export const ChampionLogo: React.FC<ChampionLogoProps> = ({
  championId,
  championName,
  role,
  type,
  tier = "B",
  size = 56,
  className = "",
  imageUrl
}) => {
  const [imgError, setImgError] = React.useState(false);

  // Styles based on champion type
  const getTypeConfig = () => {
    switch (type) {
      case "Tank":
        return {
          gradient: "from-blue-950 to-indigo-900 border-blue-800",
          icon: <Shield className="w-5 h-5 text-blue-400" />,
          textColor: "text-blue-200"
        };
      case "Fighter":
        return {
          gradient: "from-orange-950 to-red-950 border-orange-900",
          icon: <Sword className="w-5 h-5 text-orange-400" />,
          textColor: "text-orange-200"
        };
      case "Assassin":
        return {
          gradient: "from-purple-950 to-zinc-900 border-purple-900",
          icon: <Skull className="w-5 h-5 text-purple-400" />,
          textColor: "text-purple-200"
        };
      case "Mage":
        return {
          gradient: "from-violet-950 to-indigo-950 border-violet-900",
          icon: <Flame className="w-5 h-5 text-violet-400" />,
          textColor: "text-violet-200"
        };
      case "Marksman":
        return {
          gradient: "from-amber-950 to-yellow-950 border-amber-900",
          icon: <Target className="w-5 h-5 text-amber-400" />,
          textColor: "text-amber-200"
        };
      case "Enchanter":
        return {
          gradient: "from-emerald-950 to-teal-950 border-emerald-900",
          icon: <Wand2 className="w-5 h-5 text-emerald-400" />,
          textColor: "text-emerald-200"
        };
      default:
        return {
          gradient: "from-slate-900 to-slate-950 border-slate-800",
          icon: <User className="w-5 h-5 text-slate-400" />,
          textColor: "text-slate-200"
        };
    }
  };

  // Border and glow colors based on tier
  const getTierConfig = () => {
    switch (tier?.toUpperCase()) {
      case "S":
        return "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]";
      case "A":
        return "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
      case "B":
        return "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]";
      case "C":
        return "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.15)]";
      case "D":
        return "border-slate-500 shadow-none";
      default:
        return "border-slate-700 shadow-none";
    }
  };

  const typeConfig = getTypeConfig();
  const tierBorder = getTierConfig();
  const displayInitials = championName ? championName.slice(0, 2).toUpperCase() : "??";

  return (
    <div
      className={`relative rounded-md border flex flex-col justify-between overflow-hidden bg-slate-950 select-none group transition-all duration-300 hover:scale-105 ${typeConfig.gradient} ${tierBorder} ${className}`}
      style={{ width: size, height: size }}
      title={`${championName} (${type} - Tier ${tier})`}
    >
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={championName}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          {/* Huge subtle initials in the background */}
          <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[28px] text-white/5 tracking-tighter select-none pointer-events-none group-hover:scale-110 transition-transform duration-300">
            {displayInitials}
          </span>

          {/* Icon in Center */}
          <div className="flex items-center justify-center py-0.5 z-10 absolute inset-0 m-auto w-fit h-fit">
            {typeConfig.icon}
          </div>
        </>
      )}

      {/* Role and Tier markers at top */}
      <div className="flex justify-between items-center px-1 pt-1 z-10 w-full">
        <span className="text-[8px] font-bold px-1 py-0.25 rounded bg-black/60 text-slate-300">
          {role}
        </span>
        <span 
          className={`text-[9px] font-extrabold px-1 rounded bg-black/75 ${
            tier === "S" ? "text-rose-400" :
            tier === "A" ? "text-amber-400" :
            tier === "B" ? "text-blue-400" :
            tier === "C" ? "text-emerald-400" : "text-slate-400"
          }`}
        >
          {tier}
        </span>
      </div>

      {/* Champion Name Bar at bottom */}
      <div className="w-full bg-black/85 py-0.75 text-center z-10 border-t border-white/5 mt-auto">
        <span className="text-[7.5px] font-semibold text-white/90 truncate block px-0.5 leading-none">
          {championName}
        </span>
      </div>
    </div>
  );
};

