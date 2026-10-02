/**
 * The words around the documentation, not in it: the docs' own header, sidebar
 * and error screens. The pages themselves are MDX under `content/docs/<lang>`,
 * which is the one place prose does not go through `t()`.
 */
export const docs = {
  title: "Documentation",
  notFound: {
    title: "That page is not in the documentation",
    body: "It may have moved, or the link may be wrong. The documentation home lists everything there is.",
    home: "Documentation home",
  },
} as const;
