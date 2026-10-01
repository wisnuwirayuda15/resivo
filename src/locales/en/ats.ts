/**
 * The ATS tab. One block per rule, filed under the rule's name (see
 * `ATS_RULE_NAMES` in `features/ats/types.ts`, which this tree is checked
 * against), with what the rule says, why it matters, where it is, and, where
 * the rule can repair it, what the button says.
 *
 * Variants of one sentence (which colour, which font) are the `_` suffixes
 * i18next calls context, picked by the issue's own `context`.
 */
export const ats = {
  tab: {
    clean: "No issues we recognise",
    disclaimer:
      "This looks for common problems. It cannot promise how a particular system will read the file.",
    errors_one: "{{count}} error",
    errors_other: "{{count}} errors",
    warnings_one: "{{count}} warning",
    warnings_other: "{{count}} warnings",
    infos_one: "{{count}} suggestion",
    infos_other: "{{count}} suggestions",
    fixAll: "Fix {{count}}",
    fixAllLabel: "Fix all {{count}}",
    dismiss: "Dismiss for now",
    dismissIssue: "Dismiss: {{message}}",
    dismissed_one: "{{count}} issue dismissed",
    dismissed_other: "{{count}} issues dismissed",
    showAgain: "Show again",
    issues: "ATS issues",
    lengthNotChecked:
      "Length is not checked here. Open the Paper tab to measure it.",
    untitledSection: "Untitled section",
    untitledEntry: "Untitled entry",
    severity: {
      error: "error",
      warning: "warning",
      info: "suggestion",
    },
  },
  rules: {
    "name-missing": {
      message: "The resume has no name.",
      why: "A parser reads the first line as the candidate's name, and a resume without one is filed under nobody.",
      where: "Header",
    },
    "email-missing": {
      message: "No email address in the contact details.",
      why: "Most systems create the candidate record from the email, and a resume without one often cannot be matched or contacted.",
      where: "Header, contact details",
    },
    "phone-missing": {
      message: "No phone number in the contact details.",
      why: "Recruiters often phone first, and some systems hold the number as a second way to match a candidate.",
      where: "Header, contact details",
    },
    "contact-icon-only": {
      message: "A contact shows an icon and no text.",
      why: "A parser reads text, not pictures, so the detail the icon stands for is lost.",
      where: "Header, contact {{number}}",
    },
    "section-title-empty": {
      message: "A section has no heading.",
      why: "Parsers split a resume into sections by their headings, and content under no heading is attributed to nothing.",
      where: "Section {{number}}",
    },
    "section-empty": {
      message: "The {{section}} section is empty.",
      why: "A heading with nothing under it prints as a gap, and a recruiter reads it as something left unfinished.",
      where: "{{section}}",
      fix: "Hide section",
    },
    "core-sections-missing": {
      message: "No Experience, Education or Projects section has content.",
      why: "These are the sections a system scores a candidate on, so a resume without them has little to rank.",
      where: "Document",
    },
    "section-title-unusual": {
      message: "“{{section}}” is not a heading a parser is likely to know.",
      why: "Systems recognise a short list of headings, such as Experience and Education, and file anything else less reliably.",
      where: "{{section}}",
    },
    "columns-two": {
      message: "{{section}} is set in two columns.",
      why: "Many parsers read straight down the page, so two columns can come out interleaved, one line of each at a time.",
      where: "{{section}}",
      fix: "Use one column",
    },
    "table-used": {
      message: "A table is used.",
      why: "Parsers often flatten a table cell by cell and lose which value belonged to which heading.",
      where: "{{section}}",
    },
    "raw-block": {
      message: "Markdown this app does not typeset is printed as plain text.",
      why: "Raw HTML, footnotes and link definitions are kept verbatim, so they show up in the file as the markup itself.",
      where: "{{section}}",
    },
    "image-alt-missing": {
      message: "An image has no alt text.",
      why: "A parser cannot read an image, and the alt text is the only part of it that reaches the text layer.",
      where: "{{section}}",
    },
    "avatar-present": {
      message: "The header carries a photo.",
      why: "A photo is ignored by a parser, and some employers would rather not receive one at all.",
      where: "Header",
    },
    "date-order": {
      message: "The end date is before the start date.",
      why: "A parser that reads dates computes tenure from them, and a negative span is dropped or read as a typo.",
      where: "{{section}}, {{entry}}",
    },
    "date-start-missing": {
      message: "A date range has an end and no start.",
      why: "With one end missing a system cannot work out how long the role lasted, so it often records none.",
      where: "{{section}}, {{entry}}",
    },
    "date-unparsed": {
      message: "A date is written in words, not as a year or a month.",
      why: "Systems read dates like 2021 or 2021-03 and give up on free text such as Summer 2019, so the role arrives undated.",
      where: "{{section}}, {{entry}}",
    },
    "date-format-mixed": {
      message: "{{section}} mixes years and months.",
      why: "Dates written the same way throughout read as one timeline, and a system compares them more reliably.",
      where: "{{section}}",
    },
    "date-gap": {
      message: "There is a gap of about {{months}} months before this role.",
      why: "A recruiter reading the timeline will ask about a long gap, and a line saying what it was answers it first.",
      where: "{{section}}, {{entry}}",
    },
    "font-size-small": {
      message: "Body text is {{size}}pt.",
      why: "Small print is hard for a person to read and hard for a scan to recover, and recruiters skim at a glance.",
      where: "Style, body size",
      fix: "Set to {{fixSize}}pt",
    },
    "margins-narrow": {
      message: "A page margin is under 0.4 inches.",
      why: "Printers clip near the edge of the sheet, so text set that close can be cut off on paper.",
      where: "Style, paper margins",
      fix: "Raise to 0.5 in",
    },
    "contrast-low": {
      message_text:
        "The body text colour has a contrast of {{ratio}} to 1 on the paper.",
      message_heading:
        "The heading colour has a contrast of {{ratio}} to 1 on the paper.",
      message_accent:
        "The accent colour has a contrast of {{ratio}} to 1 on the paper.",
      message_muted:
        "The muted colour has a contrast of {{ratio}} to 1 on the paper.",
      why: "Pale text is hard to read and may print or scan out entirely. The usual minimum for body text is 4.5 to 1.",
      where_text: "Style, body text colour",
      where_heading: "Style, heading colour",
      where_accent: "Style, accent colour",
      where_muted: "Style, muted colour",
      fix: "Restore template colour",
    },
    "font-custom": {
      message_body: "The body font is one you uploaded.",
      message_heading: "The heading font is one you uploaded.",
      why: "An uploaded font is embedded in the PDF and the HTML here, but a system that re-renders the text may substitute its own, so the plain fonts are the safer choice.",
      where_body: "Style, body font",
      where_heading: "Style, heading font",
      fix: "Use the template font",
    },
    "css-hides-text": {
      "message_display-none": "The custom CSS uses display: none.",
      "message_visibility-hidden": "The custom CSS uses visibility: hidden.",
      "message_font-size-zero": "The custom CSS uses a font size of 0.",
      "message_opacity-zero": "The custom CSS uses an opacity of 0.",
      "message_color-transparent": "The custom CSS uses transparent text.",
      why: "Hidden text is read by a parser and never by a person, and some systems score the pattern as keyword stuffing.",
      where: "Custom CSS",
    },
    "css-generated-content": {
      message: "The custom CSS adds text with ::before or ::after.",
      why: "Text a stylesheet generates is drawn on the page and is not in the file, so a parser never reads it.",
      where: "Custom CSS",
    },
    "bullet-long": {
      message: "A bullet runs past about three lines.",
      why: "Long bullets are skimmed past, so the point they make is the one a recruiter is least likely to see.",
      where: "{{section}}",
    },
    "summary-long": {
      message: "The summary is longer than a short paragraph.",
      why: "A summary is read first and fast, so one that runs long defeats the reason it is at the top.",
      where: "{{section}}",
    },
    "entry-empty": {
      message: "A role has no description.",
      why: "A title and dates say where someone was, and the bullets are where a system finds the skills to match.",
      where: "{{section}}, {{entry}}",
    },
    "page-count": {
      message: "The resume runs to {{count}} pages.",
      why: "Screening is a quick first pass, so what falls on a third page is rarely reached, and long resumes are often set aside unread.",
      where: "Whole document",
    },
  },
} as const;
