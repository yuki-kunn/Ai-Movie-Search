<script lang="ts">
	import { Motion } from 'svelte-motion';
	import { onMount } from 'svelte';

	type Movie = {
		id: number;
		title: string;
		overview: string;
		poster_path: string;
		release_date: string;
		vote_average: number;
	};

	let mood = $state('');
	let movies = $state<Movie[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function searchMovies() {
		if (!mood.trim()) {
			error = '気分やキーワードを入力してください';
			return;
		}

		loading = true;
		error = '';
		movies = [];

		try {
			const response = await fetch('/api/recommend', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ mood }),
			});

			if (!response.ok) {
				throw new Error('映画の検索に失敗しました');
			}

			const data = await response.json();
			movies = data.movies;
		} catch (err) {
			error = err instanceof Error ? err.message : '予期しないエラーが発生しました';
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			searchMovies();
		}
	}
</script>

<div class="min-h-screen p-8">
	<Motion
		initial={{ opacity: 0, y: -50 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.8, ease: 'easeOut' }}
	>
		<div class="max-w-6xl mx-auto">
			<h1 class="text-5xl md:text-7xl font-bold text-center mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
				AI Movie Search
			</h1>
			<p class="text-center text-lg text-gray-300 mb-12">
				あなたの気分やキーワードから、AIが最適な映画をおすすめします
			</p>

			<div class="mb-12">
				<div class="flex gap-4 max-w-2xl mx-auto">
					<input
						type="text"
						bind:value={mood}
						onkeypress={handleKeyPress}
						placeholder="例: 感動的な映画、アクション満載、笑える映画..."
						class="flex-1 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
					<button
						onclick={searchMovies}
						disabled={loading}
						class="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? '検索中...' : '検索'}
					</button>
				</div>
				{#if error}
					<p class="text-red-400 text-center mt-4">{error}</p>
				{/if}
			</div>

			{#if loading}
				<div class="flex justify-center items-center py-20">
					<div class="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
				</div>
			{/if}

			{#if movies.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{#each movies as movie, index}
						<Motion
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
						>
							<div class="group cursor-pointer">
								<div class="relative overflow-hidden rounded-2xl mb-4 aspect-[2/3] bg-white/10">
									{#if movie.poster_path}
										<img
											src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
											alt={movie.title}
											class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-gray-400">
											No Image
										</div>
									{/if}
									<div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
										<p class="text-sm line-clamp-4">{movie.overview || '説明なし'}</p>
									</div>
								</div>
								<h3 class="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
									{movie.title}
								</h3>
								<div class="flex justify-between text-sm text-gray-400">
									<span>{movie.release_date?.split('-')[0] || 'N/A'}</span>
									<span class="flex items-center gap-1">
										<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
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
</div>
