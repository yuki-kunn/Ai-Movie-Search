import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

// Gemini API結果のキャッシュ
interface CacheEntry {
	analysis: any;
	timestamp: number;
}

const geminiCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15分
const MAX_CACHE_SIZE = 100; // 最大キャッシュエントリー数

// サーキットブレーカー
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 30 * 60 * 1000; // 30分

// サーキットブレーカーの状態をチェック
function isCircuitBreakerOpen(): boolean {
	if (!circuitBreakerOpen) {
		return false;
	}

	// タイムアウト期間が経過したらリセット
	if (Date.now() - circuitBreakerOpenTime > CIRCUIT_BREAKER_TIMEOUT) {
		circuitBreakerOpen = false;
		console.log('サーキットブレーカー: リセット - Gemini APIの使用を再開します');
		return false;
	}

	return true;
}

// サーキットブレーカーを開く
function openCircuitBreaker() {
	if (!circuitBreakerOpen) {
		circuitBreakerOpen = true;
		circuitBreakerOpenTime = Date.now();
		const minutes = CIRCUIT_BREAKER_TIMEOUT / 60 / 1000;
		console.log(`サーキットブレーカー: OPEN - Gemini APIの使用を${minutes}分間停止します`);
	}
}

// キャッシュのクリーンアップ（古いエントリーを削除）
function cleanupCache() {
	const now = Date.now();
	for (const [key, entry] of geminiCache.entries()) {
		if (now - entry.timestamp > CACHE_TTL) {
			geminiCache.delete(key);
		}
	}

	// サイズ制限を超えた場合、古いエントリーから削除
	if (geminiCache.size > MAX_CACHE_SIZE) {
		const entries = Array.from(geminiCache.entries())
			.sort((a, b) => a[1].timestamp - b[1].timestamp);
		const toDelete = entries.slice(0, geminiCache.size - MAX_CACHE_SIZE);
		toDelete.forEach(([key]) => geminiCache.delete(key));
	}
}

// TMDB APIから複数ページを取得して指定件数を返す
async function fetchMultiplePages(baseUrl: string, targetCount: number): Promise<any[]> {
	const results: any[] = [];
	const itemsPerPage = 20; // TMDB APIのデフォルト
	const pagesToFetch = Math.ceil(targetCount / itemsPerPage);

	for (let page = 1; page <= pagesToFetch && results.length < targetCount; page++) {
		const url = `${baseUrl}&page=${page}`;
		const response = await fetch(url);
		const data = await response.json();

		if (data.results && data.results.length > 0) {
			results.push(...data.results);
		} else {
			break; // これ以上結果がない
		}
	}

	return results.slice(0, targetCount);
}

// ムードに基づいてジャンルIDを取得
function getGenresByMood(mood: string): number[] {
	const lowerMood = mood.toLowerCase();

	// アクション系
	if (lowerMood.includes('action') || lowerMood.includes('アクション') || lowerMood.includes('迫力')) {
		return [28, 12]; // Action, Adventure
	}
	// コメディ系
	if (lowerMood.includes('funny') || lowerMood.includes('comedy') || lowerMood.includes('笑') || lowerMood.includes('面白')) {
		return [35]; // Comedy
	}
	// ホラー系
	if (lowerMood.includes('horror') || lowerMood.includes('scary') || lowerMood.includes('怖') || lowerMood.includes('ホラー')) {
		return [27]; // Horror
	}
	// ロマンス系
	if (lowerMood.includes('romance') || lowerMood.includes('love') || lowerMood.includes('恋') || lowerMood.includes('ロマンス')) {
		return [10749]; // Romance
	}
	// SF系
	if (lowerMood.includes('sci-fi') || lowerMood.includes('science') || lowerMood.includes('SF') || lowerMood.includes('未来')) {
		return [878]; // Sci-Fi
	}
	// ドラマ系
	if (lowerMood.includes('drama') || lowerMood.includes('ドラマ') || lowerMood.includes('感動')) {
		return [18]; // Drama
	}
	// アニメ系
	if (lowerMood.includes('anime') || lowerMood.includes('animation') || lowerMood.includes('アニメ')) {
		return [16]; // Animation
	}

	// デフォルト: 人気のジャンル
	return [28, 35, 18]; // Action, Comedy, Drama
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { mood } = await request.json();

		if (!mood) {
			return json({ error: '気分やキーワードを入力してください' }, { status: 400 });
		}

		if (!TMDB_API_KEY) {
			console.error('TMDB APIキーが設定されていません');
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

		let movies: any[] = [];

		// Gemini APIが利用可能な場合は使用して入力を解釈
		if (GEMINI_API_KEY && !isCircuitBreakerOpen()) {
			try {
				// キャッシュのクリーンアップ
				cleanupCache();

				// キャッシュキーを生成（小文字に統一して正規化）
				const cacheKey = mood.toLowerCase().trim();

				// キャッシュをチェック
				const cached = geminiCache.get(cacheKey);
				let analysis;

				if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
					// キャッシュヒット
					analysis = cached.analysis;
					console.log('Gemini AI分析結果（キャッシュから取得）:', analysis);
				} else {
					// キャッシュミス - Gemini APIを呼び出す
					const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
					// 無料枠で利用可能な軽量版モデルを使用
					const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-lite-latest' });

					const prompt = `ユーザーの入力: "${mood}"

この入力を分析して、映画検索に最適な情報を抽出してください。
以下のJSON形式で返してください：

{
  "genres": ["ジャンル1", "ジャンル2"],
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "searchQuery": "TMDB APIで検索するための最適なクエリ"
}

利用可能なジャンル: action, comedy, drama, horror, romance, sci-fi, thriller, animation, adventure, fantasy, mystery, crime

JSON以外の説明やマークダウンは含めず、JSONのみを返してください。`;

					const result = await model.generateContent(prompt);
					const response = await result.response;
					let analysisText = response.text().trim();

					// JSONのマークダウンコードブロックを削除
					analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

					analysis = JSON.parse(analysisText);

					// 結果をキャッシュに保存
					geminiCache.set(cacheKey, {
						analysis,
						timestamp: Date.now()
					});

					console.log('Gemini AI分析結果（APIから取得）:', analysis);
				}

				// 分析結果を使ってTMDB APIで検索
				if (analysis.searchQuery) {
					const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(analysis.searchQuery)}&language=ja-JP`;
					movies = await fetchMultiplePages(searchUrl, 30);
				}

				// 検索結果が少ない場合、ジャンルベースで補完
				if (movies.length < 30 && analysis.genres && analysis.genres.length > 0) {
					const genreMapping: { [key: string]: number } = {
						action: 28,
						adventure: 12,
						animation: 16,
						comedy: 35,
						crime: 80,
						drama: 18,
						fantasy: 14,
						horror: 27,
						mystery: 9648,
						romance: 10749,
						'sci-fi': 878,
						thriller: 53,
					};

					const genreIds = analysis.genres
						.map((g: string) => genreMapping[g.toLowerCase()])
						.filter((id: number) => id);

					if (genreIds.length > 0) {
						const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ja-JP&sort_by=popularity.desc&with_genres=${genreIds.join(',')}&vote_count.gte=100`;
						const discoverResults = await fetchMultiplePages(discoverUrl, 30);

						if (discoverResults.length > 0) {
							// 既存の結果と重複しないように追加
							const existingIds = new Set(movies.map((m: any) => m.id));
							const newMovies = discoverResults.filter(
								(m: any) => !existingIds.has(m.id)
							);
							movies = [...movies, ...newMovies].slice(0, 30);
						}
					}
				}
			} catch (geminiError: any) {
				// 429エラー（クォータ超過）の場合、サーキットブレーカーを開く
				if (geminiError?.status === 429) {
					openCircuitBreaker();
					console.error('Gemini API クォータ超過により、TMDBのみで動作します:', geminiError.message);
				} else {
					console.error('Gemini API error, falling back to TMDB:', geminiError);
				}
			}
		} else if (GEMINI_API_KEY && isCircuitBreakerOpen()) {
			console.log('サーキットブレーカー: OPEN - Gemini APIをスキップし、TMDBのみで検索します');
		}

		// Gemini APIが失敗した場合、またはAPIキーがない場合はTMDBのみを使用
		if (movies.length === 0) {
			// まずキーワード検索を試みる
			const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(mood)}&language=ja-JP`;
			movies = await fetchMultiplePages(searchUrl, 30);

			if (movies.length === 0) {
				// キーワード検索で結果がない場合、ジャンルベースで検索
				const genres = getGenresByMood(mood);
				const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ja-JP&sort_by=popularity.desc&with_genres=${genres.join(',')}&vote_count.gte=100`;
				movies = await fetchMultiplePages(discoverUrl, 30);
			}
		}

		return json({ movies });
	} catch (error) {
		console.error('Error in recommend API:', error);
		return json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
	}
};
