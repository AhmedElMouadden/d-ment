import {
  Droplets,
  Gem,
  Scissors,
  Shirt,
  Snowflake,
  Sparkles,
  Timer,
  Truck,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import type { ServiceIcon } from "@/content/services";
import type { PricingCategory } from "@/content/pricing";
import { CoatIcon, DressIcon, PantsIcon, SuitIcon } from "./garment-icons";

export const serviceIcons: Record<ServiceIcon, LucideIcon> = {
  shirt: Shirt,
  droplets: Droplets,
  sparkles: Sparkles,
  snowflake: Snowflake,
  scissors: Scissors,
  timer: Timer,
  truck: Truck,
  washing: WashingMachine,
};

type IconComponent = (props: { className?: string; "aria-hidden"?: boolean }) => React.ReactNode;

export const pricingIcons: Record<PricingCategory["icon"], IconComponent> = {
  shirt: Shirt,
  pants: PantsIcon,
  suit: SuitIcon,
  coat: CoatIcon,
  dress: DressIcon,
  gem: Gem,
  scissors: Scissors,
};
