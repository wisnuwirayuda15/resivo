# Resivo, Resume Builder Implementation Plan

## Role

Act as a senior software architect, product engineer, and React/TypeScript specialist.

Create a comprehensive implementation plan for **Resivo**, a modern, local-first resume builder web application.

The purpose of this task is to produce an actionable technical blueprint that a developer or development team can use to build Resivo incrementally.

Do **not** implement the application yet. Focus on architecture, technical decisions, data modeling, component design, workflows, development phases, and implementation details.

---

# 1. Product Overview

**Resivo** is a privacy-focused, local-first resume builder.

The application allows users to:

- Create and manage multiple resumes.
- Organize resumes into groups.
- Edit resumes visually through a WYSIWYG interface.
- Edit resumes using Markdown.
- Customize resume appearance using CSS.
- Customize styles through a visual configuration interface.
- Use ATS-friendly resume templates.
- Manage images through a dedicated local image gallery.
- Upload and use custom fonts.
- Import and export resume data.
- Export resumes as PDF, HTML, and Markdown.
- Work entirely locally without authentication or a backend.

The application should feel like a combination of:

- a document editor
- a resume designer
- a Markdown editor
- a template system
- a local document manager

Prioritize simplicity, maintainability, privacy, performance, and extensibility.

---

# 2. Core Principles

Design Resivo around these principles:

### Local-first

The application must work without a backend.

There should be:

- No login
- No account
- No server-side database
- No required internet connection after the application is loaded
- No cloud synchronization

User data belongs to the user.

### Privacy

Resume information, images, fonts, and other personal data should remain on the user's device.

### Extensibility

The architecture should make it possible to add future features such as:

- additional templates
- cover letters
- portfolios
- additional export formats
- optional cloud synchronization
- AI-assisted writing
- template marketplace

Do not implement these future features now, but avoid architectural decisions that make them unnecessarily difficult later.

---

# 3. Technology Stack

Use:

- React
- TypeScript
- Vite
- TanStack Router
- Mantine UI
- Tailwind CSS

Use the following where appropriate:

- Iconify Web Components for icons
- Monaco Editor for Markdown/CSS editing
- dnd-kit for drag-and-drop interactions
- Dexie + IndexedDB for persistent local storage

Additional libraries are allowed if they provide meaningful value.

For every significant additional dependency, explain:

1. Why it is needed.
2. What problem it solves.
3. Why it is preferable to implementing the functionality ourselves.
4. Whether it introduces any architectural or bundle-size concerns.

---

# 4. React & TypeScript Coding Standards

Establish clear coding conventions.

Requirements:

- Use functional React components.
- Always define React components using arrow functions.
- Use TypeScript throughout the application.
- Prefer strict typing.
- Component props should extend the appropriate parent HTML element props whenever applicable.

For example:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const Button = ({ variant = 'primary', ...props }: ButtonProps) => {
  // ...
}
```

Additional principles:

- Prefer composition over inheritance.
- Keep components focused and reusable.
- Avoid unnecessary abstractions.
- Avoid deeply coupled components.
- Separate business logic from presentation where practical.
- Prefer feature-oriented architecture.
- Use accessible HTML and ARIA where appropriate.

---

# 5. Application Architecture

Design the architecture around a clear separation between:

- UI
- application state
- persistence
- resume document model
- template rendering
- style configuration
- asset management
- import/export

Explain the responsibilities and boundaries of each layer.

Include an architecture diagram using Mermaid if useful.

---

# 6. Canonical Resume Document Model

This is a critical architectural requirement.

Markdown editing, visual editing, template rendering, and export should not become four independent implementations.

Design a **canonical resume document model** that acts as the source of truth.

Explain how:

```text
Visual Editor
      ↓
Resume Document Model
      ↑
Markdown Parser
      ↓
Template Renderer
      ↓
Preview
      ↓
Export
```

should work.

Determine:

- What the resume document schema looks like.
- How sections are represented.
- How content blocks are represented.
- How ordering is represented.
- How metadata is represented.
- How styling is represented.
- How custom CSS is stored.
- How Markdown maps to the internal model.
- What happens when Markdown contains unsupported structures.
- How visual edits are converted back into the canonical model.

Avoid creating separate incompatible representations for Markdown and visual editing.

---

# 7. Resume Management

Users should be able to:

- Create resumes.
- Rename resumes.
- Duplicate resumes.
- Delete resumes.
- Archive resumes.
- Restore archived resumes.
- Organize resumes into groups.
- Move resumes between groups.
- Search resumes.
- Sort resumes.
- View recently edited resumes.

Consider:

- autosave
- undo/redo
- timestamps
- document versioning where appropriate

Explain which operations should be persisted immediately and which should be debounced.

---

# 8. Local Database

Use IndexedDB through Dexie or propose a better alternative if justified.

Design schemas for at least:

- resumes
- resume groups
- images/assets
- fonts
- application settings

Consider whether templates should be:

- stored in the database
- bundled with the application
- represented as versioned code
- or use a hybrid approach

Explain the decision.

The database architecture should support schema migrations.

---

# 9. Backup & Restore

Users must be able to backup and restore their data using JSON.

Design a portable backup format.

Consider:

- schema version
- resume data
- groups
- images
- fonts
- settings
- templates/customizations
- metadata

The backup format should be versioned so future versions of Resivo can migrate older backups.

Explain:

- export process
- import process
- validation
- corrupted backup handling
- incompatible version handling
- duplicate handling
- conflict handling

Use runtime schema validation where appropriate, such as Zod.

---

# 10. Resume Editor

Resivo should support three editing approaches.

## Visual/WYSIWYG Editor

Users should be able to edit the resume directly in the preview.

Support:

- text editing
- section editing
- block editing
- reordering
- drag-and-drop
- image placement
- image resizing where appropriate
- adding/removing sections
- keyboard interactions

Use dnd-kit or an equivalent library.

Explain how editing interactions avoid interfering with normal resume rendering and printing.

---

## Markdown Editor

Provide a Monaco-based Markdown editor.

Requirements:

- syntax highlighting
- editing
- autosave
- validation
- formatting support where appropriate
- import/export compatibility

Explain the Markdown syntax supported by Resivo.

Do not assume arbitrary Markdown can map perfectly to every resume template.

Define how unsupported Markdown constructs should be handled.

---

## CSS Editor

Provide a Monaco-based CSS editor.

Users should be able to customize the appearance of their resume with custom CSS.

Define:

- CSS scope
- CSS isolation
- allowed selectors
- security considerations
- how CSS interacts with template styles
- how CSS interacts with GUI style settings
- precedence rules

The custom CSS must not accidentally affect the surrounding Resivo application UI.

---

# 11. Three-Panel Editor Layout

The main editor should contain three panels.

### Panel 1: Code Editor

Tabbed interface:

- Markdown
- CSS

### Panel 2: Resume Preview

Realtime rendered resume.

### Panel 3: Style Configuration

Visual controls for styling.

The panels should be resizable.

Use Mantine's Splitter component:

https://mantine.dev/core/splitter/

Explain:

- minimum/maximum panel widths
- responsive behavior
- mobile behavior
- persistence of panel sizes
- keyboard accessibility

---

# 12. Resume Preview Engine

Design a reusable rendering engine.

The preview must update in realtime as the user edits the resume.

It should support:

- multiple pages
- page boundaries
- A4
- Letter
- print-safe layout
- margins
- spacing
- typography
- images
- icons
- custom CSS

The preview should accurately represent the exported document.

Discuss how to handle:

- page breaks
- content overflow
- long sections
- images crossing page boundaries
- orphaned headings
- widows/orphans where practical
- print CSS
- browser differences

---

# 13. ATS-Friendly Templates

Provide three initial templates.

For example:

### Classic

Traditional single-column resume.

### Professional

Structured layout with clear hierarchy.

### Modern

Clean contemporary design while remaining ATS-friendly.

For every template define:

- structure
- supported sections
- typography
- layout
- spacing
- customization capabilities
- ATS considerations

Templates should share a common rendering architecture rather than duplicating the entire editor.

Explain how third-party or future templates could be added.

---

# 14. Style Configuration GUI

The third panel should provide visual controls for:

- paper size
- margins
- font family
- custom font
- font sizes
- font weights
- line height
- colors
- section spacing
- paragraph spacing
- heading spacing
- borders
- dividers
- image/avatar settings
- icon settings
- page breaks

Define a structured design-token system rather than storing arbitrary UI values everywhere.

Explain how GUI styling and custom CSS interact.

Define precedence, for example:

```text
Template defaults
      ↓
User style configuration
      ↓
Custom CSS
```

Adjust this model if a better architecture exists.

---

# 15. Fonts

Provide a set of common resume-friendly fonts.

Allow users to upload custom fonts.

Support appropriate font formats such as:

- WOFF
- WOFF2
- TTF where appropriate

Store uploaded fonts locally.

Explain:

- font metadata
- font loading
- font persistence
- font validation
- font removal
- how fonts are included in exports
- PDF font embedding considerations

---

# 16. Image Gallery

Create a dedicated image gallery.

Users can:

- upload images
- preview images
- rename images
- delete images
- reuse images across resumes
- identify unused images

Store image data locally.

Consider:

- image metadata
- MIME type
- dimensions
- file size
- thumbnails
- object URLs
- memory management
- cleanup

Explain whether images should be stored as Blobs, ArrayBuffers, or another format in IndexedDB.

---

## 17. Icon System

Use **Phosphor Icons** as the primary icon system.

https://phosphoricons.com/

Design an abstraction so templates can use icons without tightly coupling the resume model to the underlying icon library.

### Requirements:

- Use **Phosphor React icons** as the default implementation.
- Provide full access to the **entire Phosphor icon set**.
- Users must be able to **search, browse, and select any Phosphor icon**.
- Implement a **global icon picker UI** with:

  - search input (fuzzy search over icon names)
  - category/group filtering (if available)
  - live preview grid
  - selectable icon items

- Use **TanStack Virtual** to efficiently render the icon list due to its large size.

### Icon Picker Behavior:

- Must support thousands of icons without performance issues.
- Only render visible icons using virtualization.
- Search must filter results in real time.
- Keyboard navigation should be supported (arrow keys + enter selection).
- Selected icon should be stored as:

  ```ts
  {
    name: string; // phosphor icon name
    weight?: "regular" | "bold" | "duotone" | "fill" | "light" | "thin";
  }
  ```

### Rendering Rules:

- Icons must render correctly in:

  - Resume preview
  - Exported HTML
  - Exported PDF

- Ensure consistent sizing and alignment across templates.
- Allow styling via:

  - size
  - color
  - opacity
  - alignment

### Architecture Considerations:

- Do NOT tightly couple resume schema to Phosphor React components.
- Store only icon metadata (name + style), not React components.
- Create a renderer layer that maps icon metadata → actual Phosphor icon component.

### Performance Requirements:

- Use **TanStack Virtual** for:

  - icon grid rendering
  - search result rendering

- Avoid rendering full icon set in DOM at once.
- Lazy-load icon metadata if needed.

### Extensibility:

The system should allow future support for:

- additional icon libraries (Lucide, Heroicons, etc.)
- custom uploaded SVG icons
- template-specific icon sets

---

# 18. Import & Export

Support:

### Export

- PDF
- HTML
- Markdown

### Import

- Markdown
- JSON backup

Design an export abstraction so additional formats can be added later.

For example:

```text
Resume Document
      ↓
Export Adapter
      ├── PDF
      ├── HTML
      └── Markdown
```

Discuss the advantages and limitations of browser-based PDF generation.

Prioritize output fidelity between:

- preview
- print
- PDF

---

# 19. Routing

Design the TanStack Router structure.

Consider routes such as:

```text
/
├── dashboard
├── resumes
│   ├── $resumeId
│   └── ...
├── groups
├── images
├── fonts
├── settings
└── about
```

Recommend the actual route structure rather than blindly following this example.

Explain route responsibilities and navigation behavior.

---

# 20. State Management

Recommend an appropriate state management architecture.

Separate:

- persistent application state
- current resume state
- editor state
- UI state
- transient state

Determine whether Zustand, React context, TanStack Query, or another approach should be used.

Avoid unnecessary global state.

Explain autosave and synchronization between the editor and IndexedDB.

---

# 21. UI/UX

Design a clean modern interface.

Support:

- light mode
- dark mode
- responsive layout
- keyboard navigation
- accessible controls
- tooltips
- command actions
- empty states
- loading states
- error states
- confirmation dialogs where appropriate

Important:

**The Resivo application UI can support dark mode, but the resume preview must not inherit the application's dark-mode styling.**

The resume should render according to its own document/template styling.

---

# 22. Performance

Identify likely performance bottlenecks.

Consider:

- Monaco Editor
- realtime preview rendering
- large resumes
- large images
- custom fonts
- IndexedDB
- drag-and-drop
- PDF generation

Recommend:

- lazy loading
- debouncing
- memoization
- virtualization where appropriate
- Web Workers where useful
- object URL management
- efficient database queries

Do not prematurely optimize.

---

# 23. Security

Although Resivo is local-first, identify security considerations involving:

- custom CSS
- imported Markdown
- imported JSON
- uploaded images
- uploaded fonts
- HTML export
- potentially malicious content

Explain how to safely parse and render user-provided content.

---

# 24. Accessibility

Define accessibility requirements for:

- keyboard navigation
- drag-and-drop
- editor controls
- dialogs
- forms
- tabs
- splitters
- buttons
- icon-only controls
- color selection

Provide keyboard alternatives for interactions that cannot reasonably be performed with drag-and-drop.

---

# 25. Suggested Project Structure

Design a feature-oriented project structure.

For example:

```text
src/
├── app/
├── routes/
├── features/
│   ├── resumes/
│   ├── editor/
│   ├── preview/
│   ├── templates/
│   ├── images/
│   ├── fonts/
│   ├── export/
│   └── settings/
├── components/
├── database/
├── lib/
├── hooks/
├── types/
└── styles/
```

Do not blindly use this structure. Modify it if a better architecture is appropriate.

Explain the responsibility of each major directory.

---

# 26. Component Architecture

Provide a detailed component hierarchy for the main application.

Include components such as:

- AppShell
- ResumeList
- ResumeCard
- ResumeEditor
- EditorToolbar
- MarkdownEditor
- CssEditor
- ResumePreview
- ResumePage
- StylePanel
- TemplateSelector
- ImageGallery
- FontManager
- ExportDialog

Determine the actual component boundaries based on good React architecture.

For important components, explain:

- responsibility
- props
- state
- dependencies
- reusable behavior

---

# 27. Testing Strategy

Define a testing strategy covering:

### Unit tests

- document model
- Markdown parser
- style configuration
- database operations
- import/export
- migrations

### Integration tests

- editor → document model
- document model → preview
- backup → restore
- Markdown import → resume
- resume → export

### End-to-end tests

Test critical user workflows such as:

1. Create a resume.
2. Edit it.
3. Change the template.
4. Add an image.
5. Change styles.
6. Export PDF.
7. Create a second resume.
8. Create a group.
9. Backup data.
10. Reload the application.
11. Restore the backup.

---

# 28. Development Plan

Break the implementation into logical phases.

For every phase provide:

- objective
- features
- technical tasks
- dependencies
- complexity
- risks
- acceptance criteria
- expected deliverables

Prefer small, independently testable milestones.

Start with the smallest viable architecture and progressively add advanced capabilities.

---

# 29. MVP Definition

Clearly distinguish:

## MVP

Features absolutely required for the first usable version.

## Post-MVP

Important but non-essential features.

## Future

Potential features that should not influence the initial architecture unnecessarily.

---

# 30. Technical Decisions

Before presenting the roadmap, explicitly analyze and make recommendations for:

1. IndexedDB/Dexie architecture
2. State management
3. Canonical resume document model
4. Markdown parser
5. WYSIWYG architecture
6. Drag-and-drop architecture
7. Template system
8. CSS isolation
9. PDF generation
10. HTML generation
11. Markdown generation
12. Image storage
13. Font storage
14. Autosave
15. Undo/redo
16. Backup format
17. Schema migrations
18. Preview rendering
19. Responsive editor layout

For each decision, provide:

- recommended approach
- alternatives considered
- advantages
- disadvantages
- final recommendation

---

# 31. Final Deliverable

Produce the implementation plan in this exact high-level structure:

1. Executive Summary
2. Product Architecture
3. Core Data Model
4. Technology Decisions
5. Application State Architecture
6. Database Design
7. Resume Document Model
8. Markdown Architecture
9. WYSIWYG Architecture
10. Template Architecture
11. Preview Rendering Architecture
12. Styling System
13. Image & Font Architecture
14. Import/Export Architecture
15. Routing
16. Component Architecture
17. Project Folder Structure
18. Accessibility
19. Security
20. Performance
21. Testing Strategy
22. MVP Scope
23. Development Phases
24. Acceptance Criteria
25. Future Extensibility
26. Risks and Mitigations

Use diagrams, tables, TypeScript interfaces, schemas, and pseudocode where they make the architecture easier to understand.

Do not generate the complete application code.

The result should be detailed enough that another developer can start implementing Resivo directly from the plan without having to make major architectural decisions themselves.
