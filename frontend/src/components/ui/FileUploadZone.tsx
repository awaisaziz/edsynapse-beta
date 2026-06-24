"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, X, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function FileUploadZone({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
  maxSizeMB = 50,
  acceptedTypes = [".pdf", ".docx", ".txt", ".pptx", ".doc", ".png", ".jpg", ".jpeg"],
  className,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    const invalidTypes: string[] = [];
    const tooLargeFiles: string[] = [];

    files.forEach((file) => {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        tooLargeFiles.push(file.name);
        return;
      }

      // Check file extension/type
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return extension === type.toLowerCase();
        }
        return file.type.match(new RegExp(type.replace("*", ".*")));
      });

      if (!isAccepted) {
        invalidTypes.push(file.name);
        return;
      }

      validFiles.push(file);
    });

    if (invalidTypes.length > 0) {
      setError(`Unsupported file types: ${invalidTypes.join(", ")}`);
    } else if (tooLargeFiles.length > 0) {
      setError(`Files exceeding ${maxSizeMB}MB: ${tooLargeFiles.join(", ")}`);
    } else {
      setError(null);
    }

    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files);
      const validated = validateFiles(filesArray);
      if (validated.length > 0) {
        onFilesSelected(validated);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files);
      const validated = validateFiles(filesArray);
      if (validated.length > 0) {
        onFilesSelected(validated);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
          isDragActive
            ? "border-primary bg-primary/5 scale-[0.99] shadow-inner"
            : "border-primary/20 hover:border-primary/40 hover:bg-white/30 bg-white/20",
          "backdrop-blur-sm"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileChange}
          accept={acceptedTypes.join(",")}
        />

        <div className="p-4 rounded-full bg-primary/10 text-primary mb-4 transition-all duration-300 group-hover:scale-110">
          <UploadCloud className="w-8 h-8" />
        </div>

        <p className="text-sm font-semibold text-foreground text-center mb-1 font-display">
          Drag & drop your study material here, or{" "}
          <span className="text-primary hover:underline font-bold">browse</span>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Supports {acceptedTypes.join(", ")} (max {maxSizeMB}MB)
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs font-sans border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl border border-white/70 bg-white/50 backdrop-blur-md hover:bg-white/80 transition-all duration-150 edsynapse-stagger"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate max-w-[240px] md:max-w-[400px]">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <Check className="w-3 h-3" /> Ready
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
