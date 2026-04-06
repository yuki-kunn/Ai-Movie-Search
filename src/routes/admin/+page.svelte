<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	type Stats = {
		totalUsers: number;
		totalFavorites: number;
		usersGrowth: number;
		favoritesGrowth: number;
		maleCount: number;
		femaleCount: number;
		otherCount: number;
		notSpecifiedCount: number;
	};

	let stats = $state<Stats | null>(null);
	let loading = $state(true);

	onMount(async () => {
		// 管理者でない場合はホームにリダイレクト
		if (!authStore.isAdmin()) {
			goto('/');
			return;
		}

		// 統計データを取得
		try {
			const res = await fetch('/api/admin/stats');
			if (res.ok) {
				stats = await res.json();
			}
		} catch (error) {
			console.error('Failed to load stats:', error);
		} finally {
			loading = false;
		}
	});
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
				<h1 class="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
					管理者ダッシュボード
				</h1>
				<p class="text-gray-400">AI Movie Search の統計と管理</p>
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<!-- Total Users Card -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all">
					<div class="flex items-center justify-between mb-4">
						<div class="p-3 bg-purple-500/20 rounded-lg">
							<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</div>
						{#if stats && stats.usersGrowth !== 0}
							<div class="text-sm {stats.usersGrowth > 0 ? 'text-green-400' : 'text-red-400'}">
								{stats.usersGrowth > 0 ? '+' : ''}{stats.usersGrowth}%
							</div>
						{/if}
					</div>
					<div class="text-3xl font-bold text-white mb-1">{stats?.totalUsers || 0}</div>
					<div class="text-sm text-gray-400">総ユーザー数</div>
				</div>

				<!-- Total Favorites Card -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-pink-500/50 transition-all">
					<div class="flex items-center justify-between mb-4">
						<div class="p-3 bg-pink-500/20 rounded-lg">
							<svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
							</svg>
						</div>
						{#if stats && stats.favoritesGrowth !== 0}
							<div class="text-sm {stats.favoritesGrowth > 0 ? 'text-green-400' : 'text-red-400'}">
								{stats.favoritesGrowth > 0 ? '+' : ''}{stats.favoritesGrowth}%
							</div>
						{/if}
					</div>
					<div class="text-3xl font-bold text-white mb-1">{stats?.totalFavorites || 0}</div>
					<div class="text-sm text-gray-400">お気に入り総数</div>
				</div>

				<!-- Male Users Card -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
					<div class="flex items-center justify-between mb-4">
						<div class="p-3 bg-blue-500/20 rounded-lg">
							<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
					</div>
					<div class="text-3xl font-bold text-white mb-1">{stats?.maleCount || 0}</div>
					<div class="text-sm text-gray-400">男性ユーザー</div>
				</div>

				<!-- Female Users Card -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-rose-500/50 transition-all">
					<div class="flex items-center justify-between mb-4">
						<div class="p-3 bg-rose-500/20 rounded-lg">
							<svg class="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
					</div>
					<div class="text-3xl font-bold text-white mb-1">{stats?.femaleCount || 0}</div>
					<div class="text-sm text-gray-400">女性ユーザー</div>
				</div>
			</div>

			<!-- Navigation Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Users Card -->
				<a
					href="/admin/users"
					class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-purple-500 transition-all group"
				>
					<div class="flex items-center gap-4 mb-4">
						<div class="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-all">
							<svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold text-white">ユーザー管理</h3>
							<p class="text-sm text-gray-400">ユーザー一覧と詳細</p>
						</div>
					</div>
					<div class="flex items-center text-purple-400 text-sm font-medium">
						<span>詳細を見る</span>
						<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</a>

				<!-- Statistics Card -->
				<a
					href="/admin/statistics"
					class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-pink-500 transition-all group"
				>
					<div class="flex items-center gap-4 mb-4">
						<div class="p-3 bg-pink-500/20 rounded-lg group-hover:bg-pink-500/30 transition-all">
							<svg class="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold text-white">統計情報</h3>
							<p class="text-sm text-gray-400">詳細な分析とグラフ</p>
						</div>
					</div>
					<div class="flex items-center text-pink-400 text-sm font-medium">
						<span>詳細を見る</span>
						<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</a>

				<!-- Settings Card -->
				<a
					href="/admin/settings"
					class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-all group"
				>
					<div class="flex items-center gap-4 mb-4">
						<div class="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all">
							<svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold text-white">システム設定</h3>
							<p class="text-sm text-gray-400">アプリ設定とAPI</p>
						</div>
					</div>
					<div class="flex items-center text-blue-400 text-sm font-medium">
						<span>詳細を見る</span>
						<svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</a>
			</div>
		</div>
	</div>
{/if}
