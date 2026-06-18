// Meeus/Jones/Butcher algorithm
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function brazilianHolidaySet(years: number[]): Set<string> {
  const holidays = new Set<string>();

  for (const year of years) {
    // Feriados nacionais fixos
    const fixed: [number, number][] = [
      [1, 1],   // Confraternização Universal
      [4, 21],  // Tiradentes
      [5, 1],   // Dia do Trabalho
      [9, 7],   // Independência do Brasil
      [10, 12], // Nossa Sra. Aparecida
      [11, 2],  // Finados
      [11, 15], // Proclamação da República
      [11, 20], // Consciência Negra (Lei 14.759/2023)
      [12, 25], // Natal
    ];
    for (const [m, day] of fixed) {
      holidays.add(dateKey(new Date(year, m - 1, day)));
    }

    // Feriados móveis baseados na Páscoa
    const easter = easterDate(year);
    holidays.add(dateKey(addDays(easter, -48))); // Carnaval (segunda)
    holidays.add(dateKey(addDays(easter, -47))); // Carnaval (terça)
    holidays.add(dateKey(addDays(easter, -2)));  // Sexta-feira Santa
    holidays.add(dateKey(addDays(easter, 60)));  // Corpus Christi
  }

  return holidays;
}

export function isWorkingDay(date: Date, holidays: Set<string>): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !holidays.has(dateKey(date));
}

export function countWorkingDays(start: Date, end: Date): number {
  const years: number[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) years.push(y);
  const holidays = brazilianHolidaySet(years);

  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);

  while (cur <= endNorm) {
    if (isWorkingDay(cur, holidays)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
