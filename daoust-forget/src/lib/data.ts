import { branches, type Branch } from "@/content/branches";
import { services } from "@/content/services";
import { canShow } from "./verification";

/** Branches that may be displayed in the current data mode. */
export const visibleBranches = (): Branch[] => branches.filter((b) => canShow(b.verification));

export const visibleServices = () => services.filter((s) => canShow(s.verification));

export const findVisibleBranch = (slug: string) => visibleBranches().find((b) => b.slug === slug);

/** Visible branches that are confirmed to offer a service. */
export const branchesOffering = (slug: string) => visibleBranches().filter((b) => b.services?.includes(slug));
