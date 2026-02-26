const hiMap: Record<string, string> = {
  "a": "अ", "aa": "आ", "i": "इ", "ee": "ई", "u": "उ", "oo": "ऊ",
  "e": "ए", "ai": "ऐ", "o": "ओ", "au": "औ",
  "ka": "का", "kha": "खा", "ga": "गा", "gha": "घा", "nga": "ंगा",
  "cha": "चा", "chha": "छा", "ja": "जा", "jha": "झा",
  "ta": "टा", "tha": "ठा", "da": "डा", "dha": "ढा", "na": "णा",
  "pa": "पा", "pha": "फा", "ba": "बा", "bha": "भा", "ma": "मा",
  "ya": "या", "ra": "रा", "la": "ला", "va": "वा", "wa": "वा",
  "sha": "शा", "sa": "सा", "ha": "हा",
};

const paMap: Record<string, string> = {
  "a": "ਅ", "aa": "ਆ", "i": "ਇ", "ee": "ਈ", "u": "ਉ", "oo": "ਊ",
  "e": "ਏ", "ai": "ਐ", "o": "ਓ", "au": "ਔ",
};

const devConsonants: Record<string, string> = {
  "k": "क", "kh": "ख", "g": "ग", "gh": "घ",
  "ch": "च", "chh": "छ", "j": "ज", "jh": "झ",
  "t": "ट", "th": "ठ", "d": "ड", "dh": "ढ", "n": "न",
  "p": "प", "ph": "फ", "b": "ब", "bh": "भ", "m": "म",
  "y": "य", "r": "र", "l": "ल", "v": "व", "w": "व",
  "sh": "श", "s": "स", "h": "ह", "q": "क़", "f": "फ़",
  "z": "ज़", "x": "क्स",
};

const gurConsonants: Record<string, string> = {
  "k": "ਕ", "kh": "ਖ", "g": "ਗ", "gh": "ਘ",
  "ch": "ਚ", "chh": "ਛ", "j": "ਜ", "jh": "ਝ",
  "t": "ਟ", "th": "ਠ", "d": "ਡ", "dh": "ਢ", "n": "ਨ",
  "p": "ਪ", "ph": "ਫ", "b": "ਬ", "bh": "ਭ", "m": "ਮ",
  "y": "ਯ", "r": "ਰ", "l": "ਲ", "v": "ਵ", "w": "ਵ",
  "sh": "ਸ਼", "s": "ਸ", "h": "ਹ", "q": "ਕ਼", "f": "ਫ਼",
  "z": "ਜ਼", "x": "ਕਸ",
};

const devVowelMarks: Record<string, string> = {
  "a": "", "aa": "ा", "i": "ि", "ee": "ी", "u": "ु", "oo": "ू",
  "e": "े", "ai": "ै", "o": "ो", "au": "ौ",
};

const gurVowelMarks: Record<string, string> = {
  "a": "", "aa": "ਾ", "i": "ਿ", "ee": "ੀ", "u": "ੁ", "oo": "ੂ",
  "e": "ੇ", "ai": "ੈ", "o": "ੋ", "au": "ੌ",
};

const devVowels: Record<string, string> = {
  "a": "अ", "aa": "आ", "i": "इ", "ee": "ई", "u": "उ", "oo": "ऊ",
  "e": "ए", "ai": "ऐ", "o": "ओ", "au": "औ",
};

const gurVowels: Record<string, string> = {
  "a": "ਅ", "aa": "ਆ", "i": "ਇ", "ee": "ਈ", "u": "ਉ", "oo": "ਊ",
  "e": "ਏ", "ai": "ਐ", "o": "ਓ", "au": "ਔ",
};

const knownPlaces: Record<string, { hi: string; pa: string }> = {
  "banur": { hi: "बनूर", pa: "ਬਨੂਰ" },
  "rajpura": { hi: "राजपुरा", pa: "ਰਾਜਪੁਰਾ" },
  "zirakpur": { hi: "ज़ीरकपुर", pa: "ਜ਼ੀਰਕਪੁਰ" },
  "samana": { hi: "समाना", pa: "ਸਮਾਣਾ" },
  "patran": { hi: "पातड़ां", pa: "ਪਾਤੜਾਂ" },
  "nabha": { hi: "नाभा", pa: "ਨਾਭਾ" },
  "ghanaur": { hi: "घनौर", pa: "ਘਨੌਰ" },
  "fatehgarh sahib": { hi: "फतेहगढ़ साहिब", pa: "ਫ਼ਤਿਹਗੜ੍ਹ ਸਾਹਿਬ" },
  "sirhind": { hi: "सरहिंद", pa: "ਸਰਹਿੰਦ" },
  "patiala": { hi: "पटियाला", pa: "ਪਟਿਆਲਾ" },
  "patiala rural": { hi: "पटियाला ग्रामीण", pa: "ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
  "ichhewal": { hi: "इच्छेवाल", pa: "ਇੱਛੇਵਾਲ" },
  "laloda": { hi: "ललोदा", pa: "ਲਲੋਦਾ" },
  "rohta": { hi: "रोहटा", pa: "ਰੋਹਟਾ" },
  "rohti chhanna": { hi: "रोहटी छन्ना", pa: "ਰੋਹਟੀ ਛੰਨਾ" },
  "rohti mauran": { hi: "रोहटी मौरां", pa: "ਰੋਹਟੀ ਮੌਰਾਂ" },
  "rohti pul": { hi: "रोहटी पुल", pa: "ਰੋਹਟੀ ਪੁਲ" },
  "rohti khaas": { hi: "रोहटी खास", pa: "ਰੋਹਟੀ ਖ਼ਾਸ" },
  "rohti basta singh": { hi: "रोहटी बस्ता सिंह", pa: "ਰੋਹਟੀ ਬਸਤਾ ਸਿੰਘ" },
  "hiana kalan": { hi: "हियाणा कलां", pa: "ਹਿਆਣਾ ਕਲਾਂ" },
  "hiana khurd": { hi: "हियाणा खुर्द", pa: "ਹਿਆਣਾ ਖੁਰਦ" },
  "kaidupur": { hi: "कैदूपुर", pa: "ਕੈਦੂਪੁਰ" },
  "khurd": { hi: "खुर्द", pa: "ਖੁਰਦ" },
  "lubana model town": { hi: "लुबाना मॉडल टाउन", pa: "ਲੁਬਾਣਾ ਮਾਡਲ ਟਾਊਨ" },
  "lubana teku": { hi: "लुबाना टेकू", pa: "ਲੁਬਾਣਾ ਟੇਕੂ" },
  "lubana karmu": { hi: "लुबाना करमू", pa: "ਲੁਬਾਣਾ ਕਰਮੂ" },
  "shamla": { hi: "शामला", pa: "ਸ਼ਾਮਲਾ" },
  "ajnauda kalan": { hi: "अजनौदा कलां", pa: "ਅਜਨੌਦਾ ਕਲਾਂ" },
  "ajnauda khurd": { hi: "अजनौदा खुर्द", pa: "ਅਜਨੌਦਾ ਖੁਰਦ" },
  "allowal": { hi: "अल्लोवाल", pa: "ਅੱਲੋਵਾਲ" },
  "hirdapur": { hi: "हिरदापुर", pa: "ਹਿਰਦਾਪੁਰ" },
  "kansuha kalan": { hi: "कंसूहा कलां", pa: "ਕੰਸੂਹਾ ਕਲਾਂ" },
  "kishangarh": { hi: "किशनगढ़", pa: "ਕਿਸ਼ਨਗੜ੍ਹ" },
  "laut": { hi: "लौट", pa: "ਲੌਟ" },
  "paidan": { hi: "पैदां", pa: "ਪੈਦਾਂ" },
  "paidani khurd": { hi: "पैदांनी खुर्द", pa: "ਪੈਦਾਨੀ ਖੁਰਦ" },
  "simbro": { hi: "सिम्ब्रो", pa: "ਸਿੰਬਰੋ" },
  "mandaur": { hi: "मंदौर", pa: "ਮੰਦੌਰ" },
  "amaampur urf kalifewal": { hi: "अमामपुर उर्फ कालीफेवाल", pa: "ਅਮਾਮਪੁਰ ਉਰਫ਼ ਕਾਲੀਫ਼ੇਵਾਲ" },
  "chalaila": { hi: "चलैला", pa: "ਚਲੈਲਾ" },
  "dandrala kharoud": { hi: "दंद्राला खरौड", pa: "ਦੰਦਰਾਲਾ ਖਰੌਡ" },
  "dhanauri": { hi: "ढनौरी", pa: "ਢਨੌਰੀ" },
  "dhanora": { hi: "ढनोरा", pa: "ਢਨੋਰਾ" },
  "diyagarh": { hi: "दियागढ़", pa: "ਦਿਆਗੜ੍ਹ" },
  "kathmathi": { hi: "कठमाठी", pa: "ਕਠਮਾਠੀ" },
  "lachkani": { hi: "लाचकानी", pa: "ਲਾਚਕਾਨੀ" },
  "rorgarh": { hi: "रोड़गढ़", pa: "ਰੋੜਗੜ੍ਹ" },
  "bakshiwala urf kishanpur": { hi: "बख्शीवाला उर्फ किशनपुर", pa: "ਬਖ਼ਸ਼ੀਵਾਲਾ ਉਰਫ਼ ਕਿਸ਼ਨਪੁਰ" },
  "nawa fatehpur": { hi: "नवा फतेहपुर", pa: "ਨਵਾਂ ਫ਼ਤਿਹਪੁਰ" },
  "aman vihar": { hi: "अमन विहार", pa: "ਅਮਨ ਵਿਹਾਰ" },
  "babu singh colony": { hi: "बाबू सिंह कॉलोनी", pa: "ਬਾਬੂ ਸਿੰਘ ਕਲੋਨੀ" },
  "jassowal": { hi: "जस्सोवाल", pa: "ਜੱਸੋਵਾਲ" },
  "lang": { hi: "लंग", pa: "ਲੰਗ" },
  "ranjit nagar": { hi: "रणजीत नगर", pa: "ਰਣਜੀਤ ਨਗਰ" },
  "rongla": { hi: "रोंगला", pa: "ਰੋਂਗਲਾ" },
  "seona": { hi: "सेओना", pa: "ਸਿਓਣਾ" },
  "sidhuwal": { hi: "सिद्धूवाल", pa: "ਸਿੱਧੂਵਾਲ" },
  "vikas nagar": { hi: "विकास नगर", pa: "ਵਿਕਾਸ ਨਗਰ" },
  "carrier enclave": { hi: "कैरियर एन्क्लेव", pa: "ਕੈਰੀਅਰ ਐਨਕਲੇਵ" },
  "baran": { hi: "बड़ां", pa: "ਬੜਾਂ" },
  "new baran": { hi: "नया बड़ां", pa: "ਨਵਾਂ ਬੜਾਂ" },
  "faridpur": { hi: "फरीदपुर", pa: "ਫ਼ਰੀਦਪੁਰ" },
  "hardaspur": { hi: "हरदासपुर", pa: "ਹਰਦਾਸਪੁਰ" },
  "kalwa": { hi: "कलवा", pa: "ਕਲਵਾ" },
  "karamgarh": { hi: "करमगढ़", pa: "ਕਰਮਗੜ੍ਹ" },
  "ghamrouda": { hi: "घमरौदा", pa: "ਘਮਰੌਦਾ" },
  "majri akalian": { hi: "मज्री अकालियां", pa: "ਮਜਰੀ ਅਕਾਲੀਆਂ" },
  "mirzapur": { hi: "मिर्ज़ापुर", pa: "ਮਿਰਜ਼ਾਪੁਰ" },
  "nandpur kesho": { hi: "नंदपुर केशो", pa: "ਨੰਦਪੁਰ ਕੇਸ਼ੋ" },
  "faggan majra": { hi: "फग्गन मजरा", pa: "ਫੱਗਣ ਮਜਰਾ" },
  "kasiana": { hi: "कसियाना", pa: "ਕਸਿਆਣਾ" },
  "bhangala": { hi: "भंगाला", pa: "ਭੰਗਾਲਾ" },
  "ramgarh channa": { hi: "रामगढ़ छन्ना", pa: "ਰਾਮਗੜ੍ਹ ਛੰਨਾ" },
  "dhangera": { hi: "ढांगेरा", pa: "ਢਾਂਗੇਰਾ" },
  "punjabi university": { hi: "पंजाबी यूनिवर्सिटी", pa: "ਪੰਜਾਬੀ ਯੂਨੀਵਰਸਿਟੀ" },
  "urban estate phase 1": { hi: "अर्बन एस्टेट फेज़ 1", pa: "ਅਰਬਨ ਅਸਟੇਟ ਫੇਜ਼ 1" },
  "urban estate phase 2": { hi: "अर्बन एस्टेट फेज़ 2", pa: "ਅਰਬਨ ਅਸਟੇਟ ਫੇਜ਼ 2" },
  "urban estate phase 3": { hi: "अर्बन एस्टेट फेज़ 3", pa: "ਅਰਬਨ ਅਸਟੇਟ ਫੇਜ਼ 3" },
  "test village": { hi: "टेस्ट गांव", pa: "ਟੈਸਟ ਪਿੰਡ" },
  "ward": { hi: "वार्ड", pa: "ਵਾਰਡ" },
  "no.": { hi: "नं.", pa: "ਨੰ." },
  "malwa east": { hi: "मालवा पूर्व", pa: "ਮਾਲਵਾ ਪੂਰਬ" },
  "zone a": { hi: "ज़ोन ए", pa: "ਜ਼ੋਨ ਏ" },
  "farmer wing": { hi: "किसान विंग", pa: "ਕਿਸਾਨ ਵਿੰਗ" },
  "senior citizen wing": { hi: "वरिष्ठ नागरिक विंग", pa: "ਸੀਨੀਅਰ ਨਾਗਰਿਕ ਵਿੰਗ" },
  "student wing": { hi: "छात्र विंग", pa: "ਵਿਦਿਆਰਥੀ ਵਿੰਗ" },
  "women wing": { hi: "महिला विंग", pa: "ਮਹਿਲਾ ਵਿੰਗ" },
  "youth wing": { hi: "युवा विंग", pa: "ਯੁਵਾ ਵਿੰਗ" },
  "coordinator": { hi: "समन्वयक", pa: "ਕੋਆਰਡੀਨੇਟਰ" },
  "joint secretary": { hi: "संयुक्त सचिव", pa: "ਸੰਯੁਕਤ ਸਕੱਤਰ" },
  "member": { hi: "सदस्य", pa: "ਮੈਂਬਰ" },
  "president": { hi: "अध्यक्ष", pa: "ਪ੍ਰਧਾਨ" },
  "secretary": { hi: "सचिव", pa: "ਸਕੱਤਰ" },
  "treasurer": { hi: "कोषाध्यक्ष", pa: "ਖਜ਼ਾਨਚੀ" },
  "vice president": { hi: "उपाध्यक्ष", pa: "ਉਪ ਪ੍ਰਧਾਨ" },
};

function transliterateWord(word: string, target: "hi" | "pa"): string {
  const lower = word.toLowerCase();
  const lookup = knownPlaces[lower];
  if (lookup) return target === "hi" ? lookup.hi : lookup.pa;

  const consonants = target === "hi" ? devConsonants : gurConsonants;
  const vowelMrks = target === "hi" ? devVowelMarks : gurVowelMarks;
  const vowels = target === "hi" ? devVowels : gurVowels;
  const halant = target === "hi" ? "्" : "੍";

  let result = "";
  let i = 0;
  const w = lower;

  while (i < w.length) {
    let consumed = false;

    for (const len of [3, 2, 1]) {
      const chunk = w.substring(i, i + len);
      if (consonants[chunk]) {
        let vowel = "a";
        let vLen = 1;
        const nextPos = i + len;

        for (const vl of [2, 1]) {
          const vChunk = w.substring(nextPos, nextPos + vl);
          if (vowelMrks[vChunk] !== undefined && vChunk !== "a") {
            vowel = vChunk;
            vLen = vl;
            break;
          }
        }

        if (nextPos < w.length && !vowels[w.substring(nextPos, nextPos + 1)] && !consonants[w.substring(nextPos, nextPos + 1)] && !consonants[w.substring(nextPos, nextPos + 2)]) {
          result += consonants[chunk] + vowelMrks[vowel];
          i = nextPos + (vowel !== "a" ? vLen : 0);
        } else {
          const nextIsConsonant = nextPos < w.length && (consonants[w.substring(nextPos, nextPos + 2)] || consonants[w.substring(nextPos, nextPos + 1)]);
          const nextIsEnd = nextPos >= w.length;

          if (nextIsEnd) {
            result += consonants[chunk] + vowelMrks[vowel];
            i = nextPos;
          } else if (nextIsConsonant && vowel === "a") {
            result += consonants[chunk] + halant;
            i = nextPos;
          } else {
            result += consonants[chunk] + vowelMrks[vowel];
            i = nextPos + (vowel !== "a" ? vLen : 0);
          }
        }
        consumed = true;
        break;
      }

      if (vowels[chunk]) {
        if (result.length === 0) {
          result += vowels[chunk];
        } else {
          result += vowelMrks[chunk] || vowels[chunk];
        }
        i += len;
        consumed = true;
        break;
      }
    }

    if (!consumed) {
      result += w[i];
      i++;
    }
  }

  if (word[0] === word[0].toUpperCase()) {
    return result;
  }
  return result;
}

export function transliterate(text: string, target: "hi" | "pa"): string {
  const lowerText = text.toLowerCase().trim();
  const knownResult = knownPlaces[lowerText];
  if (knownResult) {
    return target === "hi" ? knownResult.hi : knownResult.pa;
  }

  const wardMatch = text.match(/^(Ward\s+No\.\s*)(\d+)(\s*,?\s*)(.*)$/i);
  if (wardMatch) {
    const wardWord = target === "hi" ? "वार्ड नं." : "ਵਾਰਡ ਨੰ.";
    const rest = wardMatch[4] ? transliterate(wardMatch[4].trim(), target) : "";
    return `${wardWord} ${wardMatch[2]}${rest ? (wardMatch[3].includes(",") ? " , " : " ") + rest : ""}`;
  }

  return text.split(/\s+/).map(w => {
    const known = knownPlaces[w.toLowerCase()];
    if (known) return target === "hi" ? known.hi : known.pa;
    return transliterateWord(w, target);
  }).join(" ");
}

export function transliterateBatch(
  items: { id: string; text: string }[],
  target: "hi" | "pa"
): Map<string, string> {
  const result = new Map<string, string>();
  for (const item of items) {
    result.set(item.id, transliterate(item.text, target));
  }
  return result;
}
