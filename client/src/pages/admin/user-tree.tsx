import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Users, UserPlus, FileCheck, FileX, Search } from "lucide-react";

interface UserTreeItem {
  id: string;
  name: string;
  mobileNumber: string | null;
  email: string | null;
  role: string;
  mappedAreaName: string | null;
  volunteerMappingCount: number;
  supporterMappingCount: number;
  documentsUploaded: string[];
  documentsMissing: string[];
}

interface UserTreeResponse {
  users: UserTreeItem[];
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function UserTreePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<UserTreeResponse>({
    queryKey: ["/api/admin/user-tree"],
  });

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!searchTerm.trim()) return data.users;
    const q = searchTerm.toLowerCase().trim();
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.mobileNumber || "").includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [data?.users, searchTerm]);

  const groupedByLetter = useMemo(() => {
    const groups: Record<string, UserTreeItem[]> = {};
    for (const u of filteredUsers) {
      const first = (u.name.trim()[0] || "?").toUpperCase();
      const letter = /[A-Z0-9]/.test(first) ? first : "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(u);
    }
    const letters = Object.keys(groups).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
    return letters.map((letter) => ({ letter, users: groups[letter] }));
  }, [filteredUsers]);

  const toggleLetter = (letter: string) => {
    setExpandedLetters((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedLetters(new Set(groupedByLetter.map((g) => g.letter)));
  };

  const collapseAll = () => {
    setExpandedLetters(new Set());
  };

  const handleExport = () => {
    if (!data?.users.length) return;
    const headers = [
      "Name",
      "Mobile",
      "Email",
      "Role",
      "Unit",
      "Volunteer Mapping",
      "Supporter Mapping",
      "Documents Uploaded",
      "Documents Missing",
    ];
    const headerRow = headers.map(escapeCSVField).join(",");
    const dataRows = data.users.map((u) => {
      const fields = [
        u.name,
        u.mobileNumber || "",
        u.email || "",
        u.role,
        u.mappedAreaName || "",
        String(u.volunteerMappingCount),
        String(u.supporterMappingCount),
        u.documentsUploaded.join("; "),
        u.documentsMissing.join("; "),
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), "user-tree-report.csv");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading user tree...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Tree</CardTitle>
          <CardDescription>
            All app users with volunteer mapping, supporter mapping counts, and profile document status. Grouped by name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="text-sm text-primary hover:underline"
              >
                Expand all
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-sm text-primary hover:underline"
              >
                Collapse all
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="text-sm text-primary hover:underline ml-2"
              >
                Export CSV
              </button>
            </div>
          </div>

          {groupedByLetter.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No users found.</p>
          ) : (
            <div className="space-y-1">
              {groupedByLetter.map(({ letter, users }) => (
                <Collapsible
                  key={letter}
                  open={expandedLetters.has(letter) || groupedByLetter.length <= 5}
                  onOpenChange={() => toggleLetter(letter)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50 text-left font-medium">
                    {expandedLetters.has(letter) || groupedByLetter.length <= 5 ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="text-lg">{letter}</span>
                    <span className="text-muted-foreground text-sm">({users.length} users)</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 space-y-2">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="flex flex-wrap items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30"
                        >
                          <div className="min-w-[180px]">
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {u.mobileNumber || u.email || "-"}
                            </p>
                            {u.mappedAreaName && (
                              <p className="text-xs text-muted-foreground mt-0.5">{u.mappedAreaName}</p>
                            )}
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">{u.volunteerMappingCount}</span>
                              <span className="text-xs text-muted-foreground">Volunteer</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <UserPlus className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">{u.supporterMappingCount}</span>
                              <span className="text-xs text-muted-foreground">Supporter</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 min-w-0">
                            {u.documentsUploaded.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <FileCheck className="h-4 w-4 text-green-600 shrink-0" />
                                <div className="flex flex-wrap gap-1">
                                  {u.documentsUploaded.map((d) => (
                                    <Badge key={d} variant="secondary" className="text-xs">
                                      {d}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {u.documentsMissing.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <FileX className="h-4 w-4 text-amber-600 shrink-0" />
                                <div className="flex flex-wrap gap-1">
                                  {u.documentsMissing.map((d) => (
                                    <Badge key={d} variant="outline" className="text-xs border-amber-300 text-amber-700">
                                      {d} (missing)
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
