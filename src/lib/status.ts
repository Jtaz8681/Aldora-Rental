export type BadgeVariant = "secondary" | "default" | "destructive" | "outline";

/**
 * Rental status → shadcn Badge variant
 */
export function badgeVariantForRentalStatus(status: string): BadgeVariant {
  switch (status) {
    case "returned":
      return "secondary";
    case "checked-out":
    case "active":
      return "default";
    case "overdue":
      return "destructive";
    case "draft":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Gear status → shadcn Badge variant
 */
export function badgeVariantForGearStatus(status: string): BadgeVariant {
  switch (status) {
    case "Available":
      return "secondary";
    case "Checked-Out":
    case "In Maintenance":
      return "default";
    case "Overdue":
    case "Quarantined":
      return "destructive";
    case "Retired":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Maintenance ticket status → shadcn Badge variant
 */
export function badgeVariantForTicketStatus(status: string): BadgeVariant {
  switch (status) {
    case "pending":
      return "outline";
    case "in_progress":
      return "default";
    case "awaiting_parts":
    case "completed":
      return "secondary";
    default:
      return "outline";
  }
}