"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/runner", label: "Courses" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/pricing", label: "Tarifs" },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const dashboardHref = session?.user?.role === "ADMIN"
    ? "/admin/dashboard"
    : "/photographer/dashboard";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center">
            <span className="text-white font-bold text-sm">FR</span>
          </div>
          <span className="text-xl font-bold text-navy">
            Focus <span className="text-orange">Racer</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                pathname === link.href
                  ? "text-orange bg-orange-50"
                  : "text-navy-600 hover:text-orange hover:bg-orange-50/50"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <Link href={dashboardHref}>
              <Button className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                Mon espace
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-navy hover:text-orange hover:bg-orange-50/50">
                  Connexion
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                  Inscription
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <span className={cn(
            "block w-6 h-0.5 bg-navy transition-all duration-200",
            mobileOpen && "rotate-45 translate-y-2"
          )} />
          <span className={cn(
            "block w-6 h-0.5 bg-navy transition-all duration-200",
            mobileOpen && "opacity-0"
          )} />
          <span className={cn(
            "block w-6 h-0.5 bg-navy transition-all duration-200",
            mobileOpen && "-rotate-45 -translate-y-2"
          )} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-white/20 shadow-lg animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === link.href
                    ? "text-orange bg-orange-50"
                    : "text-navy-600 hover:text-orange hover:bg-orange-50/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-4 flex flex-col gap-2">
              {session ? (
                <Link href={dashboardHref}>
                  <Button className="w-full bg-orange hover:bg-orange-dark text-white">
                    Mon espace
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" className="w-full border-orange text-orange hover:bg-orange-50">
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full bg-orange hover:bg-orange-dark text-white">
                      Inscription
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
