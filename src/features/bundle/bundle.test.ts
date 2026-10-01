import "fake-indexeddb/auto";

import { strToU8, unzipSync, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __setDbForTesting, getDb } from "@/database/db";
import { AssetRejected } from "@/features/assets/readImage";
import { exportHtml } from "@/features/export/html";
import { inlineFonts, inlineImages } from "@/features/export/inline";
import {
  documentFontIds,
  documentImageIds,
} from "@/features/assets/references";
import { createEmptyDocument } from "@/features/resume/model/index";
import { createSampleDocument } from "@/features/resume/sample";
import { hashBlob } from "@/lib/hash";
import { createId } from "@/lib/id";

import { buildResumeBundle } from "./exportBundle";
import {
  BUNDLE_KIND,
  BUNDLE_LIMITS,
  BUNDLE_VERSION,
  BundleRejected,
} from "./format";
import { readResumeBundle, restoreResumeBundle } from "./importBundle";

import type { ResivoDB } from "@/database/db";
import type { ResumeDocument } from "@/features/resume/model/document";
import type { BundleReaders } from "./importBundle";

/**
 * The resume bundle, against a real IndexedDB and a real zip.
 *
 * The claim worth testing is the one the feature is for: a resume exported and
 * imported somewhere else is the same resume, down to the HTML it exports. The
 * rest is about what a hostile or damaged file is allowed to cost, which is a
 * message and never a row.
 */

let db: ResivoDB;

beforeEach(() => {
  db = __setDbForTesting(`resivo-bundle-test-${createId()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const NOW = 1_700_000_000_000;

/** A 1x1 PNG. The tests never decode it, see `READERS`. */
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (character) => character.charCodeAt(0),
);

/**
 * Readers that vouch for what they are given. Decoding an image needs
 * `createImageBitmap` and checking a font needs `FontFace`, both browser-only,
 * so the end to end spec covers the real ones and these cover everything round
 * them.
 */
const READERS: BundleReaders = {
  image: (file) =>
    Promise.resolve({ name: file.name, blob: file, width: 1, height: 1 }),
  font: (file) =>
    Promise.resolve({
      family: "Probe",
      weight: 400,
      style: "normal",
      blob: file,
      format: "woff2",
    }),
};

/** A resume that uses every kind of thing a bundle has to carry. */
const seedResume = async (): Promise<{
  title: string;
  document: ResumeDocument;
}> => {
  const image = {
    id: "img-1",
    name: "portrait",
    blob: new Blob([PNG], { type: "image/png" }),
    mime: "image/png",
    width: 1,
    height: 1,
    size: PNG.byteLength,
    hash: "",
    createdAt: 0,
  };

  image.hash = await hashBlob(image.blob);
  await db.images.add(image);

  await db.fonts.add({
    id: "font-1",
    family: "Custom Serif",
    weight: 400,
    style: "normal",
    format: "woff2",
    blob: new Blob([new Uint8Array([0x77, 0x4f, 0x46, 0x32, 1, 2, 3])]),
    size: 7,
    createdAt: 0,
  });

  const document = createSampleDocument("modern");

  document.content.header.avatarImageId = "img-1";
  document.design.typography.bodyFont = {
    family: "Custom Serif",
    source: "custom",
    fontId: "font-1",
  };
  document.design.colors.accent = "#123456";
  document.customCss = ".rp-name { letter-spacing: 0.1em; }";

  return { title: "For Acme", document };
};

const bundleOf = async (resume: { title: string; document: ResumeDocument }) =>
  buildResumeBundle(resume, NOW);

/**
 * The HTML export, as `buildExportHtml` makes it but without the built-in
 * typefaces, which are read through `window` and are the same on both sides.
 * Everything that comes from the stored assets is in it.
 */
const exported = async (
  document: ResumeDocument,
  title: string,
): Promise<string> =>
  exportHtml({
    document,
    title,
    images: await inlineImages(documentImageIds(document)),
    fonts: await inlineFonts(documentFontIds(document)),
  });

/** A fresh, empty device. */
const newDevice = async (): Promise<void> => {
  db.close();
  db = __setDbForTesting(`resivo-bundle-test-${createId()}`);
};

describe("a bundle", () => {
  it("holds the files a person would expect, and only those", async () => {
    const resume = await seedResume();
    const files = unzipSync(
      new Uint8Array(await (await bundleOf(resume)).arrayBuffer()),
    );

    expect(Object.keys(files).sort()).toEqual([
      "fonts/font-1.woff2",
      "images/img-1.png",
      "manifest.json",
      "resume.json",
      "resume.md",
    ]);
    expect(files["images/img-1.png"]).toEqual(PNG);

    const manifest = JSON.parse(
      new TextDecoder().decode(files["manifest.json"]),
    ) as { kind: string; version: number };

    expect(manifest.kind).toBe(BUNDLE_KIND);
    expect(manifest.version).toBe(BUNDLE_VERSION);
  });

  it("leaves out assets the document does not use", async () => {
    const resume = await seedResume();

    await db.images.add({
      id: "other",
      name: "other",
      blob: new Blob([new Uint8Array([9, 9, 9])], { type: "image/png" }),
      mime: "image/png",
      width: 1,
      height: 1,
      size: 3,
      hash: "h",
      createdAt: 0,
    });

    const names = Object.keys(
      unzipSync(new Uint8Array(await (await bundleOf(resume)).arrayBuffer())),
    );

    expect(names).not.toContain("images/other.png");
  });

  it("imports as the same resume: the same document, the same export, the same bytes", async () => {
    const resume = await seedResume();
    const before = await exported(resume.document, resume.title);
    const blob = await bundleOf(resume);

    await newDevice();

    const parsed = await readResumeBundle(blob, READERS);
    const { resume: restored, report } = await restoreResumeBundle(parsed);

    expect(report).toEqual({
      imagesAdded: 1,
      imagesAlreadyPresent: 0,
      fontsAdded: 1,
      fontsAlreadyPresent: 0,
    });
    expect(restored.title).toBe("For Acme");
    expect(restored.document.templateId).toBe("modern");
    expect(restored.document.customCss).toBe(resume.document.customCss);
    expect(restored.document.design).toEqual(resume.document.design);
    expect(restored.document.content).toEqual(resume.document.content);

    const after = await exported(restored.document, restored.title);

    // Not just similar: the same file, down to the inlined image and font.
    expect(after).toBe(before);

    const stored = await getDb().images.toArray();

    expect(stored).toHaveLength(1);
    expect(await hashBlob(stored[0]?.blob ?? new Blob())).toBe(
      await hashBlob(new Blob([PNG])),
    );
  });

  it("shares assets between imports of the same bundle and makes a new resume each time", async () => {
    const blob = await bundleOf(await seedResume());

    await newDevice();

    const first = await restoreResumeBundle(
      await readResumeBundle(blob, READERS),
    );
    const second = await restoreResumeBundle(
      await readResumeBundle(blob, READERS),
    );

    expect(second.report).toMatchObject({
      imagesAdded: 0,
      imagesAlreadyPresent: 1,
      fontsAdded: 0,
      fontsAlreadyPresent: 1,
    });
    expect(second.resume.id).not.toBe(first.resume.id);
    expect(await getDb().resumes.count()).toBe(2);
    expect(await getDb().images.count()).toBe(1);
    expect(await getDb().fonts.count()).toBe(1);
    // Both documents point at the one stored row.
    expect(second.resume.document.content.header.avatarImageId).toBe(
      first.resume.document.content.header.avatarImageId,
    );
  });

  it("rewrites references when an image's id is already taken here", async () => {
    const blob = await bundleOf(await seedResume());

    await newDevice();
    // A different image under the same id, so the bundle's must be renumbered.
    await db.images.add({
      id: "img-1",
      name: "someone else's",
      blob: new Blob([new Uint8Array([5, 5, 5])], { type: "image/png" }),
      mime: "image/png",
      width: 1,
      height: 1,
      size: 3,
      hash: "different",
      createdAt: 0,
    });

    const { resume } = await restoreResumeBundle(
      await readResumeBundle(blob, READERS),
    );
    const avatar = resume.document.content.header.avatarImageId;

    expect(avatar).toBeDefined();
    expect(avatar).not.toBe("img-1");
    expect((await getDb().images.get(avatar ?? ""))?.name).toBe("portrait");
    expect((await getDb().images.get("img-1"))?.name).toBe("someone else's");
  });

  it("carries the job a version was written for, and not the link to a base", async () => {
    const target = {
      company: "Acme",
      role: "Analyst",
      url: "https://acme.example/1",
    };
    const blob = await buildResumeBundle(
      { title: "For Acme", document: createEmptyDocument(), target },
      NOW,
    );

    await newDevice();

    const { resume } = await restoreResumeBundle(
      await readResumeBundle(blob, READERS),
    );

    expect(resume.target).toEqual(target);
    expect(resume).not.toHaveProperty("baseId");
  });

  it("reads a bundle written before versions existed, which has no target", async () => {
    const blob = await bundleOf({
      title: "old",
      document: createEmptyDocument(),
    });

    expect((await readResumeBundle(blob, READERS)).target).toBeUndefined();
  });

  it("does not take a group it was not given, or one this device lacks", async () => {
    const blob = await bundleOf({
      title: "x",
      document: createEmptyDocument(),
    });

    await newDevice();

    const parsed = await readResumeBundle(blob, READERS);
    const { resume } = await restoreResumeBundle(parsed, {
      groupId: "nowhere",
      title: "Renamed",
    });

    expect(resume.groupId).toBe("");
    expect(resume.title).toBe("Renamed");
  });

  it("migrates a document from an older format on the way in", async () => {
    const document = createEmptyDocument();
    const old = {
      ...document,
      schemaVersion: 1,
      content: {
        ...document.content,
        sections: [
          {
            id: "s",
            kind: "custom",
            title: [{ type: "text", text: "Notes" }],
            blocks: [
              {
                id: "b",
                kind: "bulletList",
                // The version 1 shape: items were bare inline runs.
                items: [[{ type: "text", text: "one" }]],
              },
            ],
          },
        ],
      },
    };

    const blob = await bundleOf({ title: "old", document });
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const resumeJson = JSON.parse(
      new TextDecoder().decode(files["resume.json"]),
    ) as { document: unknown };

    resumeJson.document = old;
    files["resume.json"] = strToU8(JSON.stringify(resumeJson));

    const parsed = await readResumeBundle(new Blob([zipSync(files)]), READERS);
    const block = parsed.document.content.sections[0]?.blocks[0];

    expect(parsed.document.schemaVersion).toBeGreaterThan(1);
    expect(block).toMatchObject({
      kind: "bulletList",
      items: [{ text: [{ type: "text", text: "one" }] }],
    });
  });

  it("says when the template has changed since the bundle was written", async () => {
    const blob = await bundleOf({
      title: "x",
      document: createEmptyDocument("bold"),
    });
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const manifest = JSON.parse(
      new TextDecoder().decode(files["manifest.json"]),
    ) as { template: { version: number } };

    expect(
      (await readResumeBundle(blob, READERS)).templateChanged,
    ).toBeUndefined();

    manifest.template.version = 0;
    files["manifest.json"] = strToU8(JSON.stringify(manifest));

    expect(
      (await readResumeBundle(new Blob([zipSync(files)]), READERS))
        .templateChanged,
    ).toEqual({ from: 0, to: 1 });
  });
});

/** The bytes of a zip that is made by hand, so each refusal can be provoked. */
const zipped = (entries: Record<string, string | Uint8Array>): Blob =>
  new Blob([
    zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [
          name,
          typeof value === "string" ? strToU8(value) : value,
        ]),
      ),
    ),
  ]);

const MANIFEST = JSON.stringify({
  kind: BUNDLE_KIND,
  version: BUNDLE_VERSION,
  createdAt: NOW,
  template: { id: "classic", version: 1 },
});

const resumeJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    title: "x",
    document: createEmptyDocument(),
    images: [],
    fonts: [],
    ...overrides,
  });

const keyOf = async (blob: Blob, readers = READERS): Promise<string> => {
  try {
    await readResumeBundle(blob, readers);
  } catch (error) {
    return error instanceof BundleRejected || error instanceof AssetRejected
      ? error.key
      : `other: ${String(error)}`;
  }

  return "accepted";
};

/** Nothing was written, whatever the file was. */
const expectEmpty = async (): Promise<void> => {
  expect(await getDb().resumes.count()).toBe(0);
  expect(await getDb().images.count()).toBe(0);
  expect(await getDb().fonts.count()).toBe(0);
};

describe("a file that is not a good bundle", () => {
  it.each([
    [
      "not an archive",
      new Blob([strToU8("hello, this is not a zip")]),
      "library:bundle.rejected.notZip",
    ],
    ["an empty archive", zipped({}), "library:bundle.rejected.missing"],
    [
      "a zip with no manifest",
      zipped({ "resume.json": resumeJson() }),
      "library:bundle.rejected.missing",
    ],
    [
      "another kind of zip",
      zipped({
        "manifest.json": JSON.stringify({ kind: "something.else", version: 1 }),
        "resume.json": resumeJson(),
      }),
      "library:bundle.rejected.notBundle",
    ],
    [
      "a bundle from a newer build",
      zipped({
        "manifest.json": JSON.stringify({
          kind: BUNDLE_KIND,
          version: BUNDLE_VERSION + 1,
          createdAt: NOW,
          template: { id: "classic", version: 1 },
        }),
        "resume.json": resumeJson(),
      }),
      "library:bundle.rejected.newer",
    ],
    [
      "a resume.json that is not JSON",
      zipped({ "manifest.json": MANIFEST, "resume.json": "{ nope" }),
      "library:bundle.rejected.unreadable",
    ],
    [
      "a resume.json of the wrong shape",
      zipped({
        "manifest.json": MANIFEST,
        "resume.json": JSON.stringify({ title: 1 }),
      }),
      "library:bundle.rejected.unreadable",
    ],
    [
      "a document that does not validate",
      zipped({
        "manifest.json": MANIFEST,
        "resume.json": resumeJson({ document: { schemaVersion: 2 } }),
      }),
      "library:bundle.rejected.document",
    ],
    [
      "a document from a newer format",
      zipped({
        "manifest.json": MANIFEST,
        "resume.json": resumeJson({
          document: { ...createEmptyDocument(), schemaVersion: 999 },
        }),
      }),
      "library:bundle.rejected.document",
    ],
  ])("refuses %s, and writes nothing", async (_name, blob, key) => {
    expect(await keyOf(blob)).toBe(key);
    await expectEmpty();
  });

  const withImage = (bytes: Uint8Array, hash?: string) =>
    zipped({
      "manifest.json": MANIFEST,
      "resume.json": resumeJson({
        images: [
          {
            id: "i",
            file: "images/i.png",
            name: "i",
            mime: "image/png",
            width: 1,
            height: 1,
            hash: hash ?? "0".repeat(64),
          },
        ],
      }),
      "images/i.png": bytes,
    });

  it("refuses an image listed but not in the archive", async () => {
    const blob = zipped({
      "manifest.json": MANIFEST,
      "resume.json": resumeJson({
        images: [
          {
            id: "i",
            file: "images/gone.png",
            name: "i",
            mime: "image/png",
            width: 1,
            height: 1,
            hash: "0".repeat(64),
          },
        ],
      }),
    });

    expect(await keyOf(blob)).toBe("library:bundle.rejected.missing");
    await expectEmpty();
  });

  it("refuses an image whose bytes do not match the checksum it carries", async () => {
    expect(await keyOf(withImage(PNG, "a".repeat(64)))).toBe(
      "library:bundle.rejected.corrupt",
    );
    await expectEmpty();
  });

  it("refuses an image the reader cannot decode", async () => {
    const hash = await hashBlob(new Blob([PNG]));
    const refusing: BundleReaders = {
      ...READERS,
      image: () =>
        Promise.reject(
          new AssetRejected("no", "assets:rejected.image.notDecodable"),
        ),
    };

    expect(await keyOf(withImage(PNG, hash), refusing)).toBe(
      "assets:rejected.image.notDecodable",
    );
    await expectEmpty();
  });

  it("refuses a file path that tries to leave the archive", () => {
    const blob = zipped({
      "manifest.json": MANIFEST,
      "resume.json": resumeJson({
        images: [
          {
            id: "i",
            file: "images/../../evil.png",
            name: "i",
            mime: "image/png",
            width: 1,
            height: 1,
            hash: "0".repeat(64),
          },
        ],
      }),
    });

    return expect(keyOf(blob)).resolves.toBe(
      "library:bundle.rejected.unreadable",
    );
  });

  it("ignores entries it has no use for, and never reads them", async () => {
    const blob = zipped({
      "manifest.json": MANIFEST,
      "resume.json": resumeJson(),
      "../escape.txt": "outside",
      "images/nested/deep.png": "x",
      "resume.md": "# edited by hand, and never read back",
      "notes.txt": "anything",
    });

    expect(await keyOf(blob)).toBe("accepted");
  });

  it("refuses an entry that declares more than the limit, before inflating it", async () => {
    const big = new Uint8Array(BUNDLE_LIMITS.entryBytes + 1);

    expect(
      await keyOf(
        zipped({
          "manifest.json": MANIFEST,
          "resume.json": resumeJson(),
          "images/big.png": big,
        }),
      ),
    ).toBe("library:bundle.rejected.entryTooLarge");
  });

  it("refuses an archive of more entries than a resume could have", async () => {
    const entries: Record<string, string> = {
      "manifest.json": MANIFEST,
      "resume.json": resumeJson(),
    };

    for (let index = 0; index <= BUNDLE_LIMITS.entries; index += 1) {
      entries[`images/${index}.png`] = "x";
    }

    expect(await keyOf(zipped(entries))).toBe(
      "library:bundle.rejected.tooManyEntries",
    );
  });

  it("refuses a file larger than any bundle without reading it", async () => {
    const huge = { size: BUNDLE_LIMITS.totalBytes + 1 } as Blob;

    expect(await keyOf(huge)).toBe("library:bundle.rejected.tooLarge");
  });
});
