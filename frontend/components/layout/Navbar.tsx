"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { avalancheFuji } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { useWorkerByAddress, useIsAdmin } from "@/hooks/useShieldWorker";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-1.5 text-sm transition-colors ${
        active
          ? "text-gray-900 font-semibold"
          : "text-gray-400 hover:text-gray-900"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gray-900 rounded-full" />
      )}
    </Link>
  );
}

function MobileNavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-3 text-sm rounded-xl transition-colors ${
        active
          ? "bg-gray-100 text-gray-900 font-semibold"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const account = useActiveAccount();
  const { isRegistered } = useWorkerByAddress(client);
  const isAdmin = useIsAdmin(client);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    ...(isRegistered
      ? [
          { href: "/contribute", label: "Contribute" },
          { href: "/dashboard", label: "Dashboard" },
        ]
      : [{ href: "/register", label: "Register" }]),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          {/* Left: Logo */}
          <div className="flex-1">
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-base">
              <Image
                src="/shield-logo.png"
                alt="ShieldWorker"
                width={28}
                height={28}
                className="h-7 w-7 object-contain shrink-0 rounded-md"
                priority
                unoptimized
              />
              <span className="tracking-tight">ShieldWorker</span>
            </Link>
          </div>

          {/* Center: Nav links */}
          {account && (
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <NavLink key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
              ))}
            </div>
          )}

          {/* Right: Connect + mobile hamburger */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <ConnectButton
              client={client}
              chain={avalancheFuji}
              connectButton={{ label: "Connect Wallet" }}
            />

            {account && (
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 8h16M4 16h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && account && (
        <div className="sm:hidden fixed inset-x-0 top-16 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 animate-fade-in">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            {links.map((link) => (
              <MobileNavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname === link.href}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
