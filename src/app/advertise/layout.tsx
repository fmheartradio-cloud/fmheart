import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertise",
  description:
    "Advertise with FM Heart — banners, sponsored articles, radio spots.",
};

export default function AdvertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
