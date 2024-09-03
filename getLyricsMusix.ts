import { Musix } from './Musixmatch.ts';

const musix = new Musix();

const handleRequest = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    if (type === 'default') {
        const query = url.searchParams.get('q');
        if (!query) {
            return new Response(JSON.stringify({ error: 'Missing query parameter', isError: true }), { status: 400 });
        }

        try {
            const track_id = await musix.searchTrack(query);
            const lyrics = await musix.getLyrics(track_id);
            return new Response(JSON.stringify({ lyrics, isError: false }));
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message, isError: true }), { status: 500 });
        }

    } else {
        const title = url.searchParams.get('t');
        const artist = url.searchParams.get('a');
        const duration = url.searchParams.get('d');

        if (!title || !artist) {
            return new Response(JSON.stringify({ error: 'Missing title or artist parameter', isError: true }), { status: 400 });
        }

        try {
            const lyrics = await musix.getLyricsAlternative(title, artist, duration || null);
            return new Response(JSON.stringify({ lyrics, isError: false }));
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message, isError: true }), { status: 500 });
        }
    }
};

addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
});