import { serve } from "https://deno.land/std@0.224.0/http/mod.ts";
import { Musix } from "./Musixmatch.ts"; // Ajuste para importar da mesma pasta

const musix = new Musix();

serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  let response;

  try {
    if (type === "default") {
      const query = url.searchParams.get("q");
      const track_id = await musix.searchTrack(query);
      if (track_id) {
        const lyrics = await musix.getLyrics(track_id);
        response = { lyrics, isError: false };
      } else {
        response = { error: "Track id seems like doesn't exist.", isError: true };
      }
    } else {
      const title = url.searchParams.get("t");
      const artist = url.searchParams.get("a");
      const duration = url.searchParams.get("d");
      const lyrics = await musix.getLyricsAlternative(title, artist, duration ? convertDuration(duration) : null);
      if (lyrics) {
        response = { lyrics, isError: false };
      } else {
        response = { error: "Lyrics seem like don't exist.", isError: true, title, artist, duration: convertDuration(duration) };
      }
    }
  } catch (error) {
    response = { error: error.message, isError: true };
  }

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
});

function convertDuration(time: string): number {
  const [minutes, seconds] = time.split(":").map(Number);
  return (minutes * 60) + seconds;
}
