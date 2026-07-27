import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Wide tables scroll horizontally rather than crushing their columns, but a
 * plain scroller gives no sign that anything is cut off — on a phone a table
 * simply looked like it ended, hiding whole columns. These are the classic
 * CSS scroll shadows: the `local` gradients paint over the shadow at each
 * end, so a shadow shows only on the side that still has content, and both
 * vanish once nothing is clipped. No JS, no measuring.
 */
const SCROLL_SHADOWS =
  "bg-[linear-gradient(to_right,var(--card)_30%,transparent),linear-gradient(to_left,var(--card)_30%,transparent),radial-gradient(farthest-side_at_0_50%,rgba(0,0,0,0.14),transparent),radial-gradient(farthest-side_at_100%_50%,rgba(0,0,0,0.14),transparent)] " +
  "bg-[position:left_center,right_center,left_center,right_center] " +
  "bg-[size:44px_100%,44px_100%,14px_100%,14px_100%] " +
  "bg-no-repeat [background-attachment:local,local,scroll,scroll]";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className={cn("relative w-full overflow-x-auto", SCROLL_SHADOWS)}>
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-muted/50 font-medium", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("whitespace-nowrap px-3 py-3 align-middle", className)} {...props} />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
