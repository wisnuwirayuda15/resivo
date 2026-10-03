import { describe, expect, it } from "vitest";

import {
  DESCRIPTION_MAX,
  checkBody,
  checkCompiles,
  checkFences,
  checkFrontmatter,
  checkIncludes,
  checkUiLabels,
  checkLinks,
  checkMeta,
  checkParity,
  checkSlugs,
  pageFrom,
} from "./checks";
import {
  directiveSkeleton,
  fencesOf,
  headingsOf,
  slugOf,
  splitFrontmatter,
} from "./pages";

import type { DocsMeta, DocsPage, DocsTree } from "./pages";

/**
 * The rules, shown to fail.
 *
 * `content.test.ts` expects the real content to have no problems, which proves
 * only that the rules pass. Here each rule is given content that is wrong on
 * purpose and has to name the fault, so a rule that quietly stopped checking
 * anything would be caught instead of reading as a clean bill of health.
 */

const FRONT = `---\ntitle: A page\ndescription: What it is about.\n---\n`;

const page = (path: string, body = "Text.\n", lang = "en"): DocsPage =>
  pageFrom(lang, path, `${FRONT}${body}`);

const tree = (
  pages: Array<DocsPage>,
  metas: Array<DocsMeta> = [],
  lang = "en",
): DocsTree => ({ lang, pages, metas });

const meta = (folder: string, value: unknown, lang = "en"): DocsMeta => ({
  lang,
  folder,
  path: folder === "" ? "meta.json" : `${folder}/meta.json`,
  value,
});

describe("reading a page", () => {
  it("splits front matter from the body", () => {
    expect(splitFrontmatter(`${FRONT}Body`)).toEqual({
      frontmatter: { title: "A page", description: "What it is about." },
      body: "Body",
    });
    expect(splitFrontmatter("No header").frontmatter).toBeUndefined();
  });

  it("gives the docs home and a folder's index the slug of what they stand for", () => {
    expect(slugOf("index.mdx")).toBe("");
    expect(slugOf("format/overview.mdx")).toBe("format/overview");
    expect(slugOf("format/index.mdx")).toBe("format");
  });

  it("prefers an explicit id and falls back to the generated one", () => {
    const found = headingsOf(
      page("a.mdx", "## Hello World\n\n## Other [#custom]\n"),
    );

    expect(found.map((heading) => heading.id)).toEqual([
      "hello-world",
      "custom",
    ]);
    expect(found.map((heading) => heading.text)).toEqual([
      "Hello World",
      "Other",
    ]);
  });

  it("reads the language and the meta of a fence", () => {
    const [fence] = fencesOf(
      page("a.mdx", '```resume title="r.md" warns\n# A\n```\n'),
    );

    expect(fence?.language).toBe("resume");
    expect(fence?.meta).toBe('title="r.md" warns');
  });

  it("reduces an example to the directives it shows", () => {
    expect(
      directiveSkeleton(
        "# Ada\n\n::contact[ada@x.test]{icon=envelope}\n\n:::entry{start=2020-01}\nText :icon{name=star} here.\n:::\n",
      ),
    ).toEqual([
      "::contact{icon=envelope}",
      ":::entry{start=2020-01}",
      ":icon{name=star}",
    ]);
  });

  it("does not take an ordinary colon for a directive", () => {
    expect(directiveSkeleton("Note: at 10:30 see http://x.test")).toEqual([]);
  });
});

describe("checkFrontmatter", () => {
  it("accepts a title and a description", () => {
    expect(checkFrontmatter(page("a.mdx"))).toEqual([]);
  });

  it("names a missing description", () => {
    const bad = pageFrom("en", "a.mdx", "---\ntitle: A\n---\nText\n");

    expect(checkFrontmatter(bad).join()).toContain("description");
  });

  it("names a missing title and a missing block", () => {
    expect(
      checkFrontmatter(
        pageFrom("en", "a.mdx", "---\ndescription: d\n---\nx"),
      ).join(),
    ).toContain("title");
    expect(
      checkFrontmatter(pageFrom("en", "a.mdx", "x")).length,
    ).toBeGreaterThan(0);
  });

  it("refuses a description a search engine would cut", () => {
    const long = "x".repeat(DESCRIPTION_MAX + 1);
    const bad = pageFrom(
      "en",
      "a.mdx",
      `---\ntitle: A\ndescription: ${long}\n---\nx`,
    );

    expect(checkFrontmatter(bad).join()).toContain("description");
  });
});

describe("checkSlugs", () => {
  it("accepts lowercase ASCII and hyphens", () => {
    expect(checkSlugs(tree([page("format/entries-and-tags.mdx")]))).toEqual([]);
  });

  it("names a capital, a space and a non-ASCII letter", () => {
    for (const path of [
      "Format/a.mdx",
      "format/two words.mdx",
      "format/café.mdx",
    ]) {
      expect(checkSlugs(tree([page(path)])).length, path).toBe(1);
    }
  });
});

describe("checkBody", () => {
  it("names an h1", () => {
    expect(checkBody(page("a.mdx", "# Title\n")).join()).toContain("h1");
  });

  it("names a repeated heading id", () => {
    const problems = checkBody(
      page("a.mdx", "## Same\n\n## Same [#same-1]\n\n## Dup [#same-1]\n"),
    );

    expect(problems.join()).toContain("same-1");
  });

  it("accepts headings with distinct ids", () => {
    expect(checkBody(page("a.mdx", "## One\n\n## Two\n"))).toEqual([]);
  });
});

describe("checkCompiles", () => {
  it("accepts ordinary MDX", async () => {
    expect(
      await checkCompiles(
        page("a.mdx", "Text with `{braces}`.\n\n<Callout>x</Callout>\n"),
      ),
    ).toEqual([]);
  });

  it("names a stray brace, which MDX reads as an expression", async () => {
    const problems = await checkCompiles(
      page("a.mdx", "A directive {this is not js} in prose.\n"),
    );

    expect(problems.join()).toContain("does not compile");
  });

  it("names an unclosed tag", async () => {
    expect(
      (await checkCompiles(page("a.mdx", "<Callout>never closed\n"))).length,
    ).toBe(1);
  });
});

describe("checkMeta", () => {
  const home = page("index.mdx");
  const overview = page("format/overview.mdx");

  it("accepts a complete, ordered tree", () => {
    expect(
      checkMeta(
        tree(
          [home, overview],
          [
            meta("", { title: "Docs", pages: ["index", "format"] }),
            meta("format", { title: "Format", pages: ["overview"] }),
          ],
        ),
      ),
    ).toEqual([]);
  });

  it("names an entry that is not a page", () => {
    const problems = checkMeta(
      tree([home], [meta("", { title: "Docs", pages: ["index", "ghost"] })]),
    );

    expect(problems.join()).toContain('"ghost"');
  });

  it("names a page that is never listed", () => {
    const problems = checkMeta(
      tree(
        [home, overview],
        [
          meta("", { title: "Docs", pages: ["index", "format"] }),
          meta("format", { title: "Format", pages: [] }),
        ],
      ),
    );

    expect(problems.join()).toContain('"overview" exists but is not listed');
  });

  it("names a meta with no title", () => {
    expect(
      checkMeta(tree([home], [meta("", { pages: ["index"] })])).length,
    ).toBe(1);
  });

  it("lets separators through", () => {
    expect(
      checkMeta(
        tree(
          [home],
          [meta("", { title: "Docs", pages: ["index", "---Help---"] })],
        ),
      ),
    ).toEqual([]);
  });
});

describe("checkParity", () => {
  const meta1 = meta("", { title: "Docs", pages: ["index", "a"] });
  const base = (lang: string, a: string, extra = ""): DocsTree =>
    tree(
      [
        pageFrom(lang, "index.mdx", `${FRONT}${extra}`),
        pageFrom(lang, "a.mdx", `${FRONT}${a}`),
      ],
      [{ ...meta1, lang }],
      lang,
    );

  it("accepts two languages with the same shape and different words", () => {
    expect(
      checkParity(
        base("en", "## One [#one]\n\nWords.\n"),
        base("id", "## Satu [#one]\n\nKata.\n"),
      ),
    ).toEqual([]);
  });

  it("names a file that exists in one language only", () => {
    const missing = tree(
      [pageFrom("id", "index.mdx", FRONT)],
      [{ ...meta1, lang: "id" }],
      "id",
    );

    expect(checkParity(base("en", ""), missing).join()).toContain(
      "a.mdx is in en and not in id",
    );
  });

  it("names a sidebar that is ordered differently", () => {
    const other = base("id", "");

    other.metas = [
      { ...meta1, lang: "id", value: { title: "Docs", pages: ["a", "index"] } },
    ];

    expect(checkParity(base("en", ""), other).join()).toContain(
      "lists its pages differently",
    );
  });

  it("names headings that differ in depth or explicit id", () => {
    expect(
      checkParity(
        base("en", "## One [#one]\n"),
        base("id", "### Satu [#one]\n"),
      ).join(),
    ).toContain("headings differ");
    expect(
      checkParity(
        base("en", "## One [#one]\n"),
        base("id", "## Satu [#satu]\n"),
      ).join(),
    ).toContain("headings differ");
  });

  it("names components that differ", () => {
    expect(
      checkParity(
        base("en", "<Callout>x</Callout>\n"),
        base("id", "Plain.\n"),
      ).join(),
    ).toContain("components differ");
  });

  it("names a code block of another kind", () => {
    expect(
      checkParity(
        base("en", "```css verify\na{}\n```\n"),
        base("id", "```bash\nls\n```\n"),
      ).join(),
    ).toContain("code blocks differ");
  });

  it("names a css block that was edited in translation", () => {
    expect(
      checkParity(
        base("en", "```css verify\n.rp-name { color: red; }\n```\n"),
        base("id", "```css verify\n.rp-name { color: blue; }\n```\n"),
      ).join(),
    ).toContain("(css) is not identical");
  });

  it("lets a resume example have translated prose but not different directives", () => {
    const en = "```resume\n# Ada\n\n::contact[a@x.test]{icon=envelope}\n```\n";

    expect(
      checkParity(
        base("en", en),
        base(
          "id",
          "```resume\n# Budi\n\n::contact[b@x.test]{icon=envelope}\n```\n",
        ),
      ),
    ).toEqual([]);
    expect(
      checkParity(
        base("en", en),
        base(
          "id",
          "```resume\n# Budi\n\n::contact[b@x.test]{icon=phone}\n```\n",
        ),
      ).join(),
    ).toContain("different directives");
  });
});

describe("checkLinks", () => {
  const target = pageFrom(
    "en",
    "format/overview.mdx",
    `${FRONT}## Shape [#shape]\n\n## Generated heading\n`,
  );
  const home = (body: string) => pageFrom("en", "index.mdx", `${FRONT}${body}`);

  it("accepts the links a page may have", () => {
    const body = [
      "[external](https://example.com)",
      "[mail](mailto:a@b.test)",
      "[docs home](/docs)",
      "[page](/docs/format/overview)",
      "[heading](/docs/format/overview#shape)",
      "[app](/resumes)",
    ].join("\n\n");

    expect(checkLinks(tree([home(body), target]))).toEqual([]);
  });

  it("names a link to a page that does not exist", () => {
    expect(
      checkLinks(tree([home("[x](/docs/nowhere)"), target])).join(),
    ).toContain("is not a docs page");
  });

  it("names a link to a heading with no explicit id", () => {
    expect(
      checkLinks(
        tree([home("[x](/docs/format/overview#generated-heading)"), target]),
      ).join(),
    ).toContain("[#generated-heading]");
  });

  it("names an anchor that is not on the same page", () => {
    expect(checkLinks(tree([home("[x](#missing)"), target])).join()).toContain(
      "[#missing]",
    );
  });

  it("checks the href of a Card as well as a Markdown link", () => {
    expect(
      checkLinks(
        tree([home('<Card title="t" href="/docs/gone">x</Card>'), target]),
      ).join(),
    ).toContain("/docs/gone");
  });

  it("names a path that is neither the docs nor the app", () => {
    expect(
      checkLinks(tree([home("[x](/somewhere-else)"), target])).join(),
    ).toContain("neither a docs page nor an app page");
  });
});

describe("checkFences", () => {
  const fenced = (info: string, code: string) =>
    page("a.mdx", `\`\`\`${info}\n${code}\n\`\`\`\n`);

  it("accepts a clean resume block and one that is said to warn and does", () => {
    expect(
      checkFences(fenced("resume", "# Ada\n\n## Summary\n\nHello.")),
    ).toEqual([]);
    expect(
      checkFences(fenced("resume warns", "# Ada\n\n<div>raw</div>")),
    ).toEqual([]);
  });

  it("names a resume block the parser complains about", () => {
    expect(
      checkFences(fenced("resume", "# Ada\n\n<div>raw</div>")).join(),
    ).toContain("the parser warns");
  });

  it('names a block that says "warns" and has nothing wrong', () => {
    expect(
      checkFences(fenced("resume warns", "# Ada\n\nHello.")).join(),
    ).toContain("no complaint");
  });

  it("names a flag nobody defined", () => {
    expect(checkFences(fenced("resume wans", "# Ada")).join()).toContain(
      'unknown flag "wans"',
    );
  });

  it("accepts css that is kept and css that is refused, when it says which", () => {
    expect(
      checkFences(fenced("css verify", ".rp-name { color: red; }")),
    ).toEqual([]);
    expect(
      checkFences(
        fenced("css refused", '@import url("https://evil.test/x.css");'),
      ),
    ).toEqual([]);
  });

  it("names a css block that does not say what it expects", () => {
    expect(checkFences(fenced("css", "a { color: red; }")).join()).toContain(
      'exactly one of "verify" or "refused"',
    );
  });

  it("names css that is called safe and is not", () => {
    expect(
      checkFences(
        fenced("css verify", '@import url("https://evil.test/x.css");'),
      ).join(),
    ).toContain("does not keep it as written");
  });

  it("names css that is called refused and is kept whole", () => {
    expect(
      checkFences(fenced("css refused", "a { color: red; }")).join(),
    ).toContain("keeps all of it");
  });

  it("leaves other languages alone", () => {
    expect(checkFences(fenced("bash", "ls -la"))).toEqual([]);
    expect(checkFences(fenced("", "plain"))).toEqual([]);
  });
});

describe("checkUiLabels", () => {
  const labels = new Set(["New resume", "Saved"]);

  it("accepts bold text that is a label the app shows", () => {
    expect(
      checkUiLabels(
        page("a.mdx", "Choose **New resume**, then see **Saved**.\n"),
        labels,
      ),
    ).toEqual([]);
  });

  it("names bold text that is not one", () => {
    const problems = checkUiLabels(
      page("a.mdx", "Choose **New resumee** now.\n"),
      labels,
    );

    expect(problems).toHaveLength(1);
    expect(problems.join()).toContain('"New resumee" is in bold');
  });

  it("leaves italics and plain text alone", () => {
    expect(
      checkUiLabels(page("a.mdx", "An *emphasis* and plain text.\n"), labels),
    ).toEqual([]);
  });
});

describe("checkIncludes", () => {
  const withInclude = (path: string) =>
    page("a.mdx", `<include lang="text">${path}</include>\n`);

  it("accepts an include that points at a file that exists", () => {
    expect(
      checkIncludes(withInclude("../../../prompts/resume.md"), () => true),
    ).toEqual([]);
  });

  it("names an include whose file is missing", () => {
    const problems = checkIncludes(withInclude("../nope.md"), () => false);

    expect(problems).toHaveLength(1);
    expect(problems.join()).toContain(
      "includes ../nope.md, which does not exist",
    );
  });

  it("is quiet about a page with no include", () => {
    expect(checkIncludes(page("a.mdx"), () => false)).toEqual([]);
  });
});
