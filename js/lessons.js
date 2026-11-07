// Yangi boshlovchilar uchun darslar. Har bir topshiriq: fen, goal (maqsad), sol (yurishlar ketma-ketligi:
// oʻyinchi, raqib, oʻyinchi, ...; element massiv boʻlsa — istalgan variant toʻgʻri), mate (oxirida mot qilish kerak).
// tools/check_lessons.mjs bilan tekshiriladi.
export const LESSONS = [
  {
    id: 'pawn', title: 'Piyoda', icon: 'p',
    text: 'Piyoda faqat oldinga, bir katak yuradi. Birinchi yurishida ikki katak ham yura oladi. Raqib donasini esa oldinga qiya (diagonal) yoʻnalishda oladi.',
    tasks: [
      { fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', goal: 'Piyodani ikki katak oldinga yuring', sol: ['e2e4'] },
      { fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', goal: 'Piyoda bilan qora piyodani oling', sol: ['e4d5'] },
    ],
  },
  {
    id: 'knight', title: 'Ot', icon: 'n',
    text: 'Ot «G» harfi shaklida yuradi: bir tomonga ikki katak, soʻng yonga bir katak. Ot boshqa donalar ustidan sakrab oʻta oladigan yagona dona.',
    tasks: [
      { fen: '4k3/8/8/3r4/8/4N3/8/4K3 w - - 0 1', goal: 'Ot bilan qora ruxni oling', sol: ['e3d5'] },
      { fen: '4k3/8/8/8/8/8/PPP5/1N2K3 w - - 0 1', goal: 'Piyodalar ustidan sakrab, otni c3 ga chiqaring', sol: ['b1c3'] },
    ],
  },
  {
    id: 'bishop', title: 'Fil', icon: 'b',
    text: 'Fil faqat diagonal boʻylab, istalgancha katak yuradi. Shuning uchun u doim bir xil rangdagi kataklarda qoladi.',
    tasks: [
      { fen: '4k3/8/6q1/8/8/8/2B5/4K3 w - - 0 1', goal: 'Fil bilan qora farzinni oling', sol: ['c2g6'] },
    ],
  },
  {
    id: 'rook', title: 'Rux', icon: 'r',
    text: 'Rux toʻgʻri chiziq boʻylab — oldinga, orqaga va yonga — istalgancha katak yuradi. Ochiq chiziqlarda rux juda kuchli.',
    tasks: [
      { fen: '1n2k3/8/8/8/8/8/8/1R2K3 w - - 0 1', goal: 'Rux bilan qora otni oling', sol: ['b1b8'] },
    ],
  },
  {
    id: 'queen', title: 'Farzin', icon: 'q',
    text: 'Farzin — eng kuchli dona. U rux va filning yurishlarini birlashtiradi: toʻgʻri chiziq va diagonal boʻylab istalgancha yuradi.',
    tasks: [
      { fen: '4k3/8/8/7r/8/8/8/3QK3 w - - 0 1', goal: 'Farzin bilan qora ruxni oling', sol: ['d1h5'] },
    ],
  },
  {
    id: 'king', title: 'Shoh', icon: 'k',
    text: 'Shoh istalgan tomonga bir katak yuradi. Shohni hujum ostidagi katakka qoʻyib boʻlmaydi. Shohni yoʻqotish — oʻyinni yutqazish.',
    tasks: [
      { fen: '4k3/8/8/8/8/8/3p4/4K3 w - - 0 1', goal: 'Shoh bilan himoyasiz piyodani oling', sol: ['e1d2'] },
    ],
  },
  {
    id: 'castle', title: 'Rokirovka', icon: 'r',
    text: 'Rokirovka — shoh va rux bir yurishda joy almashadi: shoh ruxga tomon ikki katak suriladi, rux esa uning ustidan oʻtadi. Shoh ham, rux ham hali yurmagan, oralarida dona boʻlmasligi va shoh hujum ostida boʻlmasligi kerak.',
    tasks: [
      { fen: 'r3k3/8/8/8/8/8/8/4K2R w K - 0 1', goal: 'Qisqa rokirovka qiling: shohni g1 ga suring', sol: ['e1g1'] },
    ],
  },
  {
    id: 'enpassant', title: 'Oʻtib ketayotganda olish', icon: 'p',
    text: 'Raqib piyodasi birinchi yurishida ikki katak yurib, sizning piyodangiz yonidan oʻtib ketsa, uni xuddi bir katak yurgandek olishingiz mumkin. Bu faqat darhol, keyingi yurishda mumkin.',
    tasks: [
      { fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', goal: 'e5 piyoda bilan d5 piyodani oʻtib ketayotganda oling', sol: ['e5d6'] },
    ],
  },
  {
    id: 'promotion', title: 'Piyoda aylanishi', icon: 'q',
    text: 'Piyoda oxirgi qatorga yetsa, istalgan donaga aylanadi: koʻpincha eng kuchlisi — farzinga.',
    tasks: [
      { fen: '8/4P3/8/8/8/8/k7/4K3 w - - 0 1', goal: 'Piyodani oxirgi qatorga yuring va farzin tanlang', sol: [['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n']] },
    ],
  },
  {
    id: 'mate', title: 'Shoh va mot', icon: 'k',
    text: 'Shohga hujum qilish — «shoh» deyiladi. Agar shoh hujumdan hech qanday yoʻl bilan qutula olmasa — bu «mot», oʻyin tugaydi. Maqsad — raqib shohini mot qilish.',
    tasks: [
      { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: '1 yurishda mot qiling: oxirgi qatorga e’tibor bering', sol: [], mate: true },
      { fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', goal: 'Farzin bilan 1 yurishda mot qiling', sol: [], mate: true },
    ],
  },
  {
    id: 'ladder', title: 'Ikki rux bilan mot', icon: 'r',
    text: '«Zinapoya» usuli: ikki rux navbatma-navbat shohni oxirgi qatorga siqib boradi. Bir rux qatorni yopadi, ikkinchisi shoh beradi.',
    tasks: [
      { fen: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1', goal: 'Avval 7-qatorni yoping, soʻng mot qiling', sol: ['a2a7', 'g8f8'], mate: true },
    ],
  },
];
