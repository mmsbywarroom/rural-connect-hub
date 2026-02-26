import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Edit, AlertTriangle, Search } from "lucide-react";
import type { Issue } from "@shared/schema";

const issueFormSchema = z.object({
  name: z.string().min(1, "Issue name is required"),
  isActive: z.boolean().default(true),
});

type IssueFormData = z.infer<typeof issueFormSchema>;

export default function IssuesPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: { name: "", isActive: true },
  });

  const { data: issues, isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
  });

  const createIssue = useMutation({
    mutationFn: async (data: IssueFormData) => apiRequest("POST", "/api/issues", data),
    onSuccess: () => {
      toast({ title: "Issue added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add issue", variant: "destructive" }),
  });

  const updateIssue = useMutation({
    mutationFn: async (data: IssueFormData) => apiRequest("PATCH", `/api/issues/${editingIssue?.id}`, data),
    onSuccess: () => {
      toast({ title: "Issue updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setIsOpen(false);
      setEditingIssue(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update issue", variant: "destructive" }),
  });

  const handleEdit = (issue: Issue) => {
    setEditingIssue(issue);
    form.reset({ name: issue.name, isActive: issue.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingIssue(null);
    form.reset({ name: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: IssueFormData) => {
    if (editingIssue) {
      updateIssue.mutate(data);
    } else {
      createIssue.mutate(data);
    }
  };

  const filteredIssues = issues?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-issues-title">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Issues
          </h1>
          <p className="text-muted-foreground">Manage issue categories</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-issue">
              <Plus className="h-4 w-4 mr-2" />
              Add Issue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingIssue ? "Edit Issue" : "Add New Issue"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter issue name" {...field} data-testid="input-issue-name" />
                      </FormControl>
                      <FormMessage />
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
                <Button type="submit" className="w-full" disabled={createIssue.isPending || updateIssue.isPending} data-testid="button-save-issue">
                  {editingIssue ? "Update" : "Add"} Issue
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
                placeholder="Search issues..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-issues"
              />
            </div>
            <Badge variant="secondary">{filteredIssues?.length || 0} issues</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredIssues?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No issues found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues?.map((issue) => (
                  <TableRow key={issue.id} data-testid={`row-issue-${issue.id}`}>
                    <TableCell className="font-medium">{issue.name}</TableCell>
                    <TableCell>
                      <Badge variant={issue.isActive ? "default" : "secondary"}>
                        {issue.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(issue)} data-testid={`button-edit-issue-${issue.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
