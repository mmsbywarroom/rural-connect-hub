import { TranslationServiceClient } from "@google-cloud/translate";

let translationClient: TranslationServiceClient | null = null;
let projectId: string | null = null;

function getClient(): TranslationServiceClient | null {
  if (translationClient) return translationClient;
  try {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) return null;
    const credentials = JSON.parse(keyJson);
    projectId = credentials.project_id;
    translationClient = new TranslationServiceClient({ credentials });
    return translationClient;
  } catch (e) {
    console.error("Failed to initialize translation client:", e);
    return null;
  }
}

export async function transliterateTexts(
  texts: string[],
  targetLang: "hi" | "pa"
): Promise<string[]> {
  const client = getClient();
  if (!client || !projectId) {
    return texts;
  }

  const langCode = targetLang === "hi" ? "hi" : "pa";
  const MARKER_START = "###";
  const MARKER_END = "%%%";

  const wrappedTexts = texts.map(
    (t) => `${MARKER_START}${t}${MARKER_END}`
  );

  try {
    const [response] = await client.translateText({
      parent: `projects/${projectId}/locations/global`,
      contents: wrappedTexts,
      mimeType: "text/plain",
      sourceLanguageCode: "en",
      targetLanguageCode: langCode,
      transliterationConfig: {
        enableTransliteration: true,
      },
    });

    return (
      response.translations?.map((t, i) => {
        let result = t.translatedText || texts[i];
        result = result.replace(MARKER_START, "").replace(MARKER_END, "").trim();
        if (!result || result === texts[i]) {
          return texts[i];
        }
        return result;
      }) || texts
    );
  } catch (e) {
    console.error("Transliteration API error, falling back to translate:", e);
    try {
      const sentenceTexts = texts.map(
        (t) => `The place called ${t} is located in Punjab.`
      );
      const [response] = await client.translateText({
        parent: `projects/${projectId}/locations/global`,
        contents: sentenceTexts,
        mimeType: "text/plain",
        sourceLanguageCode: "en",
        targetLanguageCode: langCode,
      });

      return (
        response.translations?.map((t, i) => {
          const translated = t.translatedText || "";
          const match = extractTransliteratedName(translated, langCode);
          return match || texts[i];
        }) || texts
      );
    } catch (e2) {
      console.error("Fallback translation also failed:", e2);
      return texts;
    }
  }
}

function extractTransliteratedName(sentence: string, lang: string): string | null {
  if (lang === "hi") {
    const match = sentence.match(/(?:नामक स्थान|नाम(?:क)?)\s*(.+?)(?:\s*(?:पंजाब|में|है|स्थित))/);
    if (match) return match[1].trim();
    const parts = sentence.split(/\s+/);
    for (const part of parts) {
      if (/[\u0900-\u097F]/.test(part) && !/^(?:नामक|स्थान|पंजाब|में|स्थित|है|जिसका|नाम|एक|का|की|के)$/.test(part)) {
        return part;
      }
    }
  }
  if (lang === "pa") {
    const match = sentence.match(/(?:ਨਾਮ(?:ਕ)?)\s*(.+?)(?:\s*(?:ਪੰਜਾਬ|ਵਿੱਚ|ਹੈ|ਸਥਿਤ))/);
    if (match) return match[1].trim();
    const parts = sentence.split(/\s+/);
    for (const part of parts) {
      if (/[\u0A00-\u0A7F]/.test(part) && !/^(?:ਨਾਮ|ਨਾਮਕ|ਸਥਾਨ|ਪੰਜਾਬ|ਵਿੱਚ|ਸਥਿਤ|ਹੈ|ਜਿਸਦਾ|ਇੱਕ|ਦਾ|ਦੀ|ਦੇ)$/.test(part)) {
        return part;
      }
    }
  }
  return null;
}

export async function translateTexts(
  texts: string[],
  targetLang: "hi" | "pa"
): Promise<string[]> {
  const client = getClient();
  if (!client || !projectId) {
    return texts;
  }

  const langCode = targetLang === "hi" ? "hi" : "pa";

  try {
    const [response] = await client.translateText({
      parent: `projects/${projectId}/locations/global`,
      contents: texts,
      mimeType: "text/plain",
      sourceLanguageCode: "en",
      targetLanguageCode: langCode,
    });

    return (
      response.translations?.map(
        (t, i) => t.translatedText || texts[i]
      ) || texts
    );
  } catch (e) {
    console.error("Translation API error:", e);
    return texts;
  }
}

export async function translateBatch(
  items: { id: string; text: string }[],
  targetLang: "hi" | "pa",
  useTransliteration: boolean = false
): Promise<Map<string, string>> {
  const texts = items.map((i) => i.text);
  const translated = useTransliteration
    ? await transliterateTexts(texts, targetLang)
    : await translateTexts(texts, targetLang);
  const result = new Map<string, string>();
  items.forEach((item, i) => {
    result.set(item.id, translated[i]);
  });
  return result;
}
