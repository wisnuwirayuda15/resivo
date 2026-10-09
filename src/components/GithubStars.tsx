import { Box, Skeleton, Text, UnstyledButton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { Icon } from "@/features/icons/IconRenderer";
import { cn } from "@/lib/utils";
import { useHover } from "@mantine/hooks";

/**
 * The repository's page, and how many people have starred it.
 *
 * Only on the landing page and the docs, which are public pages with no user
 * data on them. The editor never asks GitHub for anything, and the one request
 * made here carries nothing but the browser's own headers: it is a read of a
 * public number, not a place a resume could end up.
 */

const REPOSITORY = "wisnuwirayuda15/resivo";

const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;

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
  const { hovered, ref } = useHover();

  /**
   * Silent on failure, offline, rate limited or blocked: the link is the
   * feature and the count is a garnish, so there is no retry and no error. The
   * query does not run on the server, which is what keeps the first client
   * render identical to the server's.
   */
  const { data: stars = -1, isPending } = useQuery({
    queryKey: ["github-stars", REPOSITORY],
    queryFn: fetchStars,
    staleTime: STALE_MS,
    retry: false,
  });

  return (
    <UnstyledButton
      ref={ref}
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
      <Icon name="github-logo" size={16} weight={hovered ? "fill" : "bold"} />

      {isPending ? (
        /* Hidden where the count is, below `sm`. A placeholder for something
           that will never appear is 40px of header the phone has not got: it
           pushed the page 26px wider than the screen for as long as GitHub took
           to answer, and the page jumped back when it did. */
        <Skeleton className="hidden h-[20px] w-[40px] sm:block" />
      ) : stars >= 0 ? (
        <Box className="hidden items-center gap-1 sm:flex">
          <Icon className="flex-none" name="star" size={12} weight="fill" />
          {/* Monospace and tabular, the design system's rule for a number that
              changes in place. `leading-none` so the line box is the glyph's
              own height: with the inherited line height the digits sat a pixel
              or two off the centre the star is aligned to. */}
          <Text
            className="font-mono text-[12px] leading-none tabular-nums"
            span
          >
            {new Intl.NumberFormat(locale, {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(stars)}
          </Text>
        </Box>
      ) : null}
    </UnstyledButton>
  );
};
