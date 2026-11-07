// Yutuqlar va nishonlar. Holat S.stats ichida saqlanadi (CloudStorage), server shart emas.
// ctx: { stats, me (server profili yoki null), refs (taklif qilinganlar soni) }

const aiWins = (st) => [0, 1, 2, 3].reduce((s, l) => s + ((st['l' + l] && st['l' + l].w) || 0), 0);
const pz = (st) => st.puzzle || {};
const days = (st) => st.days || {};

export const ACHIEVEMENTS = [
  { id: 'first_win', icon: 'trophy', title: 'Birinchi gʻalaba', desc: 'Kompyuterni birinchi marta yuting', test: (c) => aiWins(c.stats) >= 1 },
  { id: 'beat_l1', icon: 'chip', title: 'Oʻrta darajani yengdi', desc: '«Oʻrta» darajadagi kompyuterni yuting', test: (c) => [1, 2, 3].some((l) => (c.stats['l' + l] || {}).w > 0) },
  { id: 'beat_l2', icon: 'chip', title: 'Kuchli raqib', desc: '«Kuchli» darajadagi kompyuterni yuting', test: (c) => [2, 3].some((l) => (c.stats['l' + l] || {}).w > 0) },
  { id: 'beat_l3', icon: 'chip', title: 'Usta ustidan gʻalaba', desc: '«Usta» darajadagi kompyuterni yuting', test: (c) => (c.stats.l3 || {}).w > 0 },
  { id: 'wins_10', icon: 'trophy', title: '10 gʻalaba', desc: 'Kompyuterga qarshi jami 10 marta yuting', test: (c) => aiWins(c.stats) >= 10 },
  { id: 'fast_mate', icon: 'bolt', title: 'Tezkor mat', desc: '20 yurishgacha mat qilib yuting', test: (c) => (c.stats.fastest || 99) <= 20 },
  { id: 'online_win', icon: 'globe', title: 'Onlayn gʻalaba', desc: 'Tirik raqibni onlayn yuting', test: (c) => !!c.me && c.me.wins >= 1 },
  { id: 'rating_1300', icon: 'chart', title: 'Reyting 1300', desc: 'Onlayn reytingni 1300 ga yetkazing', test: (c) => !!c.me && c.me.rating >= 1300 },
  { id: 'puzzle_1', icon: 'hint', title: 'Birinchi masala', desc: 'Bitta masalani yeching', test: (c) => (pz(c.stats).solved || []).length >= 1 },
  { id: 'puzzle_10', icon: 'hint', title: 'Masala ustasi', desc: '10 ta masalani yeching', test: (c) => (pz(c.stats).solved || []).length >= 10 },
  { id: 'puzzle_streak_7', icon: 'bolt', title: 'Masala seriyasi', desc: 'Kunlik masalani 7 kun ketma-ket yeching', test: (c) => (pz(c.stats).best || 0) >= 7 },
  { id: 'days_3', icon: 'check', title: '3 kun ketma-ket', desc: '3 kun ketma-ket oʻynang', test: (c) => (days(c.stats).best || 0) >= 3 },
  { id: 'days_10', icon: 'check', title: '10 kun ketma-ket', desc: '10 kun ketma-ket oʻynang', test: (c) => (days(c.stats).best || 0) >= 10 },
  { id: 'days_30', icon: 'trophy', title: 'Bir oy shaxmat', desc: '30 kun ketma-ket oʻynang', test: (c) => (days(c.stats).best || 0) >= 30 },
  { id: 'lessons_all', icon: 'check', title: 'Bitiruvchi', desc: 'Barcha darslarni tugating', test: (c) => Object.keys(c.stats.lessons || {}).length >= (c.lessons || 99) },
  { id: 'friend_1', icon: 'pair', title: 'Birinchi doʻst', desc: 'Doʻstingizni taklif qiling', test: (c) => (c.refs || 0) >= 1 },
  { id: 'friend_5', icon: 'pair', title: 'Doʻstlar davrasi', desc: '5 ta doʻstni taklif qiling', test: (c) => (c.refs || 0) >= 5 },
];

/** Yangi ochilgan yutuqlarni qaytaradi va stats.ach ga yozadi. */
export function checkAchievements(ctx) {
  const got = ctx.stats.ach || (ctx.stats.ach = {});
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (got[a.id]) continue;
    let ok = false;
    try { ok = a.test(ctx); } catch (e) { ok = false; }
    if (ok) { got[a.id] = Date.now(); fresh.push(a); }
  }
  return fresh;
}

// ───── kunlar (Toshkent vaqti, UTC+5) ─────
export function dayNumber(ms = Date.now()) {
  return Math.floor((ms + 5 * 3600000) / 86400000);
}

/** Oʻynalgan kunni belgilaydi: ketma-ket kunlar seriyasi. */
export function markPlayedDay(stats) {
  const d = days(stats), today = dayNumber();
  if (d.last === today) return;
  d.streak = d.last === today - 1 ? (d.streak || 0) + 1 : 1;
  d.best = Math.max(d.best || 0, d.streak);
  d.last = today;
  stats.days = d;
}
