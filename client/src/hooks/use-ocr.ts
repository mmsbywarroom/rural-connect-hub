import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type OcrType = "aadhaarFront" | "aadhaarBack" | "voterId" | "ageProof" | "addressProof";

export interface OcrResult {
  name?: string;
  aadhaarNumber?: string;
  dob?: string;
  gender?: string;
  address?: string;
  voterId?: string;
  rawText?: string;
}

interface UseOcrReturn {
  processingType: OcrType | null;
  processImage: (type: OcrType, base64: string) => Promise<OcrResult | null>;
}

export function useOcr(): UseOcrReturn {
  const { toast } = useToast();
  const [processingType, setProcessingType] = useState<OcrType | null>(null);

  const processImage = useCallback(
    async (type: OcrType, base64: string): Promise<OcrResult | null> => {
      setProcessingType(type);
      try {
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, docType: type }),
          credentials: "include",
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.error("[OCR] Server error:", err);
          toast({ title: "OCR Error", description: "Could not read the document. Please try again.", variant: "destructive" });
          return null;
        }

        const result: OcrResult = await response.json();
        const hasData = Object.values(result).some((v) => v !== undefined && v !== "");
        if (hasData) {
          toast({ title: "Data Captured", description: "Details have been extracted from the photo" });
        }
        return result;
      } catch (error) {
        console.error("[OCR] Error:", error);
        toast({ title: "OCR Error", description: "Failed to process the image", variant: "destructive" });
        return null;
      } finally {
        setProcessingType(null);
      }
    },
    [toast]
  );

  return { processingType, processImage };
}
