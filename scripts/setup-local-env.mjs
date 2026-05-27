import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const localPath = join(root, ".env.local");

if (!existsSync(localPath)) {
  console.log("Crie .env.local com:");
  console.log('  npx vercel env pull .env.local --environment=production');
  console.log("Depois cole DATABASE_URL do painel Vercel/Neon (valores secretos não vêm no pull).");
  process.exit(1);
}

const lines = readFileSync(localPath, "utf8").split(/\r?\n/);
const kept = lines.filter((line) => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) return true;
  const value = m[2].trim().replace(/^"|"$/g, "");
  return value.length > 0;
});

writeFileSync(localPath, `${kept.join("\n").trimEnd()}\n`);
console.log("Removidas variáveis vazias de .env.local.");
console.log("Cole DATABASE_URL (Neon) em .env.local se ainda faltar.");
