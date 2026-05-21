import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "lol-legends-secret-key-2026-v1-super-secret";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function signToken(payload: object): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(dataStr).digest("hex");
  return `${dataStr}.${signature}`;
}

export function verifyToken(token: string): any | null {
  try {
    const [dataStr, signature] = token.split(".");
    if (!dataStr || !signature) return null;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(dataStr).digest("hex");
    if (signature !== expectedSig) return null;
    
    const decoded = Buffer.from(dataStr, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Lấy thông tin user hiện tại từ Cookie (hỗ trợ cả Next.js Server Components và Server Actions)
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (err) {
    return null;
  }
}
