export interface Champion {
  id: string;
  name: string;
  role: "TOP" | "JUG" | "MID" | "BOT" | "SUP";
  type: "Tank" | "Fighter" | "Assassin" | "Mage" | "Marksman" | "Enchanter";
  metaPower: number; // 1-10 (Sức mạnh trong meta)
  counters: string[]; // Danh sách các champion bị tướng này khắc chế
}

export const CHAMPIONS: Champion[] = [
  // TOP LANE
  { id: "aatrox", name: "Aatrox", role: "TOP", type: "Fighter", metaPower: 8, counters: ["ornn", "ksante"] },
  { id: "ornn", name: "Ornn", role: "TOP", type: "Tank", metaPower: 7, counters: ["jax", "fiora"] },
  { id: "ksante", name: "K'Sante", role: "TOP", type: "Tank", metaPower: 9, counters: ["renekton", "jayce"] },
  { id: "renekton", name: "Renekton", role: "TOP", type: "Fighter", metaPower: 8, counters: ["aatrox", "jax"] },
  { id: "jax", name: "Jax", role: "TOP", type: "Fighter", metaPower: 7, counters: ["ksante", "fiora"] },
  { id: "fiora", name: "Fiora", role: "TOP", type: "Fighter", metaPower: 8, counters: ["ornn", "ksante"] },
  { id: "jayce", name: "Jayce", role: "TOP", type: "Fighter", metaPower: 6, counters: ["aatrox", "renekton"] },

  // JUNGLE
  { id: "leesin", name: "Lee Sin", role: "JUG", type: "Fighter", metaPower: 7, counters: ["viego", "graves"] },
  { id: "viego", name: "Viego", role: "JUG", type: "Fighter", metaPower: 8, counters: ["maokai", "sejuani"] },
  { id: "maokai", name: "Maokai", role: "JUG", type: "Tank", metaPower: 9, counters: ["leesin", "xinzhao"] },
  { id: "sejuani", name: "Sejuani", role: "JUG", type: "Tank", metaPower: 8, counters: ["viego", "nidalee"] },
  { id: "graves", name: "Graves", role: "JUG", type: "Marksman", metaPower: 6, counters: ["maokai", "sejuani"] },
  { id: "nidalee", name: "Nidalee", role: "JUG", type: "Mage", metaPower: 7, counters: ["leesin", "maokai"] },
  { id: "xinzhao", name: "Xin Zhao", role: "JUG", type: "Fighter", metaPower: 8, counters: ["viego", "sejuani"] },

  // MID LANE
  { id: "azir", name: "Azir", role: "MID", type: "Mage", metaPower: 9, counters: ["orianna", "syndra"] },
  { id: "orianna", name: "Orianna", role: "MID", type: "Mage", metaPower: 8, counters: ["taliyah", "ahri"] },
  { id: "ahri", name: "Ahri", role: "MID", type: "Mage", metaPower: 7, counters: ["azir", "syndra"] },
  { id: "yone", name: "Yone", role: "MID", type: "Assassin", metaPower: 8, counters: ["azir", "orianna"] },
  { id: "syndra", name: "Syndra", role: "MID", type: "Mage", metaPower: 8, counters: ["yone", "sylas"] },
  { id: "taliyah", name: "Taliyah", role: "MID", type: "Mage", metaPower: 7, counters: ["yone", "ahri"] },
  { id: "sylas", name: "Sylas", role: "MID", type: "Assassin", metaPower: 8, counters: ["azir", "taliyah"] },

  // BOT LANE (ADC)
  { id: "zeri", name: "Zeri", role: "BOT", type: "Marksman", metaPower: 8, counters: ["jinx", "aphelios"] },
  { id: "jinx", name: "Jinx", role: "BOT", type: "Marksman", metaPower: 8, counters: ["aphelios", "lucian"] },
  { id: "aphelios", name: "Aphelios", role: "BOT", type: "Marksman", metaPower: 9, counters: ["kaisa", "ezreal"] },
  { id: "kaisa", name: "Kai'Sa", role: "BOT", type: "Marksman", metaPower: 8, counters: ["jinx", "lucian"] },
  { id: "lucian", name: "Lucian", role: "BOT", type: "Marksman", metaPower: 7, counters: ["zeri", "ezreal"] },
  { id: "ezreal", name: "Ezreal", role: "BOT", type: "Marksman", metaPower: 6, counters: ["kaisa", "zeri"] },
  { id: "kalista", name: "Kalista", role: "BOT", type: "Marksman", metaPower: 8, counters: ["jinx", "aphelios"] },

  // SUPPORT
  { id: "thresh", name: "Thresh", role: "SUP", type: "Tank", metaPower: 7, counters: ["lulu", "milio"] },
  { id: "nautilus", name: "Nautilus", role: "SUP", type: "Tank", metaPower: 8, counters: ["rakan", "milio"] },
  { id: "rakan", name: "Rakan", role: "SUP", type: "Tank", metaPower: 9, counters: ["thresh", "lulu"] },
  { id: "lulu", name: "Lulu", role: "SUP", type: "Enchanter", metaPower: 7, counters: ["nautilus", "leona"] },
  { id: "milio", name: "Milio", role: "SUP", type: "Enchanter", metaPower: 8, counters: ["thresh", "leona"] },
  { id: "leona", name: "Leona", role: "SUP", type: "Tank", metaPower: 8, counters: ["rakan", "lulu"] },
  { id: "senna", name: "Senna", role: "SUP", type: "Marksman", metaPower: 7, counters: ["nautilus", "thresh"] }
];
