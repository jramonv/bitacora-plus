import { useEffect } from "react";

interface HelmetProps {
  title: string;
  description: string;
}

export function Helmet({ title, description }: HelmetProps) {
  useEffect(() => {
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);

  return null;
}

export default Helmet;
