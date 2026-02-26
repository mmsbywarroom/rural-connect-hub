import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Building, Search, CheckCircle, XCircle, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import type { Visitor, Village, Issue, Department } from "@shared/schema";

export default function VisitorsPage() {
  const [search, setSearch] = useState("");

  const { data: visitors, isLoading } = useQuery<Visitor[]>({
    queryKey: ["/api/visitors"],
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: issues } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const getVillageName = (id: string | null) => villages?.find((v) => v.id === id)?.name || "-";
  const getIssueName = (id: string | null) => issues?.find((i) => i.id === id)?.name || "-";
  const getDepartmentName = (id: string | null) => departments?.find((d) => d.id === id)?.name || "-";

  const filteredVisitors = visitors?.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.mobileNumber.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-visitors-title">
          <Building className="h-6 w-6 text-primary" />
          Office Visitors
        </h1>
        <p className="text-muted-foreground">All recorded office visits</p>
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
                data-testid="input-search-visitors"
              />
            </div>
            <Badge variant="secondary">{filteredVisitors?.length || 0} records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredVisitors?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No visitors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisitors?.map((visitor) => (
                    <TableRow key={visitor.id} data-testid={`row-visitor-${visitor.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {visitor.photo ? (
                              <AvatarImage src={visitor.photo} alt={visitor.name} />
                            ) : (
                              <AvatarFallback>{visitor.name.charAt(0).toUpperCase()}</AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium">{visitor.name}</p>
                            {visitor.voterId && (
                              <p className="text-xs text-muted-foreground">ID: {visitor.voterId}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {visitor.mobileNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {getVillageName(visitor.villageId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getIssueName(visitor.issueId)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getDepartmentName(visitor.departmentId)}</TableCell>
                      <TableCell>
                        {visitor.isSolved ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Solved
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {visitor.createdAt ? new Date(visitor.createdAt).toLocaleDateString() : "-"}
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
