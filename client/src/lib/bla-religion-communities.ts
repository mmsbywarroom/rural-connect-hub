import type { Language } from "@/lib/i18n";

export type BlaCommunityOption = {
  value: string;
  en: string;
  hi: string;
  pa: string;
};

function opt(value: string, en: string, pa: string, hi?: string): BlaCommunityOption {
  return { value, en, hi: hi ?? en, pa };
}

export const BLA_COMMUNITY_OTHER_VALUE = "other";
export const BLA_COMMUNITY_OTHER_PREFIX = "other:";

export const OTHER_COMMUNITY_OPTION: BlaCommunityOption = opt("other", "Other", "ਹੋਰ", "अन्य");

function withOtherOption(options: BlaCommunityOption[]): BlaCommunityOption[] {
  if (options.some((c) => c.value === BLA_COMMUNITY_OTHER_VALUE)) return options;
  return [...options, OTHER_COMMUNITY_OPTION];
}

/** Stored in DB as `other:Custom text` when user picks Other and types a value. */
export function formatBlaCommunityValue(selectValue: string, customText: string): string {
  if (selectValue === BLA_COMMUNITY_OTHER_VALUE) {
    const trimmed = customText.trim();
    return trimmed ? `${BLA_COMMUNITY_OTHER_PREFIX}${trimmed}` : "";
  }
  return selectValue;
}

export function parseBlaCommunityValue(stored: string): { select: string; custom: string } {
  if (!stored) return { select: "", custom: "" };
  if (stored.startsWith(BLA_COMMUNITY_OTHER_PREFIX)) {
    return {
      select: BLA_COMMUNITY_OTHER_VALUE,
      custom: stored.slice(BLA_COMMUNITY_OTHER_PREFIX.length),
    };
  }
  return { select: stored, custom: "" };
}

const HINDU_COMMUNITIES: BlaCommunityOption[] = [
  opt("brahmin", "Brahmin", "ਬ੍ਰਾਹਮਣ", "ब्राह्मण"),
  opt("khatri", "Khatri", "ਖਤਰੀ", "खत्री"),
  opt("rajput", "Rajput", "ਰਾਜਪੂਤ", "राजपूत"),
  opt("thakur", "Thakur", "ਠਾਕੁਰ", "ठाकुर"),
  opt("bhumihar", "Bhumihar", "ਭੂਮਿਹਾਰ", "भूमिहार"),
  opt("kayastha", "Kayastha", "ਕਾਇਸਥ", "कायस्थ"),
  opt("yadav", "Yadav", "ਯਾਦਵ", "यादव"),
  opt("kurmi", "Kurmi", "ਕੁਰਮੀ", "कुरमी"),
  opt("jat", "Jat", "ਜੱਟ", "जाट"),
  opt("gurjar", "Gurjar", "ਗੁੱਜਰ", "गुर्जर"),
  opt("kushwaha", "Kushwaha", "ਕੁਸ਼ਵਾਹਾ", "कुशवाहा"),
  opt("maurya", "Maurya", "ਮੌਰਿਆ", "मौर्य"),
  opt("saini", "Saini", "ਸੈਣੀ", "सैनी"),
  opt("nai", "Nai", "ਨਾਈ", "नाई"),
  opt("teli", "Teli", "ਤੇਲੀ", "तेली"),
  opt("kumhar", "Kumhar", "ਕੁੰਭਾਰ", "कुम्हार"),
  opt("lohar", "Lohar", "ਲੋਹਾਰ", "लोहार"),
  opt("chamar", "Chamar", "ਚਮਾਰ", "चमार"),
  opt("valmiki", "Valmiki", "ਵਾਲਮੀਕੀ", "वाल्मीकि"),
  opt("pasi", "Pasi", "ਪਾਸੀ", "पासी"),
  opt("khatik", "Khatik", "ਖਟੀਕ", "खटीक"),
];

const SIKH_COMMUNITIES: BlaCommunityOption[] = [
  opt("jatt_sikh", "Jatt Sikh", "ਜੱਟ ਸਿੱਖ", "जट्ट सिख"),
  opt("ramgarhia", "Ramgarhia", "ਰਾਮਗੜ੍ਹੀਆ", "रामगढ़िया"),
  opt("khatri", "Khatri", "ਖਤਰੀ", "खत्री"),
  opt("arora", "Arora", "ਅਰੋੜਾ", "अरोड़ा"),
  opt("mazhabi_sikh", "Mazhabi Sikh", "ਮਜ਼ਹਬੀ ਸਿੱਖ", "मज़हबी सिख"),
  opt("ravidasia", "Ravidasia", "ਰਵਿਦਾਸੀਆ", "रविदासिया"),
  opt("lubana", "Lubana", "ਲੁਬਾਣਾ", "लुबाना"),
  opt("rai_sikh", "Rai Sikh", "ਰਾਇ ਸਿੱਖ", "राय सिख"),
  opt("saini_sikh", "Saini Sikh", "ਸੈਣੀ ਸਿੱਖ", "सैनी सिख"),
  opt("tarkhan", "Tarkhan", "ਤਰਖਾਣ", "तरखान"),
  opt("ahluwalia", "Ahluwalia", "ਆਹਲੂਵਾਲੀਆ", "अहलूवालिया"),
];

const MUSLIM_COMMUNITIES: BlaCommunityOption[] = [
  opt("sheikh", "Sheikh", "ਸ਼ੇਖ", "शेख"),
  opt("syed", "Syed", "ਸਈਦ", "सैयद"),
  opt("pathan", "Pathan", "ਪਠਾਨ", "पठान"),
  opt("mughal", "Mughal", "ਮੁਗਲ", "मुगल"),
  opt("ansari", "Ansari", "ਅੰਸਾਰੀ", "अंसारी"),
  opt("qureshi", "Qureshi", "ਕੁਰੈਸ਼ੀ", "कुरैशी"),
  opt("malik", "Malik", "ਮਲਿਕ", "मलिक"),
  opt("mansoori", "Mansoori", "ਮਨਸੂਰੀ", "मंसूरी"),
  opt("fakir", "Fakir", "ਫਕੀਰ", "फकीर"),
  opt("rangrez", "Rangrez", "ਰੰਗਰੇਜ਼", "रंगरेज"),
  opt("mirza", "Mirza", "ਮਿਰਜ਼ਾ", "मिर्ज़ा"),
];

const CHRISTIAN_COMMUNITIES: BlaCommunityOption[] = [
  opt("roman_catholic", "Roman Catholic", "ਰੋਮਨ ਕੈਥੋਲਿਕ", "रोमन कैथोलिक"),
  opt("protestant", "Protestant", "ਪ੍ਰੋਟੈਸਟੈਂਟ", "प्रोटेस्टेंट"),
  opt("syrian_christian", "Syrian Christian", "ਸਿਰੀਅਨ ਕਰਿਸਚਨ", "सिरियन क्रिश्चियन"),
  opt("dalit_christian", "Dalit Christian", "ਦਲਿਤ ਕਰਿਸਚਨ", "दलित क्रिश्चियन"),
  opt("anglo_indian", "Anglo-Indian", "ਐੰਗਲੋ-ਇੰਡਿਅਨ", "एंग्लो-इंडियन"),
  opt("latin_catholic", "Latin Catholic", "ਲੈਟਿਨ ਕੈਥੋਲਿਕ", "लैटिन कैथोलिक"),
];

const JAIN_COMMUNITIES: BlaCommunityOption[] = [
  opt("oswal", "Oswal", "ਓਸਵਾਲ", "ओसवाल"),
  opt("agarwal_jain", "Agarwal Jain", "ਅਗਰਵਾਲ ਜੈਨ", "अग्रवाल जैन"),
  opt("porwal", "Porwal", "ਪੋਰਵਾਲ", "पोरवाल"),
  opt("shrimall", "Shrimal", "ਸ਼੍ਰੀਮਾਲ", "श्रीमाल"),
  opt("digambar", "Digambar", "ਦਿਗੰਬਰ", "दिगंबर"),
  opt("shwetambar", "Shwetambar", "ਸ਼ਵੇਤੰਬਰ", "श्वेतांबर"),
];

const BUDDHIST_COMMUNITIES: BlaCommunityOption[] = [
  opt("mahayana", "Mahayana Buddhist", "ਮਹਾਯਾਨ ਬੁੱਧ", "महायान बौद्ध"),
  opt("theravada", "Theravada Buddhist", "ਥੇਰਵਾਦ ਬੁੱਧ", "थेरवाद बौद्ध"),
  opt("navayana", "Navayana / Ambedkarite", "ਨਵਯਾਨ / ਅੰਬੇਡਕਰਵਾਦੀ", "नवयान / अंबेडकरवादी"),
  opt("other_buddhist", "Other Buddhist", "ਹੋਰ ਬੁੱਧ", "अन्य बौद्ध"),
];

const OTHER_COMMUNITIES: BlaCommunityOption[] = [OTHER_COMMUNITY_OPTION];

export const OBC_COMMUNITIES: BlaCommunityOption[] = [
  opt("yadav_obc", "Yadav", "ਯਾਦਵ", "यादव"),
  opt("kurmi_obc", "Kurmi", "ਕੁਰਮੀ", "कुरमी"),
  opt("saini_obc", "Saini", "ਸੈਣੀ", "सैनी"),
  opt("maurya_obc", "Maurya", "ਮੌਰਿਆ", "मौर्य"),
  opt("kushwaha_obc", "Kushwaha", "ਕੁਸ਼ਵਾਹਾ", "कुशवाहा"),
  opt("teli_obc", "Teli", "ਤੇਲੀ", "तेली"),
  opt("nai_obc", "Nai", "ਨਾਈ", "नाई"),
  opt("lohar_obc", "Lohar", "ਲੋਹਾਰ", "लोहार"),
  opt("kumhar_obc", "Kumhar", "ਕੁੰਭਾਰ", "कुम्हार"),
  opt("gurjar_obc", "Gurjar", "ਗੁੱਜਰ", "गुर्जर"),
  opt("nishad", "Nishad", "ਨਿਸ਼ਾਦ", "निषाद"),
  opt("kahar", "Kahar", "ਕਹਾਰ", "कहार"),
  opt("gadariya", "Gadariya", "ਗਡ਼ਰੀਆ", "गड़रिया"),
  opt("dhobi", "Dhobi", "ਧੋਬੀ", "धोबी"),
  opt("vishwakarma", "Vishwakarma", "ਵਿਸ਼ਵਕਰਮਾ", "विश्वकर्मा"),
];

export const SC_COMMUNITIES: BlaCommunityOption[] = [
  opt("chamar_jatav", "Chamar / Jatav", "ਚਮਾਰ / ਜਾਟਵ", "चमार / जाटव"),
  opt("ravidas", "Ravidas", "ਰਵਿਦਾਸ", "रविदास"),
  opt("valmiki_sc", "Valmiki", "ਵਾਲਮੀਕੀ", "वाल्मीकि"),
  opt("pasi_sc", "Pasi", "ਪਾਸੀ", "पासी"),
  opt("khatik_sc", "Khatik", "ਖਟੀਕ", "खटीक"),
  opt("dom", "Dom", "ਡੋਮ", "डोम"),
  opt("musahar", "Musahar", "ਮੁਸਹਰ", "मुसहर"),
  opt("dusadh_paswan", "Dusadh / Paswan", "ਦੁਸਾਧ / ਪਾਸਵਾਨ", "दुसाध / पासवान"),
  opt("bhangi", "Bhangi", "ਭੰਗੀ", "भंगी"),
  opt("mahar", "Mahar", "ਮਹਾਰ", "महार"),
];

const RELIGION_COMMUNITIES: Record<string, BlaCommunityOption[]> = {
  Hindu: HINDU_COMMUNITIES,
  Sikh: SIKH_COMMUNITIES,
  Muslim: MUSLIM_COMMUNITIES,
  Christian: CHRISTIAN_COMMUNITIES,
  Jain: JAIN_COMMUNITIES,
  Buddhist: BUDDHIST_COMMUNITIES,
  Other: OTHER_COMMUNITIES,
};

/** Community list for religion + reservation category (OBC/SC use dedicated lists). */
export function getBlaCommunityOptions(religion: string, casteCategory: string): BlaCommunityOption[] {
  if (casteCategory === "OBC" || casteCategory === "BC") return withOtherOption(OBC_COMMUNITIES);
  if (casteCategory === "SC") return withOtherOption(SC_COMMUNITIES);
  return withOtherOption(RELIGION_COMMUNITIES[religion] ?? OTHER_COMMUNITIES);
}

export function blaCommunityLabel(
  value: string,
  religion: string,
  casteCategory: string,
  language: Language,
): string {
  const parsed = parseBlaCommunityValue(value);
  if (parsed.select === BLA_COMMUNITY_OTHER_VALUE) {
    if (parsed.custom) return parsed.custom;
    return language === "hi"
      ? OTHER_COMMUNITY_OPTION.hi
      : language === "pa"
        ? OTHER_COMMUNITY_OPTION.pa
        : OTHER_COMMUNITY_OPTION.en;
  }
  const o = getBlaCommunityOptions(religion, casteCategory).find((c) => c.value === parsed.select);
  if (!o) return value;
  return language === "hi" ? o.hi : language === "pa" ? o.pa : o.en;
}
