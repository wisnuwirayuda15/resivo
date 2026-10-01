import { sectionKindFromTitle } from "@/features/markdown/index";
import { formatDateRange } from "@/features/templates/renderer/dates";

import type {
  Block,
  InlineText,
  ListItem,
  ResumeDocument,
} from "@/features/resume/model/document";

/**
 * Plain text, in both directions.
 *
 * Writing it is a straight read of the document. Reading it is a guess, and the
 * guess is deliberately small: it recognises the handful of conventions a text
 * resume actually uses (a name on top, contacts under it, headings in capitals
 * or by their usual names, a bullet character) and turns them into Markdown,
 * which the one real parser then reads. There is no second parser here, so a
 * text file can never be understood differently from the same content typed into
 * the editor.
 */

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Inline text as a reader of a `.txt` would want it.
 *
 * A link is written as its label followed by the address in brackets, because
 * plain text has no links and the address is the part that is useful when the
 * label is "my portfolio". When the label already is the address it is not
 * repeated.
 */
const inline = (value: InlineText): string =>
  value
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text;

        case "link": {
          const label = inline(node.children);

          return label === node.href || label === ""
            ? node.href
            : `${label} (${node.href})`;
        }

        case "icon":
          return "";
      }
    })
    .join("");

const listLines = (
  items: Array<ListItem>,
  ordered: boolean,
  start: number,
  depth: number,
): Array<string> =>
  items.flatMap((item, index) => {
    const marker = ordered ? `${start + index}.` : "-";
    const own = `${"  ".repeat(depth)}${marker} ${inline(item.text)}`;

    return item.list === undefined
      ? [own]
      : [
          own,
          ...listLines(
            item.list.items,
            item.list.ordered === true,
            item.list.start ?? 1,
            depth + 1,
          ),
        ];
  });

const blockLines = (block: Block, locale: string): Array<string> => {
  switch (block.kind) {
    case "paragraph":
    case "heading":
      return [inline(block.text)];

    case "bulletList":
      return listLines(
        block.items,
        block.ordered === true,
        block.start ?? 1,
        0,
      );

    case "quote":
      return block.paragraphs.map((paragraph) => inline(paragraph));

    case "code":
      return block.code.split("\n");

    case "table":
      return [block.head, ...block.rows].map((row) =>
        row.map((cell) => inline(cell)).join(" | "),
      );

    case "entry": {
      const dates = formatDateRange(block.dateRange, locale);
      const head = [block.title, block.subtitle, block.location]
        .map((part) => (part === undefined ? "" : inline(part)))
        .filter((part) => part !== "")
        .join(", ");

      return [
        [head, dates === "" ? "" : `(${dates})`]
          .filter((part) => part !== "")
          .join(" "),
        ...(block.summary === undefined ? [] : [inline(block.summary)]),
        ...block.bullets.map((bullet) => `- ${inline(bullet)}`),
      ].filter((line) => line !== "");
    }

    case "tagList":
      return [block.tags.join(", ")];

    case "iconLabel":
      return [inline(block.label)];

    case "raw":
      return block.markdown.split("\n");

    // A picture, a rule and a page break have no plain text.
    case "image":
    case "divider":
    case "pageBreak":
      return [];
  }
};

/**
 * A document as text: name, headline, contacts, then each visible section under
 * its title in capitals, with a blank line between blocks that are paragraphs
 * and none inside a list or an entry's bullets.
 */
export const toPlainText = (document: ResumeDocument): string => {
  const { header, sections } = document.content;
  const { locale } = document.meta;
  const out: Array<string> = [];

  out.push(inline(header.name));

  if (header.headline !== undefined && inline(header.headline) !== "") {
    out.push(inline(header.headline));
  }

  const contacts = header.contacts
    .map((contact) => inline(contact.label))
    .filter((label) => label !== "");

  if (contacts.length > 0) {
    out.push(contacts.join(" | "));
  }

  for (const section of sections) {
    if (section.hidden === true) {
      continue;
    }

    out.push("", inline(section.title).toLocaleUpperCase(locale));

    for (const [index, block] of section.blocks.entries()) {
      const lines = blockLines(block, locale);

      if (lines.length === 0) {
        continue;
      }

      // Entries are separated from one another, and so are paragraphs, which is
      // how a text resume is laid out. The first block hugs the title.
      if (index > 0) {
        out.push("");
      }

      out.push(...lines);
    }
  }

  return `${out.join("\n").trimEnd()}\n`;
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{7,}$/;
const URL_LIKE =
  /^(?:https?:\/\/|www\.)\S+$|^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i;
/**
 * The en dash is built rather than typed, because a literal one anywhere in the
 * source is what `dashes.test.ts` forbids, and a bullet is the one place this
 * file has a reason to mean it.
 */
const EN_DASH = String.fromCodePoint(0x2013);
const BULLET = new RegExp(`^\\s*[•▪◦●·*${EN_DASH}-]\\s+`, "u");
const RULE_LINE = /^\s*[-=_*]{3,}\s*$/;

/** Characters that would end a directive's label or attribute early. */
const unbracket = (value: string): string => value.replace(/[[\]{}"\\]/g, "");

/** Markdown that a plain line could be mistaken for. */
const escapeLine = (line: string): string =>
  line
    .replace(/[\\*`<[\]]/g, (character) => `\\${character}`)
    .replace(/^([#>+])/, "\\$1");

const contactDirective = (piece: string): string | undefined => {
  const label = unbracket(piece.trim());

  if (label === "") {
    return undefined;
  }

  if (EMAIL.test(label)) {
    return `::contact[${label}]{icon="envelope" href="mailto:${label}"}`;
  }

  if (PHONE.test(label) && label.replace(/\D/g, "").length >= 7) {
    return `::contact[${label}]{icon="phone"}`;
  }

  if (URL_LIKE.test(label)) {
    const href = /^https?:\/\//i.test(label) ? label : `https://${label}`;
    const icon = /github\.com/i.test(label)
      ? "github-logo"
      : /linkedin\.com/i.test(label)
        ? "linkedin-logo"
        : "globe";

    return `::contact[${label.replace(/^https?:\/\//i, "")}]{icon="${icon}" href="${href}"}`;
  }

  return undefined;
};

const isRule = (line: string): boolean => RULE_LINE.test(line);

/**
 * Whether a line is a section heading.
 *
 * A name the format knows ("Experience", "Pengalaman Kerja"), or a short line in
 * capitals with no digits, which is how a text resume sets a heading apart when
 * it has nothing else to do it with. A trailing colon is allowed. A line that
 * ends a sentence is not a heading however loud it is.
 */
const isHeading = (line: string): boolean => {
  const title = line.replace(/[:：]\s*$/, "").trim();

  if (title.length < 2 || title.length > 40 || BULLET.test(line)) {
    return false;
  }

  if (sectionKindFromTitle(title) !== "custom") {
    return true;
  }

  return (
    /\p{L}/u.test(title) &&
    title === title.toLocaleUpperCase() &&
    !/[0-9@/|,.!?]/.test(title)
  );
};

const titleCase = (title: string): string =>
  title === title.toLocaleUpperCase()
    ? title
        .toLocaleLowerCase()
        .replace(
          /(^|\s)(\p{L})/gu,
          (_, space: string, letter: string) =>
            `${space}${letter.toLocaleUpperCase()}`,
        )
    : title;

/**
 * Plain text as Markdown the codec reads.
 *
 * The first line is the name. Everything between it and the first heading is the
 * header: pieces that are an email, a phone number or an address become
 * contacts, the first line that is none of those is the headline, and any later
 * one is read as a place. After that a heading line opens a section, a bullet
 * character opens a list item, and every other line is its own paragraph, with
 * an indented line under a bullet taken as that bullet's wrapped continuation.
 *
 * It does not try to find entries: "Role, Company (dates)" is a paragraph, and
 * the Markdown pane is one click away for someone who wants it as an entry.
 */
export const textToMarkdown = (source: string): string => {
  const lines = source
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n")
    .map((line) => line.trimEnd());

  const first = lines.findIndex((line) => line.trim() !== "");

  if (first === -1) {
    return "";
  }

  const name = escapeLine((lines[first] ?? "").trim());
  const rest = lines.slice(first + 1);
  const firstHeading = rest.findIndex((line, index) => {
    // A line is underlined if the next one is a rule, which makes the line a
    // heading whatever it says.
    const underlined = isRule(rest[index + 1] ?? "") && line.trim() !== "";

    return line.trim() !== "" && (underlined || isHeading(line));
  });

  // With no heading to end it, the header is the first run of lines, up to the
  // first blank one. Without that a file with no sections at all would have
  // every line of it read as a contact.
  const firstBlank = rest.findIndex(
    (line, index) =>
      line.trim() === "" && rest.slice(0, index).some((l) => l.trim() !== ""),
  );
  const zoneEnd =
    firstHeading !== -1
      ? firstHeading
      : firstBlank === -1
        ? rest.length
        : firstBlank;

  const headerLines = rest.slice(0, zoneEnd);
  /** Header lines that turned out to be neither a contact, the headline nor a
   * place, which belong to the body. */
  const overflow: Array<string> = [];

  let headline: string | undefined;
  const contacts: Array<string> = [];

  for (const line of headerLines) {
    if (line.trim() === "" || isRule(line)) {
      continue;
    }

    const pieces = line
      .split(/\s*[|•·●]\s*|\s{3,}/)
      .filter((piece) => piece.trim() !== "");
    const contactPieces = pieces.map((piece) => contactDirective(piece));
    const isContactLine = contactPieces.some((piece) => piece !== undefined);

    if (isContactLine) {
      pieces.forEach((piece, index) => {
        const directive = contactPieces[index];

        if (directive !== undefined) {
          contacts.push(directive);
        } else {
          const label = unbracket(piece.trim());

          contacts.push(`::contact[${label}]{icon="map-pin"}`);
        }
      });
    } else if (headline === undefined && pieces.length === 1) {
      headline = escapeLine(line.trim());
    } else if (line.includes(",") && line.trim().length <= 60) {
      contacts.push(`::contact[${unbracket(line.trim())}]{icon="map-pin"}`);
    } else {
      overflow.push(line);
    }
  }

  const bodyLines = [...overflow, ...rest.slice(zoneEnd)];

  const out: Array<string> = [`# ${name}`, ""];

  if (headline !== undefined) {
    out.push(headline, "");
  }

  if (contacts.length > 0) {
    out.push(...contacts, "");
  }

  let previousWasBullet = false;

  for (const [index, line] of bodyLines.entries()) {
    const trimmed = line.trim();

    if (trimmed === "" || isRule(line)) {
      previousWasBullet = false;
      continue;
    }

    const underlined = isRule(bodyLines[index + 1] ?? "");

    if (underlined || isHeading(line)) {
      out.push(
        "",
        `## ${escapeLine(titleCase(trimmed.replace(/[:：]\s*$/, "")))}`,
        "",
      );
      previousWasBullet = false;
      continue;
    }

    if (BULLET.test(line)) {
      // A blank line before the first item of a run, none between items.
      if (!previousWasBullet) {
        out.push("");
      }

      out.push(`- ${escapeLine(line.replace(BULLET, ""))}`);
      previousWasBullet = true;
      continue;
    }

    // Indented under a bullet, so the bullet's own wrapped line.
    if (previousWasBullet && /^\s{2,}/.test(line)) {
      const last = out.length - 1;

      out[last] = `${out[last] ?? ""} ${escapeLine(trimmed)}`;
      continue;
    }

    out.push("", escapeLine(trimmed));
    previousWasBullet = false;
  }

  return `${out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
};
