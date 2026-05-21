import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import crypto from "crypto";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const TEAM_TEMPLATES: Record<string, { name: string; budget: number; salaryCap: number; players: { name: string; realName: string; role: string; age: number; nationality: string; laning: number; teamfight: number; macro: number; mentality: number; championPool: number; salary: number; value: number }[] }[]> = {
  LCK: [
    {
      name: "T1 Esports",
      budget: 2000000,
      salaryCap: 1000000,
      players: [
        { name: "Zeus", realName: "Choi Woo-je", role: "TOP", age: 22, nationality: "South Korea", laning: 92, teamfight: 91, macro: 88, mentality: 85, championPool: 90, salary: 150000, value: 600000 },
        { name: "Oner", realName: "Mun Hyeon-jun", role: "JUG", age: 23, nationality: "South Korea", laning: 88, teamfight: 90, macro: 87, mentality: 88, championPool: 86, salary: 120000, value: 450000 },
        { name: "Faker", realName: "Lee Sang-hyeok", role: "MID", age: 30, nationality: "South Korea", laning: 86, teamfight: 93, macro: 97, mentality: 99, championPool: 95, salary: 250000, value: 800000 },
        { name: "Gumayusi", realName: "Lee Min-hyeong", role: "BOT", age: 24, nationality: "South Korea", laning: 91, teamfight: 92, macro: 89, mentality: 94, championPool: 89, salary: 140000, value: 550000 },
        { name: "Keria", realName: "Ryu Min-seok", role: "SUP", age: 23, nationality: "South Korea", laning: 90, teamfight: 91, macro: 93, mentality: 87, championPool: 97, salary: 140000, value: 580000 },
      ]
    },
    {
      name: "Gen.G Esports",
      budget: 2200000,
      salaryCap: 1100000,
      players: [
        { name: "Kiin", realName: "Kim Gi-in", role: "TOP", age: 26, nationality: "South Korea", laning: 91, teamfight: 90, macro: 91, mentality: 92, championPool: 89, salary: 160000, value: 550000 },
        { name: "Canyon", realName: "Kim Geon-bu", role: "JUG", age: 24, nationality: "South Korea", laning: 89, teamfight: 91, macro: 94, mentality: 90, championPool: 91, salary: 170000, value: 650000 },
        { name: "Chovy", realName: "Jeong Ji-hoon", role: "MID", age: 25, nationality: "South Korea", laning: 98, teamfight: 94, macro: 92, mentality: 90, championPool: 93, salary: 240000, value: 900000 },
        { name: "Peyz", realName: "Kim Su-hwan", role: "BOT", age: 20, nationality: "South Korea", laning: 87, teamfight: 93, macro: 85, mentality: 88, championPool: 87, salary: 100000, value: 500000 },
        { name: "Lehends", realName: "Son Si-woo", role: "SUP", age: 27, nationality: "South Korea", laning: 85, teamfight: 89, macro: 92, mentality: 89, championPool: 90, salary: 110000, value: 400000 },
      ]
    },
    {
      name: "Hanwha Life Esports",
      budget: 1800000,
      salaryCap: 950000,
      players: [
        { name: "Doran", realName: "Choi Hyeon-joon", role: "TOP", age: 25, nationality: "South Korea", laning: 86, teamfight: 88, macro: 85, mentality: 82, championPool: 86, salary: 110000, value: 380000 },
        { name: "Peanut", realName: "Han Wang-ho", role: "JUG", age: 28, nationality: "South Korea", laning: 82, teamfight: 87, macro: 95, mentality: 93, championPool: 88, salary: 140000, value: 480000 },
        { name: "Zeka", realName: "Kim Geon-woo", role: "MID", age: 23, nationality: "South Korea", laning: 90, teamfight: 94, macro: 86, mentality: 91, championPool: 85, salary: 160000, value: 580000 },
        { name: "Viper", realName: "Park Do-hyeon", role: "BOT", age: 25, nationality: "South Korea", laning: 93, teamfight: 96, macro: 90, mentality: 92, championPool: 90, salary: 180000, value: 750000 },
        { name: "Delight", realName: "Yoo Hwan-joong", role: "SUP", age: 23, nationality: "South Korea", laning: 86, teamfight: 93, macro: 89, mentality: 88, championPool: 87, salary: 110000, value: 420000 },
      ]
    },
    {
      name: "Dplus KIA",
      budget: 1500000,
      salaryCap: 800000,
      players: [
        { name: "Kingen", realName: "Hwang Seong-hoon", role: "TOP", age: 26, nationality: "South Korea", laning: 85, teamfight: 89, macro: 84, mentality: 88, championPool: 85, salary: 100000, value: 350000 },
        { name: "Lucid", realName: "Choi Yong-hyeok", role: "JUG", age: 21, nationality: "South Korea", laning: 86, teamfight: 87, macro: 85, mentality: 83, championPool: 84, salary: 80000, value: 320000 },
        { name: "ShowMaker", realName: "Heo Su", role: "MID", age: 25, nationality: "South Korea", laning: 89, teamfight: 91, macro: 92, mentality: 92, championPool: 91, salary: 170000, value: 620000 },
        { name: "Aiming", realName: "Kim Ha-ram", role: "BOT", age: 25, nationality: "South Korea", laning: 90, teamfight: 92, macro: 86, mentality: 87, championPool: 88, salary: 130000, value: 480000 },
        { name: "Kellin", realName: "Kim Hyeong-gyu", role: "SUP", age: 25, nationality: "South Korea", laning: 83, teamfight: 85, macro: 86, mentality: 80, championPool: 85, salary: 80000, value: 250000 },
      ]
    },
    {
      name: "KT Rolster",
      budget: 1300000,
      salaryCap: 750000,
      players: [
        { name: "PerfecT", realName: "Lee Seung-min", role: "TOP", age: 21, nationality: "South Korea", laning: 82, teamfight: 83, macro: 81, mentality: 80, championPool: 82, salary: 70000, value: 220000 },
        { name: "Pyosik", realName: "Hong Chang-hyeon", role: "JUG", age: 26, nationality: "South Korea", laning: 84, teamfight: 88, macro: 85, mentality: 89, championPool: 85, salary: 110000, value: 360000 },
        { name: "Bdd", realName: "Gwak Bo-seong", role: "MID", age: 26, nationality: "South Korea", laning: 89, teamfight: 90, macro: 90, mentality: 91, championPool: 89, salary: 140000, value: 500000 },
        { name: "Deft", realName: "Kim Hyuk-kyu", role: "BOT", age: 29, nationality: "South Korea", laning: 86, teamfight: 88, macro: 91, mentality: 95, championPool: 90, salary: 120000, value: 400000 },
        { name: "BeryL", realName: "Cho Geon-hee", role: "SUP", age: 29, nationality: "South Korea", laning: 80, teamfight: 87, macro: 96, mentality: 94, championPool: 92, salary: 120000, value: 380000 },
      ]
    },
    {
      name: "FearX",
      budget: 900000,
      salaryCap: 600000,
      players: [
        { name: "Clear", realName: "Song Hyeon-min", role: "TOP", age: 21, nationality: "South Korea", laning: 81, teamfight: 82, macro: 80, mentality: 79, championPool: 80, salary: 60000, value: 180000 },
        { name: "Raptor", realName: "Jeon Eo-jin", role: "JUG", age: 22, nationality: "South Korea", laning: 80, teamfight: 81, macro: 81, mentality: 78, championPool: 79, salary: 55000, value: 160000 },
        { name: "Clozer", realName: "Lee Ju-hyeon", role: "MID", age: 23, nationality: "South Korea", laning: 88, teamfight: 86, macro: 81, mentality: 82, championPool: 83, salary: 90000, value: 300000 },
        { name: "Hena", realName: "Park Jeong-hwan", role: "BOT", age: 24, nationality: "South Korea", laning: 83, teamfight: 84, macro: 82, mentality: 81, championPool: 82, salary: 75000, value: 240000 },
        { name: "Execute", realName: "Jeong Hun", role: "SUP", age: 25, nationality: "South Korea", laning: 81, teamfight: 83, macro: 82, mentality: 80, championPool: 80, salary: 65000, value: 190000 },
      ]
    },
    {
      name: "Kwangdong Freecs",
      budget: 1000000,
      salaryCap: 650000,
      players: [
        { name: "DuDu", realName: "Lee Dong-ju", role: "TOP", age: 24, nationality: "South Korea", laning: 86, teamfight: 83, macro: 82, mentality: 82, championPool: 83, salary: 85000, value: 280000 },
        { name: "Cuzz", realName: "Moon Woo-chan", role: "JUG", age: 26, nationality: "South Korea", laning: 84, teamfight: 85, macro: 89, mentality: 86, championPool: 85, salary: 110000, value: 350000 },
        { name: "Bulldog", realName: "Lee Tae-young", role: "MID", age: 21, nationality: "South Korea", laning: 82, teamfight: 83, macro: 80, mentality: 79, championPool: 81, salary: 60000, value: 190000 },
        { name: "Bull", realName: "Song Seon-gyu", role: "BOT", age: 22, nationality: "South Korea", laning: 80, teamfight: 82, macro: 79, mentality: 78, championPool: 78, salary: 50000, value: 150000 },
        { name: "Andil", realName: "Moon Gwan-bin", role: "SUP", age: 22, nationality: "South Korea", laning: 81, teamfight: 81, macro: 80, mentality: 79, championPool: 79, salary: 50000, value: 160000 },
      ]
    },
    {
      name: "OKSavingsBank BRION",
      budget: 800000,
      salaryCap: 550000,
      players: [
        { name: "Morgan", realName: "Park Ru-han", role: "TOP", age: 25, nationality: "South Korea", laning: 83, teamfight: 82, macro: 81, mentality: 84, championPool: 81, salary: 75000, value: 220000 },
        { name: "GIDEON", realName: "Kim Min-seong", role: "JUG", age: 23, nationality: "South Korea", laning: 80, teamfight: 80, macro: 80, mentality: 78, championPool: 79, salary: 55000, value: 150000 },
        { name: "Karis", realName: "Kim Hong-jo", role: "MID", age: 23, nationality: "South Korea", laning: 81, teamfight: 81, macro: 81, mentality: 80, championPool: 80, salary: 60000, value: 170000 },
        { name: "Envyy", realName: "Lee Myeong-joon", role: "BOT", age: 26, nationality: "South Korea", laning: 80, teamfight: 82, macro: 80, mentality: 77, championPool: 79, salary: 65000, value: 180000 },
        { name: "Pollu", realName: "Oh Dong-gyu", role: "SUP", age: 21, nationality: "South Korea", laning: 79, teamfight: 80, macro: 79, mentality: 78, championPool: 78, salary: 45000, value: 130000 },
      ]
    }
  ],
  LCP: [
    {
      name: "GAM Esports",
      budget: 1200000,
      salaryCap: 500000,
      players: [
        { name: "Kiaya", realName: "Trần Duy Sang", role: "TOP", age: 25, nationality: "Vietnam", laning: 86, teamfight: 87, macro: 84, mentality: 88, championPool: 85, salary: 80000, value: 300000 },
        { name: "Levi", realName: "Đỗ Duy Khánh", role: "JUG", age: 29, nationality: "Vietnam", laning: 83, teamfight: 87, macro: 90, mentality: 95, championPool: 88, salary: 90000, value: 350000 },
        { name: "Emo", realName: "Nguyễn Khánh Tuyên", role: "MID", age: 21, nationality: "Vietnam", laning: 78, teamfight: 82, macro: 80, mentality: 81, championPool: 80, salary: 50000, value: 180000 },
        { name: "EasyLove", realName: "Hứa Thành An", role: "BOT", age: 27, nationality: "Vietnam", laning: 80, teamfight: 83, macro: 81, mentality: 84, championPool: 81, salary: 60000, value: 200000 },
        { name: "Elio", realName: "Phạm Thạch Nhân Băng", role: "SUP", age: 24, nationality: "Vietnam", laning: 81, teamfight: 82, macro: 82, mentality: 80, championPool: 80, salary: 50000, value: 170000 },
      ]
    },
    {
      name: "Vikings Esports",
      budget: 1000000,
      salaryCap: 450000,
      players: [
        { name: "Nanaue", realName: "Nguyễn Hoàng Hải", role: "TOP", age: 22, nationality: "Vietnam", laning: 80, teamfight: 81, macro: 79, mentality: 77, championPool: 80, salary: 45000, value: 150000 },
        { name: "Gury", realName: "Lương Hải Hải", role: "JUG", age: 22, nationality: "Vietnam", laning: 81, teamfight: 82, macro: 81, mentality: 79, championPool: 81, salary: 50000, value: 160000 },
        { name: "Kati", realName: "Đặng Thanh Phê", role: "MID", age: 27, nationality: "Vietnam", laning: 82, teamfight: 83, macro: 85, mentality: 85, championPool: 83, salary: 70000, value: 240000 },
        { name: "Shogun", realName: "Nguyễn Văn Huy", role: "BOT", age: 22, nationality: "Vietnam", laning: 85, teamfight: 86, macro: 81, mentality: 82, championPool: 84, salary: 75000, value: 280000 },
        { name: "Bie", realName: "Trần Đức Hiếu", role: "SUP", age: 26, nationality: "Vietnam", laning: 82, teamfight: 83, macro: 84, mentality: 83, championPool: 82, salary: 65000, value: 210000 },
      ]
    },
    {
      name: "Team Secret LCP",
      budget: 950000,
      salaryCap: 420000,
      players: [
        { name: "Hasmed", realName: "Lâm Huỳnh Gia Huy", role: "TOP", age: 24, nationality: "Vietnam", laning: 82, teamfight: 82, macro: 80, mentality: 80, championPool: 82, salary: 55000, value: 180000 },
        { name: "Ikigai", realName: "Trần Bảo Quang", role: "JUG", age: 21, nationality: "Vietnam", laning: 79, teamfight: 80, macro: 79, mentality: 78, championPool: 79, salary: 40000, value: 130000 },
        { name: "Aress", realName: "Lương Văn Đức", role: "MID", age: 22, nationality: "Vietnam", laning: 80, teamfight: 81, macro: 80, mentality: 79, championPool: 80, salary: 45000, value: 160000 },
        { name: "Takedown", realName: "Nguyễn Giáp Huy", role: "BOT", age: 21, nationality: "Vietnam", laning: 81, teamfight: 82, macro: 79, mentality: 80, championPool: 80, salary: 45000, value: 170000 },
        { name: "Palette", realName: "Nguyễn Hải Trung", role: "SUP", age: 27, nationality: "Vietnam", laning: 82, teamfight: 83, macro: 86, mentality: 85, championPool: 84, salary: 70000, value: 230000 },
      ]
    },
    {
      name: "PSG Talon",
      budget: 1400000,
      salaryCap: 600000,
      players: [
        { name: "Azhi", realName: "Huang Shang-chih", role: "TOP", age: 24, nationality: "Taiwan", laning: 84, teamfight: 84, macro: 83, mentality: 82, championPool: 83, salary: 70000, value: 250000 },
        { name: "Junjia", realName: "Yu Chun-chia", role: "JUG", age: 23, nationality: "Taiwan", laning: 83, teamfight: 84, macro: 85, mentality: 84, championPool: 83, salary: 80000, value: 270000 },
        { name: "Maple", realName: "Huang Yi-tang", role: "MID", age: 28, nationality: "Taiwan", laning: 85, teamfight: 86, macro: 89, mentality: 92, championPool: 88, salary: 110000, value: 380000 },
        { name: "Betty", realName: "Lu Yu-hung", role: "BOT", age: 26, nationality: "Taiwan", laning: 84, teamfight: 85, macro: 83, mentality: 85, championPool: 84, salary: 85000, value: 290000 },
        { name: "Woody", realName: "Lin Yu-en", role: "SUP", age: 23, nationality: "Taiwan", laning: 81, teamfight: 82, macro: 83, mentality: 80, championPool: 81, salary: 60000, value: 190000 },
      ]
    },
    {
      name: "SoftBank Hawks Gaming",
      budget: 1300000,
      salaryCap: 580000,
      players: [
        { name: "Evi", realName: "Shunsuke Murase", role: "TOP", age: 30, nationality: "Japan", laning: 82, teamfight: 83, macro: 86, mentality: 94, championPool: 84, salary: 90000, value: 260000 },
        { name: "Forest", realName: "Lee Hyeon-seo", role: "JUG", age: 23, nationality: "South Korea", laning: 81, teamfight: 82, macro: 81, mentality: 80, championPool: 81, salary: 65000, value: 180000 },
        { name: "Dasher", realName: "Kim Deok-beom", role: "MID", age: 26, nationality: "South Korea", laning: 83, teamfight: 84, macro: 83, mentality: 84, championPool: 83, salary: 80000, value: 230000 },
        { name: "Marble", realName: "Shuto Shimaya", role: "BOT", age: 24, nationality: "Japan", laning: 80, teamfight: 82, macro: 79, mentality: 80, championPool: 80, salary: 60000, value: 190000 },
        { name: "Vsta", realName: "Oh Hyo-seong", role: "SUP", age: 25, nationality: "South Korea", laning: 82, teamfight: 83, macro: 84, mentality: 82, championPool: 82, salary: 75000, value: 210000 },
      ]
    },
    {
      name: "CTBC Flying Oyster",
      budget: 1100000,
      salaryCap: 520000,
      players: [
        { name: "Rest", realName: "Hsu Shih-chieh", role: "TOP", age: 26, nationality: "Taiwan", laning: 83, teamfight: 82, macro: 82, mentality: 81, championPool: 82, salary: 65000, value: 210000 },
        { name: "Karsa", realName: "Hung Hau-hsuan", role: "JUG", age: 29, nationality: "Taiwan", laning: 80, teamfight: 83, macro: 91, mentality: 93, championPool: 86, salary: 90000, value: 310000 },
        { name: "Gori", realName: "Kim Tae-woo", role: "MID", age: 26, nationality: "South Korea", laning: 83, teamfight: 85, macro: 82, mentality: 81, championPool: 83, salary: 85000, value: 240000 },
        { name: "ShiauC", realName: "Liu Chia-hao", role: "BOT", age: 25, nationality: "Taiwan", laning: 80, teamfight: 81, macro: 81, mentality: 80, championPool: 80, salary: 60000, value: 180000 },
        { name: "SwordArt", realName: "Hu Shuo-chieh", role: "SUP", age: 29, nationality: "Taiwan", laning: 79, teamfight: 84, macro: 92, mentality: 94, championPool: 85, salary: 80000, value: 230000 },
      ]
    },
    {
      name: "Team Whales LCP",
      budget: 900000,
      salaryCap: 400000,
      players: [
        { name: "Sparda", realName: "Nguyễn Đăng Khoa", role: "TOP", age: 23, nationality: "Vietnam", laning: 81, teamfight: 82, macro: 80, mentality: 79, championPool: 81, salary: 50000, value: 160000 },
        { name: "BeanJ", realName: "Trần Văn Chính", role: "JUG", age: 23, nationality: "Vietnam", laning: 82, teamfight: 83, macro: 82, mentality: 81, championPool: 82, salary: 55000, value: 180000 },
        { name: "Gloryy", realName: "Lê Ngọc Vinh", role: "MID", age: 23, nationality: "Vietnam", laning: 83, teamfight: 84, macro: 82, mentality: 82, championPool: 83, salary: 60000, value: 210000 },
        { name: "Artemis", realName: "Trần Quốc Hưng", role: "BOT", age: 25, nationality: "Vietnam", laning: 84, teamfight: 85, macro: 81, mentality: 83, championPool: 83, salary: 65000, value: 230000 },
        { name: "Hieu3", realName: "Ngô Minh Hiếu", role: "SUP", age: 24, nationality: "Vietnam", laning: 79, teamfight: 80, macro: 80, mentality: 79, championPool: 79, salary: 45000, value: 130000 },
      ]
    },
    {
      name: "MGN Blue Esports",
      budget: 700000,
      salaryCap: 350000,
      players: [
        { name: "Ryuz", realName: "Triệu Lâm Vỹ", role: "TOP", age: 21, nationality: "Vietnam", laning: 79, teamfight: 79, macro: 78, mentality: 77, championPool: 79, salary: 40000, value: 120000 },
        { name: "Sorn", realName: "Nguyễn Minh Tuyên", role: "JUG", age: 25, nationality: "Vietnam", laning: 79, teamfight: 81, macro: 80, mentality: 79, championPool: 79, salary: 45000, value: 140000 },
        { name: "Nugu", realName: "Trần Quốc Đạt", role: "MID", age: 21, nationality: "Vietnam", laning: 78, teamfight: 79, macro: 78, mentality: 76, championPool: 79, salary: 35000, value: 110000 },
        { name: "Style", realName: "Mai Hoàng Sơn", role: "BOT", age: 25, nationality: "Vietnam", laning: 80, teamfight: 81, macro: 79, mentality: 80, championPool: 80, salary: 45000, value: 150000 },
        { name: "H33", realName: "Nguyễn Đăng Hải", role: "SUP", age: 21, nationality: "Vietnam", laning: 78, teamfight: 78, macro: 78, mentality: 76, championPool: 78, salary: 35000, value: 100000 },
      ]
    }
  ],
  LPL: [
    {
      name: "Bilibili Gaming",
      budget: 2400000,
      salaryCap: 1200000,
      players: [
        { name: "Bin", realName: "Chen Zebin", role: "TOP", age: 23, nationality: "China", laning: 95, teamfight: 93, macro: 88, mentality: 92, championPool: 90, salary: 190000, value: 750000 },
        { name: "Xun", realName: "Peng Lixun", role: "JUG", age: 24, nationality: "China", laning: 88, teamfight: 89, macro: 87, mentality: 85, championPool: 86, salary: 130000, value: 460000 },
        { name: "knight", realName: "Zhuo Ding", role: "MID", age: 26, nationality: "China", laning: 94, teamfight: 95, macro: 91, mentality: 90, championPool: 93, salary: 230000, value: 850000 },
        { name: "Elk", realName: "Zhao Jiahao", role: "BOT", age: 24, nationality: "China", laning: 93, teamfight: 94, macro: 89, mentality: 90, championPool: 90, salary: 160000, value: 650000 },
        { name: "ON", realName: "Luo Wenjun", role: "SUP", age: 23, nationality: "China", laning: 89, teamfight: 90, macro: 90, mentality: 82, championPool: 92, salary: 120000, value: 500000 },
      ]
    },
    {
      name: "Weibo Gaming",
      budget: 1900000,
      salaryCap: 980000,
      players: [
        { name: "Breathe", realName: "Chen Chen", role: "TOP", age: 25, nationality: "China", laning: 87, teamfight: 88, macro: 86, mentality: 85, championPool: 86, salary: 110000, value: 400000 },
        { name: "Tarzan", realName: "Lee Seung-yong", role: "JUG", age: 26, nationality: "South Korea", laning: 86, teamfight: 88, macro: 94, mentality: 90, championPool: 88, salary: 150000, value: 550000 },
        { name: "Xiaohu", realName: "Li Yuanhao", role: "MID", age: 28, nationality: "China", laning: 86, teamfight: 89, macro: 93, mentality: 92, championPool: 92, salary: 180000, value: 600000 },
        { name: "Light", realName: "Wang Guangyu", role: "BOT", age: 25, nationality: "China", laning: 88, teamfight: 91, macro: 87, mentality: 89, championPool: 87, salary: 130000, value: 480000 },
        { name: "Crisp", realName: "Liu Qingsong", role: "SUP", age: 27, nationality: "China", laning: 85, teamfight: 88, macro: 91, mentality: 91, championPool: 89, salary: 130000, value: 420000 },
      ]
    },
    {
      name: "Top Esports",
      budget: 2000000,
      salaryCap: 1050000,
      players: [
        { name: "369", realName: "Bai Jiahao", role: "TOP", age: 24, nationality: "China", laning: 89, teamfight: 91, macro: 88, mentality: 88, championPool: 89, salary: 140000, value: 520000 },
        { name: "Tian", realName: "Gao Tianliang", role: "JUG", age: 25, nationality: "China", laning: 86, teamfight: 89, macro: 91, mentality: 85, championPool: 87, salary: 140000, value: 500000 },
        { name: "Creme", realName: "Lin Jian", role: "MID", age: 22, nationality: "China", laning: 88, teamfight: 90, macro: 84, mentality: 83, championPool: 82, salary: 100000, value: 420000 },
        { name: "JackeyLove", realName: "Yu Wenbo", role: "BOT", age: 25, nationality: "China", laning: 92, teamfight: 94, macro: 89, mentality: 93, championPool: 90, salary: 200000, value: 720000 },
        { name: "Meiko", realName: "Tian Ye", role: "SUP", age: 27, nationality: "China", laning: 87, teamfight: 90, macro: 94, mentality: 95, championPool: 91, salary: 150000, value: 520000 },
      ]
    },
    {
      name: "JD Gaming",
      budget: 1800000,
      salaryCap: 920000,
      players: [
        { name: "Flandre", realName: "Li Xuanjun", role: "TOP", age: 27, nationality: "China", laning: 83, teamfight: 86, macro: 88, mentality: 90, championPool: 85, salary: 100000, value: 320000 },
        { name: "Kanavi", realName: "Seo Jin-hyeok", role: "JUG", age: 25, nationality: "South Korea", laning: 88, teamfight: 90, macro: 91, mentality: 87, championPool: 90, salary: 160000, value: 600000 },
        { name: "Yagao", realName: "Zeng Qi", role: "MID", age: 27, nationality: "China", laning: 84, teamfight: 87, macro: 89, mentality: 89, championPool: 85, salary: 120000, value: 420000 },
        { name: "Ruler", realName: "Park Jae-hyuk", role: "BOT", age: 27, nationality: "South Korea", laning: 94, teamfight: 95, macro: 91, mentality: 94, championPool: 91, salary: 220000, value: 800000 },
        { name: "MISSING", realName: "Lou Yunfeng", role: "SUP", age: 25, nationality: "China", laning: 84, teamfight: 88, macro: 88, mentality: 86, championPool: 86, salary: 100000, value: 380000 },
      ]
    },
    {
      name: "LNG Esports",
      budget: 1600000,
      salaryCap: 850000,
      players: [
        { name: "Zika", realName: "Tang Huachuang", role: "TOP", age: 22, nationality: "China", laning: 87, teamfight: 86, macro: 83, mentality: 82, championPool: 84, salary: 90000, value: 340000 },
        { name: "Weiwei", realName: "Wei Bohan", role: "JUG", age: 25, nationality: "China", laning: 83, teamfight: 85, macro: 85, mentality: 83, championPool: 83, salary: 95000, value: 300000 },
        { name: "Scout", realName: "Lee Ye-chan", role: "MID", age: 28, nationality: "South Korea", laning: 91, teamfight: 92, macro: 93, mentality: 93, championPool: 91, salary: 180000, value: 650000 },
        { name: "GALA", realName: "Chen Wei", role: "BOT", age: 25, nationality: "China", laning: 91, teamfight: 95, macro: 88, mentality: 92, championPool: 89, salary: 170000, value: 680000 },
        { name: "Hang", realName: "Fu Minghang", role: "SUP", age: 23, nationality: "China", laning: 82, teamfight: 84, macro: 83, mentality: 79, championPool: 82, salary: 85000, value: 260000 },
      ]
    },
    {
      name: "Ninjas in Pyjamas LPL",
      budget: 1300000,
      salaryCap: 780000,
      players: [
        { name: "Shanji", realName: "Deng Ziqie", role: "TOP", age: 24, nationality: "China", laning: 84, teamfight: 86, macro: 82, mentality: 84, championPool: 88, salary: 85000, value: 290000 },
        { name: "Aki", realName: "Mao An", role: "JUG", age: 24, nationality: "China", laning: 81, teamfight: 82, macro: 83, mentality: 80, championPool: 81, salary: 75000, value: 220000 },
        { name: "Rookie", realName: "Song Eui-jin", role: "MID", age: 29, nationality: "South Korea", laning: 90, teamfight: 90, macro: 92, mentality: 94, championPool: 90, salary: 170000, value: 550000 },
        { name: "Photic", realName: "Qi Yingjie", role: "BOT", age: 23, nationality: "China", laning: 85, teamfight: 86, macro: 82, mentality: 81, championPool: 83, salary: 90000, value: 310000 },
        { name: "Zhuo", realName: "Wang Dongxu", role: "SUP", age: 25, nationality: "China", laning: 80, teamfight: 82, macro: 81, mentality: 78, championPool: 80, salary: 70000, value: 200000 },
      ]
    },
    {
      name: "FunPlus Phoenix",
      budget: 1100000,
      salaryCap: 700000,
      players: [
        { name: "Xiaolaohu", realName: "Ping Xiaohu", role: "TOP", age: 23, nationality: "China", laning: 83, teamfight: 83, macro: 81, mentality: 80, championPool: 82, salary: 70000, value: 220000 },
        { name: "Milkyway", realName: "Cai Zihan", role: "JUG", age: 19, nationality: "China", laning: 88, teamfight: 87, macro: 86, mentality: 85, championPool: 84, salary: 75000, value: 400000 },
        { name: "Care", realName: "Yang Jie", role: "MID", age: 22, nationality: "China", laning: 82, teamfight: 83, macro: 80, mentality: 80, championPool: 81, salary: 65000, value: 210000 },
        { name: "deokdam", realName: "Seo Dae-gil", role: "BOT", age: 25, nationality: "South Korea", laning: 84, teamfight: 85, macro: 81, mentality: 81, championPool: 83, salary: 85000, value: 280000 },
        { name: "Life", realName: "Kim Jeong-min", role: "SUP", age: 25, nationality: "South Korea", laning: 81, teamfight: 83, macro: 84, mentality: 82, championPool: 82, salary: 75000, value: 230000 },
      ]
    },
    {
      name: "Royal Never Give Up",
      budget: 1000000,
      salaryCap: 680000,
      players: [
        { name: "Juice", realName: "Zhou Zhiqiang", role: "TOP", age: 21, nationality: "China", laning: 80, teamfight: 80, macro: 79, mentality: 77, championPool: 80, salary: 50000, value: 160000 },
        { name: "wei", realName: "Yan Yangwei", role: "JUG", age: 23, nationality: "China", laning: 84, teamfight: 86, macro: 90, mentality: 88, championPool: 85, salary: 110000, value: 420000 },
        { name: "Tangyuan", realName: "Lin Yuheng", role: "MID", age: 21, nationality: "China", laning: 81, teamfight: 82, macro: 80, mentality: 79, championPool: 80, salary: 55000, value: 180000 },
        { name: "huanfeng", realName: "Tang Huanfeng", role: "BOT", age: 25, nationality: "China", laning: 82, teamfight: 84, macro: 82, mentality: 80, championPool: 81, salary: 75000, value: 230000 },
        { name: "Ming", realName: "Shi Senming", role: "SUP", age: 27, nationality: "China", laning: 82, teamfight: 85, macro: 91, mentality: 92, championPool: 88, salary: 100000, value: 330000 },
      ]
    }
  ],
  LEC: [
    {
      name: "G2 Esports",
      budget: 1700000,
      salaryCap: 850000,
      players: [
        { name: "BrokenBlade", realName: "Sergen Çelik", role: "TOP", age: 26, nationality: "Germany", laning: 87, teamfight: 89, macro: 88, mentality: 92, championPool: 90, salary: 110000, value: 450000 },
        { name: "Yike", realName: "Martin Sundelin", role: "JUG", age: 25, nationality: "Sweden", laning: 85, teamfight: 87, macro: 85, mentality: 84, championPool: 85, salary: 95000, value: 380000 },
        { name: "Caps", realName: "Rasmus Winther", role: "MID", age: 26, nationality: "Denmark", laning: 93, teamfight: 94, macro: 94, mentality: 96, championPool: 95, salary: 200000, value: 850000 },
        { name: "Hans Sama", realName: "Steven Liv", role: "BOT", age: 26, nationality: "France", laning: 90, teamfight: 91, macro: 86, mentality: 87, championPool: 88, salary: 130000, value: 480000 },
        { name: "Mikyx", realName: "Mihael Mehle", role: "SUP", age: 27, nationality: "Slovenia", laning: 86, teamfight: 90, macro: 92, mentality: 91, championPool: 93, salary: 120000, value: 460000 },
      ]
    },
    {
      name: "Fnatic",
      budget: 1400000,
      salaryCap: 750000,
      players: [
        { name: "Oscarinin", realName: "Óscar Muñoz", role: "TOP", age: 22, nationality: "Spain", laning: 84, teamfight: 85, macro: 82, mentality: 81, championPool: 83, salary: 80000, value: 280000 },
        { name: "Razork", realName: "Iván Martín", role: "JUG", age: 25, nationality: "Spain", laning: 86, teamfight: 88, macro: 87, mentality: 86, championPool: 86, salary: 110000, value: 420000 },
        { name: "Humanoid", realName: "Marek Brázda", role: "MID", age: 26, nationality: "Czech Republic", laning: 89, teamfight: 89, macro: 90, mentality: 87, championPool: 90, salary: 130000, value: 500000 },
        { name: "Noah", realName: "Oh Hyeon-taek", role: "BOT", age: 24, nationality: "South Korea", laning: 85, teamfight: 87, macro: 81, mentality: 80, championPool: 83, salary: 90000, value: 310000 },
        { name: "Jun", realName: "Yoon Se-jun", role: "SUP", age: 25, nationality: "South Korea", laning: 83, teamfight: 85, macro: 84, mentality: 82, championPool: 83, salary: 80000, value: 260000 },
      ]
    },
    {
      name: "Team Vitality",
      budget: 1300000,
      salaryCap: 700000,
      players: [
        { name: "Photon", realName: "Kyeong Gyu-tae", role: "TOP", age: 24, nationality: "South Korea", laning: 86, teamfight: 84, macro: 82, mentality: 81, championPool: 84, salary: 85000, value: 290000 },
        { name: "Lyncas", realName: "Linus Nauncikas", role: "JUG", age: 22, nationality: "Lithuania", laning: 81, teamfight: 82, macro: 82, mentality: 80, championPool: 81, salary: 65000, value: 210000 },
        { name: "Vetheo", realName: "Vincent Berrié", role: "MID", age: 23, nationality: "France", laning: 85, teamfight: 86, macro: 81, mentality: 80, championPool: 83, salary: 95000, value: 320000 },
        { name: "Carzzy", realName: "Matyáš Orság", role: "BOT", age: 24, nationality: "Czech Republic", laning: 86, teamfight: 89, macro: 83, mentality: 86, championPool: 85, salary: 105000, value: 380000 },
        { name: "Hylissang", realName: "Zdravets Galabov", role: "SUP", age: 30, nationality: "Bulgaria", laning: 80, teamfight: 86, macro: 88, mentality: 85, championPool: 89, salary: 90000, value: 250000 },
      ]
    },
    {
      name: "MAD Lions KOI",
      budget: 1100000,
      salaryCap: 650000,
      players: [
        { name: "Myrwn", realName: "Alex Pastorini", role: "TOP", age: 22, nationality: "Spain", laning: 83, teamfight: 84, macro: 81, mentality: 83, championPool: 88, salary: 70000, value: 270000 },
        { name: "Elyoya", realName: "Javier Prades", role: "JUG", age: 25, nationality: "Spain", laning: 85, teamfight: 86, macro: 89, mentality: 88, championPool: 85, salary: 120000, value: 430000 },
        { name: "Fresskowy", realName: "Bartłomiej Przewoźnik", role: "MID", age: 26, nationality: "Poland", laning: 80, teamfight: 82, macro: 82, mentality: 81, championPool: 80, salary: 65000, value: 180000 },
        { name: "Supa", realName: "David Garcia", role: "BOT", age: 25, nationality: "Spain", laning: 83, teamfight: 85, macro: 81, mentality: 81, championPool: 82, salary: 75000, value: 240000 },
        { name: "Alvaro", realName: "Alvaro Fernandez", role: "SUP", age: 23, nationality: "Spain", laning: 82, teamfight: 83, macro: 83, mentality: 82, championPool: 81, salary: 65000, value: 210000 },
      ]
    },
    {
      name: "Team Heretics",
      budget: 1200000,
      salaryCap: 680000,
      players: [
        { name: "Wunder", realName: "Martin Hansen", role: "TOP", age: 27, nationality: "Denmark", laning: 83, teamfight: 85, macro: 88, mentality: 90, championPool: 86, salary: 90000, value: 270000 },
        { name: "Jankos", realName: "Marcin Jankowski", role: "JUG", age: 30, nationality: "Poland", laning: 80, teamfight: 85, macro: 94, mentality: 95, championPool: 86, salary: 100000, value: 280000 },
        { name: "Zwyroo", realName: "Artur Trojan", role: "MID", age: 27, nationality: "Poland", laning: 79, teamfight: 81, macro: 81, mentality: 81, championPool: 80, salary: 60000, value: 160000 },
        { name: "Flakked", realName: "Victor Lirola", role: "BOT", age: 25, nationality: "Spain", laning: 82, teamfight: 84, macro: 82, mentality: 84, championPool: 81, salary: 75000, value: 210000 },
        { name: "Kaiser", realName: "Norman Kaiser", role: "SUP", age: 27, nationality: "Germany", laning: 81, teamfight: 83, macro: 83, mentality: 81, championPool: 82, salary: 70000, value: 190000 },
      ]
    },
    {
      name: "Karmine Corp",
      budget: 1000000,
      salaryCap: 620000,
      players: [
        { name: "Cabochard", realName: "Lucas Simon-Meslet", role: "TOP", age: 29, nationality: "France", laning: 81, teamfight: 82, macro: 84, mentality: 88, championPool: 82, salary: 75000, value: 180000 },
        { name: "Canna", realName: "Kim Chang-dong", role: "JUG", age: 26, nationality: "South Korea", laning: 84, teamfight: 84, macro: 82, mentality: 81, championPool: 84, salary: 85000, value: 250000 },
        { name: "Vladi", realName: "Vladimiros Kourtidis", role: "MID", age: 21, nationality: "Greece", laning: 80, teamfight: 81, macro: 79, mentality: 78, championPool: 80, salary: 50000, value: 160000 },
        { name: "Upset", realName: "Elias Lipp", role: "BOT", age: 26, nationality: "Germany", laning: 88, teamfight: 89, macro: 84, mentality: 85, championPool: 86, salary: 110000, value: 380000 },
        { name: "Targamas", realName: "Raphaël Crabbé", role: "SUP", age: 25, nationality: "Belgium", laning: 80, teamfight: 82, macro: 84, mentality: 80, championPool: 82, salary: 70000, value: 190000 },
      ]
    },
    {
      name: "SK Gaming",
      budget: 900000,
      salaryCap: 580000,
      players: [
        { name: "Irrelevant", realName: "Joel Miro Scharoll", role: "TOP", age: 24, nationality: "Germany", laning: 85, teamfight: 85, macro: 83, mentality: 84, championPool: 83, salary: 80000, value: 300000 },
        { name: "Isma", realName: "Ismaïl Bouhem", role: "JUG", age: 23, nationality: "France", laning: 80, teamfight: 81, macro: 80, mentality: 79, championPool: 79, salary: 60000, value: 170000 },
        { name: "Nisqy", realName: "Yasin Dinçer", role: "MID", age: 27, nationality: "Belgium", laning: 83, teamfight: 86, macro: 89, mentality: 89, championPool: 87, salary: 100000, value: 360000 },
        { name: "Rahel", realName: "Cho Min-seong", role: "BOT", age: 22, nationality: "South Korea", laning: 83, teamfight: 84, macro: 80, mentality: 81, championPool: 81, salary: 70000, value: 230000 },
        { name: "Luon", realName: "Lee Hyun-yeop", role: "SUP", age: 23, nationality: "South Korea", laning: 81, teamfight: 81, macro: 81, mentality: 79, championPool: 80, salary: 60000, value: 180000 },
      ]
    },
    {
      name: "Rogue",
      budget: 800000,
      salaryCap: 550000,
      players: [
        { name: "Szygenda", realName: "Mathias Jensen", role: "TOP", age: 25, nationality: "Denmark", laning: 81, teamfight: 82, macro: 80, mentality: 80, championPool: 81, salary: 65000, value: 180000 },
        { name: "Markoon", realName: "Mark van Woensel", role: "JUG", age: 24, nationality: "Netherlands", laning: 81, teamfight: 82, macro: 82, mentality: 80, championPool: 81, salary: 70000, value: 200000 },
        { name: "Larssen", realName: "Emil Larsson", role: "MID", age: 26, nationality: "Sweden", laning: 85, teamfight: 85, macro: 86, mentality: 87, championPool: 85, salary: 90000, value: 290000 },
        { name: "Comp", realName: "Markos Stamkopoulos", role: "BOT", age: 24, nationality: "Greece", laning: 83, teamfight: 84, macro: 81, mentality: 82, championPool: 82, salary: 75000, value: 220000 },
        { name: "Zoelys", realName: "Théo Le Scornec", role: "SUP", age: 22, nationality: "France", laning: 79, teamfight: 80, macro: 79, mentality: 77, championPool: 79, salary: 50000, value: 140000 },
      ]
    }
  ],
  CBLOL: [
    {
      name: "LOUD",
      budget: 1000000,
      salaryCap: 450000,
      players: [
        { name: "Robo", realName: "Leonardo Souza", role: "TOP", age: 27, nationality: "Brazil", laning: 83, teamfight: 85, macro: 84, mentality: 89, championPool: 83, salary: 60000, value: 220000 },
        { name: "Croc", realName: "Park Jong-hoon", role: "JUG", age: 27, nationality: "South Korea", laning: 81, teamfight: 83, macro: 85, mentality: 86, championPool: 82, salary: 70000, value: 210000 },
        { name: "tinowns", realName: "Thiago Sartori", role: "MID", age: 29, nationality: "Brazil", laning: 84, teamfight: 85, macro: 87, mentality: 90, championPool: 86, salary: 80000, value: 280000 },
        { name: "Route", realName: "Moon Geom-su", role: "BOT", age: 26, nationality: "South Korea", laning: 86, teamfight: 88, macro: 82, mentality: 85, championPool: 85, salary: 90000, value: 310000 },
        { name: "Ceos", realName: "Denilson Oliveira", role: "SUP", age: 25, nationality: "Brazil", laning: 81, teamfight: 83, macro: 84, mentality: 83, championPool: 82, salary: 60000, value: 190000 },
      ]
    },
    {
      name: "paiN Gaming",
      budget: 1100000,
      salaryCap: 480000,
      players: [
        { name: "Wizer", realName: "Choi Ui-seok", role: "TOP", age: 26, nationality: "South Korea", laning: 84, teamfight: 84, macro: 82, mentality: 82, championPool: 83, salary: 75000, value: 230000 },
        { name: "Cariok", realName: "Marcos Oliveira", role: "JUG", age: 25, nationality: "Brazil", laning: 80, teamfight: 82, macro: 83, mentality: 81, championPool: 81, salary: 60000, value: 180000 },
        { name: "dyNquedo", realName: "Matheus Rossini", role: "MID", age: 28, nationality: "Brazil", laning: 81, teamfight: 83, macro: 84, mentality: 85, championPool: 83, salary: 70000, value: 210000 },
        { name: "TitaN", realName: "Alexandre Lima", role: "BOT", age: 25, nationality: "Brazil", laning: 85, teamfight: 86, macro: 82, mentality: 88, championPool: 84, salary: 85000, value: 290000 },
        { name: "Kuri", realName: "Choi Won-yeong", role: "SUP", age: 25, nationality: "South Korea", laning: 80, teamfight: 82, macro: 82, mentality: 80, championPool: 81, salary: 65000, value: 180000 },
      ]
    },
    {
      name: "RED Canids",
      budget: 900000,
      salaryCap: 420000,
      players: [
        { name: "fNb", realName: "Francisco Natanael", role: "TOP", age: 25, nationality: "Brazil", laning: 82, teamfight: 82, macro: 81, mentality: 82, championPool: 82, salary: 55000, value: 180000 },
        { name: "Aegis", realName: "Gabriel Lemos", role: "JUG", age: 24, nationality: "Brazil", laning: 80, teamfight: 81, macro: 81, mentality: 80, championPool: 80, salary: 55000, value: 160000 },
        { name: "Grevthar", realName: "Daniel Xavier", role: "MID", age: 26, nationality: "Brazil", laning: 79, teamfight: 82, macro: 81, mentality: 84, championPool: 81, salary: 60000, value: 170000 },
        { name: "Brance", realName: "Diego Amaral", role: "BOT", age: 22, nationality: "Brazil", laning: 83, teamfight: 84, macro: 80, mentality: 82, championPool: 82, salary: 65000, value: 220000 },
        { name: "Jojo", realName: "Gabriel Dzelme", role: "SUP", age: 26, nationality: "Brazil", laning: 80, teamfight: 81, macro: 82, mentality: 80, championPool: 80, salary: 50000, value: 150000 },
      ]
    },
    {
      name: "KaBuM! Esports",
      budget: 850000,
      salaryCap: 400000,
      players: [
        { name: "Lonely", realName: "Han Gyu-joon", role: "TOP", age: 25, nationality: "South Korea", laning: 82, teamfight: 81, macro: 80, mentality: 79, championPool: 81, salary: 65000, value: 170000 },
        { name: "Malrang", realName: "Kim Geun-seong", role: "JUG", age: 26, nationality: "South Korea", laning: 80, teamfight: 83, macro: 86, mentality: 85, championPool: 83, salary: 80000, value: 240000 },
        { name: "Hauz", realName: "Bruno Ferreira", role: "MID", age: 24, nationality: "Brazil", laning: 80, teamfight: 81, macro: 80, mentality: 79, championPool: 80, salary: 55000, value: 150000 },
        { name: "Netuno", realName: "Lucas Flores", role: "BOT", age: 23, nationality: "Brazil", laning: 82, teamfight: 83, macro: 79, mentality: 80, championPool: 81, salary: 60000, value: 190000 },
        { name: "RedBert", realName: "Ygor Flores", role: "SUP", age: 27, nationality: "Brazil", laning: 79, teamfight: 81, macro: 82, mentality: 82, championPool: 80, salary: 55000, value: 150000 },
      ]
    },
    {
      name: "FURIA Esports",
      budget: 800000,
      salaryCap: 380000,
      players: [
        { name: "Zantins", realName: "Thiago Zantins", role: "TOP", age: 28, nationality: "Brazil", laning: 78, teamfight: 80, macro: 81, mentality: 82, championPool: 79, salary: 50000, value: 130000 },
        { name: "Shini", realName: "Diogo Rogê", role: "JUG", age: 29, nationality: "Brazil", laning: 78, teamfight: 81, macro: 83, mentality: 84, championPool: 80, salary: 55000, value: 140000 },
        { name: "Envy", realName: "Marcos Farias", role: "MID", age: 26, nationality: "Brazil", laning: 80, teamfight: 81, macro: 82, mentality: 81, championPool: 82, salary: 60000, value: 170000 },
        { name: "Anya", realName: "Ana Julia", role: "BOT", age: 21, nationality: "Brazil", laning: 79, teamfight: 80, macro: 78, mentality: 77, championPool: 79, salary: 45000, value: 120000 },
        { name: "yampi", realName: "Yan Petry", role: "SUP", age: 25, nationality: "Brazil", laning: 79, teamfight: 80, macro: 80, mentality: 79, championPool: 79, salary: 48000, value: 130000 },
      ]
    },
    {
      name: "Fluxo",
      budget: 750000,
      salaryCap: 360000,
      players: [
        { name: "Kiari", realName: "Thiago Ruiz", role: "TOP", age: 23, nationality: "Brazil", laning: 79, teamfight: 79, macro: 78, mentality: 77, championPool: 79, salary: 45000, value: 120000 },
        { name: "St1ng", realName: "Luis Silveira", role: "JUG", age: 22, nationality: "Brazil", laning: 79, teamfight: 79, macro: 79, mentality: 76, championPool: 78, salary: 40000, value: 110000 },
        { name: "FuNu", realName: "Gabriel Ferreira", role: "MID", age: 22, nationality: "Brazil", laning: 78, teamfight: 80, macro: 78, mentality: 77, championPool: 79, salary: 45000, value: 120000 },
        { name: "Kojich", realName: "Lucas Kojich", role: "BOT", age: 23, nationality: "Brazil", laning: 80, teamfight: 80, macro: 78, mentality: 78, championPool: 79, salary: 45000, value: 130000 },
        { name: "Scylla", realName: "Victor Hugo", role: "SUP", age: 22, nationality: "Brazil", laning: 78, teamfight: 79, macro: 78, mentality: 76, championPool: 78, salary: 40000, value: 100000 },
      ]
    },
    {
      name: "Vivo Keyd Stars",
      budget: 800000,
      salaryCap: 390000,
      players: [
        { name: "Guigo", realName: "Guilherme Ruiz", role: "TOP", age: 24, nationality: "Brazil", laning: 81, teamfight: 81, macro: 80, mentality: 80, championPool: 80, salary: 50000, value: 160000 },
        { name: "Disamis", realName: "Pedro Cabral", role: "JUG", age: 22, nationality: "Brazil", laning: 80, teamfight: 81, macro: 81, mentality: 79, championPool: 80, salary: 50000, value: 150000 },
        { name: "toucouille", realName: "Loïc Dubois", role: "MID", age: 25, nationality: "France", laning: 83, teamfight: 84, macro: 83, mentality: 84, championPool: 83, salary: 75000, value: 220000 },
        { name: "Smiley", realName: "Ludvig Granquist", role: "BOT", age: 26, nationality: "Sweden", laning: 82, teamfight: 83, macro: 80, mentality: 81, championPool: 82, salary: 70000, value: 200000 },
        { name: "ProDelta", realName: "Fabio Marques", role: "SUP", age: 23, nationality: "Brazil", laning: 80, teamfight: 80, macro: 80, mentality: 79, championPool: 79, salary: 50000, value: 140000 },
      ]
    },
    {
      name: "INTZ",
      budget: 700000,
      salaryCap: 340000,
      players: [
        { name: "Tay", realName: "Rodrigo Panisa", role: "TOP", age: 28, nationality: "Brazil", laning: 79, teamfight: 80, macro: 80, mentality: 82, championPool: 80, salary: 50000, value: 130000 },
        { name: "Yampi", realName: "Yan Petry", role: "JUG", age: 25, nationality: "Brazil", laning: 79, teamfight: 80, macro: 80, mentality: 78, championPool: 79, salary: 45000, value: 130000 },
        { name: "A21", realName: "Arthur Santos", role: "MID", age: 21, nationality: "Brazil", laning: 77, teamfight: 78, macro: 78, mentality: 76, championPool: 78, salary: 35000, value: 95000 },
        { name: "NinjaKiwi", realName: "Lucas Ribeiro", role: "BOT", age: 23, nationality: "Brazil", laning: 79, teamfight: 80, macro: 78, mentality: 77, championPool: 79, salary: 45000, value: 120000 },
        { name: "Nia", realName: "Gabriel Nia", role: "SUP", age: 22, nationality: "Brazil", laning: 77, teamfight: 78, macro: 78, mentality: 76, championPool: 78, salary: 35000, value: 90000 },
      ]
    }
  ]
};

const FREE_AGENTS = [
  { name: "TheShy", realName: "Kang Seung-lok", role: "TOP", age: 26, nationality: "South Korea", laning: 91, teamfight: 93, macro: 84, mentality: 85, championPool: 89, salary: 180000, value: 500000 },
  { name: "SofM", realName: "Lê Quang Duy", role: "JUG", age: 28, nationality: "Vietnam", laning: 84, teamfight: 86, macro: 94, mentality: 93, championPool: 90, salary: 120000, value: 420000 },
  { name: "Doinb", realName: "Kim Tae-sang", role: "MID", age: 29, nationality: "South Korea", laning: 83, teamfight: 89, macro: 96, mentality: 95, championPool: 91, salary: 150000, value: 450000 },
  { name: "Slayder", realName: "Nguyễn Linh Vương", role: "BOT", age: 25, nationality: "Vietnam", laning: 83, teamfight: 84, macro: 79, mentality: 80, championPool: 82, salary: 55000, value: 160000 },
  { name: "Zhuo", realName: "Wang Dongxu", role: "SUP", age: 25, nationality: "China", laning: 80, teamfight: 81, macro: 81, mentality: 79, championPool: 80, salary: 65000, value: 170000 },
  { name: "Canna", realName: "Kim Chang-dong", role: "TOP", age: 26, nationality: "South Korea", laning: 83, teamfight: 83, macro: 81, mentality: 80, championPool: 83, salary: 80000, value: 240000 },
  { name: "Tarzan", realName: "Lee Seung-yong", role: "JUG", age: 26, nationality: "South Korea", laning: 85, teamfight: 87, macro: 92, mentality: 88, championPool: 87, salary: 130000, value: 480000 },
  { name: "Burdol", realName: "Noh Tae-yoon", role: "TOP", age: 22, nationality: "South Korea", laning: 80, teamfight: 81, macro: 79, mentality: 78, championPool: 80, salary: 50000, value: 140000 },
  { name: "Ghost", realName: "Jang Yong-jun", role: "BOT", age: 27, nationality: "South Korea", laning: 81, teamfight: 85, macro: 88, mentality: 90, championPool: 84, salary: 85000, value: 230000 },
  { name: "Baolan", realName: "Wang Liuyi", role: "SUP", age: 26, nationality: "China", laning: 80, teamfight: 84, macro: 86, mentality: 85, championPool: 82, salary: 75000, value: 200000 }
];

// Sinh lịch thi đấu vòng tròn 1 lượt cho 8 đội (7 vòng đấu)
// Thống kê vòng đấu theo thuật toán Berger (Round Robin)
function generateRoundRobinSchedule(teamIds: string[]): { round: number; homeTeamId: string; awayTeamId: string }[] {
  const n = teamIds.length;
  const schedule: { round: number; homeTeamId: string; awayTeamId: string }[] = [];
  const list = [...teamIds];

  for (let round = 1; round < n; round++) {
    for (let i = 0; i < n / 2; i++) {
      const homeTeamId = list[i];
      const awayTeamId = list[n - 1 - i];
      schedule.push({ round, homeTeamId, awayTeamId });
    }
    // Rotate list except first element
    const last = list.pop()!;
    list.splice(1, 0, last);
  }
  return schedule;
}

async function main() {
  console.log("Xóa dữ liệu cũ...");
  await prisma.mail.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.gameState.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Tạo tài khoản admin mặc định...");
  const adminPasswordHash = hashPassword("assmin");
  await prisma.user.create({
    data: {
      username: "admin",
      displayName: "Administrator",
      password: adminPasswordHash,
      role: "ADMIN"
    }
  });

  console.log("Tạo các đội và tuyển thủ...");
  const createdTeams: Record<string, any[]> = {};
  
  for (const [region, teams] of Object.entries(TEAM_TEMPLATES)) {
    createdTeams[region] = [];
    for (const teamData of teams) {
      const team = await prisma.team.create({
        data: {
          name: teamData.name,
          region: region,
          budget: teamData.budget,
          salaryCap: teamData.salaryCap,
          players: {
            create: teamData.players.map(p => ({
              name: p.name,
              realName: p.realName,
              role: p.role,
              age: p.age,
              nationality: p.nationality,
              laning: p.laning,
              teamfight: p.teamfight,
              macro: p.macro,
              mentality: p.mentality,
              championPool: p.championPool,
              salary: p.salary,
              value: p.value
            }))
          }
        }
      });
      createdTeams[region].push(team);
    }
  }

  console.log("Tạo tuyển thủ tự do...");
  for (const fa of FREE_AGENTS) {
    await prisma.player.create({
      data: {
        name: fa.name,
        realName: fa.realName,
        role: fa.role,
        age: fa.age,
        nationality: fa.nationality,
        laning: fa.laning,
        teamfight: fa.teamfight,
        macro: fa.macro,
        mentality: fa.mentality,
        championPool: fa.championPool,
        salary: fa.salary,
        value: fa.value
      }
    });
  }

  console.log("Tạo lịch thi đấu giải khu vực (7 vòng đấu)...");
  // Các ngày thi đấu là các ngày Thứ Bảy hàng tuần:
  // Vòng 1: 2026-01-10
  // Vòng 2: 2026-01-17
  // Vòng 3: 2026-01-24
  // Vòng 4: 2026-01-31
  // Vòng 5: 2026-02-07
  // Vòng 6: 2026-02-14
  // Vòng 7: 2026-02-21
  const roundDates = [
    "2026-01-10",
    "2026-01-17",
    "2026-01-24",
    "2026-01-31",
    "2026-02-07",
    "2026-02-14",
    "2026-02-21"
  ];

  for (const [region, teams] of Object.entries(createdTeams)) {
    const teamIds = teams.map(t => t.id);
    const BergerSchedule = generateRoundRobinSchedule(teamIds);

    for (const matchInfo of BergerSchedule) {
      const date = roundDates[matchInfo.round - 1];
      const homeTeamId = matchInfo.homeTeamId;
      const awayTeamId = matchInfo.awayTeamId;

      await prisma.match.create({
        data: {
          tournament: "REGIONAL",
          homeTeamId,
          awayTeamId,
          date,
          played: false
        }
      });
    }
  }

  console.log("Khởi tạo trạng thái game...");
  await prisma.gameState.create({
    data: {
      id: 1,
      currentDate: "2026-01-05", // Thứ Hai đầu mùa giải
      userTeamId: null, // Chưa chọn đội
      seasonState: "REGIONAL_SEASON",
      week: 1,
      dayOfSeason: 1
    }
  });

  console.log("Tạo email chào mừng...");
  await prisma.mail.create({
    data: {
      title: "Chào mừng bạn đến với LoL Legend '26 (LL26)!",
      content: `Kính gửi Tân Huấn Luyện Viên,

Chào mừng bạn đã gia nhập hàng ngũ những nhà quản lý chiến thuật hàng đầu thế giới trong phiên bản LoL Legend '26 (LL26).

Nhiệm vụ của bạn là lựa chọn 1 trong 5 đội tuyển đại diện cho 5 khu vực hàng đầu (LCK, LCP, LPL, LEC, CBLOL). Sau đó, bạn sẽ phải dẫn dắt đội tuyển của mình thi đấu tại giải quốc nội và nỗ lực giành vé tham dự các giải đấu quốc tế danh giá trong năm:
1. First Stand (Giải đấu khởi động đầu năm)
2. Mid-Season Invitational (MSI - Nơi hội tụ các nhà vô địch)
3. Esports World Cup (EWC - Cúp thế giới mùa hè kịch tính)
4. League of Legends World Championship (Chung Kết Thế Giới - Đỉnh cao danh vọng)

Hãy chuẩn bị chiến thuật thật tốt, quản lý ngân sách thông minh và đưa ra các lượt Cấm/Chọn (Draft) xuất sắc trong từng trận đấu để đưa đội tuyển của bạn lên ngôi vô địch!

Chúc bạn thành công!
Ban Quản Trị LL26`,
      date: "2026-01-05",
      sender: "Ban Quản Trị LL26",
      category: "GENERAL",
      read: false
    }
  });

  console.log("Đã seed dữ liệu thành công!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
