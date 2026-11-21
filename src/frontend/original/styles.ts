// The v2.2.1 look. Themes from this plugin set the --original-* colors; any
// other theme falls back to its own tokens.
export const deepestBg = "bg-[var(--original-deepest,var(--background))]";
export const elevatedBg = "bg-[var(--original-elevated,var(--card))]";
export const headerBg = "bg-[var(--original-header,var(--muted))]";

/** A floating panel: rounded, thick border, page colored. */
export const floatingPanel =
  "rounded-[0.625rem] border-2 border-border bg-background overflow-hidden";

/** The outline icon buttons the old bars used. */
export const outlineButton =
  "inline-flex shrink-0 items-center justify-center rounded-[0.5rem] border-2 border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

/** The thin strip a hidden sidebar or tab bar leaves behind. */
export const reopenStrip =
  "flex shrink-0 items-center justify-center border-2 border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
