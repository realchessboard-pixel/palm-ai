import { PARVATS, REKHAS } from "@/lib/palmistry/tradition";
import type { LineName, MountName } from "@/lib/schemas/palm-analysis";
import type { Language } from "./languages";

/**
 * Fixed labels around a reading (headings, notes). The reading text itself is
 * translated separately; these are hand-written so headings read naturally.
 */
export interface ReadingMessages {
  yourPalmReading: string;
  rightHand: string;
  leftHand: string;
  basicReading: string;
  detailedReading: string;
  language: string;
  thinking: string;
  caring: string;
  strengths: string;
  career: string;
  insight: string;
  detailedTitle: string;
  linesTitle: string;
  mountsTitle: string;
  fingersTitle: string;
  markingsTitle: string;
  palmMap: string;
  analysisDetails: string;
  analysisIntro: string;
  imageClarity: string;
  handNote: string;
  traditionNote: string;
  translating: string;
  translationFailed: string;
  retry: string;
  /** Local names of the lines (Hindi uses its own terms; others add the rekha). */
  lines: Record<LineName, string>;
  /** Local (western-tradition) names of the mounts; shown next to the parvat name. */
  mounts: Record<MountName, string>;
}

const EN: ReadingMessages = {
  yourPalmReading: "Your Palm Reading",
  rightHand: "Right hand",
  leftHand: "Left hand",
  basicReading: "Basic reading",
  detailedReading: "Detailed reading",
  language: "Language",
  thinking: "The way you think",
  caring: "The way you care",
  strengths: "Your natural strengths",
  career: "Your career nature",
  insight: "Something interesting about you",
  detailedTitle: "Your detailed reading",
  linesTitle: "Your major lines",
  mountsTitle: "The parvats (mounts) of your palm",
  fingersTitle: "Fingers & thumb",
  markingsTitle: "Special markings",
  palmMap: "Your palm map",
  analysisDetails: "Analysis details",
  analysisIntro:
    "How clearly each feature could be seen in your photo — not how certain any interpretation is.",
  imageClarity: "Overall image clarity",
  handNote:
    "Our image check thought this photo might show a left hand. AstroVidya reads the right palm — if you photographed your left hand, you can start a new reading with your right.",
  traditionNote:
    "This reading follows traditional Indian palmistry (Hasta Samudrika Shastra). It is a cultural tradition offered for reflection and enjoyment — not a scientific prediction.",
  translating: "Translating your reading…",
  translationFailed: "We couldn't translate your reading just now.",
  retry: "Try again",
  lines: { heart: "Heart Line", head: "Head Line", life: "Life Line", fate: "Fate Line" },
  mounts: {
    venus: "Mount of Venus",
    jupiter: "Mount of Jupiter",
    saturn: "Mount of Saturn",
    apollo: "Mount of the Sun",
    mercury: "Mount of Mercury",
    mars: "Mount of Mars",
    moon: "Mount of the Moon",
  },
};

const MESSAGES: Record<Language, ReadingMessages> = {
  en: EN,
  hi: {
    yourPalmReading: "आपकी हस्तरेखा",
    rightHand: "दायाँ हाथ",
    leftHand: "बायाँ हाथ",
    basicReading: "मुख्य फलादेश",
    detailedReading: "विस्तृत फलादेश",
    language: "भाषा",
    thinking: "आपके सोचने का ढंग",
    caring: "आपके स्नेह का स्वभाव",
    strengths: "आपकी स्वाभाविक शक्तियाँ",
    career: "आपका कार्य-स्वभाव",
    insight: "आपके बारे में एक रोचक बात",
    detailedTitle: "आपका विस्तृत फलादेश",
    linesTitle: "आपकी प्रमुख रेखाएँ",
    mountsTitle: "आपकी हथेली के पर्वत",
    fingersTitle: "उँगलियाँ और अंगूठा",
    markingsTitle: "विशेष चिह्न",
    palmMap: "आपकी हथेली का मानचित्र",
    analysisDetails: "विश्लेषण विवरण",
    analysisIntro:
      "तस्वीर में हर विशेषता कितनी स्पष्ट दिखी — यह किसी फलादेश की निश्चितता नहीं दर्शाता।",
    imageClarity: "तस्वीर की स्पष्टता",
    handNote:
      "हमारी जाँच को लगा कि यह तस्वीर शायद बाएँ हाथ की है। AstroVidya दाईं हथेली पढ़ता है — यदि आपने बायाँ हाथ लिया था, तो दाईं हथेली से नया फलादेश शुरू करें।",
    traditionNote:
      "यह फलादेश पारंपरिक भारतीय हस्तरेखा शास्त्र (हस्त सामुद्रिक शास्त्र) के अनुसार है। यह एक सांस्कृतिक परंपरा है, जो चिंतन और आनंद के लिए प्रस्तुत है — कोई वैज्ञानिक भविष्यवाणी नहीं।",
    translating: "आपका फलादेश हिन्दी में तैयार हो रहा है…",
    translationFailed: "अभी अनुवाद नहीं हो सका।",
    retry: "फिर से कोशिश करें",
    lines: {
      heart: REKHAS.heart.hindi,
      head: REKHAS.head.hindi,
      life: REKHAS.life.hindi,
      fate: REKHAS.fate.hindi,
    },
    mounts: {
      venus: PARVATS.venus.hindi,
      jupiter: PARVATS.jupiter.hindi,
      saturn: PARVATS.saturn.hindi,
      apollo: PARVATS.apollo.hindi,
      mercury: PARVATS.mercury.hindi,
      mars: PARVATS.mars.hindi,
      moon: PARVATS.moon.hindi,
    },
  },
  de: {
    yourPalmReading: "Deine Handlesung",
    rightHand: "Rechte Hand",
    leftHand: "Linke Hand",
    basicReading: "Grundlesung",
    detailedReading: "Ausführliche Lesung",
    language: "Sprache",
    thinking: "Wie du denkst",
    caring: "Wie du fühlst und liebst",
    strengths: "Deine natürlichen Stärken",
    career: "Deine berufliche Natur",
    insight: "Etwas Interessantes über dich",
    detailedTitle: "Deine ausführliche Lesung",
    linesTitle: "Deine Hauptlinien",
    mountsTitle: "Die Berge (Parvats) deiner Hand",
    fingersTitle: "Finger & Daumen",
    markingsTitle: "Besondere Zeichen",
    palmMap: "Deine Handkarte",
    analysisDetails: "Analysedetails",
    analysisIntro:
      "Wie deutlich jedes Merkmal auf deinem Foto zu erkennen war – keine Aussage darüber, wie sicher eine Deutung ist.",
    imageClarity: "Bildklarheit insgesamt",
    handNote:
      "Unsere Bildprüfung hielt dieses Foto möglicherweise für eine linke Hand. AstroVidya liest die rechte Handfläche – falls du die linke Hand fotografiert hast, starte eine neue Lesung mit der rechten.",
    traditionNote:
      "Diese Lesung folgt der traditionellen indischen Handlesekunst (Hasta Samudrika Shastra). Sie ist eine kulturelle Tradition zur Reflexion und Freude – keine wissenschaftliche Vorhersage.",
    translating: "Deine Lesung wird übersetzt …",
    translationFailed: "Die Übersetzung ist gerade nicht möglich.",
    retry: "Erneut versuchen",
    lines: { heart: "Herzlinie", head: "Kopflinie", life: "Lebenslinie", fate: "Schicksalslinie" },
    mounts: {
      venus: "Venusberg",
      jupiter: "Jupiterberg",
      saturn: "Saturnberg",
      apollo: "Sonnenberg",
      mercury: "Merkurberg",
      mars: "Marsberg",
      moon: "Mondberg",
    },
  },
  es: {
    yourPalmReading: "Tu lectura de mano",
    rightHand: "Mano derecha",
    leftHand: "Mano izquierda",
    basicReading: "Lectura básica",
    detailedReading: "Lectura detallada",
    language: "Idioma",
    thinking: "Cómo piensas",
    caring: "Cómo amas y cuidas",
    strengths: "Tus fortalezas naturales",
    career: "Tu naturaleza profesional",
    insight: "Algo interesante sobre ti",
    detailedTitle: "Tu lectura detallada",
    linesTitle: "Tus líneas principales",
    mountsTitle: "Los montes (parvats) de tu palma",
    fingersTitle: "Dedos y pulgar",
    markingsTitle: "Marcas especiales",
    palmMap: "El mapa de tu palma",
    analysisDetails: "Detalles del análisis",
    analysisIntro:
      "Qué tan claramente se veía cada rasgo en tu foto; no indica cuán segura es una interpretación.",
    imageClarity: "Claridad general de la imagen",
    handNote:
      "Nuestra revisión de la imagen pensó que esta foto podría mostrar una mano izquierda. AstroVidya lee la palma derecha: si fotografiaste la izquierda, puedes empezar una nueva lectura con la derecha.",
    traditionNote:
      "Esta lectura sigue la quiromancia tradicional india (Hasta Samudrika Shastra). Es una tradición cultural, ofrecida para la reflexión y el disfrute, no una predicción científica.",
    translating: "Traduciendo tu lectura…",
    translationFailed: "No se pudo traducir tu lectura en este momento.",
    retry: "Reintentar",
    lines: {
      heart: "Línea del corazón",
      head: "Línea de la cabeza",
      life: "Línea de la vida",
      fate: "Línea del destino",
    },
    mounts: {
      venus: "Monte de Venus",
      jupiter: "Monte de Júpiter",
      saturn: "Monte de Saturno",
      apollo: "Monte del Sol",
      mercury: "Monte de Mercurio",
      mars: "Monte de Marte",
      moon: "Monte de la Luna",
    },
  },
  fr: {
    yourPalmReading: "Votre lecture des lignes de la main",
    rightHand: "Main droite",
    leftHand: "Main gauche",
    basicReading: "Lecture essentielle",
    detailedReading: "Lecture détaillée",
    language: "Langue",
    thinking: "Votre façon de penser",
    caring: "Votre façon d’aimer",
    strengths: "Vos forces naturelles",
    career: "Votre nature professionnelle",
    insight: "Quelque chose d’intéressant à votre sujet",
    detailedTitle: "Votre lecture détaillée",
    linesTitle: "Vos lignes principales",
    mountsTitle: "Les monts (parvats) de votre main",
    fingersTitle: "Doigts et pouce",
    markingsTitle: "Signes particuliers",
    palmMap: "La carte de votre main",
    analysisDetails: "Détails de l’analyse",
    analysisIntro:
      "La netteté de chaque trait sur votre photo — et non le degré de certitude d’une interprétation.",
    imageClarity: "Netteté globale de l’image",
    handNote:
      "Notre vérification a estimé que cette photo pourrait montrer une main gauche. AstroVidya lit la paume droite : si vous avez photographié la gauche, vous pouvez commencer une nouvelle lecture avec la droite.",
    traditionNote:
      "Cette lecture suit la chiromancie indienne traditionnelle (Hasta Samudrika Shastra). C’est une tradition culturelle, proposée pour la réflexion et le plaisir — et non une prédiction scientifique.",
    translating: "Traduction de votre lecture…",
    translationFailed: "La traduction n’est pas possible pour le moment.",
    retry: "Réessayer",
    lines: {
      heart: "Ligne de cœur",
      head: "Ligne de tête",
      life: "Ligne de vie",
      fate: "Ligne de destinée",
    },
    mounts: {
      venus: "Mont de Vénus",
      jupiter: "Mont de Jupiter",
      saturn: "Mont de Saturne",
      apollo: "Mont du Soleil",
      mercury: "Mont de Mercure",
      mars: "Mont de Mars",
      moon: "Mont de la Lune",
    },
  },
  pt: {
    yourPalmReading: "Sua leitura de mão",
    rightHand: "Mão direita",
    leftHand: "Mão esquerda",
    basicReading: "Leitura básica",
    detailedReading: "Leitura detalhada",
    language: "Idioma",
    thinking: "Como você pensa",
    caring: "Como você ama e cuida",
    strengths: "Seus pontos fortes naturais",
    career: "Sua natureza profissional",
    insight: "Algo interessante sobre você",
    detailedTitle: "Sua leitura detalhada",
    linesTitle: "Suas linhas principais",
    mountsTitle: "Os montes (parvats) da sua palma",
    fingersTitle: "Dedos e polegar",
    markingsTitle: "Marcas especiais",
    palmMap: "O mapa da sua palma",
    analysisDetails: "Detalhes da análise",
    analysisIntro:
      "O quão nitidamente cada traço aparecia na sua foto — não o quanto uma interpretação é certa.",
    imageClarity: "Nitidez geral da imagem",
    handNote:
      "Nossa verificação achou que esta foto pode mostrar a mão esquerda. O AstroVidya lê a palma direita: se você fotografou a esquerda, pode começar uma nova leitura com a direita.",
    traditionNote:
      "Esta leitura segue a quiromancia tradicional indiana (Hasta Samudrika Shastra). É uma tradição cultural, oferecida para reflexão e prazer — não uma previsão científica.",
    translating: "Traduzindo sua leitura…",
    translationFailed: "Não foi possível traduzir sua leitura agora.",
    retry: "Tentar novamente",
    lines: {
      heart: "Linha do coração",
      head: "Linha da cabeça",
      life: "Linha da vida",
      fate: "Linha do destino",
    },
    mounts: {
      venus: "Monte de Vênus",
      jupiter: "Monte de Júpiter",
      saturn: "Monte de Saturno",
      apollo: "Monte do Sol",
      mercury: "Monte de Mercúrio",
      mars: "Monte de Marte",
      moon: "Monte da Lua",
    },
  },
  it: {
    yourPalmReading: "La tua lettura della mano",
    rightHand: "Mano destra",
    leftHand: "Mano sinistra",
    basicReading: "Lettura essenziale",
    detailedReading: "Lettura dettagliata",
    language: "Lingua",
    thinking: "Il tuo modo di pensare",
    caring: "Il tuo modo di amare",
    strengths: "I tuoi punti di forza naturali",
    career: "La tua natura professionale",
    insight: "Qualcosa di interessante su di te",
    detailedTitle: "La tua lettura dettagliata",
    linesTitle: "Le tue linee principali",
    mountsTitle: "I monti (parvat) della tua mano",
    fingersTitle: "Dita e pollice",
    markingsTitle: "Segni particolari",
    palmMap: "La mappa della tua mano",
    analysisDetails: "Dettagli dell’analisi",
    analysisIntro:
      "Quanto chiaramente ogni tratto si vedeva nella tua foto — non quanto sia certa un’interpretazione.",
    imageClarity: "Nitidezza complessiva dell’immagine",
    handNote:
      "Il nostro controllo ha ritenuto che questa foto potesse mostrare una mano sinistra. AstroVidya legge il palmo destro: se hai fotografato la sinistra, puoi iniziare una nuova lettura con la destra.",
    traditionNote:
      "Questa lettura segue la chiromanzia tradizionale indiana (Hasta Samudrika Shastra). È una tradizione culturale, offerta per la riflessione e il piacere — non una previsione scientifica.",
    translating: "Traduzione della tua lettura…",
    translationFailed: "Non è stato possibile tradurre la lettura ora.",
    retry: "Riprova",
    lines: {
      heart: "Linea del cuore",
      head: "Linea della testa",
      life: "Linea della vita",
      fate: "Linea del destino",
    },
    mounts: {
      venus: "Monte di Venere",
      jupiter: "Monte di Giove",
      saturn: "Monte di Saturno",
      apollo: "Monte del Sole",
      mercury: "Monte di Mercurio",
      mars: "Monte di Marte",
      moon: "Monte della Luna",
    },
  },
  id: {
    yourPalmReading: "Pembacaan Telapak Tanganmu",
    rightHand: "Tangan kanan",
    leftHand: "Tangan kiri",
    basicReading: "Pembacaan dasar",
    detailedReading: "Pembacaan lengkap",
    language: "Bahasa",
    thinking: "Caramu berpikir",
    caring: "Caramu menyayangi",
    strengths: "Kekuatan alamimu",
    career: "Sifat kariermu",
    insight: "Sesuatu yang menarik tentang dirimu",
    detailedTitle: "Pembacaan lengkapmu",
    linesTitle: "Garis-garis utamamu",
    mountsTitle: "Gunung (parvat) di telapak tanganmu",
    fingersTitle: "Jari & ibu jari",
    markingsTitle: "Tanda-tanda khusus",
    palmMap: "Peta telapak tanganmu",
    analysisDetails: "Detail analisis",
    analysisIntro:
      "Seberapa jelas setiap ciri terlihat di fotomu — bukan seberapa pasti sebuah tafsiran.",
    imageClarity: "Kejernihan gambar secara keseluruhan",
    handNote:
      "Pemeriksaan gambar kami mengira foto ini mungkin menunjukkan tangan kiri. AstroVidya membaca telapak tangan kanan — jika kamu memotret tangan kiri, kamu bisa memulai pembacaan baru dengan tangan kanan.",
    traditionNote:
      "Pembacaan ini mengikuti ilmu rajah tangan tradisional India (Hasta Samudrika Shastra). Ini adalah tradisi budaya untuk refleksi dan kesenangan — bukan ramalan ilmiah.",
    translating: "Menerjemahkan pembacaanmu…",
    translationFailed: "Pembacaanmu belum bisa diterjemahkan sekarang.",
    retry: "Coba lagi",
    lines: {
      heart: "Garis hati",
      head: "Garis kepala",
      life: "Garis kehidupan",
      fate: "Garis nasib",
    },
    mounts: {
      venus: "Gunung Venus",
      jupiter: "Gunung Jupiter",
      saturn: "Gunung Saturnus",
      apollo: "Gunung Matahari",
      mercury: "Gunung Merkurius",
      mars: "Gunung Mars",
      moon: "Gunung Bulan",
    },
  },
  ja: {
    yourPalmReading: "あなたの手相",
    rightHand: "右手",
    leftHand: "左手",
    basicReading: "基本の鑑定",
    detailedReading: "詳しい鑑定",
    language: "言語",
    thinking: "あなたの考え方",
    caring: "あなたの愛し方",
    strengths: "あなたの持ち前の強み",
    career: "あなたの仕事の気質",
    insight: "あなたについての興味深いこと",
    detailedTitle: "あなたの詳しい鑑定",
    linesTitle: "あなたの主要な線",
    mountsTitle: "あなたの手のひらの丘（パルヴァット）",
    fingersTitle: "指と親指",
    markingsTitle: "特別なしるし",
    palmMap: "あなたの手のひらの図",
    analysisDetails: "解析の詳細",
    analysisIntro:
      "写真で各特徴がどれだけはっきり見えたかを示すもので、解釈の確かさではありません。",
    imageClarity: "画像全体の鮮明さ",
    handNote:
      "画像チェックでは、この写真は左手かもしれないと判断されました。AstroVidyaは右手のひらを読みます。左手を撮影した場合は、右手で新しい鑑定を始めてください。",
    traditionNote:
      "この鑑定は伝統的なインド手相学（ハスタ・サームドリカ・シャーストラ）に基づいています。内省と楽しみのための文化的な伝統であり、科学的な予言ではありません。",
    translating: "鑑定を翻訳しています…",
    translationFailed: "現在、鑑定を翻訳できませんでした。",
    retry: "もう一度試す",
    lines: { heart: "感情線", head: "頭脳線", life: "生命線", fate: "運命線" },
    mounts: {
      venus: "金星丘",
      jupiter: "木星丘",
      saturn: "土星丘",
      apollo: "太陽丘",
      mercury: "水星丘",
      mars: "火星丘",
      moon: "月丘",
    },
  },
  ko: {
    yourPalmReading: "당신의 손금 풀이",
    rightHand: "오른손",
    leftHand: "왼손",
    basicReading: "기본 풀이",
    detailedReading: "자세한 풀이",
    language: "언어",
    thinking: "당신이 생각하는 방식",
    caring: "당신이 마음을 주는 방식",
    strengths: "당신의 타고난 강점",
    career: "당신의 일하는 기질",
    insight: "당신에 대한 흥미로운 점",
    detailedTitle: "당신의 자세한 풀이",
    linesTitle: "당신의 주요 손금",
    mountsTitle: "손바닥의 구(파르바트)",
    fingersTitle: "손가락과 엄지",
    markingsTitle: "특별한 표시",
    palmMap: "당신의 손바닥 지도",
    analysisDetails: "분석 세부 정보",
    analysisIntro:
      "사진에서 각 특징이 얼마나 선명하게 보였는지를 나타내며, 해석의 확실성을 뜻하지 않습니다.",
    imageClarity: "전체 이미지 선명도",
    handNote:
      "이미지 확인 결과 이 사진이 왼손일 수도 있습니다. AstroVidya는 오른손 손바닥을 읽습니다. 왼손을 촬영했다면 오른손으로 새 풀이를 시작해 보세요.",
    traditionNote:
      "이 풀이는 전통 인도 수상학(하스타 사무드리카 샤스트라)을 따릅니다. 성찰과 즐거움을 위한 문화적 전통이며, 과학적 예언이 아닙니다.",
    translating: "풀이를 번역하는 중…",
    translationFailed: "지금은 풀이를 번역할 수 없습니다.",
    retry: "다시 시도",
    lines: { heart: "감정선", head: "두뇌선", life: "생명선", fate: "운명선" },
    mounts: {
      venus: "금성구",
      jupiter: "목성구",
      saturn: "토성구",
      apollo: "태양구",
      mercury: "수성구",
      mars: "화성구",
      moon: "월구",
    },
  },
};

export function readingMessages(language: Language): ReadingMessages {
  return MESSAGES[language];
}

/** Heading for a line: "Heart Line · Hridaya Rekha", or just "हृदय रेखा" in Hindi. */
export function lineTitle(language: Language, line: LineName): string {
  const local = MESSAGES[language].lines[line];
  return language === "hi" ? local : `${local} · ${REKHAS[line].name}`;
}

/** Heading for a mount: "Guru Parvat · Mount of Jupiter", or "गुरु पर्वत" in Hindi. */
export function mountTitle(language: Language, mount: MountName): string {
  const local = MESSAGES[language].mounts[mount];
  return language === "hi" ? local : `${PARVATS[mount].name} · ${local}`;
}
