import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AuthScreen from "@/components/AuthScreen";
import StartGame from "@/components/StartGame";
import GameDashboard from "@/components/GameDashboard";
import { getChampionTiersAction, getTournamentsAction } from "@/lib/game/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 1. Kiểm tra tài khoản người dùng hiện tại
  const currentUser = await getCurrentUser();

  // 2. Nếu CHƯA ĐĂNG NHẬP, hiển thị màn hình Đăng nhập / Đăng ký
  if (!currentUser) {
    return <AuthScreen />;
  }

  // 3. Nếu ĐÃ ĐĂNG NHẬP, lấy GameState của tài khoản này
  let gameState = await db.gameState.findUnique({
    where: { userId: currentUser.id }
  });

  // 4. Nếu người chơi CHƯA KHỞI TẠO GAME / CHƯA CHỌN ĐỘI TUYỂN
  if (!gameState || !gameState.userTeamId) {
    // Lấy danh sách 5 đội tuyển mẫu ngẫu nhiên (có userId = null) từ database để người chơi chọn
    const lckTeams = await db.team.findMany({ where: { region: "LCK", userId: null }, include: { players: true } });
    const lcpTeams = await db.team.findMany({ where: { region: "LCP", userId: null }, include: { players: true } });
    const lplTeams = await db.team.findMany({ where: { region: "LPL", userId: null }, include: { players: true } });
    const lecTeams = await db.team.findMany({ where: { region: "LEC", userId: null }, include: { players: true } });
    const cblolTeams = await db.team.findMany({ where: { region: "CBLOL", userId: null }, include: { players: true } });

    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    
    const randomTeams = [
      getRandom(lckTeams),
      getRandom(lcpTeams),
      getRandom(lplTeams),
      getRandom(lecTeams),
      getRandom(cblolTeams)
    ].filter(Boolean);

    return <StartGame teams={randomTeams} />;
  }

  // 5. Nếu người chơi ĐÃ CÓ GAMESTATE & ĐÃ CHỌN ĐỘI TUYỂN
  // Lấy đội tuyển của người dùng (lọc theo userId và userTeamId)
  const userTeam = await db.team.findFirst({
    where: { id: gameState.userTeamId, userId: currentUser.id },
    include: { players: true }
  });

  if (!userTeam) {
    // Đề phòng trường hợp đội tuyển bị lỗi, reset GameState để người dùng chọn lại
    await db.gameState.delete({
      where: { userId: currentUser.id }
    });
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-zinc-400">Không tìm thấy đội tuyển của bạn. Vui lòng F5 để tải lại trang chọn đội.</p>
      </div>
    );
  }

  // Lấy tất cả các đội bóng thuộc cùng Save Game của người dùng
  const allTeams = await db.team.findMany({
    where: { userId: currentUser.id },
    include: { players: true }
  });

  // Lọc lấy các đội bóng trong khu vực của người dùng
  const allTeamsInRegion = allTeams.filter((t: any) => t.region === userTeam.region);

  // Lấy lịch thi đấu của người chơi
  const rawUserMatches = await db.match.findMany({
    where: {
      userId: currentUser.id,
      OR: [
        { homeTeamId: userTeam.id },
        { awayTeamId: userTeam.id }
      ]
    },
    orderBy: { date: "asc" },
    include: {
      homeTeam: { select: { name: true, region: true, logoUrl: true } },
      awayTeam: { select: { name: true, region: true, logoUrl: true } }
    }
  });

  // Tính số tuần thi đấu động dựa trên ngày
  const userMatches = rawUserMatches.map(m => {
    const start = new Date("2026-01-05");
    const current = new Date(m.date);
    const diffTime = Math.abs(current.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return { ...m, week };
  });

  // Lấy hòm thư của người chơi
  const allMails = await db.mail.findMany({
    where: { userId: currentUser.id },
    orderBy: { date: "desc" }
  });

  // Lấy danh sách tuyển thủ tự do (thuộc cùng Save Game)
  const freeAgents = await db.player.findMany({
    where: { teamId: null, userId: currentUser.id }
  });

  // Lấy danh sách tier tướng và ảnh tướng
  const tiersResult = await getChampionTiersAction();
  const initialChampionTiers = (tiersResult && tiersResult.success) ? tiersResult.tiers : {};
  const initialChampionImages = (tiersResult && tiersResult.success) ? (tiersResult as any).images : {};

  // Lấy danh sách giải đấu
  const tournamentsResult = await getTournamentsAction();
  const initialTournaments = (tournamentsResult && tournamentsResult.success) ? tournamentsResult.tournaments : {};

  return (
    <GameDashboard
      initialGameState={gameState}
      userTeam={userTeam}
      allTeamsInRegion={allTeamsInRegion}
      allTeams={allTeams}
      userMatches={userMatches}
      allMails={allMails}
      freeAgents={freeAgents}
      currentUser={currentUser}
      initialChampionTiers={initialChampionTiers}
      initialChampionImages={initialChampionImages}
      initialTournaments={initialTournaments}
    />
  );
}
