import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Sử dụng Turso nếu có URL, ngược lại luôn dùng file local
  const url = (tursoUrl && tursoUrl !== "undefined" && tursoUrl.length > 0) 
    ? tursoUrl 
    : `file:${path.join(process.cwd(), "prisma", "dev.db")}`;

  const adapter = new PrismaLibSql({
    url,
    authToken: tursoToken,
  });
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;