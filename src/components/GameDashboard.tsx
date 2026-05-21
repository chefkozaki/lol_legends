"use client";

import React, { useState, useTransition, useEffect } from "react";
import { advanceDayAction, readMailAction, signFreeAgentAction, releasePlayerAction, submitDraftAndPlayAction } from "@/lib/game/actions";
import { MatchSimulationResult } from "@/lib/game/engine";
import { logoutAction } from "@/lib/game/authActions";
import { adminUpdatePlayerAction, adminUpdateTeamAction, adminGetUsersAction, adminDeleteUserAction, adminCreateTeamAction, adminCreatePlayerAction, adminUpdateChampionTiersAction, adminSendGlobalMailAction } from "@/lib/game/adminActions";
import { CHAMPIONS } from "@/lib/game/champions";
import PlayerRadarChart from "./PlayerRadarChart";
import DraftScreen from "./DraftScreen";
import { TeamLogo, PlayerAvatar } from "@/components/ui/game-logo";
import MatchLiveScreen from "./MatchLiveScreen";
import MatchPrepScreen from "./MatchPrepScreen";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Mail as MailIcon, 
  Users, 
  Settings2, 
  Calendar, 
  Search, 
  DollarSign, 
  CalendarDays, 
  ChevronLeft,
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  Trash2,
  Shield,
  Sword,
  Flame,
  Skull,
  Target,
  Wand2,
  LogOut,
  Sliders,
  Flag,
  UserCheck,
  Database,
  Trophy,
  Send
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  realName: string | null;
  avatarUrl?: string | null;
  role: string;
  age: number;
  nationality: string;
  laning: number;
  teamfight: number;
  macro: number;
  mentality: number;
  championPool: number;
  salary: number;
  value: number;
  contractEnd: number;
  teamId?: string | null;
}

interface Team {
  id: string;
  name: string;
  abbreviation?: string | null;
  logoUrl?: string | null;
  region: string;
  budget: number;
  salaryCap: number;
  wins: number;
  losses: number;
  points: number;
  isUser: boolean;
  players: Player[];
}

interface Match {
  id: string;
  date: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  played: boolean;
  matchEvents: string | null;
  homeTeam: { name: string; region: string; abbreviation?: string | null; logoUrl?: string | null };
  awayTeam: { name: string; region: string; abbreviation?: string | null; logoUrl?: string | null };
}

interface Mail {
  id: string;
  title: string;
  content: string;
  date: string;
  sender: string;
  read: boolean;
  category: string;
}

interface GameState {
  id: number;
  currentDate: string;
  dayOfSeason: number;
  week: number;
  userTeamId: string | null;
  seasonState: string;
}

function getSeasonStateLabel(state: string): string {
  const mapping: Record<string, string> = {
    FIRST_STAND_QF: "First Stand - Tứ Kết",
    FIRST_STAND_SF: "First Stand - Bán Kết",
    FIRST_STAND_F: "First Stand - Chung Kết",
    REGIONAL_SEASON: "Mùa Giải Khu Vực",
    REGIONAL_REGULAR: "Vòng Bảng Khu Vực",
    REGIONAL_PLAYOFF_SF: "Playoffs Khu Vực - Bán Kết",
    REGIONAL_PLAYOFF_F: "Playoffs Khu Vực - Chung Kết",
    MSI_GROUPS: "MSI - Vòng Bảng",
    MSI_PLAYOFF_SF: "MSI - Bán Kết",
    MSI_PLAYOFF_F: "MSI - Chung Kết",
    EWC_QF: "EWC - Tứ Kết",
    EWC_SF: "EWC - Bán Kết",
    EWC_F: "EWC - Chung Kết",
    WORLDS_GROUPS: "Worlds - Vòng Bảng",
    WORLDS_PLAYOFF_QF: "Worlds - Tứ Kết",
    WORLDS_PLAYOFF_SF: "Worlds - Bán Kết",
    WORLDS_PLAYOFF_F: "Worlds - Chung Kết",
    OFF_SEASON: "Kỳ Chuyển Nhượng"
  };
  return mapping[state] || state;
}

interface GameDashboardProps {
  initialGameState: GameState;
  userTeam: Team;
  allTeamsInRegion: Team[];
  allTeams: Team[];
  userMatches: Match[];
  allMails: Mail[];
  freeAgents: Player[];
  currentUser?: {
    id: string;
    username: string;
    displayName: string;
    role: string;
  };
  initialChampionTiers?: Record<string, string>;
  initialChampionImages?: Record<string, string>;
  initialTournaments?: Record<string, { name: string; imageUrl: string | null }>;
}

export default function GameDashboard({
  initialGameState,
  userTeam,
  allTeamsInRegion,
  allTeams,
  userMatches,
  allMails,
  freeAgents,
  currentUser,
  initialChampionTiers,
  initialChampionImages,
  initialTournaments
}: GameDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(allMails[0]?.id || null);
  const selectedMail = allMails.find(m => m.id === selectedMailId) || allMails[0] || null;
  const [autoMarkRead, setAutoMarkRead] = useState<boolean>(true);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Champion Tiers State
  const [championTiers, setChampionTiers] = useState<Record<string, string>>(initialChampionTiers || {});

  const handleMoveChamp = (champId: string, newTier: string) => {
    setChampionTiers(prev => ({
      ...prev,
      [champId]: newTier
    }));
  };

  const handleSaveTiers = () => {
    startTransition(async () => {
      const res = await adminUpdateChampionTiersAction(championTiers, championImages);
      if (res.success) {
        setErrorMsg("Cập nhật tier list tướng thành công!");
        setTimeout(() => setErrorMsg(null), 3000);
      } else {
        setErrorMsg("Lỗi khi cập nhật tier list: " + res.error);
      }
    });
  };

  // Tactical Focus State (giữ ở Client State)
  const [tacticalFocus, setTacticalFocus] = useState<string>("balanced");
  const [scoutingRoleFilter, setScoutingRoleFilter] = useState<string>("ALL");

  // Quản lý trạng thái Match Day
  const [matchDayState, setMatchDayState] = useState<{ matchId: string; date: string } | null>(null);
  const [draftMode, setDraftMode] = useState<boolean>(false);
  const [showPrepScreen, setShowPrepScreen] = useState<boolean>(false);
  const [matchResult, setMatchResult] = useState<MatchSimulationResult | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Database States
  const [dbSubTab, setDbSubTab] = useState<"teams" | "players">("teams");
  const [dbSearch, setDbSearch] = useState<string>("");
  const [dbRegionFilter, setDbRegionFilter] = useState<string>("ALL");
  const [dbRoleFilter, setDbRoleFilter] = useState<string>("ALL");
  const [dbSortField, setDbSortField] = useState<string>("default");
  const [dbSortOrder, setDbSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState<Team | null>(null);

  // Champion Images State
  const [championImages, setChampionImages] = useState<Record<string, string>>(initialChampionImages || {});
  // Tournaments State
  const [tournaments, setTournaments] = useState<Record<string, { name: string; imageUrl: string | null }>>(initialTournaments || {});

  // --- TRẠNG THÁI CHO ADMIN PANEL ---
  const [adminSubTab, setAdminSubTab] = useState<string>("players");
  const [adminPlayerMode, setAdminPlayerMode] = useState<"edit" | "create">("edit");
  const [adminTeamMode, setAdminTeamMode] = useState<"edit" | "create">("edit");

  const [adminSelectedPlayerId, setAdminSelectedPlayerId] = useState<string>("");
  const [adminPlayerForm, setAdminPlayerForm] = useState({
    name: "",
    role: "TOP",
    age: 18,
    nationality: "Vietnam",
    laning: 80,
    teamfight: 80,
    macro: 80,
    mentality: 80,
    championPool: 80,
    salary: 100000,
    value: 1000000,
    avatarUrl: "",
  });
  const [adminPlayerTeamId, setAdminPlayerTeamId] = useState<string>("free");

  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState<string>("");
  const [adminTeamName, setAdminTeamName] = useState<string>("");
  const [adminTeamRegion, setAdminTeamRegion] = useState<string>("LCK");
  const [adminTeamForm, setAdminTeamForm] = useState({
    budget: 5000000,
    salaryCap: 10000000,
    wins: 0,
    losses: 0,
    points: 0,
    logoUrl: "",
    abbreviation: "",
  });

  const [adminUsers, setAdminUsers] = useState<{
    id: string;
    username: string;
    displayName: string;
    role: string;
    createdAt: string | Date;
    _count: {
      teams: number;
      mails: number;
    };
  }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Trạng thái cập nhật ảnh Tướng (Admin)
  const [adminEditingChampId, setAdminEditingChampId] = useState<string | null>(null);
  const [adminChampImageUrl, setAdminChampImageUrl] = useState<string>("");

  // Trạng thái cho form gửi thư toàn server
  const [adminMailForm, setAdminMailForm] = useState({
    title: "",
    sender: "Ban Quản Trị LL26",
    content: "",
    category: "GENERAL"
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1 * 1024 * 1024) {
      alert("Kích thước ảnh không được vượt quá 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gom toàn bộ tuyển thủ trong Save Game để Admin chỉnh sửa
  const allPlayersInSaveGame = [
    ...freeAgents.map(p => ({ ...p, teamName: "Tự Do", teamId: null, teamLogoUrl: null })),
    ...allTeamsInRegion.flatMap(t => 
      t.players.map(p => ({ ...p, teamName: t.name, teamId: t.id, teamLogoUrl: t.logoUrl }))
    )
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Tự động điền dữ liệu của Player khi Admin chọn
  useEffect(() => {
    if (adminSelectedPlayerId && adminPlayerMode === "edit") {
      const p = allPlayersInSaveGame.find(x => x.id === adminSelectedPlayerId);
      if (p) {
        setTimeout(() => {
          setAdminPlayerForm({
            name: p.name,
            role: p.role,
            age: p.age,
            nationality: p.nationality,
            laning: p.laning,
            teamfight: p.teamfight,
            macro: p.macro,
            mentality: p.mentality,
            championPool: p.championPool,
            salary: p.salary,
            value: p.value,
            avatarUrl: p.avatarUrl || "",
          });
          setAdminPlayerTeamId(p.teamId || "free");
        }, 0);
      }
    }
  }, [adminSelectedPlayerId, adminPlayerMode]);

  // Tự động điền dữ liệu của Team khi Admin chọn
  useEffect(() => {
    if (adminSelectedTeamId && adminTeamMode === "edit") {
      const t = allTeamsInRegion.find(x => x.id === adminSelectedTeamId);
      if (t) {
        setTimeout(() => {
          setAdminTeamForm({
            budget: t.budget,
            salaryCap: t.salaryCap,
            wins: t.wins,
            losses: t.losses,
            points: t.points,
            logoUrl: t.logoUrl || "",
            abbreviation: (t as any).abbreviation || "",
          });
        }, 0);
      }
    }
  }, [adminSelectedTeamId, adminTeamMode]);

  // Reset form khi chuyển sang mode create
  useEffect(() => {
    if (adminPlayerMode === "create") {
      setTimeout(() => {
        setAdminSelectedPlayerId("");
        setAdminPlayerForm({
          name: "",
          role: "TOP",
          age: 18,
          nationality: "Vietnam",
          laning: 80,
          teamfight: 80,
          macro: 80,
          mentality: 80,
          championPool: 80,
          salary: 100000,
          value: 1000000,
          avatarUrl: "",
        });
        setAdminPlayerTeamId("free");
      }, 0);
    }
  }, [adminPlayerMode]);

  useEffect(() => {
    if (adminTeamMode === "create") {
      setTimeout(() => {
        setAdminSelectedTeamId("");
        setAdminTeamName("");
        setAdminTeamRegion("LCK");
        setAdminTeamForm({
          budget: 5000000,
          salaryCap: 10000000,
          wins: 0,
          losses: 0,
          points: 0,
          logoUrl: "",
          abbreviation: "",
        });
      }, 0);
    }
  }, [adminTeamMode]);

  // Tải danh sách user khi vào tab phụ Accounts
  useEffect(() => {
    if (activeTab === "admin" && adminSubTab === "accounts" && currentUser?.role === "ADMIN") {
      fetchUsers();
    }
  }, [activeTab, adminSubTab]);

  async function fetchUsers() {
    setLoadingUsers(true);
    const res = await adminGetUsersAction();
    if (res.success && res.users) {
      setAdminUsers(res.users);
    } else {
      alert(res.error || "Không thể tải danh sách tài khoản.");
    }
    setLoadingUsers(false);
  }

  const handleAdminUpdatePlayer = () => {
    if (!adminSelectedPlayerId) return;
    startTransition(async () => {
      const res = await adminUpdatePlayerAction(adminSelectedPlayerId, adminPlayerForm);
      if (res.success) {
        alert("Cập nhật chỉ số tuyển thủ thành công!");
      } else {
        alert(res.error);
      }
    });
  };

  const handleAdminCreatePlayer = () => {
    if (!adminPlayerForm.name.trim()) {
      alert("Vui lòng nhập tên tuyển thủ");
      return;
    }
    startTransition(async () => {
      const res = await adminCreatePlayerAction({
        name: adminPlayerForm.name,
        realName: adminPlayerForm.name,
        role: adminPlayerForm.role,
        age: adminPlayerForm.age,
        nationality: adminPlayerForm.nationality,
        laning: adminPlayerForm.laning,
        teamfight: adminPlayerForm.teamfight,
        macro: adminPlayerForm.macro,
        mentality: adminPlayerForm.mentality,
        championPool: adminPlayerForm.championPool,
        salary: adminPlayerForm.salary,
        value: adminPlayerForm.value,
        avatarUrl: adminPlayerForm.avatarUrl || undefined,
        teamId: adminPlayerTeamId === "free" ? null : adminPlayerTeamId,
      });
      if (res.success) {
        alert("Thêm tuyển thủ mới thành công!");
        setAdminPlayerMode("edit");
      } else {
        alert(res.error);
      }
    });
  };

  const handleAdminUpdateTeam = () => {
    if (!adminSelectedTeamId) return;
    startTransition(async () => {
      const res = await adminUpdateTeamAction(adminSelectedTeamId, adminTeamForm);
      if (res.success) {
        alert("Cập nhật thông tin đội tuyển thành công!");
      } else {
        alert(res.error);
      }
    });
  };

  const handleAdminCreateTeam = () => {
    if (!adminTeamName.trim()) {
      alert("Vui lòng nhập tên đội tuyển");
      return;
    }
    startTransition(async () => {
      const res = await adminCreateTeamAction({
        name: adminTeamName,
        region: adminTeamRegion,
        budget: adminTeamForm.budget,
        salaryCap: adminTeamForm.salaryCap,
        logoUrl: adminTeamForm.logoUrl || undefined,
        abbreviation: adminTeamForm.abbreviation || undefined,
      });
      if (res.success) {
        alert("Thêm đội tuyển mới thành công!");
        setAdminTeamMode("edit");
      } else {
        alert(res.error);
      }
    });
  };

  const handleAdminDeleteUser = async (userId: string) => {
    if (!confirm("CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản người dùng và toàn bộ dữ liệu Save Game của họ. Bạn có chắc chắn muốn tiếp tục?")) return;
    const res = await adminDeleteUserAction(userId);
    if (res.success) {
      alert("Đã xóa tài khoản thành công!");
      fetchUsers();
    } else {
      alert(res.error);
    }
  };

  const handleAdminSendGlobalMail = () => {
    if (!adminMailForm.title.trim() || !adminMailForm.content.trim() || !adminMailForm.sender.trim()) {
      alert("Vui lòng điền đầy đủ tiêu đề, nội dung và người gửi.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await adminSendGlobalMailAction(adminMailForm);
      if (res.success) {
        alert("Đã gửi thư tới toàn bộ tài khoản thành công!");
        setAdminMailForm({
          title: "",
          sender: "Ban Quản Trị LL26",
          content: "",
          category: "GENERAL"
        });
      } else {
        alert(res.error || "Có lỗi xảy ra khi gửi thư.");
      }
    });
  };

  // 1. Tiến ngày (Advance Day)
  const handleAdvanceDay = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await advanceDayAction();
      if (res.status === "MATCH_DAY" && res.matchId && res.date) {
        setMatchDayState({ matchId: res.matchId, date: res.date });
        setShowPrepScreen(true);
      } else if (res.status === "SUCCESS") {
        setSelectedMailId(allMails[0]?.id || null);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  // 2. Click đọc thư
  const handleSelectMail = (mail: Mail) => {
    setSelectedMailId(mail.id);
    if (autoMarkRead && !mail.read) {
      startTransition(async () => {
        const res = await readMailAction(mail.id);
        if (!res.success) {
          console.error("Lỗi đọc thư:", res.error);
        }
      });
    }
  };

  const handleMarkMailAsRead = (mailId: string) => {
    startTransition(async () => {
      const res = await readMailAction(mailId);
      if (!res.success) {
        console.error("Lỗi đọc thư:", res.error);
      }
    });
  };

  // 3. Ký hợp đồng tuyển thủ tự do
  const handleSignPlayer = (playerId: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await signFreeAgentAction(playerId);
      if (!res.success) {
        setErrorMsg(res.error);
      } else {
        alert("Ký hợp đồng thành công! Vui lòng kiểm tra Inbox của bạn.");
      }
    });
  };

  // 4. Sa thải tuyển thủ
  const handleReleasePlayer = (playerId: string) => {
    if (!confirm("Bạn có chắc chắn muốn giải phóng hợp đồng của tuyển thủ này không?")) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await releasePlayerAction(playerId);
      if (!res.success) {
        setErrorMsg(res.error);
      } else {
        setSelectedPlayer(null);
      }
    });
  };

  // 5. Cấm chọn xong & bắt đầu giả lập trận đấu
  const handleDraftComplete = (draft: { bans: string[]; picks: Record<string, string> }, opponentDraft?: { bans: string[]; picks: Record<string, string> }) => {
    if (!matchDayState) return;
    
    startTransition(async () => {
      const res = await submitDraftAndPlayAction(matchDayState.matchId, draft, opponentDraft);
      if (res.success) {
        setMatchResult(res.result || null);
        setDraftMode(false);
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  const handleLogout = async () => {
    if (!confirm("Bạn có chắc muốn đăng xuất?")) return;
    await logoutAction();
    window.location.reload();
  };

  // Bảng xếp hạng được sắp xếp
  const sortedStandings = [...allTeamsInRegion].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.points - a.points;
  });

  // Ước lượng tổng quỹ lương
  const currentTotalSalary = userTeam.players.reduce((sum, p) => sum + p.salary, 0);

  // --- DATABASE EXPLORER CALCULATIONS ---
  const allSavePlayers = React.useMemo(() => {
    const list: (Player & { teamName?: string; teamLogoUrl?: string | null })[] = [];
    if (allTeams) {
      allTeams.forEach(t => {
        if (t.players) {
          t.players.forEach(p => {
            list.push({
              ...p,
              teamId: t.id,
              teamName: t.name,
              teamLogoUrl: t.logoUrl
            });
          });
        }
      });
    }
    if (freeAgents) {
      freeAgents.forEach(p => {
        list.push({
          ...p,
          teamId: null,
          teamName: "Tự Do",
          teamLogoUrl: null
        });
      });
    }
    return list;
  }, [allTeams, freeAgents]);

  const filteredTeams = React.useMemo(() => {
    if (!allTeams) return [];
    let result = [...allTeams];
    
    if (dbSearch.trim()) {
      const q = dbSearch.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    
    if (dbRegionFilter !== "ALL") {
      result = result.filter(t => t.region === dbRegionFilter);
    }
    
    if (dbSortField !== "default") {
      result.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (dbSortField === "wins") {
          valA = a.wins;
          valB = b.wins;
        } else if (dbSortField === "points") {
          valA = a.points;
          valB = b.points;
        } else if (dbSortField === "budget") {
          valA = a.budget;
          valB = b.budget;
        } else if (dbSortField === "salary") {
          valA = a.players ? a.players.reduce((sum, p) => sum + p.salary, 0) : 0;
          valB = b.players ? b.players.reduce((sum, p) => sum + p.salary, 0) : 0;
        } else if (dbSortField === "players") {
          valA = a.players ? a.players.length : 0;
          valB = b.players ? b.players.length : 0;
        }
        return dbSortOrder === "asc" ? valA - valB : valB - valA;
      });
    }
    return result;
  }, [allTeams, dbSearch, dbRegionFilter, dbSortField, dbSortOrder]);

  const filteredPlayers = React.useMemo(() => {
    let result = [...allSavePlayers];
    
    if (dbSearch.trim()) {
      const q = dbSearch.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || (p.realName && p.realName.toLowerCase().includes(q)));
    }
    
    if (dbRegionFilter !== "ALL") {
      result = result.filter(p => {
        if (!p.teamId) return false;
        const team = allTeams.find(t => t.id === p.teamId);
        return team ? team.region === dbRegionFilter : false;
      });
    }
    
    if (dbRoleFilter !== "ALL") {
      result = result.filter(p => p.role === dbRoleFilter);
    }
    
    if (dbSortField !== "default") {
      result.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        const avgA = Math.round((a.laning + a.teamfight + a.macro + a.mentality + a.championPool) / 5);
        const avgB = Math.round((b.laning + b.teamfight + b.macro + b.mentality + b.championPool) / 5);
        
        if (dbSortField === "rating") {
          valA = avgA;
          valB = avgB;
        } else if (dbSortField === "salary") {
          valA = a.salary;
          valB = b.salary;
        } else if (dbSortField === "value") {
          valA = a.value;
          valB = b.value;
        } else if (dbSortField === "age") {
          valA = a.age;
          valB = b.age;
        } else if (dbSortField === "name") {
          const strA = a.name.toLowerCase();
          const strB = b.name.toLowerCase();
          return dbSortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
        return dbSortOrder === "asc" ? valA - valB : valB - valA;
      });
    }
    return result;
  }, [allSavePlayers, allTeams, dbSearch, dbRegionFilter, dbRoleFilter, dbSortField, dbSortOrder]);

  // --- RENDERING DRAFT HOẶC MATCH LIVE ---
  if (showPrepScreen && matchDayState) {
    const match = userMatches.find(m => m.id === matchDayState.matchId);
    const homeTeam = allTeamsInRegion.find(t => t.name === match?.homeTeam.name);
    const awayTeam = allTeamsInRegion.find(t => t.name === match?.awayTeam.name);

    if (homeTeam && awayTeam) {
      const homePrepTeam = {
        id: homeTeam.id,
        name: homeTeam.name,
        logoUrl: homeTeam.logoUrl,
        abbreviation: homeTeam.abbreviation,
        wins: homeTeam.wins,
        losses: homeTeam.losses,
        players: homeTeam.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          laning: p.laning,
          teamfight: p.teamfight,
          macro: p.macro,
          mentality: p.mentality,
          championPool: p.championPool,
          age: p.age,
          nationality: p.nationality
        }))
      };

      const awayPrepTeam = {
        id: awayTeam.id,
        name: awayTeam.name,
        logoUrl: awayTeam.logoUrl,
        abbreviation: awayTeam.abbreviation,
        wins: awayTeam.wins,
        losses: awayTeam.losses,
        players: awayTeam.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          laning: p.laning,
          teamfight: p.teamfight,
          macro: p.macro,
          mentality: p.mentality,
          championPool: p.championPool,
          age: p.age,
          nationality: p.nationality
        }))
      };

      return (
        <MatchPrepScreen
          homeTeam={homePrepTeam}
          awayTeam={awayPrepTeam}
          currentDate={initialGameState.currentDate}
          currentWeek={initialGameState.week}
          onStartMatch={() => {
            setShowPrepScreen(false);
            setDraftMode(true);
          }}
          onClose={() => {
            setShowPrepScreen(false);
            setMatchDayState(null);
          }}
        />
      );
    }
  }

  if (draftMode && matchDayState) {
    const match = userMatches.find(m => m.id === matchDayState.matchId);
    const opponentName = match?.homeTeamId === userTeam.id ? match?.awayTeam.name : match?.homeTeam.name;
    const isUserHome = match?.homeTeamId === userTeam.id;
    const opponentTeamId = isUserHome ? match?.awayTeamId : match?.homeTeamId;
    const opponentTeam = allTeamsInRegion.find(t => t.id === opponentTeamId);
    const opponentPlayers = opponentTeam?.players || [];

    const homeTeam = allTeamsInRegion.find(t => t.name === match?.homeTeam.name);
    const awayTeam = allTeamsInRegion.find(t => t.name === match?.awayTeam.name);
    const homeWins = homeTeam?.wins ?? 0;
    const homeLosses = homeTeam?.losses ?? 0;
    const awayWins = awayTeam?.wins ?? 0;
    const awayLosses = awayTeam?.losses ?? 0;

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center w-full">
        <DraftScreen
          matchId={matchDayState.matchId}
          homeTeamName={match?.homeTeam.name || ""}
          awayTeamName={match?.awayTeam.name || ""}
          homeTeamAbbreviation={homeTeam?.abbreviation}
          awayTeamAbbreviation={awayTeam?.abbreviation}
          homeTeamLogoUrl={homeTeam?.logoUrl}
          awayTeamLogoUrl={awayTeam?.logoUrl}
          isUserHome={!!isUserHome}
          userTeamName={userTeam.name}
          opponentTeamName={opponentName || ""}
          opponentPlayers={opponentPlayers}
          userPlayers={userTeam.players || []}
          onDraftComplete={handleDraftComplete}
          isPending={isPending}
          championTiers={championTiers}
          championImages={championImages}
          currentDate={initialGameState.currentDate}
          currentWeek={initialGameState.week}
          homeWins={homeWins}
          homeLosses={homeLosses}
          awayWins={awayWins}
          awayLosses={awayLosses}
        />
      </div>
    );
  }

  if (matchResult && matchDayState) {
    const match = userMatches.find(m => m.id === matchDayState.matchId);
    const opponentName = match?.homeTeamId === userTeam.id ? match?.awayTeam.name : match?.homeTeam.name;
    const isUserHome = match?.homeTeamId === userTeam.id;

    return (
      <div className="h-screen max-h-screen overflow-hidden bg-zinc-950 p-4 lg:p-6 flex items-center justify-center">
        <div className="w-full max-w-6xl">
          <MatchLiveScreen
            result={matchResult}
            homeTeamName={match?.homeTeam.name || ""}
            awayTeamName={match?.awayTeam.name || ""}
            homeTeamAbbreviation={match?.homeTeam.abbreviation}
            awayTeamAbbreviation={match?.awayTeam.abbreviation}
            isUserHome={!!isUserHome}
            onClose={() => {
              setMatchResult(null);
              setMatchDayState(null);
              setActiveTab("inbox");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* 1. HEADER */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <TeamLogo teamName={userTeam.name} size={68} imageUrl={userTeam.logoUrl} />
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-100 flex items-center gap-2">
              LOL LEGEND &apos;26
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] py-0 font-normal">v1.0</Badge>
            </h1>
            <p className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              Đội tuyển: <span className="text-emerald-400 font-bold">{userTeam.name}</span> ({userTeam.region})
              <span className="text-zinc-600">|</span>
              HLV: <span className="text-zinc-200 font-bold">{currentUser?.displayName}</span>
              {currentUser?.role === "ADMIN" && (
                <Badge className="bg-rose-950 text-rose-400 border-rose-900 text-[9px] py-0 px-1 font-bold">ADMIN</Badge>
              )}
            </p>
          </div>
        </div>

        {/* Thông tin nhanh về tài chính & ngày hiện tại */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-300">
          <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-850">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span>Giải đấu: <span className="text-yellow-400 font-bold">{getSeasonStateLabel(initialGameState.seasonState)}</span></span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-850">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ngân sách: <span className="text-emerald-400 font-bold">${userTeam.budget.toLocaleString()}</span></span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-850">
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
            <span>Ngày: <span className="text-blue-400 font-bold">{initialGameState.currentDate}</span> (Tuần {initialGameState.week})</span>
          </div>

          {/* NÚT TIẾN NGÀY CHỦ ĐẠO */}
          <Button
            onClick={handleAdvanceDay}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-500 font-bold px-4 py-5 rounded-lg text-xs shadow-md shadow-red-900/30 text-zinc-50 flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-zinc-50" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>ĐANG TIẾN NGÀY...</span>
              </>
            ) : (
              <>
                Tiếp Tục (Advance)
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* NÚT ĐĂNG XUẤT */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 py-5 font-bold text-xs"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* 2. CHÍNH GIỮA: SIDEBAR VÀ NỘI DUNG CHÍNH */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`w-full ${isSidebarCollapsed ? "md:w-16" : "md:w-60"} bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 space-y-1 shrink-0 transition-all duration-300 relative`}>
          {/* Toggle Button for Desktop */}
          <div className="hidden md:flex justify-end mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 w-8 h-8 rounded-lg flex items-center justify-center"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "inbox"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("inbox")}
            title={isSidebarCollapsed ? "Hộp Thư (Inbox)" : undefined}
          >
            {activeTab === "inbox" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <MailIcon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "inbox" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Hộp Thư (Inbox)</span>
            
            {allMails.filter(m => !m.read).length > 0 && (
              isSidebarCollapsed ? (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full md:block hidden" />
              ) : (
                <Badge className="bg-red-600 text-zinc-100 border-none ml-auto text-[10px] px-1.5 py-0 md:inline-flex hidden">
                  {allMails.filter(m => !m.read).length}
                </Badge>
              )
            )}
            
            {allMails.filter(m => !m.read).length > 0 && (
              <Badge className="bg-red-600 text-zinc-100 border-none ml-auto text-[10px] px-1.5 py-0 md:hidden">
                {allMails.filter(m => !m.read).length}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "squad"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("squad")}
            title={isSidebarCollapsed ? "Đội Hình (Squad)" : undefined}
          >
            {activeTab === "squad" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <Users className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "squad" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Đội Hình (Squad)</span>
          </Button>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "tactics"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("tactics")}
            title={isSidebarCollapsed ? "Chiến Thuật (Tactics)" : undefined}
          >
            {activeTab === "tactics" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <Settings2 className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "tactics" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Chiến Thuật (Tactics)</span>
          </Button>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "schedule"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("schedule")}
            title={isSidebarCollapsed ? "Lịch Thi Đấu & BXH" : undefined}
          >
            {activeTab === "schedule" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <Calendar className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "schedule" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Lịch Thi Đấu & BXH</span>
          </Button>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "scouting"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("scouting")}
            title={isSidebarCollapsed ? "Thị Trường Tự Do" : undefined}
          >
            {activeTab === "scouting" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <Search className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "scouting" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Thị Trường Tự Do</span>
          </Button>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "tierlist"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("tierlist")}
            title={isSidebarCollapsed ? "Tier List Tướng" : undefined}
          >
            {activeTab === "tierlist" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <Sliders className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "tierlist" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Tier List Tướng</span>
          </Button>

          <Button
            variant="ghost"
            className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
              activeTab === "database"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20"
                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-700/30"
            }`}
            onClick={() => setActiveTab("database")}
            title={isSidebarCollapsed ? "Cơ sở dữ liệu" : undefined}
          >
            {activeTab === "database" && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r animate-fade-in" />
            )}
            <Database className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              activeTab === "database" ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
            }`} />
            <span className={isSidebarCollapsed ? "md:hidden" : ""}>Cơ sở dữ liệu</span>
          </Button>

          {/* TAB QUẢN TRỊ ADMIN ĐỘC QUYỀN */}
          {currentUser?.role === "ADMIN" && (
            <Button
              variant="ghost"
              className={`justify-start ${isSidebarCollapsed ? "md:justify-center" : ""} gap-2.5 font-bold text-xs py-5 rounded-lg w-full relative transition-all duration-200 border group ${
                activeTab === "admin"
                  ? "bg-rose-950/40 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-950/20"
                  : "bg-transparent border-transparent text-zinc-400 hover:text-rose-300 hover:bg-rose-950/10 hover:border-rose-900/30"
              }`}
              onClick={() => setActiveTab("admin")}
              title={isSidebarCollapsed ? "Quản Trị (Admin)" : undefined}
            >
              {activeTab === "admin" && (
                <span className="absolute left-0 top-3 bottom-3 w-1 bg-rose-500 rounded-r animate-fade-in" />
              )}
              <Shield className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                activeTab === "admin" ? "text-rose-500" : "text-zinc-500 group-hover:text-rose-400"
              }`} />
              <span className={isSidebarCollapsed ? "md:hidden" : ""}>Quản Trị (Admin)</span>
            </Button>
          )}

          {errorMsg && (
            <div className={`mt-6 p-3 bg-red-950/20 border border-red-950 rounded-lg text-red-400 text-xs font-semibold flex gap-2 ${isSidebarCollapsed ? "md:flex-col md:items-center" : ""}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className={isSidebarCollapsed ? "md:hidden" : ""}>{errorMsg}</span>
            </div>
          )}
        </aside>

        {/* NỘI DUNG CHÍNH */}
        <main className="flex-grow p-6 bg-zinc-950 overflow-y-auto z-0 relative">
          
          {/* TAB 1: INBOX (Hộp Thư) */}
          {activeTab === "inbox" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:h-[calc(100vh-160px)] items-stretch">
              <div className="lg:col-span-2 flex flex-col h-full min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-black text-zinc-400 tracking-wider uppercase">Danh sách email</h2>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoMarkRead}
                      onChange={(e) => setAutoMarkRead(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-950 text-blue-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tự động đọc</span>
                  </label>
                </div>
                <div className="space-y-2 flex-grow overflow-y-auto pr-1 min-h-0 lg:max-h-[calc(100vh-200px)]">
                  {allMails.length === 0 ? (
                    <div className="text-zinc-600 text-xs py-8 text-center font-medium">Hộp thư trống</div>
                  ) : (
                    allMails.map(mail => (
                      <div
                        key={mail.id}
                        onClick={() => handleSelectMail(mail)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          selectedMail?.id === mail.id
                            ? "bg-zinc-900 border-zinc-700 shadow-md"
                            : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/60"
                        } ${!mail.read ? "border-l-4 border-l-blue-500" : ""}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-[10px] text-zinc-500 font-bold">{mail.sender}</span>
                          <span className="text-[10px] text-zinc-500 font-mono font-medium">{mail.date}</span>
                        </div>
                        <h4 className={`text-xs ${!mail.read ? "font-bold text-zinc-100" : "font-semibold text-zinc-300"} truncate`}>
                          {mail.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 truncate mt-1">{mail.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col h-full min-h-0">
                <h2 className="text-sm font-black text-zinc-400 tracking-wider uppercase mb-2">Nội dung chi tiết</h2>
                {selectedMail ? (
                  <Card className="bg-zinc-900 border-zinc-800 flex-grow flex flex-col shadow-xl min-h-0 lg:max-h-[calc(100vh-200px)]">
                    <CardHeader className="border-b border-zinc-800 py-4 flex-shrink-0">
                      <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold mb-2">
                        <span>Người gửi: <span className="text-zinc-300 font-bold">{selectedMail.sender}</span></span>
                        <div className="flex items-center gap-3">
                          {!selectedMail.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkMailAsRead(selectedMail.id)}
                              className="h-7 text-[10px] font-bold text-blue-400 hover:text-blue-300 border-blue-900/50 hover:bg-blue-950/20"
                            >
                              Đánh dấu đã đọc
                            </Button>
                          )}
                          <span className="font-mono">{selectedMail.date}</span>
                        </div>
                      </div>
                      <CardTitle className="text-base font-extrabold text-zinc-100 leading-snug">
                        {selectedMail.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-6 flex-grow text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap overflow-y-auto">
                      {selectedMail.content}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-12 text-center text-zinc-600 text-xs font-semibold flex-grow flex items-center justify-center">
                    Vui lòng chọn một thư từ danh sách bên trái để đọc nội dung.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SQUAD (Đội Hình) */}
          {activeTab === "squad" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-100">ĐỘI HÌNH THI ĐẤU CHÍNH THỨC</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Tổng lương hàng năm: <span className="font-bold text-zinc-300">${currentTotalSalary.toLocaleString()}</span> / Quỹ lương tối đa: <span className="font-bold text-zinc-300">${userTeam.salaryCap.toLocaleString()}</span>
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <Table>
                  <TableHeader className="bg-zinc-950">
                    <TableRow className="border-zinc-800 hover:bg-zinc-950">
                      <TableHead className="w-16 font-bold text-zinc-400">Vị trí</TableHead>
                      <TableHead className="font-bold text-zinc-400">Tên tuyển thủ</TableHead>
                      <TableHead className="w-16 font-bold text-zinc-400 text-center">Tuổi</TableHead>
                      <TableHead className="font-bold text-zinc-400">Quốc tịch</TableHead>
                      <TableHead className="font-bold text-zinc-400 text-right">Lương hàng năm</TableHead>
                      <TableHead className="font-bold text-zinc-400 text-right">Giá trị chuyển nhượng</TableHead>
                      <TableHead className="w-20 font-bold text-zinc-400 text-center">Điểm tb</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userTeam.players.map(player => {
                      const avgRating = Math.round((player.laning + player.teamfight + player.macro + player.mentality + player.championPool) / 5);
                      return (
                        <TableRow
                          key={player.id}
                          className="border-zinc-800 hover:bg-zinc-800/40 cursor-pointer"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <TableCell className="font-bold text-zinc-400">
                            <Badge className="bg-zinc-800 text-[10px] border-zinc-700 text-zinc-400 w-8 justify-center font-mono">{player.role}</Badge>
                          </TableCell>
                          <TableCell className="font-bold text-zinc-100">
                            <div className="flex items-center gap-3">
                              <PlayerAvatar playerName={player.name} role={player.role} size={56} imageUrl={player.avatarUrl} />
                              <div>
                                {player.name}
                                <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">{player.realName}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-zinc-300 font-medium">{player.age}</TableCell>
                          <TableCell className="text-zinc-400 font-medium">{player.nationality}</TableCell>
                          <TableCell className="text-right text-emerald-400 font-semibold font-mono">${player.salary.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-zinc-300 font-semibold font-mono">${player.value.toLocaleString()}</TableCell>
                          <TableCell className="text-center font-bold text-blue-400">{avgRating}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 3: TACTICS (Chiến Thuật) */}
          {activeTab === "tactics" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent)] pointer-events-none" />
                <h3 className="text-sm font-black text-zinc-400 tracking-wider uppercase mb-6 self-start">Sơ đồ vị trí Summoner&apos;s Rift</h3>

                <div className="relative w-full max-w-[320px] aspect-square border-2 border-zinc-800 rounded bg-zinc-950 flex flex-col justify-between p-4 shadow-inner">
                  <div className="absolute top-4 left-4 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center font-bold text-xs text-blue-400 shadow-md">TOP</div>
                    <span className="text-[10px] text-zinc-300 font-bold mt-1">{userTeam.players.find(p=>p.role==="TOP")?.name}</span>
                  </div>

                  <div className="absolute top-1/3 left-1/3 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center font-bold text-xs text-blue-400 shadow-md">JUG</div>
                    <span className="text-[10px] text-zinc-300 font-bold mt-1">{userTeam.players.find(p=>p.role==="JUG")?.name}</span>
                  </div>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center font-bold text-xs text-blue-400 shadow-md">MID</div>
                    <span className="text-[10px] text-zinc-300 font-bold mt-1">{userTeam.players.find(p=>p.role==="MID")?.name}</span>
                  </div>

                  <div className="absolute bottom-12 right-12 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center font-bold text-xs text-blue-400 shadow-md">BOT</div>
                    <span className="text-[10px] text-zinc-300 font-bold mt-1">{userTeam.players.find(p=>p.role==="BOT")?.name}</span>
                  </div>

                  <div className="absolute bottom-4 right-4 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center font-bold text-xs text-blue-400 shadow-md">SUP</div>
                    <span className="text-[10px] text-zinc-300 font-bold mt-1">{userTeam.players.find(p=>p.role==="SUP")?.name}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-base font-extrabold text-zinc-200">LỰA CHỌN LỐI CHƠI CHỦ ĐẠO</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">Thiết lập chiến thuật chung cho các trận đấu sắp tới</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="space-y-2">
                      <label className="font-semibold text-zinc-400 block">Lối chơi tập trung:</label>
                      <Select value={tacticalFocus} onValueChange={(val) => {
                        setTacticalFocus(val || "balanced");
                        alert(`Đã chuyển chiến thuật sang: ${
                          (val || "balanced") === "balanced" ? "Cân bằng" :
                          (val || "balanced") === "teamfight" ? "Giao tranh tổng" :
                          (val || "balanced") === "objective" ? "Kiểm soát mục tiêu" :
                          (val || "balanced") === "topside" ? "Đẩy cánh trên (TOP/MID)" :
                          "Đẩy cánh dưới (BOT/SUP)"
                        }`);
                      }}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                          <SelectValue placeholder="Chọn chiến thuật..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                          <SelectItem value="balanced">Cân bằng (Mặc định)</SelectItem>
                          <SelectItem value="teamfight">Giao tranh tổng (Teamfight-focused)</SelectItem>
                          <SelectItem value="objective">Kiểm soát mục tiêu (Objective-focused)</SelectItem>
                          <SelectItem value="topside">Đẩy cánh trên (Top-side Focus)</SelectItem>
                          <SelectItem value="botside">Đẩy cánh dưới (Bot-side Focus)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/80 space-y-2">
                      <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Đánh giá tác động chiến thuật
                      </div>
                      <p className="text-zinc-500 leading-relaxed">
                        {tacticalFocus === "balanced" && "Lối chơi an toàn. Giữ nguyên toàn bộ chỉ số laning và teamfight mặc định của tất cả các tuyển thủ."}
                        {tacticalFocus === "teamfight" && "Cộng thêm +5% khả năng Giao tranh (Teamfight) của toàn đội. Đổi lại, chỉ số Đi đường (Laning) sẽ giảm đi 2%."}
                        {tacticalFocus === "objective" && "Tập trung kiểm soát Rồng/Baron. Cộng thêm +5% chỉ số Macro của toàn đội. Đổi lại, chỉ số Giao tranh (Teamfight) giảm đi 2%."}
                        {tacticalFocus === "topside" && "Tập trung gank và bảo kê cho Đường Trên/Đường Giữa. Tăng laning TOP & MID thêm +5%. Giảm laning BOT & SUP đi 3%."}
                        {tacticalFocus === "botside" && "Tập trung bảo kê và nuôi xạ thủ Đường Dưới. Tăng laning BOT & SUP thêm +5%. Giảm laning TOP & MID đi 3%."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: SCHEDULE & STANDINGS */}
          {activeTab === "schedule" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-black text-zinc-400 tracking-wider uppercase">Bảng Xếp Hạng Giải {userTeam.region}</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                  <Table>
                    <TableHeader className="bg-zinc-950">
                      <TableRow className="border-zinc-800 hover:bg-zinc-950">
                        <TableHead className="w-12 text-center text-zinc-400 font-bold">XH</TableHead>
                        <TableHead className="font-bold text-zinc-400">Đội tuyển</TableHead>
                        <TableHead className="w-16 text-center font-bold text-zinc-400">Thắng</TableHead>
                        <TableHead className="w-16 text-center font-bold text-zinc-400">Thua</TableHead>
                        <TableHead className="w-16 text-center font-bold text-zinc-400">Điểm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {sortedStandings.map((team, idx) => {
                        const isUser = team.id === userTeam.id;
                        return (
                          <TableRow key={team.id} className={`border-zinc-800 hover:bg-zinc-800/20 ${isUser ? "bg-blue-950/20 font-bold" : ""}`}>
                            <TableCell className="text-center font-bold text-zinc-400">{idx + 1}</TableCell>
                            <TableCell className={`font-semibold ${isUser ? "text-blue-400" : "text-zinc-200"}`}>
                              <div className="flex items-center gap-2.5">
                                <TeamLogo teamName={team.name} size={42} imageUrl={team.logoUrl} />
                                <span>{team.name}</span>
                                {isUser && <Badge className="bg-blue-600 text-[8px] py-0 ml-1 font-bold">USER</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-zinc-200 font-mono">{team.wins}</TableCell>
                            <TableCell className="text-center text-zinc-500 font-mono">{team.losses}</TableCell>
                            <TableCell className="text-center font-bold text-zinc-200 font-mono">{team.points}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                <h3 className="text-sm font-black text-zinc-400 tracking-wider uppercase">Lịch Thi Đấu Của Đội</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-zinc-950">
                      <TableRow className="border-zinc-800 hover:bg-zinc-950">
                        <TableHead className="w-16 font-bold text-zinc-400">Vòng</TableHead>
                        <TableHead className="font-bold text-zinc-400">Ngày thi đấu</TableHead>
                        <TableHead className="font-bold text-zinc-400">Trận đấu</TableHead>
                        <TableHead className="w-24 text-center font-bold text-zinc-400">Kết quả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {userMatches.map(match => {
                        const isUserHome = match.homeTeamId === userTeam.id;
                        const opponentName = isUserHome ? match.awayTeam.name : match.homeTeam.name;
                        
                        let resultText = "-";
                        let badgeBg = "bg-zinc-950 text-zinc-500 border-zinc-800";
                        if (match.played) {
                          const userScore = isUserHome ? match.homeScore : match.awayScore;
                          const oppScore = isUserHome ? match.awayScore : match.homeScore;
                          let isWin = false;
                          if (match.matchEvents) {
                            try {
                              const parsedEvents = JSON.parse(match.matchEvents);
                              isWin = isUserHome ? (parsedEvents.winner === "HOME") : (parsedEvents.winner === "AWAY");
                            } catch (e) {
                              isWin = userScore > oppScore;
                            }
                          } else {
                            isWin = userScore > oppScore;
                          }
                          resultText = `${userScore} - ${oppScore} ${isWin ? "W" : "L"}`;
                          badgeBg = isWin 
                            ? "bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 font-bold" 
                            : "bg-red-950/40 text-red-500 border border-red-900/50 font-bold";
                        }

                        const isToday = match.date === initialGameState.currentDate;

                        return (
                          <TableRow key={match.id} className={`border-zinc-800 hover:bg-zinc-800/20 ${isToday && !match.played ? "bg-amber-950/10" : ""}`}>
                            <TableCell className="font-bold text-zinc-400">W {match.week}</TableCell>
                            <TableCell className="text-zinc-400 font-mono font-medium">
                              {match.date}
                              {isToday && !match.played && (
                                <Badge className="bg-amber-600 text-zinc-100 text-[8px] px-1 py-0 ml-1.5 font-bold animate-pulse">HÔM NAY</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-zinc-200">
                              <div className="flex items-center gap-2.5">
                                <span className="text-zinc-500 text-xs">VS</span>
                                <TeamLogo teamName={opponentName} size={42} imageUrl={isUserHome ? match.awayTeam.logoUrl : match.homeTeam.logoUrl} />
                                <span className="text-zinc-100 font-bold">{opponentName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              <Badge className={`${badgeBg} text-[10px] w-20 justify-center border font-mono`}>
                                {resultText}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCOUTING / TRANSFERS */}
          {activeTab === "scouting" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-100">THỊ TRƯỜNG CHUYỂN NHƯỢNG TỰ DO</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Tại đây, bạn có thể ký hợp đồng trực tiếp với các tuyển thủ tự do bằng phí lót tay (lấy từ ngân sách) và thỏa thuận lương.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-zinc-400">Vị trí:</span>
                  <Select value={scoutingRoleFilter} onValueChange={(val) => setScoutingRoleFilter(val || "ALL")}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200 w-32">
                      <SelectValue placeholder="Chọn vai trò..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      <SelectItem value="TOP">TOP</SelectItem>
                      <SelectItem value="JUG">JUG</SelectItem>
                      <SelectItem value="MID">MID</SelectItem>
                      <SelectItem value="BOT">BOT</SelectItem>
                      <SelectItem value="SUP">SUP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <Table>
                  <TableHeader className="bg-zinc-950">
                    <TableRow className="border-zinc-800 hover:bg-zinc-950">
                      <TableHead className="w-16 font-bold text-zinc-400">Vị trí</TableHead>
                      <TableHead className="font-bold text-zinc-400">Tuyển thủ</TableHead>
                      <TableHead className="w-16 font-bold text-zinc-400 text-center">Tuổi</TableHead>
                      <TableHead className="font-bold text-zinc-400">Quốc tịch</TableHead>
                      <TableHead className="font-bold text-zinc-400 text-right">Lương yêu cầu (/năm)</TableHead>
                      <TableHead className="font-bold text-zinc-400 text-right">Phí lót tay ký hợp đồng</TableHead>
                      <TableHead className="w-20 font-bold text-zinc-400 text-center">Điểm tb</TableHead>
                      <TableHead className="w-28 text-center font-bold text-zinc-400">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {freeAgents
                      .filter(agent => scoutingRoleFilter === "ALL" || agent.role === scoutingRoleFilter)
                      .length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-zinc-600 py-10 font-semibold">
                            Không có tuyển thủ tự do nào thỏa mãn bộ lọc.
                          </TableCell>
                        </TableRow>
                      ) : (
                        freeAgents
                          .filter(agent => scoutingRoleFilter === "ALL" || agent.role === scoutingRoleFilter)
                          .map(agent => {
                            const avgRating = Math.round((agent.laning + agent.teamfight + agent.macro + agent.mentality + agent.championPool) / 5);
                            const signingBonus = Math.round(agent.value * 0.8);
                            const canAfford = userTeam.budget >= signingBonus && (currentTotalSalary + agent.salary <= userTeam.salaryCap);

                            return (
                              <TableRow key={agent.id} className="border-zinc-800 hover:bg-zinc-800/10">
                                <TableCell className="font-bold text-zinc-400">
                                  <Badge className="bg-zinc-800 text-[10px] border-zinc-700 text-zinc-400 w-8 justify-center font-mono">{agent.role}</Badge>
                                </TableCell>
                                <TableCell className="font-bold text-zinc-100">
                                  {agent.name}
                                  <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">{agent.realName}</span>
                                </TableCell>
                                <TableCell className="text-center text-zinc-300 font-medium">{agent.age}</TableCell>
                                <TableCell className="text-zinc-400 font-medium">{agent.nationality}</TableCell>
                                <TableCell className="text-right text-emerald-400 font-semibold font-mono">${agent.salary.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-zinc-300 font-semibold font-mono">${signingBonus.toLocaleString()}</TableCell>
                                <TableCell className="text-center font-bold text-blue-400">{avgRating}</TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSignPlayer(agent.id)}
                                    disabled={!canAfford || isPending}
                                    className={`font-bold text-[10px] px-3 py-1.5 h-fit ${
                                      canAfford 
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-zinc-50" 
                                        : "bg-zinc-800 text-zinc-500 border border-zinc-800 cursor-not-allowed"
                                    }`}
                                  >
                                    Ký Hợp Đồng
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB TIER LIST TƯỚNG (CẢ HAI NHÓM USER/ADMIN ĐỀU THẤY, NHƯNG QUYỀN SỬA KHÁC NHAU) */}
          {activeTab === "tierlist" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-100 flex items-center gap-2">
                    <Sliders className="w-6 h-6 text-emerald-500" />
                    TIER LIST TƯỚNG (METAGAME)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Bảng xếp hạng sức mạnh tướng trong metagame hiện tại. Tier tướng ảnh hưởng trực tiếp đến kết quả cấm chọn và tỉ lệ thắng khi giả lập trận đấu.
                    {currentUser?.role === "ADMIN" ? (
                      <span className="text-rose-400 font-semibold block sm:inline sm:ml-1">
                        (Bạn đang có quyền Admin, có thể thay đổi tier và lưu).
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold block sm:inline sm:ml-1">
                        (Chế độ xem - Chỉ admin mới có quyền chỉnh sửa).
                      </span>
                    )}
                  </p>
                </div>
                {currentUser?.role === "ADMIN" && (
                  <Button
                    onClick={handleSaveTiers}
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 font-bold px-6 py-2.5 text-xs text-zinc-50 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/20 w-full sm:w-auto justify-center"
                  >
                    Lưu Bảng Tier List
                  </Button>
                )}
              </div>

              <div className="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
                {["S", "A", "B", "C", "D", "F"].map(tier => {
                  const tierChamps = CHAMPIONS.filter(champ => {
                    const currentTier = championTiers[champ.id] || "B";
                    return currentTier === tier;
                  });

                  let labelBg = "bg-rose-600/90 text-rose-50 border-rose-500/20";
                  if (tier === "A") labelBg = "bg-orange-500/90 text-orange-50 border-orange-500/20";
                  if (tier === "B") labelBg = "bg-amber-500/95 text-amber-950 border-amber-500/20";
                  if (tier === "C") labelBg = "bg-emerald-600/90 text-emerald-50 border-emerald-500/20";
                  if (tier === "D") labelBg = "bg-cyan-500/90 text-cyan-950 border-cyan-500/20";
                  if (tier === "F") labelBg = "bg-blue-600/90 text-blue-50 border-blue-500/20";

                  return (
                    <div key={tier} className="flex border border-zinc-800 rounded-xl overflow-hidden min-h-[96px] bg-zinc-950/40">
                      {/* Cột nhãn Tier bên trái */}
                      <div className={`${labelBg} w-24 flex flex-col items-center justify-center font-black text-3xl select-none shadow-inner border-r border-zinc-800/80`}>
                        {tier}
                      </div>

                      {/* Vùng hiển thị danh sách tướng bên phải */}
                      <div className="flex-grow flex flex-wrap gap-3 p-4 bg-zinc-950/20 items-center animate-fade-in">
                        {tierChamps.length === 0 ? (
                          <span className="text-xs text-zinc-600 italic pl-3">Không có tướng nào ở tier này</span>
                        ) : (
                          tierChamps.map(champ => (
                            <div
                              key={champ.id}
                              className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex flex-col items-center justify-between w-[124px] h-[135px] shadow-lg hover:border-zinc-700/80 transition-all duration-200 group"
                            >
                              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{champ.role}</div>
                              {championImages?.[champ.id] ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 my-0.5 relative z-10 shadow-sm">
                                  <img src={championImages[champ.id]} alt={champ.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 my-0.5 relative z-10 shadow-sm">
                                  {champ.type === "Tank" && <Shield className="w-7 h-7 text-blue-400/70" />}
                                  {champ.type === "Fighter" && <Sword className="w-7 h-7 text-orange-400/70" />}
                                  {champ.type === "Assassin" && <Skull className="w-7 h-7 text-purple-400/70" />}
                                  {champ.type === "Mage" && <Flame className="w-7 h-7 text-violet-400/70" />}
                                  {champ.type === "Marksman" && <Target className="w-7 h-7 text-amber-400/70" />}
                                  {champ.type === "Enchanter" && <Wand2 className="w-7 h-7 text-emerald-400/70" />}
                                </div>
                              )}
                              <div className="flex items-center gap-1 w-full justify-center px-1">
                                <div className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">{champ.name}</div>
                                {currentUser?.role === "ADMIN" && (
                                  <button
                                    onClick={() => {
                                      setAdminEditingChampId(champ.id);
                                      setAdminChampImageUrl(championImages?.[champ.id] || "");
                                    }}
                                    className="text-zinc-500 hover:text-emerald-400 p-0.5"
                                    title="Đổi ảnh tướng"
                                  >
                                    <Settings2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              
                              {currentUser?.role === "ADMIN" ? (
                                <select
                                  value={tier}
                                  onChange={(e) => handleMoveChamp(champ.id, e.target.value)}
                                  className="bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-[10px] rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full text-center font-bold"
                                >
                                  <option value="S">Tier S</option>
                                  <option value="A">Tier A</option>
                                  <option value="B">Tier B</option>
                                  <option value="C">Tier C</option>
                                  <option value="D">Tier D</option>
                                  <option value="F">Tier F</option>
                                </select>
                              ) : (
                                <Badge className="bg-zinc-950 text-[9px] text-zinc-400 font-semibold px-2 py-0.5 border-zinc-800">
                                  {champ.type}
                                </Badge>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hộp thoại Đổi Ảnh Tướng (Admin) */}
              <Dialog open={!!adminEditingChampId} onOpenChange={(open) => !open && setAdminEditingChampId(null)}>
                <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-emerald-500" />
                      Đổi Ảnh Tướng
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-xs">
                      Cập nhật ảnh đại diện (icon) của tướng. Dán link URL hoặc tải ảnh lên từ máy.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">URL Hình Ảnh / File</label>
                      <Input
                        type="text"
                        value={adminChampImageUrl}
                        onChange={(e) => setAdminChampImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs mb-2"
                      />
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setAdminChampImageUrl)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs w-full cursor-pointer"
                      />
                    </div>

                    {adminChampImageUrl && (
                      <div className="flex justify-center mt-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-zinc-950">
                          <img src={adminChampImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-2 border-t border-zinc-800 pt-4">
                    <Button
                      disabled={isPending}
                      variant="outline"
                      onClick={() => setAdminEditingChampId(null)}
                      className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs h-8"
                    >
                      Hủy
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() => {
                        if (!adminEditingChampId) return;
                        const newImages = { ...championImages, [adminEditingChampId]: adminChampImageUrl };
                        setChampionImages(newImages);
                        startTransition(async () => {
                          const res = await adminUpdateChampionTiersAction(championTiers, newImages);
                          if (res.success) {
                            alert("Đã cập nhật ảnh tướng thành công!");
                            setAdminEditingChampId(null);
                          } else {
                            alert(res.error || "Lỗi cập nhật ảnh tướng");
                          }
                        });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-50 font-bold text-xs h-8 px-4"
                    >
                      {isPending ? "ĐANG LƯU..." : "LƯU LẠI"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* TAB 7: DATABASE EXPLORER (Cơ sở dữ liệu) */}
          {activeTab === "database" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-100 flex items-center gap-2">
                    <Database className="w-6 h-6 text-emerald-500 animate-pulse" />
                    CƠ SỞ DỮ LIỆU GIẢI ĐẤU
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Tra cứu thông tin chi tiết, thành tích của các đội tuyển và hồ sơ năng lực của các tuyển thủ trên toàn thế giới.
                  </p>
                </div>

                {/* Sub-tabs toggles */}
                <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-lg">
                  <button
                    onClick={() => {
                      setDbSubTab("teams");
                      setDbSortField("default");
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      dbSubTab === "teams"
                        ? "bg-emerald-600 text-zinc-50 shadow-md"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Đội tuyển
                  </button>
                  <button
                    onClick={() => {
                      setDbSubTab("players");
                      setDbSortField("default");
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      dbSubTab === "players"
                        ? "bg-emerald-600 text-zinc-50 shadow-md"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Tuyển thủ
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 backdrop-blur-md flex flex-wrap gap-4 items-center">
                {/* Search Input */}
                <div className="flex-grow min-w-[200px] relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder={dbSubTab === "teams" ? "Tìm kiếm đội tuyển..." : "Tìm kiếm tuyển thủ..."}
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-200 text-xs focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-lg h-9"
                  />
                </div>

                {/* Region Filter */}
                <div className="w-[140px]">
                  <Select value={dbRegionFilter} onValueChange={(val) => setDbRegionFilter(val || "ALL")}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs h-9 rounded-lg">
                      <SelectValue placeholder="Khu vực" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      <SelectItem value="ALL">Tất cả khu vực</SelectItem>
                      <SelectItem value="LCK">LCK</SelectItem>
                      <SelectItem value="LPL">LPL</SelectItem>
                      <SelectItem value="LEC">LEC</SelectItem>
                      <SelectItem value="LCP">LCP</SelectItem>
                      <SelectItem value="CBLOL">CBLOL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Filter (Only for players) */}
                {dbSubTab === "players" && (
                  <div className="w-[140px]">
                    <Select value={dbRoleFilter} onValueChange={(val) => setDbRoleFilter(val || "ALL")}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs h-9 rounded-lg">
                        <SelectValue placeholder="Vị trí" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                        <SelectItem value="ALL">Tất cả vị trí</SelectItem>
                        <SelectItem value="TOP">Đường trên (TOP)</SelectItem>
                        <SelectItem value="JUG">Đi rừng (JUG)</SelectItem>
                        <SelectItem value="MID">Đường giữa (MID)</SelectItem>
                        <SelectItem value="BOT">Xạ thủ (BOT)</SelectItem>
                        <SelectItem value="SUP">Hỗ trợ (SUP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Clear Filters Button */}
                {(dbSearch || dbRegionFilter !== "ALL" || dbRoleFilter !== "ALL" || dbSortField !== "default") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDbSearch("");
                      setDbRegionFilter("ALL");
                      setDbRoleFilter("ALL");
                      setDbSortField("default");
                      setDbSortOrder("desc");
                    }}
                    className="text-zinc-500 hover:text-zinc-300 text-xs font-bold font-sans"
                  >
                    Xóa lọc
                  </Button>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-2xl">
                {dbSubTab === "teams" ? (
                  /* TEAMS TABLE */
                  <Table>
                    <TableHeader className="bg-zinc-950/80 border-b border-zinc-850">
                      <TableRow className="border-zinc-850 hover:bg-zinc-950/80">
                        <TableHead className="font-bold text-zinc-400">Đội tuyển</TableHead>
                        <TableHead className="font-bold text-zinc-400 text-center">Khu vực</TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-center cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("wins");
                            setDbSortOrder(dbSortField === "wins" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Số trận thắng {dbSortField === "wins" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead className="font-bold text-zinc-400 text-center">Số trận thua</TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-center cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("points");
                            setDbSortOrder(dbSortField === "points" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Điểm số BXH {dbSortField === "points" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-right cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("budget");
                            setDbSortOrder(dbSortField === "budget" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Ngân sách {dbSortField === "budget" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-right cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("salary");
                            setDbSortOrder(dbSortField === "salary" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Tổng quỹ lương {dbSortField === "salary" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-center cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("players");
                            setDbSortOrder(dbSortField === "players" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Số tuyển thủ {dbSortField === "players" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-zinc-500 py-12 italic text-xs font-semibold">
                            Không tìm thấy đội tuyển nào phù hợp với bộ lọc
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTeams.map((team) => {
                          const totalSalary = team.players ? team.players.reduce((sum, p) => sum + p.salary, 0) : 0;
                          const isUser = team.id === userTeam.id;
                          return (
                            <TableRow 
                              key={team.id} 
                              className={`border-zinc-850 hover:bg-zinc-850/30 cursor-pointer transition-colors ${
                                isUser ? "bg-emerald-950/10 border-l-2 border-l-emerald-500" : ""
                              }`}
                              onClick={() => setSelectedTeamForDetails(team)}
                            >
                              <TableCell className="font-bold text-zinc-100 py-3">
                                <div className="flex items-center gap-3">
                                  <TeamLogo teamName={team.name} size={56} imageUrl={team.logoUrl} />
                                  <div className="flex flex-col">
                                    <span className="flex items-center gap-1.5">
                                      {team.name}
                                      {isUser && <Badge className="bg-emerald-600 text-[8px] text-zinc-50 px-1 py-0.25">Đội của bạn</Badge>}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-zinc-400 text-xs">
                                <Badge variant="outline" className="border-zinc-800 text-zinc-400 bg-zinc-950/40">{team.region}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold text-emerald-400 font-mono">{team.wins}</TableCell>
                              <TableCell className="text-center font-bold text-rose-400/90 font-mono">{team.losses}</TableCell>
                              <TableCell className="text-center font-bold text-blue-400 font-mono">{team.points}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-semibold font-mono">${team.budget.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-zinc-300 font-semibold font-mono">${totalSalary.toLocaleString()}</TableCell>
                              <TableCell className="text-center font-semibold text-zinc-400 font-mono">{team.players ? team.players.length : 0}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  /* PLAYERS TABLE */
                  <Table>
                    <TableHeader className="bg-zinc-950/80 border-b border-zinc-850">
                      <TableRow className="border-zinc-850 hover:bg-zinc-950/80">
                        <TableHead className="w-16 font-bold text-zinc-400 text-center">Vị trí</TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("name");
                            setDbSortOrder(dbSortField === "name" && dbSortOrder === "asc" ? "desc" : "asc");
                          }}
                        >
                          Tuyển thủ {dbSortField === "name" && (dbSortOrder === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="font-bold text-zinc-400">Đội tuyển</TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-center cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("age");
                            setDbSortOrder(dbSortField === "age" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Tuổi {dbSortField === "age" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead className="font-bold text-zinc-400">Quốc tịch</TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-right cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("salary");
                            setDbSortOrder(dbSortField === "salary" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Lương {dbSortField === "salary" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-right cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("value");
                            setDbSortOrder(dbSortField === "value" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Giá trị {dbSortField === "value" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                        <TableHead 
                          className="font-bold text-zinc-400 text-center cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => {
                            setDbSortField("rating");
                            setDbSortOrder(dbSortField === "rating" && dbSortOrder === "desc" ? "asc" : "desc");
                          }}
                        >
                          Điểm tb {dbSortField === "rating" && (dbSortOrder === "desc" ? "↓" : "↑")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-zinc-500 py-12 italic text-xs font-semibold">
                            Không tìm thấy tuyển thủ nào phù hợp với bộ lọc
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPlayers.map((player) => {
                          const avgRating = Math.round((player.laning + player.teamfight + player.macro + player.mentality + player.championPool) / 5);
                          const isOnUserTeam = player.teamId === userTeam.id;
                          return (
                            <TableRow 
                              key={player.id} 
                              className={`border-zinc-850 hover:bg-zinc-850/30 cursor-pointer transition-colors ${
                                isOnUserTeam ? "bg-emerald-950/10 border-l-2 border-l-emerald-500" : ""
                              }`}
                              onClick={() => setSelectedPlayer(player)}
                            >
                              <TableCell className="text-center py-3">
                                <Badge className="bg-zinc-800 text-[10px] border-zinc-700 text-zinc-400 w-8 justify-center font-mono">{player.role}</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-zinc-200">
                                <div className="flex items-center gap-3">
                                  <PlayerAvatar playerName={player.name} role={player.role} size={56} imageUrl={player.avatarUrl} />
                                  <div className="flex flex-col">
                                    <span className="text-zinc-100 flex items-center gap-1.5 font-bold">
                                      {player.name}
                                      {isOnUserTeam && <Badge className="bg-emerald-600 text-[8px] text-zinc-50 px-1 py-0.25">Đội của bạn</Badge>}
                                    </span>
                                    {player.realName && <span className="text-[10px] text-zinc-500 font-semibold">{player.realName}</span>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-bold text-zinc-300">
                                <div className="flex items-center gap-2.5">
                                  {player.teamId ? (
                                    <>
                                      <TeamLogo teamName={player.teamName || ""} size={36} imageUrl={player.teamLogoUrl} />
                                      <span className="text-xs text-zinc-300 font-bold">{player.teamName}</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-zinc-500 italic">Tự Do (Free Agent)</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-zinc-300 font-medium font-mono">{player.age}</TableCell>
                              <TableCell className="text-zinc-400 font-medium text-xs">{player.nationality}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-semibold font-mono">${player.salary.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-zinc-300 font-semibold font-mono">${player.value.toLocaleString()}</TableCell>
                              <TableCell className="text-center font-bold text-blue-400 font-mono">{avgRating}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN PANEL (Chỉ khả dụng cho ADMIN) */}
          {activeTab === "admin" && currentUser?.role === "ADMIN" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-rose-500 flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  ADMIN PANEL - HỆ THỐNG QUẢN TRỊ
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Công cụ dành riêng cho Administrator. Cho phép cập nhật chỉ số tuyển thủ, đội tuyển và quản lý tài khoản thành viên.
                </p>
              </div>

              {/* Sub-tabs của Admin Panel */}
              <div className="flex border-b border-zinc-800 gap-2">
                <button
                  onClick={() => setAdminSubTab("players")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    adminSubTab === "players"
                      ? "border-rose-500 text-rose-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tuyển thủ
                </button>
                <button
                  onClick={() => setAdminSubTab("teams")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    adminSubTab === "teams"
                      ? "border-rose-500 text-rose-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Đội tuyển
                </button>
                <button
                  onClick={() => setAdminSubTab("accounts")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    adminSubTab === "accounts"
                      ? "border-rose-500 text-rose-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tài khoản ({adminUsers.length})
                </button>
                <button
                  onClick={() => setAdminSubTab("mail")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    adminSubTab === "mail"
                      ? "border-rose-500 text-rose-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Gửi thư toàn SV
                </button>
              </div>

              {/* 1. SUB-TAB ADMIN: PLAYERS */}
              {adminSubTab === "players" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Danh sách tuyển thủ bên trái */}
                  <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={adminPlayerMode === "edit" ? "secondary" : "outline"}
                        onClick={() => setAdminPlayerMode("edit")}
                        className={`flex-1 text-[11px] font-bold h-8 ${adminPlayerMode === "edit" ? "bg-rose-950/20 text-rose-400 border border-rose-900/50" : "border-zinc-800"}`}
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        size="sm"
                        variant={adminPlayerMode === "create" ? "secondary" : "outline"}
                        onClick={() => setAdminPlayerMode("create")}
                        className={`flex-1 text-[11px] font-bold h-8 ${adminPlayerMode === "create" ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30" : "border-zinc-800"}`}
                      >
                        + Thêm mới
                      </Button>
                    </div>

                    {adminPlayerMode === "edit" ? (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Chọn tuyển thủ để chỉnh sửa:</label>
                        <Select value={adminSelectedPlayerId} onValueChange={(val) => setAdminSelectedPlayerId(val || "")}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 w-full text-xs">
                            <SelectValue placeholder="Chọn tuyển thủ..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200 max-h-[300px]">
                            {allPlayersInSaveGame.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} ({p.role} - Đội: {p.teamName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {adminSelectedPlayerId ? (
                          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs">
                            <div className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Chỉ số trung bình</div>
                            <div className="text-2xl font-black text-zinc-100">
                              {Math.round((adminPlayerForm.laning + adminPlayerForm.teamfight + adminPlayerForm.macro + adminPlayerForm.mentality + adminPlayerForm.championPool) / 5)}/100
                            </div>
                            <p className="text-zinc-500 text-[10px]">
                              Sau khi cập nhật, chỉ số mới sẽ được lưu trực tiếp vào cơ sở dữ liệu và hiển thị ngay trên đội hình của người chơi tương ứng.
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-10 text-zinc-600 text-xs font-semibold">
                            Vui lòng chọn 1 tuyển thủ từ danh sách trên để xem/chỉnh sửa thông tin.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
                        <h4 className="font-bold text-emerald-400 flex items-center gap-1">
                          <span>●</span> Đang ở chế độ tạo mới
                        </h4>
                        <p className="text-zinc-500 leading-relaxed text-[11px]">
                          Nhập các thông tin và chỉ số bên form phải để thêm một tuyển thủ mới vào hệ thống Save Game của bạn.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Form tuyển thủ bên phải */}
                  {(adminPlayerMode === "create" || (adminPlayerMode === "edit" && adminSelectedPlayerId)) && (
                    <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 shadow-xl">
                      <CardHeader className="py-4 border-b border-zinc-800">
                        <CardTitle className="text-base font-extrabold text-rose-400">
                          {adminPlayerMode === "create" ? "TẠO MỚI TUYỂN THỦ" : `CHỈNH SỬA THÔNG TIN TUYỂN THỦ: ${adminPlayerForm.name}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tên hiển thị (Ingame Name)</label>
                          <Input
                            type="text"
                            value={adminPlayerForm.name}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, name: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                            placeholder="Ví dụ: Faker, ShowMaker..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Vị trí (TOP/JUG/MID/BOT/SUP)</label>
                          <Select
                            value={adminPlayerForm.role}
                            onValueChange={(val) => setAdminPlayerForm({ ...adminPlayerForm, role: val || "TOP" })}
                          >
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
                              <SelectValue placeholder="Chọn vai trò..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                              <SelectItem value="TOP">TOP</SelectItem>
                              <SelectItem value="JUG">JUG</SelectItem>
                              <SelectItem value="MID">MID</SelectItem>
                              <SelectItem value="BOT">BOT</SelectItem>
                              <SelectItem value="SUP">SUP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tuổi</label>
                          <Input
                            type="number"
                            value={adminPlayerForm.age}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, age: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        {adminPlayerMode === "create" ? (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Quốc tịch</label>
                              <Input
                                type="text"
                                value={adminPlayerForm.nationality}
                                onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, nationality: e.target.value })}
                                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                                placeholder="Ví dụ: Hàn Quốc, Việt Nam..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Đội tuyển đầu quân</label>
                              <Select
                                value={adminPlayerTeamId}
                                onValueChange={(val) => setAdminPlayerTeamId(val || "free")}
                              >
                                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
                                  <SelectValue placeholder="Chọn đội..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                                  <SelectItem value="free">Tự Do (Free Agent)</SelectItem>
                                  {allTeamsInRegion.map(team => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name} ({team.region})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Quốc tịch</label>
                            <Input
                              type="text"
                              value={adminPlayerForm.nationality}
                              onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, nationality: e.target.value })}
                              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Đi đường (Laning) [1 - 100]</label>
                          <Input
                            type="number"
                            value={adminPlayerForm.laning}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, laning: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Giao tranh (Teamfight) [1 - 100]</label>
                          <Input
                            type="number"
                            value={adminPlayerForm.teamfight}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, teamfight: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Kiểm soát (Macro) [1 - 100]</label>
                          <Input
                            type="number"
                            value={adminPlayerForm.macro}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, macro: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tâm lý (Mentality) [1 - 100]</label>
                          <Input
                            type="number"
                            value={adminPlayerForm.mentality}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, mentality: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Bể tướng (Champ Pool) [1 - 100]</label>
                          <Input
                            type="number"
                            value={adminPlayerForm.championPool}
                            onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, championPool: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Ảnh Đại Diện (URL hoặc Tải lên)</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="text"
                              value={adminPlayerForm.avatarUrl}
                              onChange={(e) => setAdminPlayerForm({ ...adminPlayerForm, avatarUrl: e.target.value })}
                              placeholder="https://... hoặc chọn file"
                              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs flex-1"
                            />
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, (base64) => setAdminPlayerForm({ ...adminPlayerForm, avatarUrl: base64 }))}
                              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs w-full sm:w-[200px] cursor-pointer"
                            />
                          </div>
                          {adminPlayerForm.avatarUrl && (
                            <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border border-zinc-800">
                              <img src={adminPlayerForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-zinc-800 py-4 flex justify-end gap-3">
                        <Button
                          disabled={isPending}
                          onClick={adminPlayerMode === "create" ? handleAdminCreatePlayer : handleAdminUpdatePlayer}
                          className={`${adminPlayerMode === "create" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"} text-zinc-50 font-bold text-xs px-4`}
                        >
                          {isPending ? "ĐANG LƯU..." : (adminPlayerMode === "create" ? "TẠO MỚI TUYỂN THỦ" : "CẬP NHẬT CHỈ SỐ")}
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              )}

              {/* 2. SUB-TAB ADMIN: TEAMS */}
              {adminSubTab === "teams" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Danh sách đội bên trái */}
                  <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={adminTeamMode === "edit" ? "secondary" : "outline"}
                        onClick={() => setAdminTeamMode("edit")}
                        className={`flex-1 text-[11px] font-bold h-8 ${adminTeamMode === "edit" ? "bg-rose-950/20 text-rose-400 border border-rose-900/50" : "border-zinc-800"}`}
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        size="sm"
                        variant={adminTeamMode === "create" ? "secondary" : "outline"}
                        onClick={() => setAdminTeamMode("create")}
                        className={`flex-1 text-[11px] font-bold h-8 ${adminTeamMode === "create" ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30" : "border-zinc-800"}`}
                      >
                        + Thêm mới
                      </Button>
                    </div>

                    {adminTeamMode === "edit" ? (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Chọn đội tuyển để chỉnh sửa:</label>
                        <Select value={adminSelectedTeamId} onValueChange={(val) => setAdminSelectedTeamId(val || "")}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 w-full text-xs">
                            <SelectValue placeholder="Chọn đội tuyển..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                            {allTeamsInRegion.map(t => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">
                                {t.name} (Giải: {t.region}) {t.isUser ? "- Đội của bạn" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {adminSelectedTeamId ? (
                          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs">
                            <div className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Hiệu số thi đấu</div>
                            <div className="text-zinc-300 font-semibold">
                              Thắng: <span className="text-zinc-100">{adminTeamForm.wins}</span> | Thua: <span className="text-zinc-100">{adminTeamForm.losses}</span>
                            </div>
                            <div className="text-zinc-300 font-semibold">
                              Tổng điểm: <span className="text-emerald-400 font-bold">{adminTeamForm.points} pts</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 text-zinc-600 text-xs font-semibold">
                            Vui lòng chọn 1 đội tuyển để chỉnh sửa ngân sách và hiệu số BXH.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
                        <h4 className="font-bold text-emerald-400 flex items-center gap-1">
                          <span>●</span> Đang ở chế độ tạo mới
                        </h4>
                        <p className="text-zinc-500 leading-relaxed text-[11px]">
                          Nhập tên đội tuyển và chọn khu vực thi đấu để thêm vào giải đấu trong Save Game hiện tại.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Form đội bên phải */}
                  {(adminTeamMode === "create" || (adminTeamMode === "edit" && adminSelectedTeamId)) && (
                    <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 shadow-xl">
                      <CardHeader className="py-4 border-b border-zinc-800">
                        <CardTitle className="text-base font-extrabold text-rose-400">
                          {adminTeamMode === "create" ? "TẠO MỚI ĐỘI TUYỂN" : `CHỈNH SỬA THÔNG TIN ĐỘI: ${allTeamsInRegion.find(x => x.id === adminSelectedTeamId)?.name}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {adminTeamMode === "create" && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tên đội tuyển</label>
                              <Input
                                type="text"
                                value={adminTeamName}
                                onChange={(e) => setAdminTeamName(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                                placeholder="Ví dụ: T1, Gen.G, GAM Esports..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Khu vực / Giải đấu</label>
                              <Select
                                value={adminTeamRegion}
                                onValueChange={(val) => setAdminTeamRegion(val || "LCK")}
                              >
                                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
                                  <SelectValue placeholder="Chọn khu vực..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                                  <SelectItem value="LCK">LCK (Hàn Quốc)</SelectItem>
                                  <SelectItem value="LCP">LCP (Châu Á Thái Bình Dương)</SelectItem>
                                  <SelectItem value="LPL">LPL (Trung Quốc)</SelectItem>
                                  <SelectItem value="LEC">LEC (Châu Âu)</SelectItem>
                                  <SelectItem value="CBLOL">CBLOL (Brazil)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Ngân sách chuyển nhượng ($)</label>
                          <Input
                            type="number"
                            value={adminTeamForm.budget}
                            onChange={(e) => setAdminTeamForm({ ...adminTeamForm, budget: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Quỹ lương tối đa (Salary Cap - $)</label>
                          <Input
                            type="number"
                            value={adminTeamForm.salaryCap}
                            onChange={(e) => setAdminTeamForm({ ...adminTeamForm, salaryCap: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tên viết tắt (Abbreviation)</label>
                          <Input
                            type="text"
                            value={adminTeamForm.abbreviation}
                            onChange={(e) => setAdminTeamForm({ ...adminTeamForm, abbreviation: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                            placeholder="Ví dụ: T1, GEN, GAM..."
                          />
                        </div>

                        {adminTeamMode === "edit" && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Số trận Thắng (Wins)</label>
                              <Input
                                type="number"
                                value={adminTeamForm.wins}
                                onChange={(e) => setAdminTeamForm({ ...adminTeamForm, wins: Number(e.target.value) })}
                                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Số trận Thua (Losses)</label>
                              <Input
                                type="number"
                                value={adminTeamForm.losses}
                                onChange={(e) => setAdminTeamForm({ ...adminTeamForm, losses: Number(e.target.value) })}
                                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Điểm số BXH (Points)</label>
                              <Input
                                type="number"
                                value={adminTeamForm.points}
                                onChange={(e) => setAdminTeamForm({ ...adminTeamForm, points: Number(e.target.value) })}
                                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Logo Đội Tuyển (URL hoặc Tải lên)</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="text"
                              value={adminTeamForm.logoUrl}
                              onChange={(e) => setAdminTeamForm({ ...adminTeamForm, logoUrl: e.target.value })}
                              placeholder="https://... hoặc chọn file"
                              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs flex-1"
                            />
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, (base64) => setAdminTeamForm({ ...adminTeamForm, logoUrl: base64 }))}
                              className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs w-full sm:w-[200px] cursor-pointer"
                            />
                          </div>
                          {adminTeamForm.logoUrl && (
                            <div className="mt-2 w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                              <img src={adminTeamForm.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-zinc-800 py-4 flex justify-end gap-3">
                        <Button
                          disabled={isPending}
                          onClick={adminTeamMode === "create" ? handleAdminCreateTeam : handleAdminUpdateTeam}
                          className={`${adminTeamMode === "create" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"} text-zinc-50 font-bold text-xs px-4`}
                        >
                          {isPending ? "ĐANG LƯU..." : (adminTeamMode === "create" ? "TẠO MỚI ĐỘI TUYỂN" : "CẬP NHẬT THÔNG TIN ĐỘI")}
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              )}

              {/* 3. SUB-TAB ADMIN: ACCOUNTS */}
              {adminSubTab === "accounts" && (
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                  <CardHeader className="border-b border-zinc-800 py-4 flex flex-row justify-between items-center">
                    <div>
                      <CardTitle className="text-base font-extrabold text-rose-400">DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG</CardTitle>
                      <CardDescription className="text-xs text-zinc-500">Xem và quản lý tất cả các tài khoản thành viên trong hệ thống.</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={fetchUsers}
                      className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold px-3 py-1.5"
                    >
                      LÀM MỚI DANH SÁCH
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingUsers ? (
                      <div className="text-center py-12 text-zinc-400 text-xs font-semibold">
                        Đang tải danh sách tài khoản...
                      </div>
                    ) : (
                      <Table>
                        <TableHeader className="bg-zinc-950">
                          <TableRow className="border-zinc-800 hover:bg-zinc-950">
                            <TableHead className="font-bold text-zinc-400">Tên đăng nhập (Username)</TableHead>
                            <TableHead className="font-bold text-zinc-400">Tên hiển thị (Display Name)</TableHead>
                            <TableHead className="font-bold text-zinc-400">Quyền hạn (Role)</TableHead>
                            <TableHead className="font-bold text-zinc-400">Ngày đăng ký</TableHead>
                            <TableHead className="font-bold text-zinc-400 text-center">Số Save Game / Thư</TableHead>
                            <TableHead className="w-24 text-center font-bold text-zinc-400">Hành động</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {adminUsers.map(user => {
                            const isMe = user.id === currentUser?.id;
                            return (
                              <TableRow key={user.id} className="border-zinc-800 hover:bg-zinc-800/10">
                                <TableCell className="font-bold text-zinc-100">{user.username}</TableCell>
                                <TableCell className="text-zinc-300 font-semibold">{user.displayName}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    user.role === "ADMIN" 
                                      ? "bg-rose-950 text-rose-400 border border-rose-900/50" 
                                      : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                                  }>
                                    {user.role}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-zinc-400 font-mono font-medium">
                                  {new Date(user.createdAt).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </TableCell>
                                <TableCell className="text-center font-semibold text-zinc-300">
                                  {user._count.teams} teams / {user._count.mails} mails
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    disabled={isMe}
                                    onClick={() => handleAdminDeleteUser(user.id)}
                                    className={`font-bold text-[10px] px-2.5 py-1 h-fit ${
                                      isMe 
                                        ? "bg-zinc-800 text-zinc-600 border border-zinc-900 cursor-not-allowed" 
                                        : "bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900 hover:text-zinc-50"
                                    }`}
                                  >
                                    Xóa tài khoản
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 4. SUB-TAB ADMIN: MAIL */}
              {adminSubTab === "mail" && (
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl max-w-2xl mx-auto animate-in fade-in-50 duration-200">
                  <CardHeader className="border-b border-zinc-800 py-4">
                    <CardTitle className="text-base font-extrabold text-rose-400 flex items-center gap-2">
                      <MailIcon className="w-5 h-5" />
                      GỬI THƯ THÔNG BÁO TOÀN SV
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      Gửi thư thông báo đến toàn bộ người chơi hiện có trong hệ thống và tự động lưu làm mẫu cho tài khoản đăng ký mới sau này.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Người gửi</label>
                        <Input
                          type="text"
                          value={adminMailForm.sender}
                          onChange={(e) => setAdminMailForm({ ...adminMailForm, sender: e.target.value })}
                          className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus-visible:ring-rose-500 focus-visible:border-rose-500"
                          placeholder="Ví dụ: Ban Quản Trị, BTC Giải Đấu..."
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Phân loại thư (Category)</label>
                        <Select
                          value={adminMailForm.category}
                          onValueChange={(val) => setAdminMailForm({ ...adminMailForm, category: val || "GENERAL" })}
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 text-xs focus:ring-rose-500">
                            <SelectValue placeholder="Chọn phân loại..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-850 text-zinc-200">
                            <SelectItem value="GENERAL">GENERAL (Chung / Hệ thống)</SelectItem>
                            <SelectItem value="TRANSFER">TRANSFER (Chuyển nhượng)</SelectItem>
                            <SelectItem value="MATCH">MATCH (Trận đấu)</SelectItem>
                            <SelectItem value="BOARD">BOARD (Ban quản lý)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tiêu đề email</label>
                      <Input
                        type="text"
                        value={adminMailForm.title}
                        onChange={(e) => setAdminMailForm({ ...adminMailForm, title: e.target.value })}
                        className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus-visible:ring-rose-500 focus-visible:border-rose-500"
                        placeholder="Nhập tiêu đề thông báo..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Nội dung thư</label>
                      <textarea
                        value={adminMailForm.content}
                        onChange={(e) => setAdminMailForm({ ...adminMailForm, content: e.target.value })}
                        rows={6}
                        className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 focus-visible:border-rose-500"
                        placeholder="Nhập nội dung thư gửi tới tất cả người chơi..."
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-zinc-800 py-4 flex justify-end">
                    <Button
                      disabled={isPending}
                      onClick={handleAdminSendGlobalMail}
                      className="bg-rose-600 hover:bg-rose-500 text-zinc-50 font-bold text-xs px-4 py-2 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isPending ? "ĐANG GỬI THƯ..." : "GỬI THƯ TOÀN SV"}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          )}
          {/* DIALOG CHI TIẾT TUYỂN THỦ (GLOBAL) */}
          {selectedPlayer && (
            <Dialog open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg shadow-2xl">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <PlayerAvatar playerName={selectedPlayer.name} role={selectedPlayer.role} size={96} imageUrl={selectedPlayer.avatarUrl} />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 font-bold font-mono">{selectedPlayer.role}</Badge>
                        <DialogTitle className="text-2xl font-black text-zinc-100 tracking-tight">{selectedPlayer.name}</DialogTitle>
                      </div>
                      <DialogDescription className="text-xs text-zinc-500 font-semibold mt-0.5">
                        Tên thật: {selectedPlayer.realName || "Chưa cập nhật"} | Quốc tịch: {selectedPlayer.nationality}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
                  <div className="space-y-3 text-xs">
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Thông tin hợp đồng</div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Lương:</span>
                        <span className="font-bold text-emerald-400">${selectedPlayer.salary.toLocaleString()}/năm</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Giá trị:</span>
                        <span className="font-bold">${selectedPlayer.value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span>Hợp đồng đến:</span>
                        <span className="font-bold text-zinc-400 font-mono">Mùa {selectedPlayer.contractEnd}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold px-0.5">Kỹ năng chi tiết</div>
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-400 mb-0.5">
                            <span>Laning (Đi Đường):</span>
                            <span className="font-bold text-zinc-200">{selectedPlayer.laning}/100</span>
                          </div>
                          <Progress value={selectedPlayer.laning} className="h-1 bg-zinc-950 border border-zinc-800" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-400 mb-0.5">
                            <span>Teamfight (Giao Tranh):</span>
                            <span className="font-bold text-zinc-200">{selectedPlayer.teamfight}/100</span>
                          </div>
                          <Progress value={selectedPlayer.teamfight} className="h-1 bg-zinc-950 border border-zinc-800" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-400 mb-0.5">
                            <span>Macro (Kiểm Soát):</span>
                            <span className="font-bold text-zinc-200">{selectedPlayer.macro}/100</span>
                          </div>
                          <Progress value={selectedPlayer.macro} className="h-1 bg-zinc-950 border border-zinc-800" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-400 mb-0.5">
                            <span>Mental (Tâm Lý):</span>
                            <span className="font-bold text-zinc-200">{selectedPlayer.mentality}/100</span>
                          </div>
                          <Progress value={selectedPlayer.mentality} className="h-1 bg-zinc-950 border border-zinc-800" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-400 mb-0.5">
                            <span>Bể tướng (Pool):</span>
                            <span className="font-bold text-zinc-200">{selectedPlayer.championPool}/100</span>
                          </div>
                          <Progress value={selectedPlayer.championPool} className="h-1 bg-zinc-950 border border-zinc-800" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-center">
                    <PlayerRadarChart
                      stats={[
                        { subject: "Đi đường", value: selectedPlayer.laning },
                        { subject: "Giao tranh", value: selectedPlayer.teamfight },
                        { subject: "Kiểm soát", value: selectedPlayer.macro },
                        { subject: "Tâm lý", value: selectedPlayer.mentality },
                        { subject: "Bể tướng", value: selectedPlayer.championPool }
                      ]}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4 flex justify-between items-center gap-3">
                  {selectedPlayer.teamId === userTeam.id ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReleasePlayer(selectedPlayer.id)}
                      className="font-bold text-xs"
                    >
                      Sa thải tuyển thủ
                    </Button>
                  ) : !selectedPlayer.teamId ? (
                    <Button
                      onClick={() => {
                        handleSignPlayer(selectedPlayer.id);
                        setSelectedPlayer(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-50 font-bold text-xs px-3 py-1.5"
                    >
                      Chiêu mộ tuyển thủ
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlayer(null)}
                    className="font-bold text-xs border-zinc-700 hover:bg-zinc-800"
                  >
                    Đóng
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* DIALOG CHI TIẾT ĐỘI TUYỂN (GLOBAL) */}
          {selectedTeamForDetails && (
            <Dialog open={!!selectedTeamForDetails} onOpenChange={(open) => !open && setSelectedTeamForDetails(null)}>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <TeamLogo teamName={selectedTeamForDetails.name} size={96} />
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-2xl font-black text-zinc-100 tracking-tight">{selectedTeamForDetails.name}</DialogTitle>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-950/40">{selectedTeamForDetails.region}</Badge>
                        {selectedTeamForDetails.id === userTeam.id && (
                          <Badge className="bg-emerald-600 text-zinc-50 text-[10px] font-bold">Đội của bạn</Badge>
                        )}
                      </div>
                      <DialogDescription className="text-xs text-zinc-500 mt-1 font-semibold">
                        Thành tích: <span className="text-emerald-400 font-bold">{selectedTeamForDetails.wins} Thắng</span> - <span className="text-rose-400 font-bold">{selectedTeamForDetails.losses} Thua</span> | Điểm BXH: <span className="text-blue-400 font-bold">{selectedTeamForDetails.points} pts</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Financials Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1.5 shadow-md">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Ngân sách hiện tại</div>
                      <div className="text-lg font-black text-emerald-400 font-mono font-semibold">${selectedTeamForDetails.budget.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1.5 shadow-md">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Giới hạn lương (Cap)</div>
                      <div className="text-lg font-black text-zinc-300 font-mono font-semibold">${selectedTeamForDetails.salaryCap.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1.5 shadow-md">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Tổng lương chi trả</div>
                      {(() => {
                        const totalSal = selectedTeamForDetails.players ? selectedTeamForDetails.players.reduce((sum, p) => sum + p.salary, 0) : 0;
                        const pct = Math.round((totalSal / selectedTeamForDetails.salaryCap) * 100);
                        return (
                          <div>
                            <div className="text-lg font-black text-rose-400 font-mono font-semibold">${totalSal.toLocaleString()}</div>
                            <div className="text-[9px] text-zinc-500 font-bold mt-0.5">Chiếm {pct}% quỹ lương tối đa</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Roster Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Đội hình tuyển thủ</h4>
                    <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-inner">
                      <Table>
                        <TableHeader className="bg-zinc-900 border-b border-zinc-850">
                          <TableRow className="border-zinc-850 hover:bg-zinc-900">
                            <TableHead className="w-16 font-bold text-zinc-400 text-center">Vị trí</TableHead>
                            <TableHead className="font-bold text-zinc-400">Tuyển thủ</TableHead>
                            <TableHead className="w-16 font-bold text-zinc-400 text-center">Tuổi</TableHead>
                            <TableHead className="font-bold text-zinc-400">Quốc tịch</TableHead>
                            <TableHead className="font-bold text-zinc-400 text-right">Lương hàng năm</TableHead>
                            <TableHead className="font-bold text-zinc-400 text-right">Giá trị chuyển nhượng</TableHead>
                            <TableHead className="w-20 font-bold text-zinc-400 text-center">Điểm tb</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!selectedTeamForDetails.players || selectedTeamForDetails.players.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-zinc-600 py-8 italic text-xs font-bold">
                                Không có tuyển thủ nào trong đội hình.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedTeamForDetails.players.map((player) => {
                              const avgRating = Math.round((player.laning + player.teamfight + player.macro + player.mentality + player.championPool) / 5);
                              return (
                                <TableRow
                                  key={player.id}
                                  className="border-zinc-850 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    setSelectedTeamForDetails(null);
                                  }}
                                >
                                  <TableCell className="text-center py-2.5">
                                    <Badge className="bg-zinc-850 text-[10px] border-zinc-800 text-zinc-400 w-8 justify-center font-mono">{player.role}</Badge>
                                  </TableCell>
                                  <TableCell className="font-bold text-zinc-200">
                                    <div className="flex items-center gap-3">
                                      <PlayerAvatar playerName={player.name} role={player.role} size={52} imageUrl={player.avatarUrl} />
                                      <div className="flex flex-col">
                                        <span className="text-xs text-zinc-100 font-bold">{player.name}</span>
                                        {player.realName && <span className="text-[9px] text-zinc-500 font-semibold">{player.realName}</span>}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center text-zinc-300 font-medium text-xs font-mono">{player.age}</TableCell>
                                  <TableCell className="text-zinc-400 font-medium text-xs">{player.nationality}</TableCell>
                                  <TableCell className="text-right text-emerald-400 font-semibold text-xs font-mono">${player.salary.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-zinc-300 font-semibold text-xs font-mono">${player.value.toLocaleString()}</TableCell>
                                  <TableCell className="text-center font-bold text-blue-400 font-mono text-xs">{avgRating}</TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTeamForDetails(null)}
                    className="font-bold text-xs border-zinc-700 hover:bg-zinc-800"
                  >
                    Đóng
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}


