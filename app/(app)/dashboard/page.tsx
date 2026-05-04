import { Badge } from "@/components/ui/badge";
import { Frame } from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant="outline">
      <span
        aria-hidden="true"
        className={
          active
            ? "size-1.5 rounded-full bg-emerald-500"
            : "size-1.5 rounded-full bg-amber-500"
        }
      />
      {active ? "Ready" : "Needs config"}
    </Badge>
  );
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");

  return (
    <main className="p-2">
      <Frame className="w-full">
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Signed-in user</TableCell>
              <TableCell>
                <StatusBadge active />
              </TableCell>
              <TableCell className="text-right">{session.user.email}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Display name</TableCell>
              <TableCell>
                <StatusBadge active={Boolean(session.user.name)} />
              </TableCell>
              <TableCell className="text-right">{session.user.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Role</TableCell>
              <TableCell>
                <StatusBadge active />
              </TableCell>
              <TableCell className="text-right">
                {session.user.role ?? "user"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Frame>
    </main>
  );
}
