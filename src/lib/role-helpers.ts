const PRO_ROLES = ["PHOTOGRAPHER", "ORGANIZER", "AGENCY", "CLUB", "FEDERATION"];

export function isProRole(role: string): boolean {
  return PRO_ROLES.includes(role);
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN";
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    PHOTOGRAPHER: "Photographe",
    ORGANIZER: "Organisateur",
    AGENCY: "Agence",
    CLUB: "Club",
    FEDERATION: "Fédération",
    ADMIN: "Administrateur",
    RUNNER: "Coureur",
  };
  return labels[role] || role;
}

export function getRedirectPath(role: string): string {
  if (isAdmin(role)) return "/focus-mgr-7k9x/dashboard";
  if (isProRole(role)) return "/photographer/dashboard";
  return "/runner";
}
