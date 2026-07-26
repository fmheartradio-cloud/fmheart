import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact FM Heart — advertising, partnerships, song requests.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
