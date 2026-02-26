import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Vote, Search, ChevronLeft, ChevronRight, Database, User, MapPin, Phone, Building, Hash, Briefcase, Calendar, Home, Users as UsersIcon } from "lucide-react";

interface VoterRecord {
  id: string;
  assemblyNo: string | null;
  partNo: string | null;
  srno: string | null;
  boothId: string | null;
  draftSrno: string | null;
  localLastName: string | null;
  localFirstName: string | null;
  localMiddleName: string | null;
  engLastName: string | null;
  engFirstName: string | null;
  engMiddleName: string | null;
  sex: string | null;
  age: string | null;
  vcardId: string | null;
  houseNo: string | null;
  localVillage: string | null;
  engVillage: string | null;
  localTaluka: string | null;
  engTaluka: string | null;
  localAssemblyName: string | null;
  engAssemblyName: string | null;
  localAddress: string | null;
  engAddress: string | null;
  boothNo: string | null;
  localBoothAddress: string | null;
  engBoothAddress: string | null;
  localNewAddress: string | null;
  engNewAddress: string | null;
  familyId: string | null;
  mobileNo1: string | null;
  mobileNo2: string | null;
  emailId: string | null;
  localCastName: string | null;
  engCastName: string | null;
  localProfessionName: string | null;
  engProfessionName: string | null;
  voted: string | null;
  dead: string | null;
  repeated: string | null;
  repeatedNo: string | null;
  important: string | null;
  color: string | null;
  karykartaNo: string | null;
  karyakarta1: string | null;
  demands: string | null;
  society: string | null;
  flatNo: string | null;
  fullName: string | null;
  dob: string | null;
  type: string | null;
  vtype: string | null;
  addressChange: string | null;
  assemblyMapping: string | null;
  engGat: string | null;
  localGat: string | null;
  engGan: string | null;
  localGan: string | null;
  votedBy: string | null;
  printed: string | null;
  printedBy: string | null;
}

function DetailRow({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-2 py-1 ${highlight ? 'bg-amber-50 dark:bg-amber-950/30 -mx-2 px-2 rounded' : ''}`}>
      <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[100px]">{label}:</span>
      <span className={`text-xs font-medium ${highlight ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</span>
    </div>
  );
}

export default function VoterDatabasePage() {
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedVoter, setSelectedVoter] = useState<VoterRecord | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useQuery<{ records: VoterRecord[]; total: number }>({
    queryKey: ['/api/voter-list', searchTerm, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/voter-list?${params}`);
      return res.json();
    },
  });

  const { data: appUsersData } = useQuery<any[]>({
    queryKey: ['/api/export/app-users'],
  });

  const appUserVoterIds = new Set(
    (appUsersData || []).filter(u => u.voterId).map(u => u.voterId.toUpperCase())
  );

  const handleSearch = () => {
    setSearchTerm(search);
    setPage(0);
  };

  const records = data?.records || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-voter-database-title">
          <Database className="h-6 w-6 text-primary" />
          Voter Database
        </h1>
        <p className="text-muted-foreground">Browse and search imported voter list records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Voter Records
            </span>
            <Badge variant="secondary" data-testid="badge-total-voters">{total.toLocaleString()} voters</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voter ID, name, mobile, booth, village..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
                data-testid="input-voter-search"
              />
            </div>
            <Button onClick={handleSearch} data-testid="button-voter-search">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
            {searchTerm && (
              <Button variant="outline" onClick={() => { setSearch(""); setSearchTerm(""); setPage(0); }} data-testid="button-voter-clear">
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p data-testid="text-no-voters">
                {searchTerm ? "No voters found matching your search" : "No voter records imported yet. Use CSV Upload to import voter list."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Voter ID</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Booth</TableHead>
                      <TableHead className="text-xs">Caste</TableHead>
                      <TableHead className="text-xs">Sex / Age</TableHead>
                      <TableHead className="text-xs">Village</TableHead>
                      <TableHead className="text-xs">Mobile</TableHead>
                      <TableHead className="text-xs">Mapped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((voter) => {
                      const displayName = voter.fullName || [voter.engFirstName, voter.engMiddleName, voter.engLastName].filter(Boolean).join(" ") || "—";
                      const isMapped = voter.vcardId ? appUserVoterIds.has(voter.vcardId.toUpperCase()) : false;
                      return (
                        <TableRow
                          key={voter.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedVoter(voter)}
                          data-testid={`row-voter-${voter.id}`}
                        >
                          <TableCell className="font-mono text-xs">{voter.vcardId || "—"}</TableCell>
                          <TableCell className="text-xs font-medium">{displayName}</TableCell>
                          <TableCell className="text-xs">
                            {voter.boothNo ? <Badge variant="outline" className="text-xs">#{voter.boothNo}</Badge> : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {voter.engCastName ? <Badge variant="secondary" className="text-xs">{voter.engCastName}</Badge> : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {voter.sex && voter.age ? `${voter.sex}, ${voter.age}` : voter.sex || voter.age || "—"}
                          </TableCell>
                          <TableCell className="text-xs">{voter.engVillage || voter.localVillage || "—"}</TableCell>
                          <TableCell className="text-xs">{voter.mobileNo1 || "—"}</TableCell>
                          <TableCell>
                            {isMapped ? (
                              <Badge variant="default" className="text-xs" data-testid="badge-voter-mapped">Mapped</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    data-testid="button-voter-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs">Page {page + 1} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="button-voter-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedVoter} onOpenChange={(open) => { if (!open) setSelectedVoter(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto" data-testid="dialog-voter-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Vote className="h-5 w-5 text-blue-600" />
              Voter Details
              {selectedVoter?.vcardId && <Badge variant="outline">{selectedVoter.vcardId}</Badge>}
              {selectedVoter?.vcardId && appUserVoterIds.has(selectedVoter.vcardId.toUpperCase()) && (
                <Badge variant="default">Mapped to User</Badge>
              )}
            </DialogTitle>
            <DialogDescription>Complete voter record from imported voter list</DialogDescription>
          </DialogHeader>
          {selectedVoter && (
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booth & Caste (Highlighted)</h4>
                <DetailRow label="Booth No" value={selectedVoter.boothNo ? `#${selectedVoter.boothNo}` : null} highlight />
                <DetailRow label="Booth ID" value={selectedVoter.boothId} highlight />
                <DetailRow label="Booth Address" value={selectedVoter.engBoothAddress || selectedVoter.localBoothAddress} highlight />
                <DetailRow label="Caste (En)" value={selectedVoter.engCastName} highlight />
                <DetailRow label="Caste (Local)" value={selectedVoter.localCastName} highlight />
                <DetailRow label="Profession (En)" value={selectedVoter.engProfessionName} highlight />
                <DetailRow label="Profession (Local)" value={selectedVoter.localProfessionName} highlight />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Details</h4>
                <DetailRow label="Full Name" value={selectedVoter.fullName} />
                <DetailRow label="Name (En)" value={[selectedVoter.engFirstName, selectedVoter.engMiddleName, selectedVoter.engLastName].filter(Boolean).join(" ") || null} />
                <DetailRow label="Name (Local)" value={[selectedVoter.localFirstName, selectedVoter.localMiddleName, selectedVoter.localLastName].filter(Boolean).join(" ") || null} />
                <DetailRow label="Sex" value={selectedVoter.sex} />
                <DetailRow label="Age" value={selectedVoter.age} />
                <DetailRow label="DOB" value={selectedVoter.dob} />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</h4>
                <DetailRow label="House No" value={selectedVoter.houseNo} />
                <DetailRow label="Village (En)" value={selectedVoter.engVillage} />
                <DetailRow label="Village (Local)" value={selectedVoter.localVillage} />
                <DetailRow label="Address (En)" value={selectedVoter.engAddress} />
                <DetailRow label="Address (Local)" value={selectedVoter.localAddress} />
                <DetailRow label="New Address (En)" value={selectedVoter.engNewAddress} />
                <DetailRow label="Taluka (En)" value={selectedVoter.engTaluka} />
                <DetailRow label="Assembly (En)" value={selectedVoter.engAssemblyName} />
                <DetailRow label="Flat No" value={selectedVoter.flatNo} />
                <DetailRow label="Society" value={selectedVoter.society} />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Electoral Info</h4>
                <DetailRow label="Assembly No" value={selectedVoter.assemblyNo} />
                <DetailRow label="Part No" value={selectedVoter.partNo} />
                <DetailRow label="Sr. No" value={selectedVoter.srno} />
                <DetailRow label="Family ID" value={selectedVoter.familyId} />
                <DetailRow label="Voted" value={selectedVoter.voted} />
                <DetailRow label="Voted By" value={selectedVoter.votedBy} />
                <DetailRow label="Type" value={selectedVoter.type} />
                <DetailRow label="V-Type" value={selectedVoter.vtype} />
                <DetailRow label="Important" value={selectedVoter.important} />
                <DetailRow label="Color" value={selectedVoter.color} />
                <DetailRow label="Karyakarta No" value={selectedVoter.karykartaNo} />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
                <DetailRow label="Mobile 1" value={selectedVoter.mobileNo1} />
                <DetailRow label="Mobile 2" value={selectedVoter.mobileNo2} />
                <DetailRow label="Email" value={selectedVoter.emailId} />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other</h4>
                <DetailRow label="Demands" value={selectedVoter.demands} />
                <DetailRow label="Dead" value={selectedVoter.dead} />
                <DetailRow label="Repeated" value={selectedVoter.repeated} />
                <DetailRow label="Repeated No" value={selectedVoter.repeatedNo} />
                <DetailRow label="Address Change" value={selectedVoter.addressChange} />
                <DetailRow label="Gat (En)" value={selectedVoter.engGat} />
                <DetailRow label="Gan (En)" value={selectedVoter.engGan} />
                <DetailRow label="Assembly Mapping" value={selectedVoter.assemblyMapping} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
