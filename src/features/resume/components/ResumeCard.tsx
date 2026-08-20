import { Link } from '@tanstack/react-router'
import { Menu, Tooltip, UnstyledButton } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'
import { RelativeTime } from '@/components/RelativeTime'
import { templateName } from '@/features/templates/catalog'

import type { ResumeSummary } from '@/database/index'

interface ResumeCardProps {
  resume: ResumeSummary
  onRename: () => void
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}

/**
 * One resume in the library.
 *
 * Media-first: a sunken well holds a paper miniature, with a metadata row
 * underneath. The miniature is built from ruled divs inside `.resivo-paper`, so
 * it shows the resume's actual template colours without rendering — or storing a
 * thumbnail of — the real document.
 */
export const ResumeCard: React.FC<ResumeCardProps> = ({
  resume,
  onRename,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}) => {
  const archived = resume.archivedAt !== 0

  return (
    // Only colour and shadow cross-fade — never layout properties, which
    // `transition-all` would also animate.
    <div className="group border-line-soft bg-surface rounded-card hover:border-line duration-fast ease-standard relative border shadow-xs transition-[border-color,box-shadow] hover:shadow-md">
      <Link
        to="/resumes/$resumeId"
        params={{ resumeId: resume.id }}
        className="block"
      >
        <div className="bg-sunken rounded-t-card flex justify-center px-4 pt-5 pb-4">
          <div
            className="resivo-paper rounded-[2px] px-3 py-3.5 shadow-paper"
            data-template={resume.templateId}
            data-size={resume.templateId === 'classic' ? undefined : undefined}
            style={{ width: 116, height: 150 }}
          >
            <div
              style={{
                height: 7,
                width: '60%',
                background: 'var(--paper-ink)',
              }}
            />
            <div
              style={{
                height: 3,
                width: '42%',
                marginTop: 4,
                background: 'var(--paper-ink-muted)',
              }}
            />
            {[0, 1, 2].map((section) => (
              <div key={section} style={{ marginTop: 11 }}>
                <div
                  style={{
                    height: 4,
                    width: '32%',
                    background: 'var(--paper-accent)',
                  }}
                />
                <div
                  style={{
                    height: 1,
                    marginTop: 3,
                    background: 'var(--paper-rule)',
                  }}
                />
                {[0, 1, 2].map((line) => (
                  <div
                    key={line}
                    style={{
                      height: 2.5,
                      marginTop: 3,
                      width: line === 2 ? '64%' : '100%',
                      background: 'var(--paper-ink-muted)',
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="px-3.5 pt-3 pb-3.5">
          <div className="text-title truncate text-[13px] font-medium">
            {resume.title}
          </div>
          {/* Middle dot separates metadata, per the design system. */}
          <div className="text-subtle mt-1 truncate font-mono text-[11px]">
            Edited <RelativeTime value={resume.updatedAt} /> ·{' '}
            {templateName(resume.templateId)}
          </div>
        </div>
      </Link>

      {/* Actions sit outside the Link so they do not navigate. */}
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Menu position="bottom-end" shadow="lg" radius="panel" width={180}>
          <Menu.Target>
            <Tooltip label="More">
              <UnstyledButton
                aria-label={`Actions for ${resume.title}`}
                className="border-line bg-surface text-muted hover:text-body rounded-control flex h-[26px] w-[26px] items-center justify-center border shadow-xs"
              >
                <Icon name="dots-three" size={15} />
              </UnstyledButton>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<Icon name="cursor-text" size={15} />}
              onClick={onRename}
            >
              Rename
            </Menu.Item>
            <Menu.Item
              leftSection={<Icon name="copy" size={15} />}
              onClick={onDuplicate}
            >
              Duplicate
            </Menu.Item>
            <Menu.Divider />
            {archived ? (
              <Menu.Item
                leftSection={<Icon name="arrow-counter-clockwise" size={15} />}
                onClick={onRestore}
              >
                Restore
              </Menu.Item>
            ) : (
              <Menu.Item
                leftSection={<Icon name="archive" size={15} />}
                onClick={onArchive}
              >
                Archive
              </Menu.Item>
            )}
            <Menu.Item
              leftSection={<Icon name="trash" size={15} />}
              onClick={onDelete}
              c="var(--danger-text)"
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  )
}
