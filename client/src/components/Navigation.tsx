import { Link, useLocation } from "wouter";
import { Home, ListOrdered, RotateCcw, Swords, Shield, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", icon: Home, label: "Hub" },
    { href: "/lineup", icon: ListOrdered, label: "Lineup" },
    { href: "/pitchers", icon: RotateCcw, label: "Pitch" },
    { href: "/attack", icon: Swords, label: "ATK" },
    { href: "/defense", icon: Shield, label: "DEF" },
    { href: "/schedule", icon: Calendar, label: "Sched" },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-black/90 backdrop-blur-md border-t border-cyan-500/30 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`nav-${link.label.toLowerCase()}`}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-cyan-400" : "text-gray-500 hover:text-cyan-200"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]")} />
              <span className="text-[9px] uppercase tracking-wider font-bold">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
