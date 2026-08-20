/**
 * The Resivo wordmark.
 *
 * Typographic, not a logo: no logo asset exists, and the design system is
 * explicit that none was invented. The accent period is the only mark.
 */
export const Wordmark: React.FC = () => (
  <span className="text-title text-[15px] leading-none font-semibold tracking-[-0.015em]">
    Resivo<span className="text-accent">.</span>
  </span>
)
