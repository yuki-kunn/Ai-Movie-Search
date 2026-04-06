<script lang="ts">
	import { Motion } from 'svelte-motion';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { favoritesStore } from '$lib/stores/favorites.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { goto } from '$app/navigation';

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

	let selectedMovie = $state<Movie | null>(null);
	let movieDetail = $state<MovieDetail | null>(null);
	let loadingDetail = $state(false);

	onMount(async () => {
		// 未ログインの場合はトップページへ
		if (!authStore.user) {
			goto('/');
			return;
		}

		// お気に入りを読み込み
		await favoritesStore.loadFavorites();
	});

	async function openMovieDetail(movie: Movie) {
		selectedMovie = movie;
		movieDetail = null;
		loadingDetail = true;

		try {
			const response = await fetch(`/api/movie/${movie.id}?language=${languageStore.language}`);
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

	async function handleRemoveFavorite(movieId: number, event: Event) {
		event.stopPropagation();
		await favoritesStore.removeFavorite(movieId);
	}
</script>

<div class="min-h-screen pb-20">
	<Motion
		initial={{ opacity: 0, y: -50 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.8, ease: 'easeOut' }}
	>
		<div class="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8">
			<h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
				{languageStore.language === 'ja' ? 'お気に入り' : 'My Favorites'}
			</h1>
			<p class="text-center text-sm sm:text-base text-gray-400 mb-6 sm:mb-8">
				{languageStore.language === 'ja'
					? 'お気に入りに登録した映画一覧'
					: 'Your favorite movies collection'}
			</p>

			{#if favoritesStore.loading}
				<div class="flex justify-center items-center py-12 sm:py-16 md:py-20">
					<div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-purple-600 border-t-transparent"></div>
				</div>
			{:else if favoritesStore.favorites.length === 0}
				<div class="text-center py-12 sm:py-16 md:py-20">
					<svg class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
					</svg>
					<p class="text-gray-400 text-lg">
						{languageStore.language === 'ja' ? 'お気に入りはまだありません' : 'No favorites yet'}
					</p>
					<p class="text-gray-500 text-sm mt-2">
						{languageStore.language === 'ja'
							? '映画を検索して、星アイコンをクリックしてお気に入りに追加しましょう'
							: 'Search for movies and click the star icon to add favorites'}
					</p>
				</div>
			{:else}
				<div class="mb-4 sm:mb-6 text-center">
					<p class="text-sm sm:text-base text-gray-400">
						{languageStore.language === 'ja' ? '全' : 'Total'} <span class="text-purple-400 font-bold">{favoritesStore.favorites.length}</span> {languageStore.language === 'ja' ? '件' : 'movies'}
					</p>
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
					{#each favoritesStore.favorites as movie, index}
						<Motion
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
						>
							<div class="group cursor-pointer relative">
								<!-- お気に入りボタン -->
								<button
									onclick={(e) => handleRemoveFavorite(movie.id, e)}
									class="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-all transform hover:scale-110 duration-200"
									aria-label="Remove from favorites"
								>
									<svg
										class="w-5 h-5 text-yellow-400 transition-all duration-200"
										viewBox="0 0 20 20"
										fill="currentColor"
										stroke="currentColor"
										stroke-width="0"
									>
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
								</button>

								<div onclick={() => openMovieDetail(movie)} class="relative overflow-hidden rounded-lg sm:rounded-xl mb-2 aspect-[2/3] bg-slate-800/50 border border-slate-700/50 group-hover:border-purple-500/50 transition-colors duration-300">
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
										<p class="text-xs line-clamp-3 text-gray-200">{movie.overview || (languageStore.language === 'ja' ? '説明なし' : 'No overview')}</p>
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
						aria-label={languageStore.language === 'ja' ? '閉じる' : 'Close'}
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
										{languageStore.language === 'ja' ? '公開' : 'Released'}: {selectedMovie.release_date}
									</span>
								{/if}
							</div>
						</div>

						<!-- 概要 -->
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-gray-200 mb-2">{languageStore.language === 'ja' ? '概要' : 'Overview'}</h3>
							<p class="text-gray-300 leading-relaxed">
								{selectedMovie.overview || (languageStore.language === 'ja' ? '概要情報がありません' : 'No overview available')}
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
									<h3 class="text-lg font-semibold text-gray-200 mb-3">{languageStore.language === 'ja' ? '公式リンク' : 'Official Links'}</h3>
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
												{languageStore.language === 'ja' ? '公式サイト' : 'Official Site'}
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
									<h3 class="text-lg font-semibold text-gray-200 mb-3">{languageStore.language === 'ja' ? '配信サービス' : 'Streaming Services'}</h3>
									<p class="text-xs text-gray-500 mb-3">
										{languageStore.language === 'ja' ? '※クリックすると配信サービスの視聴ページに移動します' : '※Click to go to the streaming page'}
									</p>

									<!-- サブスク配信 -->
									{#if movieDetail.providers.flatrate.length > 0}
										<div class="mb-4">
											<h4 class="text-sm font-medium text-gray-400 mb-2">{languageStore.language === 'ja' ? '見放題配信' : 'Subscription'}</h4>
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
											<h4 class="text-sm font-medium text-gray-400 mb-2">{languageStore.language === 'ja' ? 'レンタル' : 'Rent'}</h4>
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
											<h4 class="text-sm font-medium text-gray-400 mb-2">{languageStore.language === 'ja' ? '購入' : 'Buy'}</h4>
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
