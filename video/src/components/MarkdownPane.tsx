import { Caret } from "./Caret";

/**
 * The Markdown as the editor shows it: headings in the title colour, directives
 * in the accent, everything else muted, as the landing page's own source panel
 * does. The text sits at the bottom of the pane and grows upward, which scrolls
 * it without measuring anything, so the line being typed is always in view.
 */
const kindOf = (line: string): string => {
  if (line.startsWith("#")) {
    return "heading";
  }

  if (line.startsWith(":")) {
    return "directive";
  }

  if (line.startsWith("- ")) {
    return "bullet";
  }

  return "prose";
};

export const MarkdownPane = ({ text }: { text: string }) => {
  const lines = text.split("\n");

  return (
    <div className="v-code">
      <div className="v-code-lines">
        {lines.map((line, index) => (
          <div
            // The position is the identity: lines only ever grow.
            key={index}
            className="v-code-line"
            data-kind={kindOf(line)}
          >
            {line === "" ? " " : line}
            {index === lines.length - 1 ? <Caret solid /> : null}
          </div>
        ))}
      </div>
    </div>
  );
};
