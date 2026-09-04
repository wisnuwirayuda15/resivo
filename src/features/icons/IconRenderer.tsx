import { useCatalogGlyph } from './useCatalogGlyph'

import { resolveIcon } from './registry'

import type { IconRef } from '@/features/resume/model/document'

interface IconProps {
  /** Kebab-case Phosphor name, e.g. `envelope-simple`. */
  name: string
  weight?: IconRef['weight']
  /** Defaults to `1em`, so an icon tracks the font size of whatever contains
   * it: the design system sizes glyphs relative to their context. */
  size?: number | string
  /** Defaults to `currentColor`, so an icon inherits its surrounding text
   * colour rather than needing to be told. */
  color?: string
  opacity?: number
  title?: string
  className?: string
}

/**
 * The only place in the app that turns icon metadata into a component.
 *
 * The document model stores `{ name, weight }` and never a React component,
 * which is what keeps a saved resume independent of the icon library. Everything
 * else (templates, the chrome, exports) goes through here, so swapping or
 * adding an icon set later is a change to the registry rather than to every
 * call site.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  weight = 'regular',
  size = '1em',
  color = 'currentColor',
  opacity,
  title,
  className,
}) => {
  const Component = resolveIcon(name)
  const catalogGlyph = useCatalogGlyph(
    Component === undefined ? name : undefined,
    weight,
  )

  if (Component === undefined) {
    /**
     * Not one of the curated icons, so it comes from the catalog, 1512 glyphs
     * per weight behind a lazy import, because bundling them all as components
     * would cost megabytes at the entry point.
     *
     * The weight selects which file is fetched, so a catalog icon is drawn in
     * the weight the document asked for rather than approximated by the
     * default.
     *
     * Until that lands, and for a name no build carries at all, the space is
     * reserved rather than collapsed. That keeps the surrounding layout (and
     * therefore pagination) identical to what it will be once the glyph
     * appears, so an icon arriving late cannot reflow a printed page.
     */
    if (catalogGlyph === undefined) {
      return (
        <span
          aria-hidden
          className={className}
          style={{ display: 'inline-block', width: size, height: size }}
          data-icon-name={name}
          data-icon-weight={weight}
          data-unknown-icon={name}
        />
      )
    }

    return (
      <svg
        className={className}
        /**
         * The name and weight, on the element itself. An icon is a model node
         * with no textual form, so this is what lets `domToInline` read one back
         * out of an edited field instead of losing it.
         */
        data-icon-name={name}
        data-icon-weight={weight}
        // Phosphor's own viewBox. Every glyph in the catalog is drawn in it, so
        // a catalog icon and a curated one are the same size at the same
        // `size`.
        viewBox="0 0 256 256"
        width={size}
        height={size}
        fill={color}
        opacity={opacity}
        {...(title === undefined
          ? { 'aria-hidden': true }
          : { role: 'img', 'aria-label': title })}
        /**
         * The markup is generated from the icon package's own assets by
         * `scripts/generate-icon-catalog.mjs`, which takes only the drawable
         * shapes, so this is build-time data from a dependency, never anything
         * a user typed.
         */
        dangerouslySetInnerHTML={{ __html: catalogGlyph }}
      />
    )
  }

  return (
    <Component
      className={className}
      data-icon-name={name}
      data-icon-weight={weight}
      size={size}
      weight={weight}
      color={color}
      opacity={opacity}
      // Phosphor renders a <title> and drops aria-hidden when given one, so a
      // titled icon is announced and an untitled one is treated as decoration.
      {...(title === undefined ? { 'aria-hidden': true } : { title })}
    />
  )
}

/** Renders an `IconRef` straight from the document. */
export const DocumentIcon: React.FC<
  { icon: IconRef } & Omit<IconProps, 'name' | 'weight'>
> = ({ icon, ...rest }) => (
  <Icon name={icon.name} weight={icon.weight} {...rest} />
)
