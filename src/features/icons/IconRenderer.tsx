import { resolveIcon } from './registry'

import type { IconRef } from '@/features/resume/model/document'

interface IconProps {
  /** Kebab-case Phosphor name, e.g. `envelope-simple`. */
  name: string
  weight?: IconRef['weight']
  /** Defaults to `1em`, so an icon tracks the font size of whatever contains it
   * — the design system sizes glyphs relative to their context. */
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
 * else — templates, the chrome, exports — goes through here, so swapping or
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

  if (Component === undefined) {
    /**
     * An unknown name means a document references an icon this build does not
     * carry. Reserving the space keeps the surrounding layout — and therefore
     * pagination — identical to what it would be with the glyph present, so a
     * missing icon never silently reflows a printed page.
     */
    return (
      <span
        aria-hidden
        className={className}
        style={{ display: 'inline-block', width: size, height: size }}
        data-unknown-icon={name}
      />
    )
  }

  return (
    <Component
      className={className}
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
