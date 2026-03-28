import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { id } = params;
		const language = url.searchParams.get('language') || 'ja';
		const tmdbLanguage = language === 'ja' ? 'ja-JP' : 'en-US';

		if (!TMDB_API_KEY) {
			return json({ error: 'TMDB APIキーが設定されていません' }, { status: 500 });
		}

		// 映画の詳細情報を取得（公式サイトのURL含む）
		const detailResponse = await fetch(
			`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=${tmdbLanguage}`
		);
		const detail = await detailResponse.json();

		// 配信サービス情報を取得（日本向け）
		const providersResponse = await fetch(
			`https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${TMDB_API_KEY}`
		);
		const providersData = await providersResponse.json();

		// 外部IDを取得（IMDb等）
		const externalIdsResponse = await fetch(
			`https://api.themoviedb.org/3/movie/${id}/external_ids?api_key=${TMDB_API_KEY}`
		);
		const externalIds = await externalIdsResponse.json();

		// 日本の配信サービス情報を抽出
		const jpProviders = providersData.results?.JP;

		return json({
			homepage: detail.homepage || null,
			imdb_id: externalIds.imdb_id || null,
			providers: {
				link: jpProviders?.link || null,
				flatrate: jpProviders?.flatrate || [], // サブスク配信
				rent: jpProviders?.rent || [], // レンタル
				buy: jpProviders?.buy || [], // 購入
			},
		});
	} catch (error) {
		console.error('Error fetching movie details:', error);
		return json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
	}
};
