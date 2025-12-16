import { useCallback } from "react";

export const useDownloadBlob = () => {
  const downloadBlob = useCallback(
    (arrayBuffer: ArrayBuffer, contentType: string, filename: string) => {
      try {
        const blob = new Blob([arrayBuffer], { type: contentType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Clean up
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 100);

        return { blob, url };
      } catch (error) {
        throw error;
      }
    },
    []
  );

  return { downloadBlob };
};
