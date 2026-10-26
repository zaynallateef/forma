import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../../../components/ui/button";
export function DownloadText({
  text,
  name,
  label,
  type = "text/plain;charset=utf-8",
}: {
  text: string;
  name: string;
  label: string;
  type?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(new Blob([text], { type }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [text, type]);
  return (
    <Button variant="secondary" asChild>
      <a href={url || undefined} download={name}>
        <Download size={15} />
        {label}
      </a>
    </Button>
  );
}
