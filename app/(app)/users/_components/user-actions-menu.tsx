"use client";

import { EllipsisVerticalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";

type UserActionsMenuProps = {
  userId: string;
  currentRole: "admin" | "writer" | "user";
  isActive: boolean;
  isCurrent: boolean;
};

const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Writer", value: "writer" },
  { label: "User", value: "user" },
] as const;

export function UserActionsMenu({
  userId,
  currentRole,
  isActive,
  isCurrent,
}: UserActionsMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runAction(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, ...body }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Unable to update user.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Menu>
        <MenuTrigger
          render={
            <Button size="icon" variant="secondary">
              <EllipsisVerticalIcon className="size-4" />
            </Button>
          }
        />
        <MenuPopup align="end" className="w-52">
          <MenuSub>
            <MenuSubTrigger>Set role</MenuSubTrigger>
            <MenuSubPopup className="w-44">
              <MenuGroup>
                <MenuGroupLabel>Choose role</MenuGroupLabel>
                {roleOptions.map((role) => (
                  <MenuItem
                    disabled={pending || currentRole === role.value}
                    key={role.value}
                    onClick={() => runAction({ role: role.value })}
                  >
                    Set {role.label}
                  </MenuItem>
                ))}
              </MenuGroup>
            </MenuSubPopup>
          </MenuSub>
          <MenuSeparator />
          <MenuItem
            disabled={pending || isCurrent}
            onClick={() => runAction({ active: !isActive })}
            variant={isActive ? "destructive" : "default"}
          >
            {isActive ? "Disable user" : "Enable user"}
          </MenuItem>
        </MenuPopup>
      </Menu>
      {error ? <p className="text-destructive-foreground text-xs">{error}</p> : null}
    </div>
  );
}
