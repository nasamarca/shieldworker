"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "thirdweb/react";
import { avalancheFuji } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { useWorkerByAddress, useIsAdmin } from "@/hooks/useShieldWorker";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { isRegistered } = useWorkerByAddress(client);
  const isAdmin = useIsAdmin(client);

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Image
              src="/shield-logo.png"
              alt="ShieldWorker"
              width={32}
              height={32}
              className="h-8 w-8 object-contain shrink-0 rounded-md"
              priority
              unoptimized
            />
            <span>ShieldWorker</span>
          </Link>

          <div className="hidden sm:flex items-center gap-4 text-sm">
            {isRegistered && (
              <>
                <Link href="/contribute" className="hover:text-blue-600 transition-colors">
                  Contribute
                </Link>
                <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
              </>
            )}
            {!isRegistered && (
              <Link href="/register" className="hover:text-blue-600 transition-colors">
                Register
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="hover:text-blue-600 transition-colors">
                <Badge variant="outline" className="text-xs">
                  Admin
                </Badge>
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
