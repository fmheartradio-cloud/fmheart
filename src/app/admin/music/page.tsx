"use client";

import { CmsListPage } from "@/components/admin/CmsListPage";

export default function AdminMusicPage() {
  return (
    <CmsListPage
      listKey="music"
      title="Music Library"
      hint="Playlist / library tracks. Icecast now-playing history Dashboard Top Tracks එකේ එනවා."
      fields={[
        { key: "title", label: "Song title", required: true },
        { key: "artist", label: "Artist", required: true },
        { key: "duration", label: "Duration", placeholder: "3:45" },
        { key: "album", label: "Album" },
        { key: "audioUrl", label: "Audio / file URL", type: "url" },
      ]}
    />
  );
}
