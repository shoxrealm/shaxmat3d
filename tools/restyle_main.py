# main.js dagi emoji va eski UI satrlarini yangi dizaynga moslab almashtiradi (bir martalik skript).
import sys
from pathlib import Path

p = Path(sys.argv[1])
s = p.read_text(encoding='utf-8')
R = [
    ("import { play, setSound } from './sound.js';", "import { play, setSound } from './sound.js';\nimport { icon, medallion } from './icons.js';"),
    # HUD nomlar
    ("    if (S.mode === 'ai') return c === S.player ? `🙂 ${TG.userName()}` : `🤖 Kompyuter · ${LEVELS[S.level].name}`;",
     "    if (S.mode === 'ai') return c === S.player ? escapeHtml(TG.userName()) : `Kompyuter <span class=\"rt\">${LEVELS[S.level].name}</span>`;"),
    ("      return `${p.online === false ? '⚪️' : '🟢'} ${p.name} · ${p.rating}`;",
     "      return `${escapeHtml(p.name)}<span class=\"rt\">${p.rating}</span>${p.online === false ? '<span class=\"off\">tarmoqda emas</span>' : ''}`;"),
    ("    return c === 'w' ? '⚪ Oq' : '⚫ Qora';", "    return c === 'w' ? 'Oq' : 'Qora';"),
    ("    bar.querySelector('.pname').textContent = name(c);", "    bar.querySelector('.pname').innerHTML = name(c);"),
    ("    bar.querySelector('.ava').textContent = S.mode === 'ai' && c !== S.player ? '🤖' : c === 'w' ? '♔' : '♚';",
     "    bar.querySelector('.ava').className = 'ava ' + c + (S.mode === 'ai' && c !== S.player ? ' ai' : '');"),
    ("  $('#tUndo i').textContent = on ? '😀' : '↶'; $('#tUndo span').textContent = on ? 'Emoji' : 'Orqaga';",
     "  $('#tUndo i').innerHTML = icon(on ? 'smile' : 'undo'); $('#tUndo span').textContent = on ? 'Emoji' : 'Orqaga';"),
    ("  $('#tHint i').textContent = on ? '🤝' : '💡'; $('#tHint span').textContent = on ? 'Durang' : 'Maslahat';",
     "  $('#tHint i').innerHTML = icon(on ? 'half' : 'hint'); $('#tHint span').textContent = on ? 'Durang' : 'Maslahat';"),
    ("  $('#tResign i').textContent = S.mode === 'friend' ? '🤝' : '🏳️';", "  $('#tResign i').innerHTML = icon(S.mode === 'friend' ? 'half' : 'flag');"),
    ("flashStatus('Shoh! ⚠️');", "flashStatus('Shoh!');"),
    ("flashStatus('Mat! ♚', 1400);", "flashStatus('Mat', 1400);"),
    # Natija (lokal)
    ("  if (S.mode === 'friend' && winner) { big = '🏆'; title = (winner === 'w' ? 'Oq' : 'Qora') + ' gʻalaba qozondi!'; }\n  else if (outcome === 'win') { big = '🎉'; title = 'Gʻalaba!'; }\n  else if (outcome === 'loss') { big = '😔'; title = 'Magʻlubiyat'; }\n  else { big = '🤝'; title = 'Durang'; }",
     "  big = winner === 'w' ? '1–0' : winner === 'b' ? '0–1' : '½–½';\n  if (S.mode === 'friend' && winner) title = (winner === 'w' ? 'Oq' : 'Qora') + ' yutdi';\n  else if (outcome === 'win') title = 'Gʻalaba';\n  else if (outcome === 'loss') title = 'Magʻlubiyat';\n  else title = 'Durang';"),
    ('<div class="result"><div class="big">${big}</div><h2>${title}</h2><p>${REASON[reason] || \'\'} · ${moves} yurish</p>',
     '<div class="result ${outcome}">${medallion(big)}<h2>${title}</h2><p>${REASON[reason] || \'\'}, ${moves} yurish</p>'),
    ('<button class="btn primary" id="rAgain">🔄 Yana oʻynash</button>', '<button class="btn primary" id="rAgain">Yana oʻynash</button>'),
    ('<button class="btn" id="rShare">📤 Doʻstlarga ulashish</button>', '<button class="btn" id="rShare">${icon(\'send\', 20)}Doʻstlarga yuborish</button>'),
    ("toast('💡 Oʻylayapman…', 1200);", "toast('Eng yaxshi yurish izlanmoqda…', 1200);"),
    ("<h2>Taslim boʻlasizmi? 🏳️</h2>", "<h2>Taslim boʻlasizmi?</h2>"),
    ("<h2>Durang taklifi 🤝</h2>", "<h2>Durangga kelishasizmi?</h2>"),
    ("openModal(`<h2>🧠 PRO</h2>", "openModal(`<h2>PRO</h2>"),
    ("PRO olish · ${ITEMS.find((i) => i.id === 'pro').price} ⭐", "PRO olish, ${ITEMS.find((i) => i.id === 'pro').price} ⭐"),
    ('<button class="btn" id="upShop">🎨 Doʻkonni ochish</button>', '<button class="btn" id="upShop">Doʻkonni ochish</button>'),
    # Onlayn
    ("const TCS = [['60+0', '⚡ 1 daq'], ['180+0', '🔥 3 daq'], ['180+2', '3 + 2'], ['300+0', '⏱ 5 daq'], ['600+0', '🕰 10 daq']];",
     "const TCS = [['60+0', '1 daqiqa'], ['180+0', '3 daqiqa'], ['180+2', '3 + 2 soniya'], ['300+0', '5 daqiqa'], ['600+0', '10 daqiqa']];"),
    ("openModal(`<h2>🌐 Onlayn</h2>${me ? `<p class=\"muted\" style=\"text-align:center\">Reytingingiz: <b>${me.rating}</b> · ${me.games} oʻyin</p>` : ''}",
     "openModal(`<h2>Onlayn oʻyin</h2>${me ? `<p class=\"muted center\">Reytingingiz ${me.rating}, oʻynalgan ${me.games}</p>` : ''}"),
    ('<p class="muted">⚡ Tasodifiy raqib (reytingli)</p>', '<p class="muted">Tasodifiy raqib bilan, reytingga taʼsir qiladi</p>'),
    ('<p class="muted">🔗 Doʻstni havola orqali chaqirish</p>', '<p class="muted">Doʻstni havola bilan chaqirish</p>'),
    ("['0+0', '♾ Vaqtsiz']", "['0+0', 'Vaqtsiz']"),
    ('<button class="btn primary" id="btnInvite">🔗 Taklif havolasini yaratish</button>', '<button class="btn primary" id="btnInvite">${icon(\'link\', 20)}Havola yaratish</button>'),
    ('<button class="btn" id="btnTop">🏆 Reyting jadvali</button>', '<button class="btn" id="btnTop">${icon(\'trophy\', 20)}Reyting jadvali</button>'),
    ('<div class="result"><div class="big searching">🔎</div><h2>Raqib qidirilmoqda…</h2>', '<div class="result searching">${medallion(\'♞\')}<h2>Raqib izlanmoqda</h2>'),
    ("toast('📡 Qayta ulanmoqda…', 1500);", "toast('Aloqa uzildi, qayta ulanmoqda…', 1500);"),
    ("<h2>🤝 Durang taklifi</h2>", "<h2>Raqib durang taklif qildi</h2>"),
    ('<p class="muted" style="text-align:center">Raqibingiz durang taklif qilyapti.</p>', '<p class="muted center">Qabul qilsangiz, oʻyin durang bilan tugaydi.</p>'),
    ("toast('🔄 Raqib revansh taklif qilyapti!', 3000); const b = $('#oRematch'); if (b) b.textContent = '🔄 Revanshni qabul qilish';",
     "toast('Raqib revansh soʻrayapti', 3000); const b = $('#oRematch'); if (b) b.textContent = 'Revanshni qabul qilish';"),
    ("flashStatus('Yangi oʻyin! ♟', 1200);", "flashStatus('Yangi oʻyin', 1200);"),
    ("toast('👀 Siz tomoshabinsiz', 2500);", "toast('Siz bu oʻyinni tomosha qilyapsiz', 2500);"),
    ('<div class="result"><div class="big searching">⏳</div><h2>Doʻstingiz kutilmoqda…</h2>', '<div class="result searching">${medallion(\'♞\')}<h2>Doʻstingiz kutilmoqda</h2>'),
    ('<button class="btn primary" id="wShare">📤 Telegramda yuborish</button>', '<button class="btn primary" id="wShare">${icon(\'send\', 20)}Telegramda yuborish</button>'),
    ('<button class="btn" id="wCopy">🔗 Havolani nusxalash</button>', '<button class="btn" id="wCopy">${icon(\'link\', 20)}Havolani nusxalash</button>'),
    ("toast('✅ Havola nusxalandi');", "toast('Havola nusxalandi');"),
    ("encodeURIComponent('♟ Keling, Shaxmat 3D da bellashamiz!')", "encodeURIComponent('Keling, Shaxmat 3D da bir partiya oʻynaymiz')"),
    ("  const big = m.reason === 'aborted' ? '🚫' : outcome === 'win' ? '🎉' : outcome === 'loss' ? '😔' : outcome === 'draw' ? '🤝' : '🏁';",
     "  const big = m.reason === 'aborted' ? '—' : m.result === '1-0' ? '1–0' : m.result === '0-1' ? '0–1' : '½–½';"),
    ('openModal(`<div class="result"><div class="big">${big}</div><h2>${title}</h2><p>${OREASON[m.reason] || \'\'}</p>',
     'openModal(`<div class="result ${outcome}">${medallion(big)}<h2>${title}</h2><p>${OREASON[m.reason] || \'\'}</p>'),
    ('<button class="btn primary" id="oRematch">🔄 Revansh</button>', '<button class="btn primary" id="oRematch">Revansh</button>'),
    ('<button class="btn" id="oNew">🌐 Yangi raqib</button>', '<button class="btn" id="oNew">${icon(\'globe\', 20)}Yangi raqib</button>'),
    ("toast('🤝 Durang taklifi yuborildi');", "toast('Durang taklifi yuborildi');"),
    ("openModal('<h2>🏆 Reyting</h2><p class=\"muted\" style=\"text-align:center\">Yuklanmoqda…</p>');", "openModal('<h2>Reyting</h2><p class=\"muted center\">Yuklanmoqda…</p>');"),
    ("    const medals = ['🥇', '🥈', '🥉'];", "    const medals = [];"),
    ("openModal(`<h2>🏆 Reyting</h2><table", "openModal(`<h2>Reyting</h2><table"),
    ('<button class="btn primary" id="tPlay">⚡ Reytingli oʻyin</button>', '<button class="btn primary" id="tPlay">Reytingli oʻyin boshlash</button>'),
    # Daraja chiplari va statistika
    ("    b.innerHTML = `${l.emoji} ${l.name}<small>${s ? `${s.w} gʻalaba · ${s.l} magʻlubiyat` : 'yangi'}</small>`;",
     "    b.classList.add('stack');\n    b.innerHTML = `${l.name}<small>${s ? `${s.w} gʻalaba, ${s.l} magʻlubiyat` : 'hali oʻynalmagan'}</small>`;"),
    ("    ${LEVELS.map((l) => row(`${l.emoji} ${l.name}`, S.stats['l' + l.id])).join('')}", "    ${LEVELS.map((l) => row(l.name, S.stats['l' + l.id])).join('')}"),
    ("openModal(`<h2>📊 Statistika</h2>", "openModal(`<h2>Natijalar</h2>"),
    ("row('👥 Doʻst bilan',", "row('Bir telefonda',"),
    # Doʻkon
    ("      ${have ? '' : '<span class=\"lock\">🔒</span>'}<div class=\"em\">${it.emoji}</div><div class=\"nm\">${it.name}</div>",
     "      ${have ? '' : `<span class=\"lock\">${icon('lock', 16)}</span>`}${swatch(it)}<div class=\"nm\">${it.name}</div>"),
    ("      <div class=\"pr\">${have ? (sel ? '✅ Tanlangan' : 'Sizda bor') : it.price + ' ⭐'}</div>",
     "      <div class=\"pr\">${have ? (sel ? 'Tanlangan' : 'Sizda bor') : it.price + ' ⭐'}</div>"),
    ("`<button data-prev=\"${it.id}\">👁 Koʻrish</button>`", "`<button data-prev=\"${it.id}\">Koʻrish</button>`"),
    ("openModal(`<h2>🎨 Doʻkon</h2>", "openModal(`<h2>Doʻkon</h2>"),
    ("toast('👁 ' + it.name + ' — oldindan koʻrish');", "toast(it.name + ' doskada koʻrsatildi');"),
    ("toast('👁 ' + it.name + ' — urishda koʻrinadi');", "toast(it.name + ': dona olinganda koʻrinadi');"),
    ("toast('🎉 Rahmat! ' + it.name + ' ochildi');", "toast(it.name + ' ochildi. Rahmat!');"),
    # Sozlamalar
    ("openModal(`<h2>⚙️ Sozlamalar</h2>", "openModal(`<h2>Sozlamalar</h2>"),
    ("${sw('sound', '🔊 Ovoz')}${sw('haptics', '📳 Tebranish')}${sw('dots', '🎯 Mumkin yurishlarni koʻrsatish')}",
     "${sw('sound', 'Ovoz')}${sw('haptics', 'Tebranish')}${sw('dots', 'Mumkin yurishlarni koʻrsatish')}"),
    ("${sw('view2D', '🗺 2D koʻrinish (tepadan)')}${sw('autoRotate', '🔄 Doʻst bilan: doskani aylantirish')}${sw('coords', '🔤 Koordinatalar')}",
     "${sw('view2D', 'Doskaga tepadan qarash')}${sw('autoRotate', 'Bir telefonda: doskani navbatga qarab burish')}${sw('coords', 'Koordinatalar')}"),
    ("<div class=\"set\"><span>🎮 Grafika</span>", "<div class=\"set\"><span>Grafika sifati</span>"),
    # Menyu
    ("openModal(`<h2>Menyu</h2><button class=\"btn\" id=\"mNew\">🔄 Yangi oʻyin</button><button class=\"btn\" id=\"mShop\">🎨 Doʻkon</button>",
     "openModal(`<h2>Menyu</h2><button class=\"btn\" id=\"mNew\">Yangi oʻyin</button><button class=\"btn\" id=\"mShop\">${icon('bag', 20)}Doʻkon</button>"),
    ("<button class=\"btn\" id=\"mSet\">⚙️ Sozlamalar</button><button class=\"btn\" id=\"mHome\">🏠 Bosh menyu</button>",
     "<button class=\"btn\" id=\"mSet\">${icon('gear', 20)}Sozlamalar</button><button class=\"btn\" id=\"mHome\">Bosh menyu</button>"),
]
missing = []
for a, b in R:
    if a not in s:
        missing.append(a[:90])
        continue
    s = s.replace(a, b)
p.write_text(s, encoding='utf-8')
print('replaced', len(R) - len(missing), 'of', len(R))
for m in missing:
    print('MISSING:', m)
