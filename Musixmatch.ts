import { fetch } from "https://deno.land/std@0.181.0/fetch/mod.ts";

export class Musix {
    private tokenUrl = 'https://apic-desktop.musixmatch.com/ws/1.1/token.get?app_id=web-desktop-app-v1.0';
    private searchTermUrl = 'https://apic-desktop.musixmatch.com/ws/1.1/track.search?app_id=web-desktop-app-v1.0&page_size=5&page=1&s_track_rating=desc&quorum_factor=1.0';
    private lyricsUrl = 'https://apic-desktop.musixmatch.com/ws/1.1/track.subtitle.get?app_id=web-desktop-app-v1.0&subtitle_format=lrc';
    private lyricsAlternativeUrl = 'https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynched&subtitle_format=mxm&app_id=web-desktop-app-v1.0';

    private async fetchData(url: string): Promise<any> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        return await response.json();
    }

    private async getToken(): Promise<string> {
        const result = await this.fetchData(this.tokenUrl);
        if (result.message.header.status_code !== 200) {
            throw new Error(`Failed to retrieve token: ${JSON.stringify(result)}`);
        }
        const token = result.message.body.user_token;
        return token;
    }

    async checkTokenExpire(): Promise<string> {
        const tokenFile = './musix.json';
        const tokenData = await Deno.readTextFile(tokenFile).catch(() => null);
        if (tokenData) {
            const { expiration_time } = JSON.parse(tokenData);
            const currentTime = Date.now() / 1000;
            if (expiration_time > currentTime) {
                return JSON.parse(tokenData).user_token;
            }
        }
        const token = await this.getToken();
        const expiration_time = (Date.now() / 1000) + 600;
        const tokenData = JSON.stringify({ user_token: token, expiration_time });
        await Deno.writeTextFile(tokenFile, tokenData);
        return token;
    }

    async getLyrics(track_id: string): Promise<string> {
        const token = await this.checkTokenExpire();
        const url = `${this.lyricsUrl}&track_id=${track_id}&usertoken=${token}`;
        const result = await this.fetchData(url);
        return result.message.body.subtitle.subtitle_body;
    }

    async getLyricsAlternative(title: string, artist: string, duration: string | null = null): Promise<string> {
        const token = await this.checkTokenExpire();
        let url = `${this.lyricsAlternativeUrl}&usertoken=${token}&q_album=&q_artist=${artist}&q_artists=&track_spotify_id=&q_track=${title}`;
        if (duration) {
            url += `&q_duration=${this.convertDuration(duration)}&f_subtitle_length=`;
        } else {
            url += `&q_duration=&f_subtitle_length=`;
        }
        const result = await this.fetchData(url);
        const subtitle = result.message.body.macro_calls['track.subtitles.get'].message.body.subtitle_list[0].subtitle.subtitle_body;
        return this.getLrcLyrics(subtitle);
    }

    private convertDuration(duration: string): number {
        const [minutes, seconds] = duration.split(":").map(Number);
        return (minutes * 60) + seconds;
    }

    private getLrcLyrics(lyrics: string): string {
        const lines = lyrics.split('\n');
        return lines.map(line => {
            const parts = line.split(']');
            if (parts.length > 1) {
                const time = parts[0].replace('[', '');
                const text = parts[1] || '♪';
                return `[${time}]${text}`;
            }
            return line;
        }).join('\n');
    }

    async searchTrack(query: string): Promise<string> {
        const token = await this.checkTokenExpire();
        const url = `${this.searchTermUrl}&q=${query}&usertoken=${token}`;
        const result = await this.fetchData(url);
        const trackList = result.message.body.track_list;
        if (!trackList || trackList.length === 0) {
            throw new Error('Track not found');
        }
        const track = trackList.find(t => t.track.track_name.includes(query));
        return track ? track.track.track_id : trackList[0].track.track_id;
    }
}
