import type { FlowItem } from "./flow";
import type { ResolvedTemplate } from "@/features/templates/registry";
import type { RenderContext } from "@/features/templates/renderer/types";
import type {
  Block,
  ResumeDocument,
  Section,
} from "@/features/resume/model/document";

/**
 * Turning a flattened flow into template-rendered nodes.
 *
 * This is the template renderer: the one place that maps `documentFlow`'s items
 * onto a template's three components. It is deliberately separate from the
 * paginated view, because the same mapping has to serve both the on-screen
 * preview and the HTML export, and a second implementation for export would be
 * a second thing that could disagree with what was measured.
 *
 * It renders each item exactly once. The preview places those same element
 * references in both its measuring pass and its paged pass, which is what makes
 * "what was measured is what appears" true rather than merely intended.
 */

export interface RenderedFlowItem {
  item: FlowItem;
  /**
   * `null` when the item names a section or block the document no longer
   * contains. Kept as an entry rather than dropped so the item list, the
   * measured metrics and the paginated output all stay index-for-index aligned.
   */
  node: React.ReactNode;
}

export const renderFlow = (
  document: ResumeDocument,
  template: ResolvedTemplate,
  context: RenderContext,
  items: ReadonlyArray<FlowItem>,
): Array<RenderedFlowItem> => {
  const { Header, SectionHeading, Block: BlockView } = template.components;

  const sections = new Map<string, Section>(
    document.content.sections.map((section) => [section.id, section]),
  );
  const blocks = new Map<string, { section: Section; block: Block }>();

  for (const section of document.content.sections) {
    for (const block of section.blocks) {
      blocks.set(block.id, { section, block });
    }
  }

  return items.map((item) => {
    switch (item.type) {
      case "header":
        return {
          item,
          node: <Header header={document.content.header} context={context} />,
        };

      case "sectionHeading": {
        const section = sections.get(item.sectionId ?? "");

        return {
          item,
          node:
            section === undefined ? null : (
              <SectionHeading section={section} context={context} />
            ),
        };
      }

      case "block": {
        const found = blocks.get(item.blockId ?? "");

        return {
          item,
          node:
            found === undefined ? null : (
              <BlockView
                block={found.block}
                section={found.section}
                context={context}
              />
            ),
        };
      }
    }
  });
};
