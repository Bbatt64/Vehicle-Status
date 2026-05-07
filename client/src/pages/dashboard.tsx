import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Wrench, CheckCircle, AlertTriangle, Activity, ArrowUpRight } from "lucide-react";

interface DashboardData {
  activeInField: Array<{
    id: number;
    vehicleName: string;
    site: string;
    guardName: string;
    opsSupportName: string;
    outgoingTime: string;
    vehicleStatus?: string;
    perm24HrPost?: boolean | number;
  }>;
  inShop: Array<{ id: number; name: string; status: string; shopName?: string; dateIn?: string | null; timeIn?: string | null; notes?: string | null; shopLogId?: number | null }>;
  inactive: Array<{ id: number; name: string; status: string }>;
  readyToGo: Array<{ id: number; name: string; status: string }>;
  totalActive: number;
  totalInactive: number;
  totalInShop: number;
  totalInField: number;
  totalReadyToGo: number;
  totalVehicles: number;
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function timeSince(isoString: string) {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (days >= 1) {
    const remH = hours - days * 24;
    return `${days}d ${remH}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function daysSince(isoString: string) {
  const diffMs = new Date().getTime() - new Date(isoString).getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KPICard
          label="Total Fleet"
          value={data.totalVehicles}
          icon={<Truck className="h-4 w-4" />}
          color="text-muted-foreground"
          bgColor="bg-muted/50"
        />
        <KPICard
          label="Active In Field"
          value={data.totalInField}
          icon={<Activity className="h-4 w-4" />}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
        <KPICard
          label="Ready to Go"
          value={data.totalReadyToGo}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <KPICard
          label="In Shop"
          value={data.totalInShop}
          icon={<Wrench className="h-4 w-4" />}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-950/30"
        />
        <KPICard
          label="Inactive"
          value={data.totalInactive}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-red-500 dark:text-red-400"
          bgColor="bg-red-50 dark:bg-red-950/30"
        />
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Active In Field */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Active In Field
              <Badge variant="secondary" className="ml-auto text-xs font-mono">
                {data.totalInField}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[640px] overflow-y-auto">
            {data.activeInField.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No vehicles in field</p>
            ) : (
              data.activeInField.map((checkout) => {
                const isPerm = !!checkout.perm24HrPost;
                const isOverdue = isPerm && daysSince(checkout.outgoingTime) > 7;
                return (
                  <div
                    key={checkout.id}
                    className={
                      isOverdue
                        ? "flex items-start justify-between p-3 rounded-md bg-red-100 dark:bg-red-950/40 border-2 border-red-500 animate-pulse"
                        : "flex items-start justify-between p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30"
                    }
                    data-testid={`field-vehicle-${checkout.id}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold font-mono ${isOverdue ? "text-red-700 dark:text-red-300" : ""}`}>
                          {checkout.vehicleName}
                        </p>
                        {isPerm && (
                          <Badge
                            variant="outline"
                            className={
                              isOverdue
                                ? "text-[10px] px-1.5 py-0 h-4 border-red-500 text-red-700 dark:text-red-300"
                                : "text-[10px] px-1.5 py-0 h-4"
                            }
                          >
                            24HR
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{checkout.site}</p>
                      <p className="text-xs text-muted-foreground">{checkout.guardName}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs text-muted-foreground">{formatTime(checkout.outgoingTime)}</p>
                      <p
                        className={
                          isOverdue
                            ? "text-xs font-bold text-red-700 dark:text-red-300 mt-0.5"
                            : "text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5"
                        }
                      >
                        {timeSince(checkout.outgoingTime)} ago
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* In Shop / Out of Service */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-amber-500" />
              Out of Service / In Shop
              <Badge variant="secondary" className="ml-auto text-xs font-mono">
                {data.totalInShop}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.inShop.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm text-muted-foreground">All vehicles operational</p>
              </div>
            ) : (
              data.inShop.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-3 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30"
                  data-testid={`shop-vehicle-${vehicle.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold font-mono">{vehicle.name}</p>
                      {vehicle.shopName && vehicle.shopName !== "Unknown" && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{vehicle.shopName}</p>
                      )}
                      {vehicle.notes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{vehicle.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {vehicle.dateIn && (
                        <p className="text-xs text-muted-foreground">{vehicle.dateIn}</p>
                      )}
                      {vehicle.timeIn && (
                        <p className="text-xs text-muted-foreground">{vehicle.timeIn}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ready to Go */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Ready to Go
              <Badge variant="secondary" className="ml-auto text-xs font-mono">
                {data.totalReadyToGo}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {data.readyToGo.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No vehicles available</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.readyToGo
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                  .map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30"
                      data-testid={`ready-vehicle-${vehicle.id}`}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-sm font-mono font-medium">{vehicle.name}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inactive vehicles */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            Inactive Vehicles
            <Badge variant="secondary" className="ml-auto text-xs font-mono">
              {data.totalInactive}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.inactive
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
              .map((vehicle) => (
                <Badge
                  key={vehicle.id}
                  variant="outline"
                  className="text-xs font-mono text-red-500 dark:text-red-400 border-red-200 dark:border-red-800/50"
                  data-testid={`inactive-vehicle-${vehicle.id}`}
                >
                  {vehicle.name}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-md ${bgColor} ${color}`}>{icon}</div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-2xl font-bold font-mono tabular-nums ${color}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
