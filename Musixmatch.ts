export class Musix {
  private tokenUrl = "https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0";
  private searchTermUrl = "https://apic-desktop.musixmatch.com/ws/1.1/track.search?app_id=web-desktop-app-v1.0&page_size=5&page=1&s_track_rating=desc&quorum_factor=1.0";
  private lyricsUrl = "https://apic-desktop.musixmatch.com/ws/1.1/track.subtitle.get?app_id=web-desktop-app-v1.0&subtitle_format=lrc";
  private lyricsAlternativeUrl = "https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynched&subtitle_format=mxm&app_id=web-desktop-app-v1.0";

  private async get(url: string): Promise<string> {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.text();
  }

  async getToken(): Promise<void> {
    const result = await this.get(this.tokenUrl);
    const tokenData = JSON.parse(result);
    if (tokenData.message.header.status_code !== 200) {
      throw new Error("Failed to retrieve the access token.");
    }
    const token = tokenData.message.body.user_token;
    const expirationTime = Date.now() + 600000; // 10 minutes
    await Deno.writeTextFile("musix.txt", JSON.stringify({ user_token: token, expiration_time: expirationTime }));
  }

  async checkTokenExpire(): Promise<void> {
    try {
      const tokenData = JSON.parse(await Deno.readTextFile("musix.txt"));
      if (Date.now() > tokenData.expiration_time) {
        await this.getToken();
      }
    } catch {
      await this.getToken();
    }
  }

  async getLyrics(trackId: string): Promise<string> {
    await this.checkTokenExpire();
    const tokenData = JSON.parse(await Deno.readTextFile("musix.txt"));
    const url = `${this.lyricsUrl}&track_id=${trackId}&usertoken=${tokenData.user_token}`;
    const result = await this.get(url);
    const lyricsData = JSON.parse(result);
    return lyricsData.message.body.subtitle.subtitle_body;
  }

  async getLyricsAlternative(title: string, artist: string, duration: number | null): Promise<string> {
    await this.checkTokenExpire();
    const tokenData = JSON.parse(await Deno.readTextFile("musix.txt"));
    const url = `${this.lyricsAlternativeUrl}&usertoken=${tokenData.user_token}&q_album=&q_artist=${artist}&q_artists=&track_spotify_id=&q_track=${title}&q_duration=${duration ?? ''}&f_subtitle_length=`;
    const result = await this.get(url);
    const lyricsData = JSON.parse(result);
    return this.getLrcLyrics(lyricsData.message.body.macro_calls['track.subtitles.get'].message.body.subtitle_list[0].subtitle.subtitle_body);
  }

  private getLrcLyrics(lyrics: string): string {
    const data = JSON.parse(lyrics);
    return data.map((item: any) => {
      const minutes = item.time.minutes.toString().padStart(2, "0");
      const seconds = item.time.seconds.toString().padStart(2, "0");
      const hundredths = item.time.hundredths.toString().padStart(2, "0");
      const text = item.text || "♪";
      return `[${minutes}:${seconds}.${hundredths}]${text}`;
    }).join("\n");
  }

  async searchTrack(query: string): Promise<string> {
    await this.checkTokenExpire();
    const tokenData = JSON.parse(await Deno.readTextFile("musix.txt"));
    const url = `${this.searchTermUrl}&q=${query}&usertoken=${tokenData.user_token}`;
    const result = await this.get(url);
    const trackList = JSON.parse(result).message.body.track_list;
    const track = trackList.find((track: any) => track.track.track_name.includes(query) || track.track.artist_name.includes(query));
    return track ? track.track.track_id : trackList[0].track.track_id;
  }
}
