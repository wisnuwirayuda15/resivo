import { useQuery } from "@tanstack/react-query";
import { Box, Text, UnstyledButton } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { cn } from "@/lib/utils";

/**
 * The repository's page, and how many people have starred it.
 *
 * Only on the landing page and the docs, which are public pages with no user
 * data on them. The editor never asks GitHub for anything, and the one request
 * made here carries nothing but the browser's own headers: it is a read of a
 * public number, not a place a resume could end up.
 */

const REPOSITORY = "wisnuwirayuda15/resivo";

export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;

/**
 * Ten minutes. GitHub allows 60 unauthenticated requests an hour per address,
 * and a count that is a few minutes behind is as good as live for a star
 * button. The refetch on window focus respects this, so coming back to the tab
 * is fresh without a poll that would spend the allowance on a hidden page.
 */
const STALE_MS = 10 * 60 * 1000;

const fetchStars = async (): Promise<number> => {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`);
  }

  const body = (await response.json()) as { stargazers_count?: unknown };

  if (typeof body.stargazers_count !== "number") {
    throw new TypeError("GitHub sent no star count");
  }

  return body.stargazers_count;
};

interface GithubStarsProps {
  /** What the link is called, for the accessible name and the tooltip. */
  label: string;
  /** The interface language, so 1,200 is written the way the reader writes it. */
  locale: string;
  className?: string;
}

export const GithubStars: React.FC<GithubStarsProps> = ({
  label,
  locale,
  className,
}) => {
  /**
   * Silent on failure, offline, rate limited or blocked: the link is the
   * feature and the count is a garnish, so there is no retry and no error. The
   * query does not run on the server, which is what keeps the first client
   * render identical to the server's.
   */
  const { data: stars } = useQuery({
    queryKey: ["github-stars", REPOSITORY],
    queryFn: fetchStars,
    staleTime: STALE_MS,
    retry: false,
  });

  return (
    <UnstyledButton
      aria-label={label}
      className={cn(
        "text-muted hover:text-body hover:bg-hover rounded-control duration-fast ease-standard flex h-[30px] items-center gap-2 px-2 transition-colors active:scale-[0.96]",
        className,
      )}
      component="a"
      href={REPOSITORY_URL}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <Icon name="github-logo" size={16} />

      {stars === undefined ? null : (
        // Off a phone's bar: the docs' header already has a burger, the logo, a
        // search, a language and a theme control in 390px, and the link alone
        // is the part that has to stay.
        <Box className="hidden items-center gap-0.5 sm:flex">
          <Icon name="star" size={12} weight="fill" />
          {/* Monospace and tabular, the design system's rule for a number that
              changes in place. */}
          <Text className="font-mono text-[12px] tabular-nums" span>
            {new Intl.NumberFormat(locale, {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(stars)}
          </Text>
        </Box>
      )}
    </UnstyledButton>
  );
};
