import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Harbor",
    short_name: "Harbor",
    description: "Modern POS platform for hospitality businesses.",
    start_url: "/dashboard/pos",
    display: "standalone",
    background_color: "#f3f4f5",
    theme_color: "#0a684f",
    icons: [
      {
        src: "/harbor-logo.svg",
        sizes: "260x64",
        type: "image/svg+xml"
      }
    ]
  };
}
