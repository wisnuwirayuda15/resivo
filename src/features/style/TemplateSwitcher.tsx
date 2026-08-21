import { useState } from 'react'
import { Button, Group, Modal, Stack, UnstyledButton } from '@mantine/core'

import {
  designMatchesTemplate,
  templateDefaults,
} from '@/features/templates/defaults'
import { TEMPLATE_CATALOG, templateList } from '@/features/templates/catalog'
import { setTemplate } from '@/features/editor/mutations'

import type { Recipe } from '@/features/editor/mutations'
import type { DesignConfig, TemplateId } from '@/features/resume/model/document'

/**
 * Choosing a template, from inside the editor.
 *
 * Switching never touches `content` — that is the whole point of keeping the
 * template out of the document beyond its id. It does raise the question of what
 * happens to `design`, since a template ships its own token defaults:
 *
 *  - nothing has been customised → switch silently and seed the new defaults,
 *    because there is nothing to lose and a prompt with no stakes teaches people
 *    to dismiss prompts;
 *  - something has been customised → ask, and default to keeping it.
 */

interface TemplateSwitcherProps {
  templateId: TemplateId
  design: DesignConfig
  apply: (recipe: Recipe) => void
}

/**
 * A row-sized swatch: the template's accent over its two faces, in the real
 * paper tokens. Small enough to sit in a 288px panel, and honest, because it
 * reads the same `data-template` scope the page does.
 */
const TemplateSwatch: React.FC<{ id: TemplateId }> = ({ id }) => {
  const design = templateDefaults(id)

  return (
    <span
      className="resivo-paper border-line-soft flex size-[26px] flex-none items-center justify-center rounded-[2px] border"
      data-template={id}
    >
      <span
        style={{
          fontFamily: 'var(--paper-font-head)',
          fontSize: 13,
          fontWeight: design.typography.weights.heading,
          color: 'var(--paper-accent)',
          lineHeight: 1,
        }}
      >
        Aa
      </span>
    </span>
  )
}

export const TemplateSwitcher: React.FC<TemplateSwitcherProps> = ({
  templateId,
  design,
  apply,
}) => {
  const [pending, setPending] = useState<TemplateId | null>(null)

  const select = (next: TemplateId) => {
    if (next === templateId) {
      return
    }

    if (designMatchesTemplate(design, templateId)) {
      apply(setTemplate(next, { resetDesign: true }))
      return
    }

    setPending(next)
  }

  const commit = (resetDesign: boolean) => {
    if (pending !== null) {
      apply(setTemplate(pending, { resetDesign }))
    }

    setPending(null)
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {templateList.map((template) => {
          const selected = template.id === templateId

          return (
            <UnstyledButton
              aria-pressed={selected}
              className={[
                'rounded-control duration-fast ease-standard flex items-center gap-2 border px-2 py-1.5 text-left transition-colors',
                selected
                  ? 'border-line-accent bg-selected'
                  : 'border-transparent hover:bg-hover',
              ].join(' ')}
              key={template.id}
              onClick={() => select(template.id)}
            >
              <TemplateSwatch id={template.id} />
              <span className="min-w-0 flex-1">
                <span className="text-title block text-[12px] font-medium">
                  {template.name}
                </span>
                <span className="text-subtle block truncate text-[11px]">
                  {template.description}
                </span>
              </span>
            </UnstyledButton>
          )
        })}
      </div>

      <Modal
        onClose={() => setPending(null)}
        opened={pending !== null}
        size={440}
        title="Keep your style changes?"
      >
        <Stack gap="lg">
          <p className="text-body text-[13px] leading-normal">
            You have changed the style tokens on this resume. Switching to{' '}
            {pending === null ? '' : TEMPLATE_CATALOG[pending].name} can keep
            those changes, or replace them with that template&rsquo;s own
            defaults. Your content is untouched either way.
          </p>
          <Group gap="xs" justify="flex-end">
            <Button onClick={() => setPending(null)} variant="subtle">
              Cancel
            </Button>
            {/* Replacing is the destructive option, so keeping is the focused
                default — a stray Enter must not discard styling work. */}
            <Button onClick={() => commit(true)} variant="default">
              Use template defaults
            </Button>
            <Button data-autofocus onClick={() => commit(false)}>
              Keep my changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
