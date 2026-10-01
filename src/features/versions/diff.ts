/**
 * The longest common subsequence, and the word diff built on it.
 *
 * Written here rather than taken from a package: `diff` is in the lockfile only
 * as somebody else's dependency, and this is forty lines whose behaviour the
 * comparison depends on and a test pins down.
 */

/**
 * The index pairs of a longest common subsequence of two sequences.
 *
 * The textbook table, O(n m) in time and space. Every input here is a paragraph
 * or the list of sections in a resume, which is hundreds of items at the very
 * most, so the quadratic table is not a cost anyone will see.
 */
export const commonSubsequence = <TItem>(
  before: ReadonlyArray<TItem>,
  after: ReadonlyArray<TItem>,
  equals: (a: TItem, b: TItem) => boolean = (a, b) => a === b,
): Array<[number, number]> => {
  const rows = before.length + 1;
  const columns = after.length + 1;
  // Flat, so a long sequence is one allocation rather than a thousand arrays.
  const table = new Uint32Array(rows * columns);

  for (let row = before.length - 1; row >= 0; row -= 1) {
    for (let column = after.length - 1; column >= 0; column -= 1) {
      const a = before[row] as TItem;
      const b = after[column] as TItem;

      table[row * columns + column] = equals(a, b)
        ? (table[(row + 1) * columns + column + 1] ?? 0) + 1
        : Math.max(
            table[(row + 1) * columns + column] ?? 0,
            table[row * columns + column + 1] ?? 0,
          );
    }
  }

  const pairs: Array<[number, number]> = [];
  let row = 0;
  let column = 0;

  while (row < before.length && column < after.length) {
    if (equals(before[row] as TItem, after[column] as TItem)) {
      pairs.push([row, column]);
      row += 1;
      column += 1;
    } else if (
      (table[(row + 1) * columns + column] ?? 0) >=
      (table[row * columns + column + 1] ?? 0)
    ) {
      row += 1;
    } else {
      column += 1;
    }
  }

  return pairs;
};

export interface DiffPart {
  type: "same" | "added" | "removed";
  text: string;
}

/** Words and the white space between them, as separate tokens, so joining the
 * tokens of one side gives back that side exactly. */
const tokenize = (value: string): Array<string> =>
  value.match(/\s+|\S+/g) ?? [];

/**
 * Past this many tokens on either side the quadratic table is no longer free, and
 * a paragraph that long was rewritten rather than edited. It is reported as one
 * removal and one addition.
 */
const MAX_TOKENS = 3000;

const push = (parts: Array<DiffPart>, type: DiffPart["type"], text: string) => {
  if (text === "") {
    return;
  }

  const last = parts.at(-1);

  if (last?.type === type) {
    last.text += text;
  } else {
    parts.push({ type, text });
  }
};

/**
 * What changed between two strings, word by word.
 *
 * Joining the `same` and `removed` parts gives `before` and joining the `same`
 * and `added` parts gives `after`, which is what the tests hold it to and what
 * lets a screen show either side from one result.
 */
export const diffWords = (before: string, after: string): Array<DiffPart> => {
  const parts: Array<DiffPart> = [];

  if (before === after) {
    push(parts, "same", before);

    return parts;
  }

  const a = tokenize(before);
  const b = tokenize(after);

  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) {
    push(parts, "removed", before);
    push(parts, "added", after);

    return parts;
  }

  let row = 0;
  let column = 0;

  for (const [matchedRow, matchedColumn] of commonSubsequence(a, b)) {
    push(parts, "removed", a.slice(row, matchedRow).join(""));
    push(parts, "added", b.slice(column, matchedColumn).join(""));
    push(parts, "same", a[matchedRow] ?? "");
    row = matchedRow + 1;
    column = matchedColumn + 1;
  }

  push(parts, "removed", a.slice(row).join(""));
  push(parts, "added", b.slice(column).join(""));

  return parts;
};
