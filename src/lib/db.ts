import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  const isTurso = (tursoUrl && tursoUrl !== "undefined" && tursoUrl.length > 0);

  let config;

  if (isTurso) {
    // Vercel Serverless Environment: Kết nối thẳng tới Turso qua HTTP/WebSocket
    config = {
      url: tursoUrl!,
      authToken: tursoToken,
    };
  } else {
    // Chỉ dùng cho môi trường dev không có internet / Turso
    const localDbUrl = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
    config = {
      url: localDbUrl,
    };
  }

  const adapter = new PrismaLibSql(config);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;