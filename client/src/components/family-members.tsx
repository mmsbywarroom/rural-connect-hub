import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import type { FamilyMember } from "@shared/schema";

const familyMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relation: z.string().optional(),
  voterId: z.string().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
});

type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;

interface FamilyMembersProps {
  volunteerId: string;
}

export function FamilyMembers({ volunteerId }: FamilyMembersProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const form = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: { name: "", relation: "", voterId: "", gender: "" },
  });

  const { data: members, isLoading } = useQuery<FamilyMember[]>({
    queryKey: [`/api/volunteers/${volunteerId}/family`],
    enabled: !!volunteerId,
  });

  const createMember = useMutation({
    mutationFn: async (data: FamilyMemberFormData) => {
      return apiRequest("POST", "/api/family-members", { ...data, volunteerId });
    },
    onSuccess: () => {
      toast({ title: "Family member added!" });
      queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${volunteerId}/family`] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add family member", variant: "destructive" });
    },
  });

  const updateMember = useMutation({
    mutationFn: async (data: FamilyMemberFormData) => {
      return apiRequest("PATCH", `/api/family-members/${editingMember?.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Family member updated!" });
      queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${volunteerId}/family`] });
      setIsOpen(false);
      setEditingMember(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update family member", variant: "destructive" });
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/family-members/${id}`, undefined);
    },
    onSuccess: () => {
      toast({ title: "Family member removed!" });
      queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${volunteerId}/family`] });
    },
    onError: () => {
      toast({ title: "Failed to remove family member", variant: "destructive" });
    },
  });

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    form.reset({
      name: member.name,
      relation: member.relation || "",
      voterId: member.voterId || "",
      age: member.age || undefined,
      gender: member.gender || "",
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    form.reset({ name: "", relation: "", voterId: "", gender: "" });
    setIsOpen(true);
  };

  const onSubmit = (data: FamilyMemberFormData) => {
    if (editingMember) {
      updateMember.mutate(data);
    } else {
      createMember.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Family Members
        </h4>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAdd} data-testid="button-add-family-member">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMember ? "Edit Family Member" : "Add Family Member"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} data-testid="input-family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="relation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="son">Son</SelectItem>
                            <SelectItem value="daughter">Daughter</SelectItem>
                            <SelectItem value="brother">Brother</SelectItem>
                            <SelectItem value="sister">Sister</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Age"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMember.isPending || updateMember.isPending} data-testid="button-save-family-member">
                  {editingMember ? "Update" : "Add"} Family Member
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : !members?.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">No family members added yet</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Relation</TableHead>
              <TableHead>Voter ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id} data-testid={`row-family-${member.id}`}>
                <TableCell>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.gender} {member.age ? `(${member.age} yrs)` : ""}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {member.relation && <Badge variant="outline" className="capitalize">{member.relation}</Badge>}
                </TableCell>
                <TableCell className="text-sm">{member.voterId || "-"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMember.mutate(member.id)}
                    disabled={deleteMember.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
