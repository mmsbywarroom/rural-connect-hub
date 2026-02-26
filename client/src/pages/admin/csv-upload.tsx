import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Upload, FileUp, History, Download, Info } from "lucide-react";

const TABLE_CONFIG: Record<string, {
  label: string;
  description: string;
  fields: { name: string; required: boolean; description: string; example: string }[];
  mappableFields: string[];
}> = {
  villages: {
    label: "Villages / Wards",
    description: "Upload village/ward units with full hierarchy: Zone > District > Halka (AC Name) > Block Number > Village/Ward.",
    fields: [
      { name: "name", required: true, description: "Village or Ward name (Unit)", example: "Bhangala" },
      { name: "zone", required: false, description: "Zone name", example: "Zone A" },
      { name: "district", required: false, description: "District name", example: "Patiala" },
      { name: "halka", required: false, description: "Halka / AC Name", example: "Patiala Rural" },
      { name: "blockNumber", required: false, description: "Block Number", example: "Block 1" },
      { name: "isActive", required: false, description: "Active status (true/false). Defaults to true if not provided.", example: "true" },
    ],
    mappableFields: ["name", "zone", "district", "halka", "blockNumber", "isActive"],
  },
  issues: {
    label: "Issues",
    description: "Upload list of issue categories that visitors can report at the office.",
    fields: [
      { name: "name", required: true, description: "Issue category name", example: "Road Repair" },
      { name: "isActive", required: false, description: "Active status (true/false). Defaults to true.", example: "true" },
    ],
    mappableFields: ["name", "isActive"],
  },
  wings: {
    label: "Wings",
    description: "Upload party wings (e.g., Youth, Mahilla, SC, BC, etc.).",
    fields: [
      { name: "name", required: true, description: "Wing name", example: "Youth" },
      { name: "isActive", required: false, description: "Active status (true/false). Defaults to true.", example: "true" },
    ],
    mappableFields: ["name", "isActive"],
  },
  positions: {
    label: "Positions",
    description: "Upload list of party positions (e.g., President, Secretary, etc.).",
    fields: [
      { name: "name", required: true, description: "Position title", example: "President" },
      { name: "isActive", required: false, description: "Active status (true/false). Defaults to true.", example: "true" },
    ],
    mappableFields: ["name", "isActive"],
  },
  departments: {
    label: "Departments",
    description: "Upload list of departments.",
    fields: [
      { name: "name", required: true, description: "Department name", example: "Education" },
      { name: "isActive", required: false, description: "Active status (true/false). Defaults to true.", example: "true" },
    ],
    mappableFields: ["name", "isActive"],
  },
  gov_positions: {
    label: "Govt Positions",
    description: "Upload list of government positions (e.g., Sarpanch, Panch, MLA, etc.).",
    fields: [
      { name: "name", required: true, description: "Position name in English", example: "Sarpanch" },
      { name: "nameHi", required: false, description: "Position name in Hindi", example: "सरपंच" },
      { name: "namePa", required: false, description: "Position name in Punjabi", example: "ਸਰਪੰਚ" },
      { name: "isActive", required: false, description: "Active status (true/false). Defaults to true.", example: "true" },
    ],
    mappableFields: ["name", "nameHi", "namePa", "isActive"],
  },
  voter_list: {
    label: "Voter List",
    description: "Upload voter list CSV with voter details including names, booth info, caste, profession, and more. The Voter ID (vcardid) is used for matching voters across the system.",
    fields: [
      { name: "vcardid", required: true, description: "Voter Card ID (EPIC number)", example: "ABC1234567" },
      { name: "full_name", required: false, description: "Full name of voter", example: "John Doe" },
      { name: "e_first_name", required: false, description: "English first name", example: "John" },
      { name: "e_last_name", required: false, description: "English last name", example: "Doe" },
      { name: "sex", required: false, description: "Gender (M/F)", example: "M" },
      { name: "age", required: false, description: "Age", example: "35" },
      { name: "booth_no", required: false, description: "Booth number", example: "123" },
      { name: "e_village", required: false, description: "Village name (English)", example: "Bhangala" },
      { name: "e_cast_name", required: false, description: "Caste name (English)", example: "General" },
    ],
    mappableFields: [
      "assemblyNo", "partNo", "srno", "boothId", "draftSrno",
      "localLastName", "localFirstName", "localMiddleName",
      "engLastName", "engFirstName", "engMiddleName",
      "sex", "age", "vcardId", "houseNo",
      "localVillage", "engVillage", "localTaluka", "engTaluka",
      "localAssemblyName", "engAssemblyName", "localAddress", "engAddress",
      "boothNo", "localBoothAddress", "engBoothAddress",
      "localNewAddress", "engNewAddress",
      "repeated", "repeatedNo", "dead", "type", "vtype", "addressChange",
      "familyId", "karykartaNo", "important", "color", "voted",
      "dob", "mobileNo1", "mobileNo2", "emailId",
      "localCastName", "engCastName", "localProfessionName", "engProfessionName",
      "demands", "society", "flatNo",
      "extraInfo1", "extraInfo2", "extraCheck1", "extraCheck2",
      "localGat", "engGat", "localGan", "engGan",
      "assemblyMapping", "fullName", "karyakarta1",
      "extraInfo3", "extraInfo4", "extraInfo5",
      "printed", "printedBy", "votedBy",
    ],
  },
};

const VOTER_CSV_HEADER_MAP: Record<string, string> = {
  "id": "skip", "assembly_no": "assemblyNo", "part_no": "partNo", "srno": "srno",
  "boothid": "boothId", "draft_srno": "draftSrno",
  "l_last_name": "localLastName", "l_first_name": "localFirstName", "l_middle_name": "localMiddleName",
  "e_last_name": "engLastName", "e_first_name": "engFirstName", "e_middle_name": "engMiddleName",
  "sex": "sex", "age": "age", "vcardid": "vcardId", "house_no": "houseNo",
  "l_village": "localVillage", "e_village": "engVillage", "l_taluka": "localTaluka", "e_taluka": "engTaluka",
  "l_assemblyname": "localAssemblyName", "e_assemblyname": "engAssemblyName",
  "l_address": "localAddress", "e_address": "engAddress",
  "booth_no": "boothNo", "l_boothaddress": "localBoothAddress", "e_boothaddress": "engBoothAddress",
  "l_newaddress": "localNewAddress", "e_newaddress": "engNewAddress",
  "repeated": "repeated", "repeated_no": "repeatedNo", "dead": "dead",
  "type": "type", "vtype": "vtype", "addresschange": "addressChange",
  "familyid": "familyId", "karykartano": "karykartaNo", "important": "important",
  "color": "color", "voted": "voted", "dob": "dob",
  "mobile_no1": "mobileNo1", "mobile_no2": "mobileNo2", "emailid": "emailId",
  "l_cast_name": "localCastName", "e_cast_name": "engCastName",
  "l_profession_name": "localProfessionName", "e_profession_name": "engProfessionName",
  "demands": "demands", "society": "society", "flat_no": "flatNo",
  "extra_info1": "extraInfo1", "extra_info2": "extraInfo2",
  "extra_check1": "extraCheck1", "extra_check2": "extraCheck2",
  "l_gat": "localGat", "e_gat": "engGat", "l_gan": "localGan", "e_gan": "engGan",
  "assembly_mapping": "assemblyMapping", "full_name": "fullName", "karyakarta1": "karyakarta1",
  "extra_info3": "extraInfo3", "extra_info4": "extraInfo4", "extra_info5": "extraInfo5",
  "printed": "printed", "printed_by": "printedBy", "voted_by": "votedBy",
};

const TARGET_TABLES = Object.keys(TABLE_CONFIG);

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

function downloadTemplate(targetKey: string) {
  const config = TABLE_CONFIG[targetKey];
  if (!config) return;
  const headerRow = config.fields.map(f => f.name).join(",");
  const exampleRow = config.fields.map(f => f.example).join(",");
  const csv = headerRow + "\n" + exampleRow + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${targetKey}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvUploadPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [importResult, setImportResult] = useState<{ inserted: number; total: number } | null>(null);

  const config = target ? TABLE_CONFIG[target] : null;

  const { data: uploadHistory, isLoading: historyLoading } = useQuery<{
    id: string;
    fileName: string;
    targetTable: string;
    rowCount: number | null;
    status: string | null;
    createdAt: string | null;
  }[]>({
    queryKey: ["/api/csv-uploads"],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const mappedRows = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        Object.entries(columnMapping).forEach(([colIdx, field]) => {
          if (field && field !== "skip") {
            const val = row[Number(colIdx)];
            if (field === "isActive") {
              obj[field] = val?.toLowerCase() !== "false" && val !== "0";
            } else {
              obj[field] = val;
            }
          }
        });
        return obj;
      });
      const res = await apiRequest("POST", `/api/csv-upload/${target}`, {
        rows: mappedRows,
        fileName,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult({ inserted: data.inserted, total: data.total });
      toast({ title: `Imported ${data.inserted} of ${data.total} rows` });
      queryClient.invalidateQueries({ queryKey: ["/api/csv-uploads"] });
      queryClient.invalidateQueries({ queryKey: [`/api/${target}`] });
    },
    onError: () => toast({ title: "Import failed", variant: "destructive" }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast({ title: "CSV must have at least a header row and one data row", variant: "destructive" });
        return;
      }
      const hdrs = parsed[0];
      setHeaders(hdrs);
      setRows(parsed.slice(1));
      const mapping: Record<number, string> = {};
      const mappable = config?.mappableFields || ["name", "isActive"];
      hdrs.forEach((h, i) => {
        const lower = h.toLowerCase().trim();
        if (target === "voter_list" && VOTER_CSV_HEADER_MAP[lower]) {
          mapping[i] = VOTER_CSV_HEADER_MAP[lower];
        } else {
          const match = mappable.find(f => f.toLowerCase() === lower || lower === f.replace(/([A-Z])/g, '_$1').toLowerCase());
          mapping[i] = match || "skip";
        }
      });
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setFileName("");
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-csv-upload-title">
          <Upload className="h-6 w-6 text-primary" />
          CSV Upload
        </h1>
        <p className="text-muted-foreground">Import hierarchy data from CSV files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Table</Label>
              <Select value={target} onValueChange={(val) => { setTarget(val); handleClear(); }} data-testid="select-target-table">
                <SelectTrigger data-testid="select-trigger-target">
                  <SelectValue placeholder="Select target table" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TABLES.map((t) => (
                    <SelectItem key={t} value={t} data-testid={`select-item-${t}`}>
                      {TABLE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={!target}
                data-testid="input-csv-file"
              />
            </div>
          </div>

          {config && (
            <div className="bg-muted/50 border rounded-md p-4 space-y-3" data-testid="csv-format-info">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Required CSV Format:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Column</TableHead>
                      <TableHead className="text-xs">Required</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.fields.map((f) => (
                      <TableRow key={f.name}>
                        <TableCell className="font-mono text-xs">{f.name}</TableCell>
                        <TableCell>
                          <Badge variant={f.required ? "default" : "secondary"} className="text-xs">
                            {f.required ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                        <TableCell className="font-mono text-xs">{f.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(target)}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          )}

          {headers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-semibold">Column Mapping</h3>
                <Badge variant="secondary">{rows.length} rows detected</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {headers.map((h, i) => (
                  <div key={i} className="space-y-1">
                    <Label className="text-sm text-muted-foreground">{h}</Label>
                    <Select
                      value={columnMapping[i] || "skip"}
                      onValueChange={(val) => setColumnMapping((prev) => ({ ...prev, [i]: val }))}
                    >
                      <SelectTrigger data-testid={`select-mapping-${i}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip</SelectItem>
                        {(config?.mappableFields || ["name", "isActive"]).map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Preview (first 5 rows)</h3>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h, i) => (
                          <TableHead key={i}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 5).map((row, ri) => (
                        <TableRow key={ri} data-testid={`row-preview-${ri}`}>
                          {row.map((cell, ci) => (
                            <TableCell key={ci}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={!target || importMutation.isPending}
                  data-testid="button-import"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  {importMutation.isPending ? "Importing..." : "Import"}
                </Button>
                <Button variant="outline" onClick={handleClear} data-testid="button-clear">
                  Clear
                </Button>
                {importResult && (
                  <Badge variant="default" data-testid="badge-import-result">
                    {importResult.inserted} / {importResult.total} imported
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Upload History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !uploadHistory?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p data-testid="text-no-history">No upload history</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadHistory.map((upload) => (
                  <TableRow key={upload.id} data-testid={`row-upload-${upload.id}`}>
                    <TableCell className="font-medium">{upload.fileName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{upload.targetTable}</Badge>
                    </TableCell>
                    <TableCell>{upload.rowCount ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={upload.status === "completed" ? "default" : "secondary"}>
                        {upload.status ?? "completed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {upload.createdAt ? new Date(upload.createdAt).toLocaleDateString() : "-"}
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
