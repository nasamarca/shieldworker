"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "thirdweb/react";
import { avalancheFuji } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { useWorkerByAddress, useIsAdmin } from "@/hooks/useShieldWorker";

export function Navbar() {
  const { isRegistered } = useWorkerByAddress(client);
  const isAdmin = useIsAdmin(client);

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-base">
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

          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            {isRegistered && (
              <>
                <Link href="/contribute" className="hover:text-gray-900 transition-colors">
                  Contribute
                </Link>
                <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>
              </>
            )}
            {!isRegistered && (
              <Link href="/register" className="hover:text-gray-900 transition-colors">
                Register
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="hover:text-gray-900 transition-colors">
                <span className="px-2.5 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-400 transition-colors">
                  Admin
                </span>
              </Link>
            )}
          </div>
        </div>

        <ConnectButton
          client={client}
          chain={avalancheFuji}
          connectButton={{ label: "Connect Wallet" }}
        />
      </div>
    </nav>
  );
}
