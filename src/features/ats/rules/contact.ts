import { plainText } from "@/features/resume/model/factory";

import { makeIssue } from "./helpers";

import type { ContactItem } from "@/features/resume/model/document";
import type { AtsRule } from "../types";

/**
 * Who the resume is from, and how to reach them.
 *
 * The model has no typed email or phone field, a contact is a free-text label
 * and an optional link, so a contact is classified by what it says and by the
 * scheme of its link. Both are heuristics, which is why a missing phone is only
 * a suggestion and a missing email is a warning, not an error.
 */

const EMAIL = /\S+@\S+\.\S+/;

/**
 * Seven digits, with whatever separators people type between them. The shortest
 * numbers in use are seven digits, and a looser rule would read a street number
 * as a phone.
 */
const PHONE_MIN_DIGITS = 7;

const digitCount = (value: string): number => value.replace(/\D/g, "").length;

const labelOf = (contact: ContactItem): string =>
  plainText(contact.label).trim();

const isEmail = (contact: ContactItem): boolean =>
  contact.href?.toLowerCase().startsWith("mailto:") === true ||
  EMAIL.test(labelOf(contact));

const isPhone = (contact: ContactItem): boolean =>
  contact.href?.toLowerCase().startsWith("tel:") === true ||
  digitCount(labelOf(contact)) >= PHONE_MIN_DIGITS;

const nameMissing: AtsRule = (document) =>
  plainText(document.content.header.name).trim() === ""
    ? [
        makeIssue("ats.name-missing", "header", {
          severity: "error",
          message: "The resume has no name.",
          why: "A parser reads the first line as the candidate's name, and a resume without one is filed under nobody.",
          where: "Header",
        }),
      ]
    : [];

const emailMissing: AtsRule = (document) =>
  document.content.header.contacts.some(isEmail)
    ? []
    : [
        makeIssue("ats.email-missing", "header", {
          severity: "warning",
          message: "No email address in the contact details.",
          why: "Most systems create the candidate record from the email, and a resume without one often cannot be matched or contacted.",
          where: "Header, contact details",
        }),
      ];

const phoneMissing: AtsRule = (document) =>
  document.content.header.contacts.some(isPhone)
    ? []
    : [
        makeIssue("ats.phone-missing", "header", {
          severity: "info",
          message: "No phone number in the contact details.",
          why: "Recruiters often phone first, and some systems hold the number as a second way to match a candidate.",
          where: "Header, contact details",
        }),
      ];

const contactIconOnly: AtsRule = (document) =>
  document.content.header.contacts.flatMap((contact, index) =>
    contact.icon !== undefined && labelOf(contact) === ""
      ? [
          makeIssue("ats.contact-icon-only", contact.id, {
            severity: "error",
            message: "A contact shows an icon and no text.",
            why: "A parser reads text, not pictures, so the detail the icon stands for is lost.",
            where: `Header, contact ${index + 1}`,
          }),
        ]
      : [],
  );

export const contactRules: Array<AtsRule> = [
  nameMissing,
  emailMissing,
  phoneMissing,
  contactIconOnly,
];
