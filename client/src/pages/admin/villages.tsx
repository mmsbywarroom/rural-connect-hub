import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, MapPin, Search } from "lucide-react";
import type { Village } from "@shared/schema";

const villageFormSchema = z.object({
  name: z.string().min(1, "Village name is required"),
  zone: z.string().optional().default(""),
  district: z.string().optional().default(""),
  halka: z.string().optional().default(""),
  blockNumber: z.string().optional().default(""),
  isActive: z.boolean().default(true),
});

type VillageFormData = z.infer<typeof villageFormSchema>;

export default function VillagesPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<VillageFormData>({
    resolver: zodResolver(villageFormSchema),
    defaultValues: { name: "", zone: "", district: "", halka: "", blockNumber: "", isActive: true },
  });

  const { data: villages, isLoading } = useQuery<Village[]>({
    queryKey: ["/api/villages", "all"],
    queryFn: async () => {
      const res = await fetch("/api/villages?all=true");
      if (!res.ok) throw new Error("Failed to fetch villages");
      return res.json();
    },
  });

  const createVillage = useMutation({
    mutationFn: async (data: VillageFormData) => apiRequest("POST", "/api/villages", data),
    onSuccess: () => {
      toast({ title: "Village added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add village", variant: "destructive" }),
  });

  const updateVillage = useMutation({
    mutationFn: async (data: VillageFormData) => apiRequest("PATCH", `/api/villages/${editingVillage?.id}`, data),
    onSuccess: () => {
      toast({ title: "Village updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      setIsOpen(false);
      setEditingVillage(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update village", variant: "destructive" }),
  });

  const handleEdit = (village: Village) => {
    setEditingVillage(village);
    form.reset({ name: village.name, zone: village.zone || "", district: village.district || "", halka: village.halka || "", blockNumber: village.blockNumber || "", isActive: village.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingVillage(null);
    form.reset({ name: "", zone: "", district: "", halka: "", blockNumber: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: VillageFormData) => {
    const payload = {
      ...data,
      zone: data.zone || null,
      district: data.district || null,
      halka: data.halka || null,
      blockNumber: data.blockNumber || null,
    };
    if (editingVillage) {
      updateVillage.mutate(payload as VillageFormData);
    } else {
      createVillage.mutate(payload as VillageFormData);
    }
  };

  const filteredVillages = villages?.filter((v) => {
    const s = search.toLowerCase();
    return v.name.toLowerCase().includes(s) ||
      (v.zone || "").toLowerCase().includes(s) ||
      (v.district || "").toLowerCase().includes(s) ||
      (v.halka || "").toLowerCase().includes(s) ||
      (v.blockNumber || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-villages-title">
            <MapPin className="h-6 w-6 text-primary" />
            Villages
          </h1>
          <p className="text-muted-foreground">Manage village master data</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-village">
              <Plus className="h-4 w-4 mr-2" />
              Add Village
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVillage ? "Edit Village" : "Add New Village"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Village / Ward Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter village or ward name" {...field} data-testid="input-village-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone</FormLabel>
                      <FormControl>
                        <Input placeholder="Zone name" {...field} data-testid="input-village-zone" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <Input placeholder="District name" {...field} data-testid="input-village-district" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="halka"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Halka (AC Name)</FormLabel>
                      <FormControl>
                        <Input placeholder="Halka / AC name" {...field} data-testid="input-village-halka" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="blockNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Block number" {...field} data-testid="input-village-block" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createVillage.isPending || updateVillage.isPending} data-testid="button-save-village">
                  {editingVillage ? "Update" : "Add"} Village
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search villages..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-villages"
              />
            </div>
            <Badge variant="secondary">{filteredVillages?.length || 0} villages</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredVillages?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No villages found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Village / Ward</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Halka (AC)</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVillages?.map((village) => (
                    <TableRow key={village.id} data-testid={`row-village-${village.id}`}>
                      <TableCell className="font-medium">{village.name}</TableCell>
                      <TableCell className="text-muted-foreground">{village.zone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{village.district || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{village.halka || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{village.blockNumber || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={village.isActive ? "default" : "secondary"}>
                          {village.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(village)} data-testid={`button-edit-village-${village.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
