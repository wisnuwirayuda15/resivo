import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  ArrowsHorizontalIcon,
  BriefcaseIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CertificateIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardTextIcon,
  ClockClockwiseIcon,
  ClockIcon,
  ColumnsIcon,
  CopyIcon,
  CursorTextIcon,
  DotsSixIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  EnvelopeIcon,
  EnvelopeSimpleIcon,
  ExportIcon,
  EyeIcon,
  EyeSlashIcon,
  FileArrowDownIcon,
  FileCssIcon,
  FilePdfIcon,
  FilePlusIcon,
  FileTextIcon,
  FileZipIcon,
  FolderIcon,
  FolderOpenIcon,
  GearIcon,
  GithubLogoIcon,
  GlobeSimpleIcon,
  GraduationCapIcon,
  ImageIcon,
  InfoIcon,
  KeyboardIcon,
  LinkSimpleIcon,
  LinkedinLogoIcon,
  ListChecksIcon,
  ListDashesIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MarkdownLogoIcon,
  MinusIcon,
  MoonIcon,
  PaletteIcon,
  PhoneIcon,
  PlugsIcon,
  PlusIcon,
  PrinterIcon,
  SidebarSimpleIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SquaresFourIcon,
  StarIcon,
  SunIcon,
  TextAaIcon,
  TextHIcon,
  TranslateIcon,
  TrashIcon,
  TrophyIcon,
  UploadSimpleIcon,
  UserIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react'

import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

/**
 * Maps the design system's kebab-case Phosphor names onto React components.
 *
 * The design system references icons the way the Phosphor webfont does
 * (`file-text`), while this app uses the React package for two reasons the
 * webfont cannot serve: the icon picker needs to render thousands of glyphs under
 * virtualization, and HTML export has to inline real `<svg>` so the file stays
 * self-contained with no network or font dependency.
 *
 * Components are imported under their `*Icon` names. The bare names
 * (`FileText`, `X`, ...) are deprecated aliases kept only for compatibility, and
 * the suffixed form also avoids the collision the old `Image` export had with
 * the DOM's own `Image`.
 *
 * This registry is the curated set the chrome and the templates use. Phase 9
 * adds the generated full-catalogue lookup behind the same interface, so the
 * document model keeps storing nothing but `{ name, weight }`.
 */
export const ICON_REGISTRY: Record<string, PhosphorIcon> = {
  // Documents and files
  'file-text': FileTextIcon,
  'file-plus': FilePlusIcon,
  'file-pdf': FilePdfIcon,
  'file-css': FileCssIcon,
  'file-zip': FileZipIcon,
  'file-arrow-down': FileArrowDownIcon,
  'markdown-logo': MarkdownLogoIcon,
  'clipboard-text': ClipboardTextIcon,

  // Organisation
  folder: FolderIcon,
  'folder-open': FolderOpenIcon,
  'squares-four': SquaresFourIcon,
  'list-dashes': ListDashesIcon,
  'list-checks': ListChecksIcon,
  archive: ArchiveIcon,
  star: StarIcon,
  clock: ClockIcon,
  'clock-clockwise': ClockClockwiseIcon,

  // Actions
  plus: PlusIcon,
  minus: MinusIcon,
  'arrows-horizontal': ArrowsHorizontalIcon,
  x: XIcon,
  check: CheckIcon,
  'check-circle': CheckCircleIcon,
  trash: TrashIcon,
  copy: CopyIcon,
  export: ExportIcon,
  'download-simple': DownloadSimpleIcon,
  'upload-simple': UploadSimpleIcon,
  printer: PrinterIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'arrow-counter-clockwise': ArrowCounterClockwiseIcon,
  'arrow-u-up-left': ArrowUUpLeftIcon,
  'arrow-u-up-right': ArrowUUpRightIcon,
  'arrow-square-out': ArrowSquareOutIcon,

  // Chrome and controls
  gear: GearIcon,
  'sliders-horizontal': SlidersHorizontalIcon,
  palette: PaletteIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
  columns: ColumnsIcon,
  'sidebar-simple': SidebarSimpleIcon,
  'dots-three': DotsThreeIcon,
  'dots-three-vertical': DotsThreeVerticalIcon,
  'dots-six': DotsSixIcon,
  'dots-six-vertical': DotsSixVerticalIcon,
  'caret-left': CaretLeftIcon,
  'caret-right': CaretRightIcon,
  'caret-down': CaretDownIcon,
  'caret-up': CaretUpIcon,
  keyboard: KeyboardIcon,
  'cursor-text': CursorTextIcon,
  plugs: PlugsIcon,
  sparkle: SparkleIcon,
  sun: SunIcon,
  moon: MoonIcon,

  // Status
  info: InfoIcon,
  warning: WarningIcon,
  'warning-circle': WarningCircleIcon,
  'lock-simple': LockSimpleIcon,

  // Typography and media
  'text-aa': TextAaIcon,
  'text-h': TextHIcon,
  image: ImageIcon,

  // Resume content — contact rows and section headings
  'envelope-simple': EnvelopeSimpleIcon,
  envelope: EnvelopeIcon,
  phone: PhoneIcon,
  'map-pin': MapPinIcon,
  'globe-simple': GlobeSimpleIcon,
  'link-simple': LinkSimpleIcon,
  'github-logo': GithubLogoIcon,
  'linkedin-logo': LinkedinLogoIcon,
  briefcase: BriefcaseIcon,
  'graduation-cap': GraduationCapIcon,
  certificate: CertificateIcon,
  trophy: TrophyIcon,
  translate: TranslateIcon,
  user: UserIcon,
}

/** Undefined for an unknown name, so the renderer can degrade instead of
 * throwing on a document that names an icon this build does not carry. */
export const resolveIcon = (name: string): PhosphorIcon | undefined =>
  ICON_REGISTRY[name]

export const ICON_NAMES = Object.keys(ICON_REGISTRY)
