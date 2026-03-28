import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { movieIds, language = 'ja' } = await request.json();

		if (!movieIds || !Array.isArray(movieIds)) {
			return json({ error: 'Movie IDs are required' }, { status: 400 });
		}

		if (!TMDB_API_KEY) {
			return json({ error: 'TMDB APIキーが設定されていません' }, { status: 500 });
		}

		const tmdbLanguage = language === 'ja' ? 'ja-JP' : 'en-US';

		// 各映画IDの詳細情報を並列で取得
		const moviePromises = movieIds.map(async (id: number) => {
			try {
				const response = await fetch(
					`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=${tmdbLanguage}`
				);
				if (response.ok) {
					return await response.json();
				}
				return null;
			} catch (err) {
				console.error(`Failed to fetch movie ${id}:`, err);
				return null;
			}
		});

		const moviesData = await Promise.all(moviePromises);
		const movies = moviesData.filter((movie) => movie !== null);

		return json({ movies });
	} catch (error) {
		console.error('Error in movies API:', error);
		return json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
	}
};
