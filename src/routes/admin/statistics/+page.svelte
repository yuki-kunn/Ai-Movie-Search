<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	type Statistics = {
		topMovies: Array<{ movieId: number; title: string; genres: string[]; count: number }>;
		topGenres: Array<{ genre: string; count: number }>;
		genderStats: {
			male: { users: number; favorites: number };
			female: { users: number; favorites: number };
			other: { users: number; favorites: number };
			not_specified: { users: number; favorites: number };
		};
		totalFavorites: number;
	};

	let statistics = $state<Statistics | null>(null);
	let loading = $state(true);

	onMount(async () => {
		// 管理者でない場合はホームにリダイレクト
		if (!authStore.isAdmin()) {
			goto('/');
			return;
		}

		// 統計データを取得
		try {
			const res = await fetch('/api/admin/statistics');
			if (res.ok) {
				statistics = await res.json();
			}
		} catch (error) {
			console.error('Failed to load statistics:', error);
		} finally {
			loading = false;
		}
	});

	function getGenderLabel(gender: string): string {
		switch (gender) {
			case 'male':
				return '男性';
			case 'female':
				return '女性';
			case 'other':
				return 'その他';
			default:
				return '未設定';
		}
	}

	function getGenderColor(gender: string): string {
		switch (gender) {
			case 'male':
				return 'from-blue-600 to-blue-400';
			case 'female':
				return 'from-rose-600 to-rose-400';
			case 'other':
				return 'from-purple-600 to-purple-400';
			default:
				return 'from-gray-600 to-gray-400';
		}
	}

	function calculatePercentage(count: number, total: number): number {
		return total > 0 ? Math.round((count / total) * 100) : 0;
	}
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
	</div>
{:else if !authStore.isAdmin()}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-red-400">アクセス拒否</h1>
			<p class="text-gray-400 mt-2">このページへのアクセス権限がありません</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
		<div class="max-w-7xl mx-auto">
			<!-- Header -->
			<div class="mb-8">
				<div class="flex items-center gap-4 mb-4">
					<a
						href="/admin"
						class="p-2 hover:bg-slate-800 rounded-lg transition-all text-gray-400 hover:text-white"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</a>
					<h1 class="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
						統計情報
					</h1>
				</div>
				<p class="text-gray-400 ml-14">詳細な分析とランキング</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Popular Movies -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6">
					<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
						</svg>
						人気映画トップ10
					</h2>
					<div class="space-y-3">
						{#if statistics?.topMovies && statistics.topMovies.length > 0}
							{#each statistics.topMovies as movie, index}
								<div class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-all">
									<div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
										{index + 1}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-white font-medium truncate">{movie.title}</p>
										<p class="text-xs text-gray-400 truncate">{movie.genres.join(', ')}</p>
									</div>
									<div class="flex-shrink-0 px-3 py-1 bg-pink-500/20 rounded-full">
										<span class="text-pink-400 font-semibold">{movie.count}</span>
									</div>
								</div>
							{/each}
						{:else}
							<p class="text-gray-400 text-center py-8">データがありません</p>
						{/if}
					</div>
				</div>

				<!-- Popular Genres -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6">
					<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
						</svg>
						人気ジャンルトップ10
					</h2>
					<div class="space-y-3">
						{#if statistics?.topGenres && statistics.topGenres.length > 0}
							{#each statistics.topGenres as genre, index}
								<div class="flex items-center gap-3">
									<div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
										{index + 1}
									</div>
									<div class="flex-1">
										<div class="flex items-center justify-between mb-1">
											<span class="text-white font-medium">{genre.genre}</span>
											<span class="text-purple-400 font-semibold">{genre.count}</span>
										</div>
										<div class="h-2 bg-slate-800 rounded-full overflow-hidden">
											<div
												class="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
												style="width: {calculatePercentage(genre.count, statistics.totalFavorites)}%"
											></div>
										</div>
									</div>
								</div>
							{/each}
						{:else}
							<p class="text-gray-400 text-center py-8">データがありません</p>
						{/if}
					</div>
				</div>

				<!-- Gender Statistics -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 lg:col-span-2">
					<h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
						<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						性別統計
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{#if statistics?.genderStats}
							{#each Object.entries(statistics.genderStats) as [gender, stats]}
								<div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
									<h3 class="text-gray-400 text-sm mb-3">{getGenderLabel(gender)}</h3>
									<div class="space-y-3">
										<div>
											<div class="flex items-baseline gap-2 mb-1">
												<span class="text-2xl font-bold text-white">{stats.users}</span>
												<span class="text-sm text-gray-400">ユーザー</span>
											</div>
											<div class="h-2 bg-slate-700 rounded-full overflow-hidden">
												<div
													class="h-full bg-gradient-to-r {getGenderColor(gender)} rounded-full"
													style="width: {stats.users > 0 ? '100%' : '0%'}"
												></div>
											</div>
										</div>
										<div>
											<div class="flex items-baseline gap-2 mb-1">
												<span class="text-2xl font-bold text-white">{stats.favorites}</span>
												<span class="text-sm text-gray-400">お気に入り</span>
											</div>
											<div class="h-2 bg-slate-700 rounded-full overflow-hidden">
												<div
													class="h-full bg-gradient-to-r {getGenderColor(gender)} rounded-full opacity-70"
													style="width: {calculatePercentage(stats.favorites, statistics.totalFavorites)}%"
												></div>
											</div>
										</div>
										{#if stats.users > 0}
											<div class="pt-2 border-t border-slate-700">
												<p class="text-xs text-gray-400">
													平均 <span class="text-white font-semibold">{(stats.favorites / stats.users).toFixed(1)}</span> お気に入り/人
												</p>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
