"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavLinkBaseProps = React.ComponentProps<typeof Link>;

interface NavLinkCompatProps extends Omit<NavLinkBaseProps, "href" | "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  to: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === to;

    return (
      <Link
        ref={ref}
        href={to as any}
        className={cn(className, isActive && activeClassName, pendingClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
