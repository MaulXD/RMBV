import {
  Users,
  UserPlus,
  LayoutDashboard,
  FileText,
  FileBarChart,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Copy,
  Check,
  ChevronDown,
  Upload,
  Building2,
  Shield,
  Plus,
  Briefcase,
  LogIn,
  FileDown,
  type LucideIcon,
} from "lucide-react";

const icons = {
  users: Users,
  userPlus: UserPlus,
  dashboard: LayoutDashboard,
  fileText: FileText,
  reports: FileBarChart,
  logOut: LogOut,
  sun: Sun,
  moon: Moon,
  menu: Menu,
  x: X,
  copy: Copy,
  check: Check,
  chevronDown: ChevronDown,
  upload: Upload,
  building: Building2,
  shield: Shield,
  plus: Plus,
  briefcase: Briefcase,
  logIn: LogIn,
  fileDown: FileDown,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className = "h-4 w-4 shrink-0",
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const LucideComp: LucideIcon = icons[name];
  return <LucideComp className={className} strokeWidth={strokeWidth} aria-hidden />;
}
