import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, MapPin, Phone, Building, Vote, Briefcase, Hash, Calendar, Home, Users } from "lucide-react";

interface VoterDetailsCardProps {
  voterId: string;
  compact?: boolean;
}

interface VoterRecord {
  id: string;
  vcardId: string | null;
  fullName: string | null;
  engFirstName: string | null;
  engLastName: string | null;
  engMiddleName: string | null;
  localFirstName: string | null;
  localLastName: string | null;
  localMiddleName: string | null;
  sex: string | null;
  age: string | null;
  dob: string | null;
  houseNo: string | null;
  engVillage: string | null;
  localVillage: string | null;
  engAddress: string | null;
  localAddress: string | null;
  engNewAddress: string | null;
  localNewAddress: string | null;
  engTaluka: string | null;
  localTaluka: string | null;
  engAssemblyName: string | null;
  localAssemblyName: string | null;
  boothNo: string | null;
  boothId: string | null;
  engBoothAddress: string | null;
  localBoothAddress: string | null;
  assemblyNo: string | null;
  partNo: string | null;
  srno: string | null;
  familyId: string | null;
  mobileNo1: string | null;
  mobileNo2: string | null;
  emailId: string | null;
  engCastName: string | null;
  localCastName: string | null;
  engProfessionName: string | null;
  localProfessionName: string | null;
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
  type: string | null;
  vtype: string | null;
  addressChange: string | null;
  draftSrno: string | null;
  engGat: string | null;
  localGat: string | null;
  engGan: string | null;
  localGan: string | null;
  assemblyMapping: string | null;
  extraInfo1: string | null;
  extraInfo2: string | null;
  extraInfo3: string | null;
  extraInfo4: string | null;
  extraInfo5: string | null;
  extraCheck1: string | null;
  extraCheck2: string | null;
  printed: string | null;
  printedBy: string | null;
  votedBy: string | null;
}

function InfoRow({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | null | undefined; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-2 py-1 ${highlight ? 'bg-amber-50 dark:bg-amber-950/30 -mx-2 px-2 rounded' : ''}`}>
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className={`text-xs font-medium ${highlight ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</span>
    </div>
  );
}

export function VoterDetailsCard({ voterId, compact = false }: VoterDetailsCardProps) {
  const { data: voter, isLoading, isError } = useQuery<VoterRecord>({
    queryKey: ['/api/voter-lookup', voterId],
    queryFn: async () => {
      const res = await fetch(`/api/voter-lookup/${encodeURIComponent(voterId)}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!voterId && voterId.trim().length >= 3,
    retry: false,
    staleTime: 60000,
  });

  if (!voterId || voterId.trim().length < 3) return null;
  if (isLoading) {
    return (
      <Card className="border-dashed" data-testid="voter-details-loading">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="mt-2 space-y-1">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (isError || !voter) return null;

  const displayName = voter.fullName || [voter.engFirstName, voter.engMiddleName, voter.engLastName].filter(Boolean).join(" ") || "—";

  if (compact) {
    return (
      <div className="border rounded-md p-2 bg-muted/30 space-y-1" data-testid="voter-details-compact">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{voter.vcardId}</Badge>
          <span className="text-xs font-medium">{displayName}</span>
          {voter.engCastName && <Badge variant="secondary" className="text-xs">{voter.engCastName}</Badge>}
          {voter.boothNo && <Badge variant="secondary" className="text-xs">Booth #{voter.boothNo}</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {voter.sex && <span>{voter.sex === "M" ? "Male" : voter.sex === "F" ? "Female" : voter.sex}</span>}
          {voter.age && <span>Age: {voter.age}</span>}
          {voter.engVillage && <span>{voter.engVillage}</span>}
          {voter.mobileNo1 && <span>{voter.mobileNo1}</span>}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" data-testid="voter-details-card">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Vote className="h-4 w-4 text-blue-600" />
          <span>Voter Details</span>
          <Badge variant="outline" className="text-xs">{voter.vcardId}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-0.5">
        <InfoRow icon={User} label="Name" value={displayName} />
        <InfoRow icon={User} label="Local Name" value={[voter.localFirstName, voter.localMiddleName, voter.localLastName].filter(Boolean).join(" ") || null} />
        <InfoRow icon={Hash} label="Booth" value={voter.boothNo ? `#${voter.boothNo} (ID: ${voter.boothId || '-'})` : null} highlight />
        <InfoRow icon={Building} label="Booth Address" value={voter.engBoothAddress} highlight />
        <InfoRow icon={Vote} label="Caste" value={voter.engCastName || voter.localCastName} highlight />
        <InfoRow icon={Briefcase} label="Profession" value={voter.engProfessionName || voter.localProfessionName} highlight />
        <InfoRow icon={User} label="Sex / Age" value={voter.sex && voter.age ? `${voter.sex === "M" ? "Male" : voter.sex === "F" ? "Female" : voter.sex}, ${voter.age} yrs` : voter.sex || voter.age} />
        <InfoRow icon={Calendar} label="DOB" value={voter.dob} />
        <InfoRow icon={Home} label="House No" value={voter.houseNo} />
        <InfoRow icon={MapPin} label="Village" value={voter.engVillage || voter.localVillage} />
        <InfoRow icon={MapPin} label="Address" value={voter.engAddress || voter.localAddress} />
        <InfoRow icon={MapPin} label="Taluka" value={voter.engTaluka || voter.localTaluka} />
        <InfoRow icon={Building} label="Assembly" value={voter.engAssemblyName || voter.localAssemblyName} />
        <InfoRow icon={Hash} label="Assembly No / Part" value={voter.assemblyNo && voter.partNo ? `${voter.assemblyNo} / ${voter.partNo}` : voter.assemblyNo} />
        <InfoRow icon={Hash} label="Sr. No" value={voter.srno} />
        <InfoRow icon={Users} label="Family ID" value={voter.familyId} />
        <InfoRow icon={Phone} label="Mobile 1" value={voter.mobileNo1} />
        <InfoRow icon={Phone} label="Mobile 2" value={voter.mobileNo2} />
        {voter.voted && <InfoRow icon={Vote} label="Voted" value={voter.voted} />}
        {voter.demands && <InfoRow icon={Briefcase} label="Demands" value={voter.demands} />}
        {voter.society && <InfoRow icon={Building} label="Society" value={voter.society} />}
        {voter.flatNo && <InfoRow icon={Home} label="Flat No" value={voter.flatNo} />}
        {voter.important && <InfoRow icon={Vote} label="Important" value={voter.important} />}
        {voter.karykartaNo && <InfoRow icon={Users} label="Karyakarta No" value={voter.karykartaNo} />}
      </CardContent>
    </Card>
  );
}

export function VoterDetailsInline({ voterId }: { voterId: string }) {
  return <VoterDetailsCard voterId={voterId} compact />;
}
