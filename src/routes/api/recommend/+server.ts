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
const CIRCUIT_BREAKER_TIMEOUT = 10 * 60 * 1000; // 10分（503エラーは一時的なことが多いため短めに設定）

// シンプルなレート制限（IPアドレスベース）
interface RateLimitEntry {
	count: number;
	resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REQUESTS = 20; // 1分間に最大20リクエスト

// レート制限のクリーンアップ
function cleanupRateLimit() {
	const now = Date.now();
	for (const [key, entry] of rateLimitMap.entries()) {
		if (now > entry.resetTime) {
			rateLimitMap.delete(key);
		}
	}
}

// レート制限チェック
function checkRateLimit(clientId: string): boolean {
	cleanupRateLimit();

	const now = Date.now();
	const entry = rateLimitMap.get(clientId);

	if (!entry) {
		rateLimitMap.set(clientId, {
			count: 1,
			resetTime: now + RATE_LIMIT_WINDOW
		});
		return true;
	}

	if (now > entry.resetTime) {
		// ウィンドウをリセット
		rateLimitMap.set(clientId, {
			count: 1,
			resetTime: now + RATE_LIMIT_WINDOW
		});
		return true;
	}

	if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
		return false; // レート制限超過
	}

	entry.count++;
	return true;
}

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
		const minutes = Math.floor(CIRCUIT_BREAKER_TIMEOUT / 60 / 1000);
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
		try {
			const url = `${baseUrl}&page=${page}`;
			const response = await fetch(url, {
				signal: AbortSignal.timeout(10000) // 10秒タイムアウト
			});

			if (!response.ok) {
				console.error(`TMDB API error: ${response.status} ${response.statusText}`);
				break;
			}

			const data = await response.json();

			if (data.results && data.results.length > 0) {
				results.push(...data.results);
			} else {
				break; // これ以上結果がない
			}
		} catch (error) {
			console.error('TMDB API fetch error:', error);
			break; // エラーが発生したら中断
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

// 入力のサニタイズとバリデーション
function sanitizeInput(input: string): string {
	if (!input || typeof input !== 'string') {
		return '';
	}

	// 前後の空白を削除
	let sanitized = input.trim();

	// 最大長を制限（200文字）
	if (sanitized.length > 200) {
		sanitized = sanitized.slice(0, 200);
	}

	// 危険な文字をエスケープ（XSS対策）
	sanitized = sanitized
		.replace(/[<>]/g, '') // HTML タグを削除
		.replace(/[\\'"]/g, '') // クォートを削除
		.replace(/\n\n+/g, ' ') // 連続する改行をスペースに
		.trim();

	return sanitized;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const { mood: rawMood, language = 'ja', skipAI = false } = await request.json();

		// レート制限チェック
		const clientAddress = getClientAddress();
		if (!checkRateLimit(clientAddress)) {
			const errorMsg = language === 'ja'
				? 'リクエストが多すぎます。しばらく待ってから再度お試しください。'
				: 'Too many requests. Please wait a moment and try again.';
			return json({ error: errorMsg }, { status: 429 });
		}

		// 入力のサニタイズ
		const mood = sanitizeInput(rawMood);

		if (!mood || mood.length < 1) {
			const errorMsg = language === 'ja' ? '気分やキーワードを入力してください' : 'Please enter a mood or keyword';
			return json({ error: errorMsg }, { status: 400 });
		}

		// 最小文字数チェック（1文字以上）
		if (mood.length < 1) {
			const errorMsg = language === 'ja' ? '1文字以上入力してください' : 'Please enter at least 1 character';
			return json({ error: errorMsg }, { status: 400 });
		}

		const tmdbLanguage = language === 'ja' ? 'ja-JP' : 'en-US';

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

		// Gemini APIが利用可能な場合は使用して入力を解釈（skipAIがfalseの場合のみ）
		if (GEMINI_API_KEY && !isCircuitBreakerOpen() && !skipAI) {
			try {
				// キャッシュのクリーンアップ
				cleanupCache();

				// キャッシュキーを生成（正規化）
				// - 小文字に変換
				// - 複数のスペースを1つに
				// - 前後の空白を削除
				const cacheKey = mood
					.toLowerCase()
					.replace(/\s+/g, ' ')
					.trim();

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

					const prompt = `You are a movie recommendation expert. Analyze the user's input and extract optimal information for movie search.

User input: "${mood}"

Available genres (use these EXACT values): action, comedy, drama, horror, romance, sci-fi, thriller, animation, adventure, fantasy, mystery, crime

Instructions:
1. Extract 1-3 relevant genres from the available list
2. Generate 2-5 search keywords related to the mood/theme
3. Create ONE optimal search query for TMDB API (keep it concise, under 50 characters)
4. If input is in Japanese, translate keywords to English for better TMDB search results
5. If input is vague or unclear, choose popular/general genres

Output ONLY valid JSON in this exact format (no markdown, no explanations):

{
  "genres": ["genre1", "genre2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "searchQuery": "optimal search query"
}

Examples:

Input: "感動的な映画"
Output: {"genres": ["drama"], "keywords": ["emotional", "touching", "heartwarming"], "searchQuery": "emotional drama"}

Input: "アクション満載のスリリングな映画"
Output: {"genres": ["action", "thriller"], "keywords": ["action-packed", "thrilling", "intense"], "searchQuery": "action thriller"}

Input: "funny comedy"
Output: {"genres": ["comedy"], "keywords": ["funny", "hilarious", "laugh"], "searchQuery": "funny comedy"}

Now analyze and respond:`;

					// タイムアウト処理を追加（30秒）
					const timeoutPromise = new Promise((_, reject) => {
						setTimeout(() => reject(new Error('Gemini API timeout')), 30000);
					});

					const result = await Promise.race([
						model.generateContent(prompt),
						timeoutPromise
					]) as any;

					const response = await result.response;
					let analysisText = response.text().trim();

					// JSONのマークダウンコードブロックを削除
					analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '');

					try {
						analysis = JSON.parse(analysisText);

						// 出力形式の詳細な検証とサニタイズ
						if (!analysis || typeof analysis !== 'object') {
							throw new Error('Response is not a valid object');
						}

						// genres の検証と正規化
						if (!Array.isArray(analysis.genres)) {
							analysis.genres = [];
						}
						analysis.genres = analysis.genres
							.filter((g: any) => typeof g === 'string' && g.trim().length > 0)
							.slice(0, 3) // 最大3つまで
							.map((g: string) => g.toLowerCase().trim());

						// keywords の検証と正規化
						if (!Array.isArray(analysis.keywords)) {
							analysis.keywords = [];
						}
						analysis.keywords = analysis.keywords
							.filter((k: any) => typeof k === 'string' && k.trim().length > 0)
							.slice(0, 5) // 最大5つまで
							.map((k: string) => k.trim());

						// searchQuery の検証と正規化
						if (typeof analysis.searchQuery !== 'string' || !analysis.searchQuery.trim()) {
							// searchQueryがない場合、keywordsの最初の値を使用
							analysis.searchQuery = analysis.keywords[0] || mood;
						}
						analysis.searchQuery = analysis.searchQuery.trim().slice(0, 100); // 最大100文字

						// 最終的な必須フィールドチェック
						if (!analysis.searchQuery && analysis.genres.length === 0) {
							throw new Error('Invalid analysis response: no valid search criteria');
						}

						console.log('検証済みAI分析結果:', analysis);
					} catch (parseError) {
						console.error('Gemini API JSON parse/validation error:', parseError);
						console.error('Response text:', analysisText);
						throw new Error('Failed to parse Gemini API response');
					}

					// 結果をキャッシュに保存
					geminiCache.set(cacheKey, {
						analysis,
						timestamp: Date.now()
					});

					console.log('Gemini AI分析結果（APIから取得）:', analysis);
				}

				// 分析結果を使ってTMDB APIで検索
				if (analysis.searchQuery) {
					const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(analysis.searchQuery)}&language=${tmdbLanguage}`;
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
						const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${tmdbLanguage}&sort_by=popularity.desc&with_genres=${genreIds.join(',')}&vote_count.gte=100`;
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
				// タイムアウトエラー
				if (geminiError?.message === 'Gemini API timeout') {
					console.error('Gemini API timeout - TMDBのみで検索します');
				}
				// 429エラー（クォータ超過）または503エラー（サービス過負荷）の場合、サーキットブレーカーを開く
				else if (geminiError?.status === 429 || geminiError?.status === 503) {
					openCircuitBreaker();
					const errorType = geminiError?.status === 429 ? 'クォータ超過' : 'サービス過負荷';
					console.error(`Gemini API ${errorType}により、TMDBのみで動作します:`, geminiError.message);
				}
				// その他のエラー（JSON parse errorなど）
				else {
					console.error('Gemini API error, falling back to TMDB:', geminiError?.message || geminiError);
				}
			}
		} else if (GEMINI_API_KEY && isCircuitBreakerOpen()) {
			console.log('サーキットブレーカー: OPEN - Gemini APIをスキップし、TMDBのみで検索します');
		}

		// Gemini APIが失敗した場合、またはAPIキーがない場合はTMDBのみを使用
		if (movies.length === 0) {
			// まずキーワード検索を試みる
			const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(mood)}&language=${tmdbLanguage}`;
			movies = await fetchMultiplePages(searchUrl, 30);

			if (movies.length === 0) {
				// キーワード検索で結果がない場合、ジャンルベースで検索
				const genres = getGenresByMood(mood);
				const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${tmdbLanguage}&sort_by=popularity.desc&with_genres=${genres.join(',')}&vote_count.gte=100`;
				movies = await fetchMultiplePages(discoverUrl, 30);
			}
		}

		// 最終的に結果が0件の場合でも、エラーではなく空の配列を返す
		if (movies.length === 0) {
			console.log('検索結果が見つかりませんでした:', mood);
		}

		return json({ movies });
	} catch (error) {
		console.error('Error in recommend API:', error);
		const errorMessage = language === 'ja'
			? 'サーバーエラーが発生しました。しばらくしてから再度お試しください。'
			: 'A server error occurred. Please try again later.';
		return json({ error: errorMessage }, { status: 500 });
	}
};
