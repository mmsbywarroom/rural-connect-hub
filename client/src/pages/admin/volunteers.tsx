import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Users, Phone, MapPin, Search, Calendar, Briefcase, Eye } from "lucide-react";
import { FamilyMembers } from "@/components/family-members";
import type { Volunteer, Village, Wing, Position, LeadershipFlag } from "@shared/schema";

const volunteerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobileNumber: z.string().min(10, "Valid mobile number required"),
  photo: z.string().optional(),
  wingId: z.string().optional(),
  positionId: z.string().optional(),
  voterId: z.string().optional(),
  villageId: z.string().optional(),
  wardName: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfAnniversary: z.string().optional(),
  age: z.number().optional(),
  occupation: z.string().optional(),
  qualification: z.string().optional(),
  gender: z.string().optional(),
  leadershipFlagId: z.string().optional(),
  pin: z.string().optional(),
});

type VolunteerFormData = z.infer<typeof volunteerFormSchema>;

export default function VolunteersPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [viewingVolunteer, setViewingVolunteer] = useState<Volunteer | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<VolunteerFormData>({
    resolver: zodResolver(volunteerFormSchema),
    defaultValues: {
      name: "",
      mobileNumber: "",
      photo: "",
      wingId: "",
      positionId: "",
      voterId: "",
      villageId: "",
      wardName: "",
      address: "",
      dateOfBirth: "",
      dateOfAnniversary: "",
      occupation: "",
      qualification: "",
      gender: "",
      leadershipFlagId: "",
      pin: "1234",
    },
  });

  const { data: volunteers, isLoading } = useQuery<Volunteer[]>({
    queryKey: ["/api/volunteers"],
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: wings } = useQuery<Wing[]>({
    queryKey: ["/api/wings"],
  });

  const { data: positions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });

  const { data: leadershipFlags } = useQuery<LeadershipFlag[]>({
    queryKey: ["/api/leadership-flags"],
  });

  const createVolunteer = useMutation({
    mutationFn: async (data: VolunteerFormData) => {
      const payload = {
        ...data,
        age: data.dateOfBirth ? calculateAge(data.dateOfBirth) : undefined,
      };
      return apiRequest("POST", "/api/volunteers", payload);
    },
    onSuccess: () => {
      toast({ title: "Volunteer added successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add volunteer", variant: "destructive" });
    },
  });

  const updateVolunteer = useMutation({
    mutationFn: async (data: VolunteerFormData) => {
      const payload = {
        ...data,
        age: data.dateOfBirth ? calculateAge(data.dateOfBirth) : undefined,
      };
      return apiRequest("PATCH", `/api/volunteers/${editingVolunteer?.id}`, payload);
    },
    onSuccess: () => {
      toast({ title: "Volunteer updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      setIsOpen(false);
      setEditingVolunteer(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update volunteer", variant: "destructive" });
    },
  });

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    form.reset({
      name: volunteer.name,
      mobileNumber: volunteer.mobileNumber,
      photo: volunteer.photo || "",
      wingId: volunteer.wingId || "",
      positionId: volunteer.positionId || "",
      voterId: volunteer.voterId || "",
      villageId: volunteer.villageId || "",
      wardName: volunteer.wardName || "",
      address: volunteer.address || "",
      dateOfBirth: volunteer.dateOfBirth || "",
      dateOfAnniversary: volunteer.dateOfAnniversary || "",
      occupation: volunteer.occupation || "",
      qualification: volunteer.qualification || "",
      gender: volunteer.gender || "",
      leadershipFlagId: volunteer.leadershipFlagId || "",
      pin: volunteer.pin || "1234",
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingVolunteer(null);
    form.reset();
    setIsOpen(true);
  };

  const handleViewDetails = (volunteer: Volunteer) => {
    setViewingVolunteer(volunteer);
    setIsDetailsOpen(true);
  };

  const onSubmit = (data: VolunteerFormData) => {
    if (editingVolunteer) {
      updateVolunteer.mutate(data);
    } else {
      createVolunteer.mutate(data);
    }
  };

  const filteredVolunteers = volunteers?.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.mobileNumber.includes(search)
  );

  const getVillageName = (id: string | null) => villages?.find((v) => v.id === id)?.name || "-";
  const getWingName = (id: string | null) => wings?.find((w) => w.id === id)?.name || "-";
  const getPositionName = (id: string | null) => positions?.find((p) => p.id === id)?.name || "-";
  const getLeadershipFlag = (id: string | null) => leadershipFlags?.find((l) => l.id === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-volunteers-title">
            <Users className="h-6 w-6 text-primary" />
            Volunteers
          </h1>
          <p className="text-muted-foreground">Manage volunteer records</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-volunteer">
              <Plus className="h-4 w-4 mr-2" />
              Add Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVolunteer ? "Edit Volunteer" : "Add New Volunteer"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} data-testid="input-volunteer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Mobile number" {...field} data-testid="input-volunteer-mobile" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="wingId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wing</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-wing">
                              <SelectValue placeholder="Select wing" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wings?.filter(w => w.isActive).map((wing) => (
                              <SelectItem key={wing.id} value={wing.id}>{wing.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="positionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-position">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {positions?.filter(p => p.isActive).map((pos) => (
                              <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="villageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Village</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-volunteer-village">
                              <SelectValue placeholder="Select village" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {villages?.filter(v => v.isActive).map((village) => (
                              <SelectItem key={village.id} value={village.id}>{village.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wardName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ward Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ward name" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Full address" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="voterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voter ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Voter ID" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-dob" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfAnniversary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anniversary</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input placeholder="Occupation" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qualification</FormLabel>
                        <FormControl>
                          <Input placeholder="Qualification" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="leadershipFlagId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leadership Flag</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-leadership">
                            <SelectValue placeholder="Select leadership flag" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {leadershipFlags?.filter(l => l.isActive).map((flag) => (
                            <SelectItem key={flag.id} value={flag.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: flag.color || "#3b82f6" }}
                                />
                                {flag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login PIN (Last 4 digits)</FormLabel>
                      <FormControl>
                        <Input placeholder="4-digit PIN" maxLength={4} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createVolunteer.isPending || updateVolunteer.isPending} data-testid="button-save-volunteer">
                  {editingVolunteer ? "Update Volunteer" : "Add Volunteer"}
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
                placeholder="Search by name or mobile..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-volunteers"
              />
            </div>
            <Badge variant="secondary">{filteredVolunteers?.length || 0} volunteers</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredVolunteers?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No volunteers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Wing / Position</TableHead>
                    <TableHead>Leadership</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVolunteers?.map((volunteer) => {
                    const flag = getLeadershipFlag(volunteer.leadershipFlagId);
                    return (
                      <TableRow key={volunteer.id} data-testid={`row-volunteer-${volunteer.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {volunteer.photo ? (
                                <AvatarImage src={volunteer.photo} alt={volunteer.name} />
                              ) : (
                                <AvatarFallback>{volunteer.name.charAt(0).toUpperCase()}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{volunteer.name}</p>
                              <p className="text-xs text-muted-foreground">{volunteer.gender || "-"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {volunteer.mobileNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {getVillageName(volunteer.villageId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{getWingName(volunteer.wingId)}</p>
                            <p className="text-muted-foreground">{getPositionName(volunteer.positionId)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {flag && (
                            <Badge
                              variant="outline"
                              style={{ borderColor: flag.color || "#3b82f6", color: flag.color || "#3b82f6" }}
                            >
                              {flag.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(volunteer)}
                            data-testid={`button-view-volunteer-${volunteer.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(volunteer)}
                            data-testid={`button-edit-volunteer-${volunteer.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {viewingVolunteer?.photo ? (
                  <AvatarImage src={viewingVolunteer.photo} alt={viewingVolunteer.name} />
                ) : (
                  <AvatarFallback>{viewingVolunteer?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <p>{viewingVolunteer?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">{viewingVolunteer?.mobileNumber}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewingVolunteer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Village</p>
                  <p className="font-medium">{getVillageName(viewingVolunteer.villageId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Wing</p>
                  <p className="font-medium">{getWingName(viewingVolunteer.wingId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-medium">{getPositionName(viewingVolunteer.positionId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Voter ID</p>
                  <p className="font-medium">{viewingVolunteer.voterId || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Occupation</p>
                  <p className="font-medium">{viewingVolunteer.occupation || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qualification</p>
                  <p className="font-medium">{viewingVolunteer.qualification || "-"}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <FamilyMembers volunteerId={viewingVolunteer.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
