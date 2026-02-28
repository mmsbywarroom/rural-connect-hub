import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Image, Save } from "lucide-react";

interface LoginPageConfig {
  imageUrl: string | null;
  ministerName: string;
  ministerTitle: string;
  slogan: string;
}

const DEFAULT_CONFIG: LoginPageConfig = {
  imageUrl: null,
  ministerName: "Dr. Balbir Singh",
  ministerTitle: "Health Minister, Punjab Government",
  slogan: "Sewa, Sunwai, Samman, Sangathan, Suraksha, Sangharsh",
};

export default function LoginPageSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState("");
  const [ministerName, setMinisterName] = useState("");
  const [ministerTitle, setMinisterTitle] = useState("");
  const [slogan, setSlogan] = useState("");

  const { data: config, isLoading } = useQuery<LoginPageConfig>({
    queryKey: ["/api/admin/login-page-config"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LoginPageConfig>) => {
      const res = await apiRequest("PATCH", "/api/admin/login-page-config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-page-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/login-page-config"] });
      toast({ title: "Saved", description: "Login page settings updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (config) {
      setImageUrl(config.imageUrl || "");
      setMinisterName(config.ministerName || DEFAULT_CONFIG.ministerName);
      setMinisterTitle(config.ministerTitle || DEFAULT_CONFIG.ministerTitle);
      setSlogan(config.slogan || DEFAULT_CONFIG.slogan);
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate({
      imageUrl: imageUrl.trim() || null,
      ministerName: ministerName.trim() || DEFAULT_CONFIG.ministerName,
      ministerTitle: ministerTitle.trim() || DEFAULT_CONFIG.ministerTitle,
      slogan: slogan.trim() || DEFAULT_CONFIG.slogan,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Login Page Settings</CardTitle>
          <CardDescription>
            Change the image, name, and slogan shown on the app login and welcome screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/image.jpg or Google Drive link"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use a direct image URL (JPG/PNG). For Google Drive: use thumbnail format: https://drive.google.com/thumbnail?id=FILE_ID&sz=w800
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ministerName">Name</Label>
            <Input
              id="ministerName"
              placeholder="Dr. Balbir Singh"
              value={ministerName}
              onChange={(e) => setMinisterName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ministerTitle">Title</Label>
            <Input
              id="ministerTitle"
              placeholder="Health Minister, Punjab Government"
              value={ministerTitle}
              onChange={(e) => setMinisterTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan</Label>
            <Input
              id="slogan"
              placeholder="Sewa, Sunwai, Samman, Sangathan, Suraksha, Sangharsh"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </CardContent>
      </Card>

      {imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden max-w-sm">
              {imageUrl.trim() ? (
                <img
                  src={imageUrl.trim()}
                  alt={ministerName}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="p-3 text-center bg-white">
                <p className="font-semibold text-slate-800">{ministerName || "Name"}</p>
                <p className="text-sm text-slate-600">{ministerTitle || "Title"}</p>
                <p className="text-xs text-slate-500 mt-1">{slogan || "Slogan"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
