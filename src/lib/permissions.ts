import type { AppRole } from "./types";

export type Permissions = {
  manageMenu: boolean; // all roles
  viewRoster: boolean; // all roles
  manageShifts: boolean; // admin, dba
  manageStaff: boolean; // admin, dba
  manageRoles: boolean; // dba only
  manageHours: boolean; // admin, dba
  viewFeedback: boolean; // admin, dba
  viewActivity: boolean; // admin, dba
};

/** UI permissions. These only decide what's shown — Postgres RLS enforces the real rules. */
export function permissionsFor(role: AppRole | null): Permissions {
  const manager = role === "admin" || role === "dba";
  return {
    manageMenu: !!role,
    viewRoster: !!role,
    manageShifts: manager,
    manageStaff: manager,
    manageRoles: role === "dba",
    manageHours: manager,
    viewFeedback: manager,
    viewActivity: manager,
  };
}
