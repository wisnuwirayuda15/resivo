import { Tabs as MantineTabs } from "@mantine/core";

interface TabsProps {
  /** The tab labels, in order. The first is open to begin with. */
  items: Array<string>;
  children?: React.ReactNode;
}

interface TabProps {
  /** Which label this panel belongs to. */
  value: string;
  children?: React.ReactNode;
}

/**
 * Alternatives shown one at a time: a command in two package managers, a
 * setting in two languages.
 *
 * Written `<Tabs items={["A", "B"]}><Tab value="A">...</Tab>...</Tabs>`. Every
 * panel is in the server's HTML (Mantine hides the inactive ones), so a reader
 * without script, a crawler and the Markdown export all still see every
 * alternative.
 *
 * Both `keepMounted` and `keepMountedMode="display-none"` are needed: Mantine 9
 * hides an inactive panel with React's `Activity` by default, which renders
 * nothing at all while the server builds the page, so the other alternatives
 * would be missing from the HTML exactly where a crawler reads it.
 */
export const Tabs: React.FC<TabsProps> = ({ items, children }) => (
  <MantineTabs
    className="my-5"
    defaultValue={items[0]}
    keepMounted
    keepMountedMode="display-none"
  >
    <MantineTabs.List>
      {items.map((item) => (
        <MantineTabs.Tab key={item} value={item}>
          {item}
        </MantineTabs.Tab>
      ))}
    </MantineTabs.List>
    {children}
  </MantineTabs>
);

export const Tab: React.FC<TabProps> = ({ value, children }) => (
  <MantineTabs.Panel pt="xs" value={value}>
    {children}
  </MantineTabs.Panel>
);
