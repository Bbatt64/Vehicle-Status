import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Truck, ArrowRight, ArrowLeft, CheckCircle, Clock, Loader2, Wrench } from "lucide-react";

interface Vehicle {
  id: number;
  name: string;
  status: string;
}

interface CheckoutLog {
  id: number;
  vehicleId: number;
  vehicleName: string;
  site: string;
  guardName: string;
  opsSupportName: string;
  outgoingTime: string;
  returnTime: string | null;
  inspectionComplete: boolean;
  perm24HrPost: boolean;
}

interface ShopLog {
  id: number;
  vehicleId: number;
  vehicleName: string;
  shopName: string;
  dateIn: string;
  timeIn: string;
  notes: string | null;
  dateOut: string | null;
  resolved: boolean;
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

export default function CheckoutPage() {
  const { toast } = useToast();

  // Checkout form state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [site, setSite] = useState("");
  const [guardName, setGuardName] = useState("");
  const [opsName, setOpsName] = useState("");
  const [perm24Hr, setPerm24Hr] = useState(false);

  // Shop form state
  const [shopVehicleId, setShopVehicleId] = useState<string>("");
  const [shopName, setShopName] = useState("");
  const [shopDate, setShopDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shopTime, setShopTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [shopNotes, setShopNotes] = useState("");

  // Only fetch available vehicles (active + not checked out)
  const { data: availableVehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles/available"],
  });

  const { data: activeCheckouts = [], isLoading: checkoutsLoading } = useQuery<CheckoutLog[]>({
    queryKey: ["/api/checkouts/active"],
  });

  const { data: activeShopLogs = [] } = useQuery<ShopLog[]>({
    queryKey: ["/api/shop/active"],
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles/available"] });
    queryClient.invalidateQueries({ queryKey: ["/api/checkouts/active"] });
    queryClient.invalidateQueries({ queryKey: ["/api/shop/active"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const checkoutMutation = useMutation({
    mutationFn: async (data: {
      vehicleId: number;
      vehicleName: string;
      site: string;
      guardName: string;
      opsSupportName: string;
      perm24HrPost: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/checkouts", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vehicle checked out", description: "Vehicle has been dispatched." });
      setSelectedVehicleId("");
      setSite("");
      setGuardName("");
      setOpsName("");
      setPerm24Hr(false);
      invalidateAll();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to checkout vehicle.", variant: "destructive" });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, inspectionComplete }: { id: number; inspectionComplete: boolean }) => {
      const res = await apiRequest("POST", `/api/checkouts/${id}/return`, { inspectionComplete });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vehicle returned", description: "Vehicle has been checked back in." });
      invalidateAll();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to return vehicle.", variant: "destructive" });
    },
  });

  const shopMutation = useMutation({
    mutationFn: async (data: {
      vehicleId: number;
      vehicleName: string;
      shopName: string;
      dateIn: string;
      timeIn: string;
      notes: string;
    }) => {
      const res = await apiRequest("POST", "/api/shop", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vehicle sent to shop", description: "Vehicle has been marked as in shop." });
      setShopVehicleId("");
      setShopName("");
      setShopNotes("");
      invalidateAll();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send vehicle to shop.", variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/shop/${id}/resolve`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vehicle back from shop", description: "Vehicle has been returned to active." });
      invalidateAll();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resolve shop log.", variant: "destructive" });
    },
  });

  const handleCheckout = () => {
    if (!selectedVehicleId || !site || !guardName || !opsName) {
      toast({ title: "Missing fields", description: "Fill out all fields before checking out.", variant: "destructive" });
      return;
    }
    const vehicle = availableVehicles.find((v) => v.id === Number(selectedVehicleId));
    if (!vehicle) return;
    checkoutMutation.mutate({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      site,
      guardName,
      opsSupportName: opsName,
      perm24HrPost: perm24Hr,
    });
  };

  const handleSendToShop = () => {
    if (!shopVehicleId || !shopName || !shopDate || !shopTime) {
      toast({ title: "Missing fields", description: "Fill out all required fields.", variant: "destructive" });
      return;
    }
    const vehicle = availableVehicles.find((v) => v.id === Number(shopVehicleId));
    if (!vehicle) return;
    shopMutation.mutate({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      shopName,
      dateIn: shopDate,
      timeIn: shopTime,
      notes: shopNotes,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Checkout / Send to Shop tabs */}
        <Card className="border border-border">
          <Tabs defaultValue="checkout">
            <CardHeader className="pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="checkout" className="flex-1 gap-1.5" data-testid="tab-checkout">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Check Out
                </TabsTrigger>
                <TabsTrigger value="shop" className="flex-1 gap-1.5" data-testid="tab-shop">
                  <Wrench className="h-3.5 w-3.5" />
                  Send to Shop
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Check Out Tab */}
            <TabsContent value="checkout">
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger data-testid="select-vehicle">
                      <SelectValue placeholder={vehiclesLoading ? "Loading..." : "Select available vehicle"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                        .map((v) => (
                          <SelectItem key={v.id} value={String(v.id)} data-testid={`vehicle-option-${v.id}`}>
                            {v.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {availableVehicles.length} vehicle{availableVehicles.length !== 1 ? "s" : ""} available
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Site</Label>
                  <Input
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    placeholder="Post/site name"
                    data-testid="input-site"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guard Name</Label>
                    <Input
                      value={guardName}
                      onChange={(e) => setGuardName(e.target.value)}
                      placeholder="Guard name"
                      data-testid="input-guard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ops Support</Label>
                    <Input
                      value={opsName}
                      onChange={(e) => setOpsName(e.target.value)}
                      placeholder="Ops name"
                      data-testid="input-ops"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <Label className="text-sm" htmlFor="perm-24hr">Perm 24Hr Post</Label>
                  <Switch
                    id="perm-24hr"
                    checked={perm24Hr}
                    onCheckedChange={setPerm24Hr}
                    data-testid="switch-perm24"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={checkoutMutation.isPending || !selectedVehicleId}
                  data-testid="button-checkout"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Check Out Vehicle
                </Button>
              </CardContent>
            </TabsContent>

            {/* Send to Shop Tab */}
            <TabsContent value="shop">
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle</Label>
                  <Select value={shopVehicleId} onValueChange={setShopVehicleId}>
                    <SelectTrigger data-testid="select-shop-vehicle">
                      <SelectValue placeholder={vehiclesLoading ? "Loading..." : "Select vehicle"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                        .map((v) => (
                          <SelectItem key={v.id} value={String(v.id)} data-testid={`shop-vehicle-option-${v.id}`}>
                            {v.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shop Name</Label>
                  <Input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Shop / repair facility name"
                    data-testid="input-shop-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={shopDate}
                      onChange={(e) => setShopDate(e.target.value)}
                      data-testid="input-shop-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</Label>
                    <Input
                      type="time"
                      value={shopTime}
                      onChange={(e) => setShopTime(e.target.value)}
                      data-testid="input-shop-time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
                  <Input
                    value={shopNotes}
                    onChange={(e) => setShopNotes(e.target.value)}
                    placeholder="Reason for service, issue description..."
                    data-testid="input-shop-notes"
                  />
                </div>

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleSendToShop}
                  disabled={shopMutation.isPending || !shopVehicleId}
                  data-testid="button-send-to-shop"
                >
                  {shopMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wrench className="h-4 w-4 mr-2" />
                  )}
                  Send to Shop
                </Button>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right column: Currently Checked Out + In Shop */}
        <div className="space-y-6">
          {/* Active Checkouts - Return */}
          <Card className="border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 text-emerald-500" />
                Currently Checked Out
                <Badge variant="secondary" className="ml-auto text-xs font-mono">
                  {activeCheckouts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
              {checkoutsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : activeCheckouts.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">All vehicles returned</p>
                </div>
              ) : (
                activeCheckouts.map((checkout) => (
                  <div
                    key={checkout.id}
                    className="p-3 rounded-md border border-border bg-card"
                    data-testid={`active-checkout-${checkout.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold font-mono">{checkout.vehicleName}</p>
                        <p className="text-xs text-muted-foreground">{checkout.site}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(checkout.outgoingTime)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {checkout.guardName} / {checkout.opsSupportName}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => returnMutation.mutate({ id: checkout.id, inspectionComplete: false })}
                          disabled={returnMutation.isPending}
                          data-testid={`button-return-${checkout.id}`}
                        >
                          Return
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => returnMutation.mutate({ id: checkout.id, inspectionComplete: true })}
                          disabled={returnMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          data-testid={`button-return-inspected-${checkout.id}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Inspected
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Currently In Shop */}
          <Card className="border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-500" />
                Currently In Shop
                <Badge variant="secondary" className="ml-auto text-xs font-mono">
                  {activeShopLogs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
              {activeShopLogs.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">No vehicles in shop</p>
                </div>
              ) : (
                activeShopLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-md border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20"
                    data-testid={`shop-log-${log.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold font-mono">{log.vehicleName}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">{log.shopName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{log.dateIn}</p>
                        <p className="text-xs text-muted-foreground">{log.timeIn}</p>
                      </div>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mb-2 italic">{log.notes}</p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => resolveMutation.mutate(log.id)}
                        disabled={resolveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        data-testid={`button-resolve-${log.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Back from Shop
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
