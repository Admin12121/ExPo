import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function AuthBrand({ className }: { className?: string }) {
  return (
    <div className={cn("mb-5 text-center", className)}>
      <Link
        className="inline-flex flex-col items-center gap-2 text-3xl font-medium"
        href="/"
      >
        <div className="flex size-14 items-center justify-center rounded-md">
          <Image
            alt="ExPO"
            className="rounded-md"
            height={500}
            priority
            src="/logo.webp"
            width={500}
          />
        </div>
        ExPO
      </Link>
    </div>
  );
}
