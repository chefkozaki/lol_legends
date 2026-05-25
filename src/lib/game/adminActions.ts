"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Hàm kiểm tra quyền admin
async function checkAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Bạn không có quyền thực hiện hành động này.");
  }
  return currentUser;
}

// 1. Cập nhật chỉ số tuyển thủ
export async function adminUpdatePlayerAction(playerId: string, data: {
  name?: string;
  role?: string;
  age?: number;
  nationality?: string;
  laning?: number;
  teamfight?: number;
  macro?: number;
  mentality?: number;
  championPool?: number;
  salary?: number;
  value?: number;
  avatarUrl?: string;
}) {
  try {
    await checkAdmin();

    const player = await db.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error("Không tìm thấy tuyển thủ");

    await db.player.updateMany({
      where: { name: player.name },
      data: {
        name: data.name !== undefined ? data.name : player.name,
        role: data.role !== undefined ? data.role : player.role,
        age: data.age !== undefined ? Number(data.age) : player.age,
        nationality: data.nationality !== undefined ? data.nationality : player.nationality,
        laning: data.laning !== undefined ? Number(data.laning) : player.laning,
        teamfight: data.teamfight !== undefined ? Number(data.teamfight) : player.teamfight,
        macro: data.macro !== undefined ? Number(data.macro) : player.macro,
        mentality: data.mentality !== undefined ? Number(data.mentality) : player.mentality,
        championPool: data.championPool !== undefined ? Number(data.championPool) : player.championPool,
        salary: data.salary !== undefined ? Number(data.salary) : player.salary,
        value: data.value !== undefined ? Number(data.value) : player.value,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : player.avatarUrl,
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi admin update player:", error);
    return { success: false, error: error.message };
  }
}

// 2. Cập nhật ngân sách / quỹ lương của đội
export async function adminUpdateTeamAction(teamId: string, data: {
  name?: string;
  budget?: number;
  salaryCap?: number;
  points?: number;
  wins?: number;
  losses?: number;
  logoUrl?: string;
  abbreviation?: string;
}) {
  try {
    await checkAdmin();

    const team = await db.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Không tìm thấy đội tuyển");

    const oldName = team.name;
    const newName = data.name !== undefined ? data.name.trim() : team.name;

    await db.team.update({
      where: { id: teamId },
      data: {
        name: newName,
        budget: data.budget !== undefined ? Number(data.budget) : team.budget,
        salaryCap: data.salaryCap !== undefined ? Number(data.salaryCap) : team.salaryCap,
        points: data.points !== undefined ? Number(data.points) : team.points,
        wins: data.wins !== undefined ? Number(data.wins) : team.wins,
        losses: data.losses !== undefined ? Number(data.losses) : team.losses,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : team.logoUrl,
        abbreviation: data.abbreviation !== undefined ? data.abbreviation : team.abbreviation,
      }
    });

    if (data.logoUrl !== undefined || data.abbreviation !== undefined || data.name !== undefined) {
      await db.team.updateMany({
        where: { name: oldName },
        data: {
          name: newName,
          logoUrl: data.logoUrl !== undefined ? data.logoUrl : team.logoUrl,
          abbreviation: data.abbreviation !== undefined ? data.abbreviation : team.abbreviation,
        }
      });
    }

    if (data.budget !== undefined || data.salaryCap !== undefined) {
      await db.team.updateMany({
        where: { name: team.name, userId: null },
        data: {
          budget: data.budget !== undefined ? Number(data.budget) : team.budget,
          salaryCap: data.salaryCap !== undefined ? Number(data.salaryCap) : team.salaryCap,
        }
      });
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi admin update team:", error);
    return { success: false, error: error.message };
  }
}

// 3. Lấy danh sách tất cả tài khoản người dùng
export async function adminGetUsersAction() {
  try {
    await checkAdmin();

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            teams: true,
            mails: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, users };
  } catch (error: any) {
    console.error("Lỗi admin get users:", error);
    return { success: false, error: error.message };
  }
}

// 4. Xóa tài khoản người dùng (bao gồm toàn bộ Save Game của họ do CASCADE onDelete)
export async function adminDeleteUserAction(userId: string) {
  try {
    const current = await checkAdmin();
    if (current.id === userId) {
      throw new Error("Bạn không thể tự xóa tài khoản của chính mình.");
    }

    await db.user.delete({
      where: { id: userId }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi admin delete user:", error);
    return { success: false, error: error.message };
  }
}

// 5. Thêm Đội tuyển mới
export async function adminCreateTeamAction(data: {
  name: string;
  region: string;
  budget: number;
  salaryCap: number;
  logoUrl?: string;
  abbreviation?: string;
}) {
  try {
    await checkAdmin();

    const existing = await db.team.findFirst({
      where: {
        name: data.name,
        userId: null,
      }
    });
    if (existing) {
      throw new Error(`Đội tuyển với tên "${data.name}" đã tồn tại trong hệ thống.`);
    }

    // 1. Tạo bản mẫu (userId: null)
    await db.team.create({
      data: {
        name: data.name,
        region: data.region,
        budget: Number(data.budget),
        salaryCap: Number(data.salaryCap),
        logoUrl: data.logoUrl || null,
        abbreviation: data.abbreviation || null,
        isUser: false,
        wins: 0,
        losses: 0,
        points: 0,
        userId: null,
      }
    });

    // 2. Tạo cho toàn bộ user
    const users = await db.user.findMany({ select: { id: true } });
    for (const u of users) {
      const existingTeam = await db.team.findFirst({
        where: { name: data.name, userId: u.id }
      });
      if (!existingTeam) {
        await db.team.create({
          data: {
            name: data.name,
            region: data.region,
            budget: Number(data.budget),
            salaryCap: Number(data.salaryCap),
            logoUrl: data.logoUrl || null,
            abbreviation: data.abbreviation || null,
            isUser: false,
            wins: 0,
            losses: 0,
            points: 0,
            userId: u.id,
          }
        });
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi admin create team:", error);
    return { success: false, error: error.message };
  }
}

// 6. Thêm Tuyển thủ mới
export async function adminCreatePlayerAction(data: {
  name: string;
  realName: string;
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
  teamId: string | null;
  avatarUrl?: string;
}) {
  try {
    await checkAdmin();

    let teamName: string | null = null;
    if (data.teamId) {
      const adminTeam = await db.team.findUnique({ where: { id: data.teamId } });
      if (adminTeam) {
        teamName = adminTeam.name;
      }
    }

    // 1. Tạo tuyển thủ mẫu (userId = null)
    let templateTeamId: string | null = null;
    if (teamName) {
      const templateTeam = await db.team.findFirst({
        where: { name: teamName, userId: null }
      });
      if (templateTeam) {
        templateTeamId = templateTeam.id;
      }
    }

    await db.player.create({
      data: {
        name: data.name,
        realName: data.realName || null,
        avatarUrl: data.avatarUrl || null,
        role: data.role,
        age: Number(data.age),
        nationality: data.nationality,
        laning: Number(data.laning),
        teamfight: Number(data.teamfight),
        macro: Number(data.macro),
        mentality: Number(data.mentality),
        championPool: Number(data.championPool),
        salary: Number(data.salary),
        value: Number(data.value),
        teamId: templateTeamId,
        userId: null,
      }
    });

    // 2. Tạo tuyển thủ cho tất cả user
    const users = await db.user.findMany({ select: { id: true } });
    for (const u of users) {
      let userTeamId: string | null = null;
      if (teamName) {
        const userTeam = await db.team.findFirst({
          where: { name: teamName, userId: u.id }
        });
        if (userTeam) {
          userTeamId = userTeam.id;
        }
      }

      await db.player.create({
        data: {
          name: data.name,
          realName: data.realName || null,
          avatarUrl: data.avatarUrl || null,
          role: data.role,
          age: Number(data.age),
          nationality: data.nationality,
          laning: Number(data.laning),
          teamfight: Number(data.teamfight),
          macro: Number(data.macro),
          mentality: Number(data.mentality),
          championPool: Number(data.championPool),
          salary: Number(data.salary),
          value: Number(data.value),
          teamId: userTeamId,
          userId: u.id,
        }
      });
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi admin create player:", error);
    return { success: false, error: error.message };
  }
}

export async function adminUpdateChampionTiersAction(
  tiers: Record<string, string>,
  images?: Record<string, string>
) {
  try {
    await checkAdmin();

    for (const [champId, tier] of Object.entries(tiers)) {
      await db.championTier.upsert({
        where: { id: champId },
        update: { tier },
        create: { id: champId, tier }
      });
    }

    if (images) {
      for (const [champId, imageUrl] of Object.entries(images)) {
        await db.championTier.update({
          where: { id: champId },
          data: { imageUrl: imageUrl || null }
        });
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi cập nhật tier/ảnh tướng:", error);
    return { success: false, error: error.message };
  }
}

export async function adminUpdateTournamentAction(
  tournamentId: string,
  data: { name?: string; imageUrl?: string }
) {
  try {
    await checkAdmin();

    const t = await db.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new Error("Không tìm thấy giải đấu");

    await db.tournament.update({
      where: { id: tournamentId },
      data: {
        name: data.name !== undefined ? data.name : t.name,
        imageUrl: data.imageUrl !== undefined ? (data.imageUrl || null) : t.imageUrl
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi cập nhật giải đấu:", error);
    return { success: false, error: error.message };
  }
}

// 7. Gửi tin nhắn tới toàn bộ máy chủ (tất cả user)
export async function adminSendGlobalMailAction(data: {
  title: string;
  content: string;
  sender: string;
  category?: string;
}) {
  try {
    await checkAdmin();

    const { title, content, sender, category = "GENERAL" } = data;
    if (!title || !content || !sender) {
      throw new Error("Vui lòng điền đầy đủ tiêu đề, nội dung và người gửi.");
    }

    // 1. Lấy tất cả người dùng trong hệ thống kèm theo GameState của họ
    const users = await db.user.findMany({
      include: { gameState: true }
    });

    // 2. Gửi thư cho từng người dùng hiện tại
    for (const u of users) {
      const date = u.gameState?.currentDate || "2026-01-05";
      await db.mail.create({
        data: {
          title,
          content,
          date,
          sender,
          category,
          read: false,
          userId: u.id
        }
      });
    }

    // 3. Tạo 1 bản sao global template (userId: null) để người chơi mới sau này cũng nhận được
    await db.mail.create({
      data: {
        title,
        content,
        date: "2026-01-05", // Ngày mặc định khi khởi tạo GameState
        sender,
        category,
        read: false,
        userId: null
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi admin gửi thư toàn server:", error);
    return { success: false, error: error.message };
  }
}
