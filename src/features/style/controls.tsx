import {
  Box,
  ColorInput,
  NumberInput,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";

import type { ReactNode } from "react";

/**
 * The style inspector's control vocabulary.
 *
 * Every control in the panel is one of these, for two reasons. The panel is
 * 288px wide, so the label/control split has to be identical everywhere or the
 * column of controls looks ragged; and each control has to report its value the
 * same way the document stores it, a number as a number, a colour as a string,
 * so the panel never has to parse anything on its way into `patchDesign`.
 */

/** A titled run of controls. The heading is the design system's uppercase
 * micro-label, which is why it carries the wide tracking. */
export const ControlGroup: React.FC<{
  title: string;
  children: ReactNode;
}> = ({ title, children }) => (
  <section className="border-line-soft border-b px-3 py-3 last:border-b-0">
    <Text
      className="text-subtle mb-2 text-[10px] font-medium tracking-[0.06em] uppercase"
      component="h3"
    >
      {title}
    </Text>
    <Box className="flex flex-col gap-1.5">{children}</Box>
  </section>
);

/**
 * One labelled row.
 *
 * The label is a fixed-width column rather than a Mantine `label` prop: stacked
 * labels would double the panel's height, and this panel is scrolled far more
 * often than it is read top to bottom.
 */
export const Field: React.FC<{
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}> = ({ label, hint, htmlFor, children }) => (
  <Box className="flex items-center gap-2">
    <Tooltip disabled={hint === undefined} label={hint} multiline w={220}>
      <Text
        className="text-muted w-[86px] flex-none text-[12px] leading-snug"
        component="label"
        htmlFor={htmlFor}
      >
        {label}
      </Text>
    </Tooltip>
    <Box className="min-w-0 flex-1">{children}</Box>
  </Box>
);

/**
 * A numeric token.
 *
 * `clampBehavior="strict"` on purpose: these numbers become CSS lengths, and
 * `css.ts` clamps them again on the way out, so letting the input hold a value
 * the preview will silently refuse would leave the panel showing something the
 * paper is not doing.
 */
export const NumberField: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Shown inside the input, e.g. `pt` or `in`. */
  suffix?: string;
  decimalScale?: number;
  label: string;
  hint?: string;
}> = ({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  decimalScale = 2,
  label,
  hint,
}) => (
  <Field hint={hint} label={label}>
    <NumberInput
      aria-label={label}
      clampBehavior="strict"
      decimalScale={decimalScale}
      max={max}
      min={min}
      onChange={(next) => {
        // Mantine reports an empty input as `''`. Treating that as a change
        // would write `NaN` into the document mid-edit; ignoring it leaves the
        // last valid value in place until the user commits a new one.
        const parsed =
          typeof next === "number" ? next : Number.parseFloat(next);

        if (Number.isFinite(parsed)) {
          onChange(parsed);
        }
      }}
      size="xs"
      step={step}
      suffix={suffix === undefined ? undefined : ` ${suffix}`}
      value={value}
    />
  </Field>
);

/** A colour token. Swatches are the paper palette, so the common choices are one
 * click rather than a hex typed from memory. */
export const PAPER_SWATCHES = [
  "#1a1a18",
  "#55554e",
  "#79796f",
  "#d8d8d3",
  "#0e7c76",
  "#2563a8",
  "#94271d",
  "#b5720b",
];

export const ColorField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
}> = ({ value, onChange, label, hint }) => (
  <Field hint={hint} label={label}>
    <ColorInput
      aria-label={label}
      format="hex"
      onChange={onChange}
      size="xs"
      swatches={PAPER_SWATCHES}
      swatchesPerRow={8}
      value={value}
    />
  </Field>
);

export const SelectField = <T extends string>({
  value,
  onChange,
  data,
  label,
  hint,
}: {
  value: T;
  onChange: (value: T) => void;
  data: Array<{ value: T; label: string }>;
  label: string;
  hint?: string;
}) => (
  <Field hint={hint} label={label}>
    <Select
      allowDeselect={false}
      aria-label={label}
      comboboxProps={{ withinPortal: true }}
      data={data}
      // `onChange` fires with `null` only on deselect, which is disabled above.
      onChange={(next) => {
        if (next !== null) {
          onChange(next);
        }
      }}
      size="xs"
      value={value}
    />
  </Field>
);

/**
 * A short choice shown as a row of icons, for a token whose options have a
 * well-known glyph (text alignment). Each segment is labelled for assistive
 * technology and by tooltip, since an icon alone says nothing to a screen reader.
 */
export const IconChoiceField = <T extends string>({
  value,
  onChange,
  data,
  label,
  hint,
}: {
  value: T;
  onChange: (value: T) => void;
  data: Array<{ value: T; icon: string; label: string }>;
  label: string;
  hint?: string;
}) => (
  <Field hint={hint} label={label}>
    <SegmentedControl
      aria-label={label}
      data={data.map((option) => ({
        value: option.value,
        label: (
          <Tooltip label={option.label} openDelay={300}>
            <Box
              aria-label={option.label}
              className="flex items-center justify-center"
              role="img"
            >
              <Icon name={option.icon} size={14} />
            </Box>
          </Tooltip>
        ),
      }))}
      fullWidth
      onChange={(next) => onChange(next)}
      size="xs"
      value={value}
    />
  </Field>
);

/** A short free-text token. Commits on every keystroke, like the number fields,
 * so the paper follows the typing. */
export const TextField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
}> = ({ value, onChange, label, hint, placeholder, maxLength }) => (
  <Field hint={hint} label={label}>
    <TextInput
      aria-label={label}
      maxLength={maxLength}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={placeholder}
      size="xs"
      value={value}
    />
  </Field>
);

export const SwitchField: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <Field hint={hint} label={label}>
    <Switch
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.currentTarget.checked)}
      size="xs"
    />
  </Field>
);

/**
 * A continuous token, for the two where the exact number matters less than the
 * feel of moving it: the type scale and the line height.
 *
 * The readout is monospace and tabular, per the design system's rule that any
 * number changing in place is set in the mono face so it does not jitter.
 */
export const SliderField: React.FC<{
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  hint?: string;
  format?: (value: number) => string;
}> = ({
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
  label,
  hint,
  format = (next) => next.toFixed(2),
}) => (
  <Field hint={hint} label={label}>
    <Box className="flex items-center gap-2">
      <Slider
        aria-label={label}
        className="min-w-0 flex-1"
        label={null}
        max={max}
        min={min}
        onChange={onChange}
        onChangeEnd={onCommit}
        size="xs"
        step={step}
        value={value}
      />
      <Text
        span
        className="text-subtle w-[3.2em] flex-none text-right font-mono text-[11px] tabular-nums"
      >
        {format(value)}
      </Text>
    </Box>
  </Field>
);
