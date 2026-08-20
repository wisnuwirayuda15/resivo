import { UnstyledButton } from '@mantine/core'

import type { TemplateMeta } from '@/features/templates/catalog'

interface TemplateTileProps {
  template: TemplateMeta
  selected: boolean
  onSelect: () => void
}

/**
 * A selectable template, shown as a ruled paper miniature above its name.
 *
 * The miniature is built from a handful of 1–2px divs rather than a screenshot:
 * it stays crisp at any zoom, needs no asset pipeline, and — because it sits
 * inside `.resivo-paper` — it picks up the template's real paper tokens, so the
 * accent colour and heading face shown here are the ones the resume will use.
 */
export const TemplateTile: React.FC<TemplateTileProps> = ({
  template,
  selected,
  onSelect,
}) => (
  <UnstyledButton
    onClick={onSelect}
    aria-pressed={selected}
    className={[
      'rounded-card border p-2 text-left transition-colors duration-fast ease-standard',
      selected
        ? 'border-line-accent bg-selected'
        : 'border-line-soft bg-surface hover:border-line',
    ].join(' ')}
  >
    <div className="bg-sunken rounded-xs flex justify-center p-2.5">
      <div
        className="resivo-paper rounded-[2px] px-2 py-2.5 shadow-xs"
        data-template={template.id}
        style={{ width: 72, height: 94 }}
      >
        {/* Name */}
        <div
          style={{
            height: 5,
            width: '62%',
            background: 'var(--paper-ink)',
            fontFamily: 'var(--paper-font-head)',
          }}
        />
        {/* Contact line */}
        <div
          style={{
            height: 2,
            width: '44%',
            marginTop: 3,
            background: 'var(--paper-ink-muted)',
          }}
        />
        {[0, 1].map((section) => (
          <div key={section} style={{ marginTop: 8 }}>
            {/* Section heading, in the template's accent */}
            <div
              style={{
                height: 3,
                width: '34%',
                background: 'var(--paper-accent)',
              }}
            />
            <div
              style={{
                height: 1,
                marginTop: 2,
                background: 'var(--paper-rule)',
              }}
            />
            {[0, 1, 2].map((line) => (
              <div
                key={line}
                style={{
                  height: 2,
                  marginTop: 2.5,
                  width: line === 2 ? '68%' : '100%',
                  background: 'var(--paper-ink-muted)',
                  opacity: 0.55,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>

    <div className="px-1 pt-2 pb-0.5">
      <div className="text-title text-[13px] font-medium">{template.name}</div>
      <div className="text-muted mt-0.5 text-[11px] leading-snug">
        {template.description}
      </div>
    </div>
  </UnstyledButton>
)
