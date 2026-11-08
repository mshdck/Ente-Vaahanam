"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/login");
      }}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 active:scale-95 cursor-pointer"
      data-signout
    >
      <LogOut size={13} />
      <span>Sign out</span>
    </button>
  );
}
