"use server";

import { db } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: any) {
  try {
    const username = formData.username?.trim();
    const password = formData.password;

    if (!username || !password) {
      return { success: false, error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." };
    }

    const user = await db.user.findUnique({
      where: { username }
    });

    if (!user) {
      return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác." };
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác." };
    }

    // Tạo session token
    const token = signToken({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });

    // Lưu vào cookie (hạn 7 ngày)
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    revalidatePath("/");
    return { success: true, role: user.role };
  } catch (err: any) {
    console.error("Lỗi đăng nhập:", err);
    return { success: false, error: err.message || "Đã xảy ra lỗi hệ thống." };
  }
}

export async function signupAction(formData: any) {
  try {
    const username = formData.username?.trim();
    const displayName = formData.displayName?.trim();
    const password = formData.password;

    if (!username || !displayName || !password) {
      return { success: false, error: "Vui lòng điền đầy đủ các thông tin yêu cầu." };
    }

    if (username.length < 3) {
      return { success: false, error: "Tên đăng nhập phải có ít nhất 3 ký tự." };
    }

    if (password.length < 5) {
      return { success: false, error: "Mật khẩu phải có ít nhất 5 ký tự." };
    }

    // Kiểm tra trùng username
    const existing = await db.user.findUnique({
      where: { username }
    });

    if (existing) {
      return { success: false, error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." };
    }

    const hashedPassword = hashPassword(password);

    // Tạo user mới (mặc định role NORMAL)
    const user = await db.user.create({
      data: {
        username,
        displayName,
        password: hashedPassword,
        role: "NORMAL"
      }
    });

    // Tự động đăng nhập sau khi đăng ký
    const token = signToken({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi đăng ký:", err);
    return { success: false, error: err.message || "Đã xảy ra lỗi hệ thống." };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi đăng xuất:", err);
    return { success: false };
  }
}
