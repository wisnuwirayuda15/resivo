import {
  Blockquote,
  Code,
  Divider,
  Kbd,
  List,
  Table,
  Text,
} from "@mantine/core";

import { Callout } from "./Callout";
import { Card, Cards } from "./Cards";
import { CodeBlock } from "./CodeBlock";
import { DocLink } from "./DocLink";
import { makeHeading } from "./Heading";
import { Step, Steps } from "./Steps";
import { Tab, Tabs } from "./Tabs";

import type { MDXComponents } from "mdx/types";

interface WithChildren {
  children?: React.ReactNode;
}

interface CodeProps extends WithChildren {
  className?: string;
}

/**
 * Inline `code` is Mantine's `Code`. A `code` inside a fenced block is not:
 * the highlighter has already given it its classes and spans, and the block
 * around it draws the frame, so it passes through untouched.
 */
const InlineOrBlockCode: React.FC<CodeProps> = ({ className, children }) =>
  className !== undefined && /\b(?:hljs|language-)/.test(className) ? (
    <code className={className}>{children}</code>
  ) : (
    <Code className="text-[0.9em]">{children}</Code>
  );

const Paragraph: React.FC<WithChildren> = ({ children }) => (
  <Text className="text-body my-4 text-[14px] leading-[1.7]" component="p">
    {children}
  </Text>
);

const UnorderedList: React.FC<WithChildren> = ({ children }) => (
  <List
    className="text-body my-4 text-[14px] leading-[1.7]"
    listStyleType="disc"
    spacing={4}
    withPadding
  >
    {children}
  </List>
);

const OrderedList: React.FC<WithChildren> = ({ children }) => (
  <List
    className="text-body my-4 text-[14px] leading-[1.7]"
    listStyleType="decimal"
    spacing={4}
    type="ordered"
    withPadding
  >
    {children}
  </List>
);

const ListItem: React.FC<WithChildren> = ({ children }) => (
  <List.Item className="[&_p]:my-0">{children}</List.Item>
);

const DocsTable: React.FC<WithChildren> = ({ children }) => (
  <Table.ScrollContainer className="my-5" minWidth={480}>
    <Table className="text-[13px]" verticalSpacing="xs" withTableBorder>
      {children}
    </Table>
  </Table.ScrollContainer>
);

const Quote: React.FC<WithChildren> = ({ children }) => (
  <Blockquote className="my-5 text-[14px]" color="gray" p="md">
    {children}
  </Blockquote>
);

const Rule: React.FC = () => <Divider className="my-8" />;

/**
 * Every element an article can contain, mapped to Mantine.
 *
 * This is how the house rule (Mantine components, not raw elements) holds for
 * content that is written in Markdown: the author writes `##` and `-` and a
 * table, and what reaches the page is `Title`, `List` and `Table`. No `h1`
 * is mapped, on purpose: the page title is the front matter, drawn once by the
 * page, and a test refuses an `h1` in a body.
 *
 * The capitalised entries are the components an author may write by hand.
 */
export const docsComponents: MDXComponents = {
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
  p: Paragraph,
  a: DocLink,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  blockquote: Quote,
  hr: Rule,
  code: InlineOrBlockCode,
  pre: CodeBlock,
  table: DocsTable,
  thead: Table.Thead,
  tbody: Table.Tbody,
  tr: Table.Tr,
  th: Table.Th,
  td: Table.Td,
  Callout,
  Tabs,
  Tab,
  Steps,
  Step,
  Cards,
  Card,
  Kbd,
};
