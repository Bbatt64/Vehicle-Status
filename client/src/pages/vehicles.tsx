import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Truck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Vehicle {
  id: number;
  name: string;
  status: string;
  airtableId: string;
}

export default function VehiclesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const filtered = vehicles
    .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
      case "Inactive":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50";
      case "In shop":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-vehicles"
          />
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {filtered.length} vehicles
        </Badge>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground p-3">Vehicle</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground p-3">Status</th>
                  <th className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-sm text-muted-foreground">Loading vehicles...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No vehicles found</td>
                  </tr>
                ) : (
                  filtered.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      data-testid={`vehicle-row-${vehicle.id}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold font-mono">{vehicle.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs font-medium ${statusColor(vehicle.status)}`}>
                          {vehicle.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Select
                          value={vehicle.status}
                          onValueChange={(status) => statusMutation.mutate({ id: vehicle.id, status })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs ml-auto" data-testid={`status-select-${vehicle.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="In shop">In Shop</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
