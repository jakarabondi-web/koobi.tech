import { Bell, MessagesSquare, Search } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";

interface TopbarProps {
  searchPlaceholder: string;
  user: { name: string; role: string };
  /** Shows the green dot on the messages icon. */
  hasUnread?: boolean;
}

export function Topbar({ searchPlaceholder, user, hasUnread = true }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 pl-16 sm:px-6 lg:pl-6">
        <div className="relative hidden max-w-xl flex-1 sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="dashboard-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <input
            id="dashboard-search"
            type="search"
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-primary"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label={hasUnread ? "Messages, unread" : "Messages"}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessagesSquare className="h-5 w-5" aria-hidden="true" />
            {hasUnread ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            ) : null}
          </button>

          <div className="flex items-center gap-3 pl-1">
            <Avatar name={user.name} />
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
