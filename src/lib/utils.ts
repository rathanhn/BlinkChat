import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mobile layout utilities for consistent spacing
export const mobileLayout = {
  // For components with fixed footers (like chat components)
  chatContent: "pb-32", // 8rem = 128px - accounts for mobile nav (5rem) + chat footer (3rem)
  // For components with only mobile navigation
  standardContent: "pb-20", // 5rem = 80px - accounts for mobile nav only
  // For components with no fixed elements
  noFixedElements: "pb-0"
} as const;

// Z-index utilities for consistent layering
export const zIndex = {
  mobileNav: "z-40",
  chatFooter: "z-40",
  mobileHeader: "z-40",
  sidebar: "z-50"
} as const;
