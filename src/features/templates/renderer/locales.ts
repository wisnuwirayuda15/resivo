/**
 * The languages a document can be written in.
 *
 * `meta.locale` has been in the model since the beginning and nothing could
 * change it, so every resume was permanently `en` and every date range could
 * only render in English. This is the list the style panel offers.
 *
 * It is deliberately not "every locale the browser knows". A resume renders one
 * word this app has to supply itself (the "present" of an ongoing role), and a
 * document set to a language whose word is missing would print English inside an
 * otherwise translated line. So the offered list is exactly the set with a
 * checked word, and adding a language means adding its word here.
 *
 * The schema accepts any BCP 47 tag, because a Markdown import or a restored
 * backup can legitimately carry one this list does not name. Such a value is
 * kept, shown, and formatted by `Intl` as usual; only its "present" falls back.
 */

interface DocumentLocale {
  /** BCP 47 language subtag. */
  value: string;
  /** Endonym first, since this is chosen by the person writing the document. */
  label: string;
  /** How an ongoing role's end is written on a resume in this language. */
  present: string;
}

export const DOCUMENT_LOCALES: ReadonlyArray<DocumentLocale> = [
  { value: "en", label: "English", present: "Present" },
  { value: "id", label: "Bahasa Indonesia", present: "Sekarang" },
  { value: "de", label: "Deutsch", present: "heute" },
  { value: "es", label: "Español", present: "Actualidad" },
  { value: "fr", label: "Français", present: "Présent" },
  { value: "it", label: "Italiano", present: "Presente" },
  { value: "nl", label: "Nederlands", present: "Heden" },
  { value: "pl", label: "Polski", present: "Obecnie" },
  { value: "pt", label: "Português", present: "Presente" },
  { value: "tr", label: "Türkçe", present: "Halen" },
  { value: "ja", label: "日本語", present: "現在" },
  { value: "ko", label: "한국어", present: "현재" },
  { value: "zh", label: "中文", present: "至今" },
];

/**
 * The word for an ongoing role, for a document's locale.
 *
 * Matched on the language subtag, so `pt-BR` and `en-GB` resolve like `pt` and
 * `en`. Falls back to English rather than to nothing: a blank there would read
 * as a missing end date, which says something different and untrue.
 */
export const presentLabel = (locale: string): string => {
  const language = locale.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  const match = DOCUMENT_LOCALES.find((entry) => entry.value === language);

  return match?.present ?? "Present";
};
