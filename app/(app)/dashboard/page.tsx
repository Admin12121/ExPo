import {
  BarChart3Icon,
  CheckCircle2Icon,
  ClipboardListIcon,
  DollarSignIcon,
  HandIcon,
  TimerIcon,
  TrendingUpIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/server/dashboard";

import { RecentReportsPanel } from "./_components/recent-reports-panel";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type StatItem = DashboardData["stats"][number];
type AnalyticsItem = DashboardData["analytics"][number];
type RecentAssessment = DashboardData["recentItems"][number];

const statIcons = [
  ClipboardListIcon,
  TimerIcon,
  CheckCircle2Icon,
  DollarSignIcon,
] as const;

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

function formatValue(stat: StatItem) {
  return stat.money ? formatMoney(stat.value) : stat.value.toLocaleString("en");
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusVariant(status: string) {
  if (status === "open") return "success";
  if (status === "cancelled" || status === "closed") return "secondary";
  if (status.includes("payment")) return "warning";
  if (status === "downloaded" || status === "archived") return "outline";
  return "default";
}

function MetricCard({
  index,
  stat,
}: {
  index: number;
  stat: StatItem;
}) {
  const Icon = statIcons[index] ?? TrendingUpIcon;

  return (
    <Frame>
      <FrameHeader className="flex-row items-center justify-between gap-3 p-2">
        <FrameTitle className="text-muted-foreground">{stat.label}</FrameTitle>
        <Icon className="size-4 text-muted-foreground" />
      </FrameHeader>
      <FramePanel className="grid gap-1 p-4">
        <div className="text-2xl font-semibold tracking-normal">
          {formatValue(stat)}
        </div>
        <div className="text-muted-foreground text-xs">Current workspace</div>
      </FramePanel>
    </Frame>
  );
}

function MetricsGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <MetricCard index={index} key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function AnalyticsPanel({ items }: { items: AnalyticsItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const chartHeight = 320;
  const chartWidth = 720;
  const plotTop = 24;
  const plotBottom = 258;
  const slot = (chartWidth - 112) / Math.max(1, items.length);
  const barWidth = Math.min(34, Math.max(18, slot * 0.48));
  const tickValues = [
    max,
    Math.ceil(max * 0.75),
    Math.ceil(max * 0.5),
    Math.ceil(max * 0.25),
    0,
  ];

  return (
    <Frame>
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2 p-2">
        <FrameTitle className="flex items-center gap-2">
          <BarChart3Icon className="size-4 text-muted-foreground" />
          Assessment analytics
        </FrameTitle>
        {items.length > 0 ? (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
            {items.map((item) => (
              <Badge key={item.status} variant={statusVariant(item.status)}>
                {item.label} {item.count}
              </Badge>
            ))}
          </div>
        ) : null}
      </FrameHeader>
      <FramePanel className="h-[500px] min-h-[500px] max-h-[500px] overflow-hidden">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <svg
            aria-label="Assessment analytics chart"
            className="h-full w-full"
            preserveAspectRatio="none"
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
                <title>Assessment analytics</title>
                <g>
                  {tickValues.map((tick, index) => {
                    const y =
                      plotBottom -
                      (tick / max) * Math.max(1, plotBottom - plotTop);

                    return (
                      <g key={`${tick}-${index}`}>
                        <line
                          className="stroke-border"
                          strokeDasharray="4 5"
                          x1="52"
                          x2={chartWidth - 24}
                          y1={y}
                          y2={y}
                        />
                        <text
                          className="fill-muted-foreground text-[11px]"
                          textAnchor="end"
                          x="42"
                          y={y + 4}
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}
                </g>
                {items.map((item, index) => {
                  const x = 64 + index * slot + (slot - barWidth) / 2;
                  const height =
                    (item.count / max) * Math.max(1, plotBottom - plotTop);
                  const y = plotBottom - height;

                  return (
                    <g key={item.status}>
                      <rect
                        className="fill-primary/20"
                        height={plotBottom - plotTop}
                        rx="10"
                        width={barWidth}
                        x={x}
                        y={plotTop}
                      />
                      <rect
                        className="fill-primary"
                        height={Math.max(6, height)}
                        rx="10"
                        width={barWidth}
                        x={x}
                        y={Math.min(plotBottom - 6, y)}
                      />
                      <text
                        className="fill-foreground text-[12px] font-semibold"
                        textAnchor="middle"
                        x={x + barWidth / 2}
                        y={Math.min(plotBottom - 14, y - 8)}
                      >
                        {item.count}
                      </text>
                      <text
                        className="fill-muted-foreground text-[11px]"
                        textAnchor="middle"
                        x={x + barWidth / 2}
                        y="292"
                      >
                        {item.label.length > 12
                          ? `${item.label.slice(0, 12)}...`
                          : item.label}
                      </text>
                    </g>
                  );
                })}
          </svg>
        )}
      </FramePanel>
    </Frame>
  );
}

function TopPeopleTable({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: Extract<DashboardData, { role: "admin" }>["topUsers"];
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <UsersRoundIcon className="size-4 text-muted-foreground" />
        {title}
      </div>
      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Assessments</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.user?.id ?? item.count}>
                <TableCell>
                  <div className="font-medium">
                    {item.user?.name ?? "Unknown user"}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {item.user?.email ?? "No email"}
                  </div>
                </TableCell>
                <TableCell>{item.count}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(item.revenueCents)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground text-sm" colSpan={3}>
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Frame>
    </div>
  );
}

function AssessmentTable({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: RecentAssessment[];
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardListIcon className="size-4 text-muted-foreground" />
        {title}
      </div>
      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Assessment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Writer</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link className="min-w-0" href={`/assessments/${item.id}`}>
                    <div className="truncate font-medium">{item.topic}</div>
                    <div className="truncate text-muted-foreground text-xs">
                      {item.title}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(item.status)}>
                    {statusLabel(item.status)}
                  </Badge>
                </TableCell>
                <TableCell>{item.user?.name ?? "Unknown"}</TableCell>
                <TableCell>{item.writer?.name ?? "Unassigned"}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(item.priceCents)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground text-sm" colSpan={5}>
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Frame>
    </div>
  );
}

function ClaimableTable({
  items,
}: {
  items: Extract<DashboardData, { role: "writer" }>["availableRows"];
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <HandIcon className="size-4 text-muted-foreground" />
        Available claimable assessments
      </div>
      <Frame>
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Assessment</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, 5).map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link href={`/assessments/${item.id}`}>
                    <div className="font-medium">{item.topic}</div>
                    <div className="text-muted-foreground text-xs">{item.title}</div>
                  </Link>
                </TableCell>
                <TableCell>{item.user?.name ?? "Unknown"}</TableCell>
                <TableCell>{formatDate(item.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(item.priceCents)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted-foreground text-sm" colSpan={4}>
                  No claimable assessments right now.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Frame>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const data = await getDashboardData(session.user);

  return (
    <main className="grid gap-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">
            Hello, {session.user.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Latest assessment and report activity for your workspace.
          </p>
        </div>
        <Badge variant="outline">
          <UserRoundIcon />
          {data.role}
        </Badge>
      </div>

      <MetricsGrid stats={data.stats} />

      {data.role === "admin" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <AnalyticsPanel items={data.analytics} />
            <RecentReportsPanel reports={data.recentReports} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <TopPeopleTable
              emptyLabel="No users have submitted assessments yet."
              items={data.topUsers}
              title="Top users"
            />
            <TopPeopleTable
              emptyLabel="No writers have completed assessments yet."
              items={data.topWriters}
              title="Top writers"
            />
          </div>
          <AssessmentTable
            emptyLabel="No assessments yet."
            items={data.recentItems}
            title="Recent transactions"
          />
        </>
      ) : data.role === "writer" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <AnalyticsPanel items={data.analytics} />
            <TopPeopleTable
              emptyLabel="No completed users yet."
              items={data.clients}
              title="Users you completed work for"
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ClaimableTable items={data.availableRows} />
            <AssessmentTable
              emptyLabel="No assigned assessments yet."
              items={data.recentItems}
              title="Your recent work"
            />
          </div>
        </>
      ) : (
        <>
          <AnalyticsPanel items={data.analytics} />
          <AssessmentTable
            emptyLabel="No assessments yet."
            items={data.recentItems}
            title="Your recent assessments"
          />
        </>
      )}
    </main>
  );
}
