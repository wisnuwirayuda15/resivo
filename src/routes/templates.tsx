import { createFileRoute } from '@tanstack/react-router'

import { Shell } from '@/components/shell/Shell'
import { TemplateTile } from '@/features/resume/components/TemplateTile'
import { templateList } from '@/features/templates/catalog'

/**
 * The template gallery.
 *
 * Read-only: templates are chosen when creating a resume or switched from inside
 * the editor, so this view explains what each one is for — including how it
 * reads to an applicant tracking system, which is the whole reason these
 * layouts stay single-column.
 */
const TemplatesRoute: React.FC = () => (
  <Shell title="Templates">
    <div className="p-6">
      <p className="text-muted mb-5 max-w-[70ch] text-[13px] leading-normal">
        Every template is single-column and parser-safe. They differ in
        typeface, spacing and how much hierarchy comes from rules rather than
        type size.
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {templateList.map((template) => (
          <div key={template.id} className="flex flex-col gap-2">
            {/* Not selectable here — this view describes, it does not apply. */}
            <TemplateTile
              template={template}
              selected={false}
              onSelect={() => {}}
            />
            <p className="text-subtle px-1 text-[11px] leading-snug">
              {template.atsNotes}
            </p>
          </div>
        ))}
      </div>
    </div>
  </Shell>
)

export const Route = createFileRoute('/templates')({
  component: TemplatesRoute,
})
