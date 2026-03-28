<script lang="ts">
	import { Motion } from 'svelte-motion';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type Movie = {
		id: number;
		title: string;
		overview: string;
		poster_path: string;
		release_date: string;
		vote_average: number;
	};

	type Provider = {
		provider_id: number;
		provider_name: string;
		logo_path: string;
	};

	type MovieDetail = {
		homepage: string | null;
		imdb_id: string | null;
		providers: {
			link: string | null;
			flatrate: Provider[];
			rent: Provider[];
			buy: Provider[];
		};
	};

	const STORAGE_KEY = 'ai-movie-search-state';

	type Language = 'ja' | 'en';

	let mood = $state('');
	let movies = $state<Movie[]>([]);
	let loading = $state(false);
	let error = $state('');
	let currentPage = $state(1);
	let selectedMovie = $state<Movie | null>(null);
	let movieDetail = $state<MovieDetail | null>(null);
	let loadingDetail = $state(false);
	let language = $state<Language>('ja');
	let movieIds = $state<number[]>([]); // 映画IDリストを保持
	const itemsPerPage = 20;

	// localStorageからデータを復元
	onMount(() => {
		if (browser) {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const data = JSON.parse(saved);
					mood = data.mood || '';
					movies = data.movies || [];
					currentPage = data.currentPage || 1;
					language = data.language || 'ja';
					movieIds = data.movieIds || [];
				}
			} catch (err) {
				console.error('Failed to restore from localStorage:', err);
			}
		}
	});

	// データが変更されたらlocalStorageに保存
	$effect(() => {
		if (browser) {
			try {
				const data = {
					mood,
					movies,
					currentPage,
					language,
					movieIds
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
			} catch (err) {
				console.error('Failed to save to localStorage:', err);
			}
		}
	});

	// ページネーション用の計算
	const totalPages = $derived(Math.ceil(movies.length / itemsPerPage));
	const paginatedMovies = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return movies.slice(start, end);
	});

	function goToPage(page: number) {
		currentPage = page;
		// ページ変更時にトップにスクロール
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function nextPage() {
		if (currentPage < totalPages) {
			goToPage(currentPage + 1);
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	}

	async function searchMovies() {
		if (!mood.trim()) {
			error = language === 'ja' ? '気分やキーワードを入力してください' : 'Please enter a mood or keyword';
			return;
		}

		loading = true;
		error = '';
		movies = [];
		currentPage = 1; // 検索時にページをリセット

		try {
			const response = await fetch('/api/recommend', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ mood, language }),
			});

			if (!response.ok) {
				throw new Error(language === 'ja' ? '映画の検索に失敗しました' : 'Failed to search movies');
			}

			const data = await response.json();
			movies = data.movies;
			// 映画IDリストを保存
			movieIds = movies.map(m => m.id);
		} catch (err) {
			error = err instanceof Error ? err.message : (language === 'ja' ? '予期しないエラーが発生しました' : 'An unexpected error occurred');
		} finally {
			loading = false;
		}
	}

	async function switchLanguage(lang: Language) {
		if (language === lang) return; // 同じ言語なら何もしない

		language = lang;

		// 映画IDリストが存在する場合は、同じ映画を新しい言語で取得
		if (movieIds.length > 0) {
			loading = true;
			error = '';
			const previousPage = currentPage;
			const selectedMovieId = selectedMovie?.id; // モーダルで開いている映画のIDを保持

			try {
				const response = await fetch('/api/movies', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ movieIds, language: lang }),
				});

				if (!response.ok) {
					throw new Error(lang === 'ja' ? '映画の取得に失敗しました' : 'Failed to fetch movies');
				}

				const data = await response.json();
				movies = data.movies;
				currentPage = previousPage; // ページ位置を保持

				// モーダルが開いている場合は、selectedMovieオブジェクトを更新
				if (selectedMovieId) {
					const updatedMovie = movies.find(m => m.id === selectedMovieId);
					if (updatedMovie) {
						selectedMovie = updatedMovie;
					}
				}
			} catch (err) {
				error = err instanceof Error ? err.message : (lang === 'ja' ? '予期しないエラーが発生しました' : 'An unexpected error occurred');
			} finally {
				loading = false;
			}
		}

		// モーダルが開いている場合は、新しい言語で詳細情報を再取得
		if (selectedMovie) {
			loadingDetail = true;
			try {
				const response = await fetch(`/api/movie/${selectedMovie.id}?language=${lang}`);
				if (response.ok) {
					movieDetail = await response.json();
				}
			} catch (err) {
				console.error('Failed to fetch movie details:', err);
			} finally {
				loadingDetail = false;
			}
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			searchMovies();
		}
	}

	async function openMovieDetail(movie: Movie) {
		selectedMovie = movie;
		movieDetail = null;
		loadingDetail = true;

		try {
			const response = await fetch(`/api/movie/${movie.id}?language=${language}`);
			if (response.ok) {
				movieDetail = await response.json();
			}
		} catch (err) {
			console.error('Failed to fetch movie details:', err);
		} finally {
			loadingDetail = false;
		}
	}

	function closeMovieDetail() {
		selectedMovie = null;
		movieDetail = null;
	}
</script>

<div class="min-h-screen">
	<Motion
		initial={{ opacity: 0, y: -50 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.8, ease: 'easeOut' }}
	>
		<div class="w-full max-w-7xl mx-auto">
			<!-- 言語切り替えタブ -->
			<div class="flex justify-end px-3 sm:px-4 pt-4">
				<div class="relative inline-flex bg-slate-800/80 backdrop-blur-lg rounded-full p-1 border border-slate-700">
					<!-- スライドインジケーター -->
					<div
						class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-transform duration-300 ease-out shadow-lg shadow-purple-500/30"
						style="transform: translateX({language === 'ja' ? '0%' : '100%'})"
					></div>

					<!-- タブボタン -->
					<button
						onclick={() => switchLanguage('ja')}
						class="relative z-10 px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-colors duration-300 {language === 'ja' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}"
					>
						🇯🇵 JP
					</button>
					<button
						onclick={() => switchLanguage('en')}
						class="relative z-10 px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-colors duration-300 {language === 'en' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}"
					>
						🇺🇸 EN
					</button>
				</div>
			</div>

			<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-3 sm:mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent px-3 sm:px-4 pt-4 sm:pt-6 md:pt-8">
				AI Movie Search
			</h1>
			<p class="text-center text-sm sm:text-base md:text-lg text-gray-400 mb-6 sm:mb-8 md:mb-10 px-3 sm:px-4">
				{language === 'ja'
					? 'あなたの気分やキーワードから、AIが最適な映画をおすすめします'
					: 'AI recommends the best movies based on your mood and keywords'}
			</p>

			<div class="mb-6 sm:mb-8 md:mb-10">
				<div class="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 max-w-2xl mx-auto px-3 sm:px-4 md:px-6">
					<input
						type="text"
						bind:value={mood}
						onkeypress={handleKeyPress}
						placeholder={language === 'ja' ? '例: 感動的な映画、アクション満載...' : 'e.g. Heartwarming movie, Action-packed...'}
						class="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-800/80 backdrop-blur-lg border border-slate-700 text-gray-100 placeholder-gray-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-500"
					/>
					<button
						onclick={searchMovies}
						disabled={loading}
						class="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-purple-500/30 text-sm sm:text-base whitespace-nowrap"
					>
						{loading ? (language === 'ja' ? '検索中...' : 'Searching...') : (language === 'ja' ? '検索' : 'Search')}
					</button>
				</div>
				{#if error}
					<p class="text-red-400 text-center mt-3 sm:mt-4 text-sm sm:text-base px-3 sm:px-4">{error}</p>
				{/if}
			</div>

			{#if loading}
				<div class="flex justify-center items-center py-12 sm:py-16 md:py-20">
					<div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-purple-600 border-t-transparent"></div>
				</div>
			{/if}

			{#if movies.length > 0}
				<!-- 結果の件数表示 -->
				<div class="mb-4 sm:mb-6 text-center px-3 sm:px-4">
					<p class="text-sm sm:text-base text-gray-400">
						{#if language === 'ja'}
							全 <span class="text-purple-400 font-bold">{movies.length}</span> 件の映画が見つかりました
							{#if totalPages > 1}
								<span class="block sm:inline mt-1 sm:mt-0">（ページ {currentPage} / {totalPages}）</span>
							{/if}
						{:else}
							Found <span class="text-purple-400 font-bold">{movies.length}</span> movies
							{#if totalPages > 1}
								<span class="block sm:inline mt-1 sm:mt-0">(Page {currentPage} / {totalPages})</span>
							{/if}
						{/if}
					</p>
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 px-3 sm:px-4 md:px-6">
					{#each paginatedMovies() as movie, index}
						<Motion
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
						>
							<div class="group cursor-pointer" onclick={() => openMovieDetail(movie)}>
								<div class="relative overflow-hidden rounded-lg sm:rounded-xl mb-2 aspect-[2/3] bg-slate-800/50 border border-slate-700/50 group-hover:border-purple-500/50 transition-colors duration-300">
									{#if movie.poster_path}
										<img
											src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
											alt={movie.title}
											class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-gray-500 text-xs">
											No Image
										</div>
									{/if}
									<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-purple-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 sm:p-3">
										<p class="text-xs line-clamp-3 text-gray-200">{movie.overview || '説明なし'}</p>
									</div>
								</div>
								<h3 class="text-xs sm:text-sm md:text-base font-bold mb-1 text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-2">
									{movie.title}
								</h3>
								<div class="flex justify-between items-center text-[10px] sm:text-xs text-gray-500">
									<span class="truncate">{movie.release_date?.split('-')[0] || 'N/A'}</span>
									<span class="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-1">
										<svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
										{movie.vote_average.toFixed(1)}
									</span>
								</div>
							</div>
						</Motion>
					{/each}
				</div>

				<!-- ページネーション -->
				{#if totalPages > 1}
					<div class="mt-6 sm:mt-8 md:mt-10 pb-4 sm:pb-6 flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-4">
						<!-- 前へボタン -->
						<button
							onclick={prevPage}
							disabled={currentPage === 1}
							class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-gray-300 hover:bg-slate-700 hover:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:hover:border-slate-700 flex-shrink-0"
							aria-label="前のページ"
						>
							<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>

						<!-- ページ番号 -->
						<div class="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
							{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
								<!-- モバイル: 現在ページ±1、PC: 現在ページ±2 -->
								{#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
									<button
										onclick={() => goToPage(page)}
										class="min-w-[32px] h-8 sm:min-w-[40px] sm:h-10 px-2 rounded-lg font-semibold transition-all text-xs sm:text-base flex-shrink-0 {page === currentPage
											? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
											: 'bg-slate-800 border border-slate-700 text-gray-300 hover:bg-slate-700 hover:border-purple-500'}"
									>
										{page}
									</button>
								{:else if page === currentPage - 2 || page === currentPage + 2}
									<span class="min-w-[32px] h-8 sm:min-w-[40px] sm:h-10 flex items-center justify-center text-gray-500 text-xs sm:text-base flex-shrink-0">...</span>
								{/if}
							{/each}
						</div>

						<!-- 次へボタン -->
						<button
							onclick={nextPage}
							disabled={currentPage === totalPages}
							class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-gray-300 hover:bg-slate-700 hover:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:hover:border-slate-700 flex-shrink-0"
							aria-label="次のページ"
						>
							<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				{/if}
			{/if}
		</div>
	</Motion>

	<!-- 映画詳細モーダル -->
	{#if selectedMovie}
		<div
			class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
			onclick={closeMovieDetail}
			role="dialog"
			aria-modal="true"
		>
			<Motion
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3, ease: 'easeOut' }}
			>
				<div
					class="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl"
					onclick={(e) => e.stopPropagation()}
					role="document"
				>
					<!-- 閉じるボタン -->
					<button
						onclick={closeMovieDetail}
						class="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
						aria-label="閉じる"
					>
						<svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>

					<!-- ポスター画像 -->
					{#if selectedMovie.poster_path}
						<div class="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-t-2xl">
							<img
								src={`https://image.tmdb.org/t/p/original${selectedMovie.poster_path}`}
								alt={selectedMovie.title}
								class="w-full h-full object-cover"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
						</div>
					{/if}

					<!-- コンテンツ -->
					<div class="p-6 sm:p-8">
						<!-- タイトルと評価 -->
						<div class="mb-4">
							<h2 class="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">
								{selectedMovie.title}
							</h2>
							<div class="flex items-center gap-4 text-sm text-gray-400">
								<span class="flex items-center gap-1">
									<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
									<span class="text-lg font-semibold text-gray-200">{selectedMovie.vote_average.toFixed(1)}</span>
								</span>
								{#if selectedMovie.release_date}
									<span>
										{language === 'ja' ? '公開' : 'Released'}: {selectedMovie.release_date}
									</span>
								{/if}
							</div>
						</div>

						<!-- 概要 -->
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-gray-200 mb-2">{language === 'ja' ? '概要' : 'Overview'}</h3>
							<p class="text-gray-300 leading-relaxed">
								{selectedMovie.overview || (language === 'ja' ? '概要情報がありません' : 'No overview available')}
							</p>
						</div>

						<!-- リンク情報 -->
						{#if loadingDetail}
							<div class="flex justify-center py-4">
								<div class="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
							</div>
						{:else if movieDetail}
							<!-- 公式サイトとIMDb -->
							{#if movieDetail.homepage || movieDetail.imdb_id}
								<div class="mb-6">
									<h3 class="text-lg font-semibold text-gray-200 mb-3">{language === 'ja' ? '公式リンク' : 'Official Links'}</h3>
									<div class="flex flex-wrap gap-2">
										{#if movieDetail.homepage}
											<a
												href={movieDetail.homepage}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-medium transition-all"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
												</svg>
												{language === 'ja' ? '公式サイト' : 'Official Site'}
											</a>
										{/if}
										{#if movieDetail.imdb_id}
											<a
												href={`https://www.imdb.com/title/${movieDetail.imdb_id}`}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-medium transition-all"
											>
												<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
													<path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>
													<path fill="#000" d="M8.5 8.5h1.5v7H8.5v-7zm2.5 0h1.75l1 3.5 1-3.5H16.5v7h-1.25v-5l-1.25 5h-1l-1.25-5v5H10.5v-7z"/>
												</svg>
												IMDb
											</a>
										{/if}
									</div>
								</div>
							{/if}

							<!-- 配信サービス -->
							{#if movieDetail.providers.flatrate.length > 0 || movieDetail.providers.rent.length > 0 || movieDetail.providers.buy.length > 0}
								<div class="mb-4">
									<h3 class="text-lg font-semibold text-gray-200 mb-3">{language === 'ja' ? '配信サービス' : 'Streaming Services'}</h3>
									<p class="text-xs text-gray-500 mb-3">
										{language === 'ja' ? '※クリックすると配信サービスの視聴ページに移動します' : '※Click to go to the streaming page'}
									</p>

									<!-- サブスク配信 -->
									{#if movieDetail.providers.flatrate.length > 0}
										<div class="mb-4">
											<h4 class="text-sm font-medium text-gray-400 mb-2">{language === 'ja' ? '見放題配信' : 'Subscription'}</h4>
											<div class="flex flex-wrap gap-3">
												{#each movieDetail.providers.flatrate as provider}
													{#if movieDetail.providers.link}
														<a
															href={movieDetail.providers.link}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-purple-500 transition-all cursor-pointer"
														>
															{#if provider.logo_path}
																<img
																	src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
																	alt={provider.provider_name}
																	class="w-8 h-8 rounded"
																/>
															{/if}
															<span class="text-sm text-gray-300">{provider.provider_name}</span>
															<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
															</svg>
														</a>
													{:else}
														<div class="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
															{#if provider.logo_path}
																<img
																	src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
																	alt={provider.provider_name}
																	class="w-8 h-8 rounded"
																/>
															{/if}
															<span class="text-sm text-gray-300">{provider.provider_name}</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
									{/if}

									<!-- レンタル -->
									{#if movieDetail.providers.rent.length > 0}
										<div class="mb-4">
											<h4 class="text-sm font-medium text-gray-400 mb-2">{language === 'ja' ? 'レンタル' : 'Rent'}</h4>
											<div class="flex flex-wrap gap-3">
												{#each movieDetail.providers.rent as provider}
													{#if movieDetail.providers.link}
														<a
															href={movieDetail.providers.link}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-purple-500 transition-all cursor-pointer"
														>
															{#if provider.logo_path}
																<img
																	src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
																	alt={provider.provider_name}
																	class="w-8 h-8 rounded"
																/>
															{/if}
															<span class="text-sm text-gray-300">{provider.provider_name}</span>
															<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
															</svg>
														</a>
													{:else}
														<div class="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
															{#if provider.logo_path}
																<img
																	src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
																	alt={provider.provider_name}
																	class="w-8 h-8 rounded"
																/>
															{/if}
															<span class="text-sm text-gray-300">{provider.provider_name}</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
									{/if}

									<!-- 購入 -->
									{#if movieDetail.providers.buy.length > 0}
										<div class="mb-4">
											<h4 class="text-sm font-medium text-gray-400 mb-2">{language === 'ja' ? '購入' : 'Buy'}</h4>
											<div class="flex flex-wrap gap-3">
												{#each movieDetail.providers.buy as provider}
													{#if movieDetail.providers.link}
														<a
															href={movieDetail.providers.link}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 hover:border-purple-500 transition-all cursor-pointer"
														>
															{#if provider.logo_path}
																<img
																	src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
																	alt={provider.provider_name}
																	class="w-8 h-8 rounded"
																/>
															{/if}
															<span class="text-sm text-gray-300">{provider.provider_name}</span>
															<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
															</svg>
														</a>
													{:else}
														<div class="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
															{#if provider.logo_path}
																<img
																	src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
																	alt={provider.provider_name}
																	class="w-8 h-8 rounded"
																/>
															{/if}
															<span class="text-sm text-gray-300">{provider.provider_name}</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</Motion>
		</div>
	{/if}
</div>
