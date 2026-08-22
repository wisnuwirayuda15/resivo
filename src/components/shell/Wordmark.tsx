import { Text } from '@mantine/core'

/**
 * The Resivo wordmark.
 *
 * Typographic, not a logo: no logo asset exists, and the design system is
 * explicit that none was invented. The accent period is the only mark.
 */
export const Wordmark: React.FC = () => (
  <Text
    className="text-title text-[15px] leading-none font-semibold tracking-[-0.015em]"
    span
  >
    Resivo
    <Text className="text-accent" span>
      .
    </Text>
  </Text>
)
