import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { mood } = await request.json();

		if (!mood) {
			return json({ error: '気分やキーワードを入力してください' }, { status: 400 });
		}

		if (!GEMINI_API_KEY || !TMDB_API_KEY) {
			console.error('APIキーが設定されていません');
			// デモ用のサンプルデータを返す
			return json({
				movies: [
					{
						id: 278,
						title: 'ショーシャンクの空に',
						overview: '無実の罪で投獄された銀行員が、刑務所内で希望を失わず、最終的に自由を勝ち取る感動的な物語。',
						poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
						release_date: '1994-09-23',
						vote_average: 8.7,
					},
					{
						id: 680,
						title: 'パルプ・フィクション',
						overview: '複数のストーリーが交錯する、クエンティン・タランティーノの代表作。',
						poster_path: '/fIE3lAGcZDV1G6XM5KmuLuEuJDU.jpg',
						release_date: '1994-10-14',
						vote_average: 8.5,
					},
					{
						id: 13,
						title: 'フォレスト・ガンプ',
						overview: '知能は低いが純粋な心を持つ男性が、様々な歴史的出来事に遭遇する感動作。',
						poster_path: '/h5J4W4veyxMXDMjeNxZI46TsHOb.jpg',
						release_date: '1994-07-06',
						vote_average: 8.5,
					},
				],
			});
		}

		// Gemini AIを使用して映画のタイトルを生成
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

		const prompt = `Based on the mood or keywords "${mood}", suggest 5 popular movie titles that match this mood. Respond with ONLY the movie titles in English, one per line, without any numbering, explanations, or additional text. Just the titles.`;

		const result = await model.generateContent(prompt);
		const response = await result.response;
		const movieTitles = response
			.text()
			.split('\n')
			.filter((title) => title.trim())
			.slice(0, 5);

		// TMDB APIで映画情報を取得
		const moviePromises = movieTitles.map(async (title) => {
			const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=ja-JP`;
			const searchResponse = await fetch(searchUrl);
			const searchData = await searchResponse.json();

			if (searchData.results && searchData.results.length > 0) {
				return searchData.results[0];
			}
			return null;
		});

		const movies = (await Promise.all(moviePromises)).filter((movie) => movie !== null);

		return json({ movies });
	} catch (error) {
		console.error('Error in recommend API:', error);
		return json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
	}
};
