import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ClipboardList, ExternalLink, Users, CheckCircle2, Clock } from "lucide-react";
import type { TaskConfig } from "@shared/schema";

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  nameHi: z.string().optional().default(""),
  namePa: z.string().optional().default(""),
  description: z.string().optional().default(""),
  descriptionHi: z.string().optional().default(""),
  descriptionPa: z.string().optional().default(""),
  icon: z.string().optional().default("ClipboardList"),
  color: z.string().optional().default("#3b82f6"),
  sortOrder: z.coerce.number().int().default(0),
  villageRestricted: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  categoryId: z.string().nullable().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function TaskManagerPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskConfig | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskConfig | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      nameHi: "",
      namePa: "",
      description: "",
      descriptionHi: "",
      descriptionPa: "",
      icon: "ClipboardList",
      color: "#3b82f6",
      sortOrder: 0,
      villageRestricted: false,
      isEnabled: true,
      categoryId: null as string | null,
    },
  });

  const { data: taskConfigs, isLoading } = useQuery<TaskConfig[]>({
    queryKey: ["/api/task-configs"],
  });

  const { data: categories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/task-categories"],
  });

  const { data: taskStats } = useQuery<{ totalUsers: number; stats: Record<string, { submittedUsers: number; totalSubmissions: number }> }>({
    queryKey: ["/api/task-configs/stats"],
  });

  const createTask = useMutation({
    mutationFn: async (data: TaskFormData) => apiRequest("POST", "/api/task-configs", data),
    onSuccess: () => {
      toast({ title: "Task created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-configs"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async (data: TaskFormData) => apiRequest("PATCH", `/api/task-configs/${editingTask?.id}`, data),
    onSuccess: () => {
      toast({ title: "Task updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-configs"] });
      setIsOpen(false);
      setEditingTask(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      apiRequest("PATCH", `/api/task-configs/${id}`, { isEnabled }),
    onSuccess: () => {
      toast({ title: "Task status updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-configs"] });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/task-configs/${id}`),
    onSuccess: () => {
      toast({ title: "Task deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-configs"] });
      setDeletingTask(null);
    },
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  const handleAdd = () => {
    setEditingTask(null);
    form.reset({
      name: "",
      nameHi: "",
      namePa: "",
      description: "",
      descriptionHi: "",
      descriptionPa: "",
      icon: "ClipboardList",
      color: "#3b82f6",
      sortOrder: 0,
      villageRestricted: false,
      isEnabled: true,
      categoryId: null,
    });
    setIsOpen(true);
  };

  const handleEdit = (task: TaskConfig) => {
    setEditingTask(task);
    form.reset({
      name: task.name,
      nameHi: (task as any).nameHi ?? "",
      namePa: (task as any).namePa ?? "",
      description: task.description ?? "",
      descriptionHi: (task as any).descriptionHi ?? "",
      descriptionPa: (task as any).descriptionPa ?? "",
      icon: task.icon ?? "ClipboardList",
      color: task.color ?? "#3b82f6",
      sortOrder: task.sortOrder ?? 0,
      villageRestricted: task.villageRestricted ?? false,
      isEnabled: task.isEnabled ?? true,
      categoryId: (task as any).categoryId ?? null,
    });
    setIsOpen(true);
  };

  const onSubmit = (data: TaskFormData) => {
    const payload = { ...data, categoryId: data.categoryId || null };
    if (editingTask) {
      updateTask.mutate(payload);
    } else {
      createTask.mutate(payload);
    }
  };

  const sortedTasks = taskConfigs?.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-task-manager-title">
            <ClipboardList className="h-6 w-6 text-primary" />
            Task Manager
          </h1>
          <p className="text-muted-foreground">Configure tasks for the Volunteer Portal app</p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-task">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : sortedTasks?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p data-testid="text-no-tasks">No tasks configured yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks?.map((task) => (
            <Card
              key={task.id}
              data-testid={`card-task-${task.id}`}
              className="overflow-visible"
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-10 rounded-sm shrink-0"
                      style={{ backgroundColor: task.color ?? "#3b82f6" }}
                      data-testid={`swatch-task-${task.id}`}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" data-testid={`text-task-name-${task.id}`}>
                        {task.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-task-description-${task.id}`}>
                        {task.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={task.isEnabled ? "default" : "secondary"} data-testid={`badge-task-status-${task.id}`}>
                    {task.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2" data-testid={`stat-total-users-${task.id}`}>
                    <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{taskStats?.totalUsers ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">Active Users</div>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-950 p-2" data-testid={`stat-submitted-users-${task.id}`}>
                    <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">{taskStats?.stats?.[task.id]?.submittedUsers ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">Completed</div>
                  </div>
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-2" data-testid={`stat-pending-users-${task.id}`}>
                    <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 mb-0.5">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{Math.max(0, (taskStats?.totalUsers ?? 0) - (taskStats?.stats?.[task.id]?.submittedUsers ?? 0))}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">Pending</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span data-testid={`text-task-icon-${task.id}`}>
                    Icon: {task.icon ?? "ClipboardList"}
                  </span>
                  <span>|</span>
                  <span data-testid={`text-task-sort-${task.id}`}>
                    Order: {task.sortOrder ?? 0}
                  </span>
                  {task.villageRestricted && (
                    <>
                      <span>|</span>
                      <Badge variant="outline" className="text-xs">Village Restricted</Badge>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${task.id}`} className="text-sm">Enabled</Label>
                    <Switch
                      id={`toggle-${task.id}`}
                      checked={task.isEnabled ?? true}
                      onCheckedChange={(checked) =>
                        toggleEnabled.mutate({ id: task.id, isEnabled: checked })
                      }
                      data-testid={`switch-task-enabled-${task.id}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/form-builder?taskId=${task.id}`}>
                      <Button variant="ghost" size="icon" data-testid={`button-edit-fields-${task.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(task)}
                      data-testid={`button-edit-task-${task.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTask(task)}
                      data-testid={`button-delete-task-${task.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="task-form-description">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription id="task-form-description">
              {editingTask ? "Update task name, category, and settings." : "Create a new task for the volunteer app."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task name" {...field} data-testid="input-task-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="nameHi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Hindi)</FormLabel>
                      <FormControl>
                        <Input placeholder="हिंदी नाम" {...field} data-testid="input-task-name-hi" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="namePa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Punjabi)</FormLabel>
                      <FormControl>
                        <Input placeholder="ਪੰਜਾਬੀ ਨਾਮ" {...field} data-testid="input-task-name-pa" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (English)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter description" {...field} data-testid="input-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="descriptionHi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desc (Hindi)</FormLabel>
                      <FormControl>
                        <Input placeholder="हिंदी विवरण" {...field} data-testid="input-task-desc-hi" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descriptionPa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desc (Punjabi)</FormLabel>
                      <FormControl>
                        <Input placeholder="ਪੰਜਾਬੀ ਵੇਰਵਾ" {...field} data-testid="input-task-desc-pa" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (for user dashboard)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No category</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ClipboardList" {...field} data-testid="input-task-icon" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} className="h-9 cursor-pointer" data-testid="input-task-color" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-task-sort-order" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="villageRestricted"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>Village Restricted</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-task-village-restricted"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>Enabled</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-task-is-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createTask.isPending || updateTask.isPending}
                data-testid="button-save-task"
              >
                {editingTask ? "Update" : "Create"} Task
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTask && deleteTask.mutate(deletingTask.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
