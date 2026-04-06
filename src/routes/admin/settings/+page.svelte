<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let apiSettings = $state({
		tmdbApiKey: '●●●●●●●●',
		openaiApiKey: '●●●●●●●●',
	});

	let systemSettings = $state({
		maintenanceMode: false,
		registrationEnabled: true,
		maxFavoritesPerUser: 100,
	});

	let loading = $state(true);
	let saving = $state(false);

	onMount(async () => {
		// 管理者でない場合はホームにリダイレクト
		if (!authStore.isAdmin()) {
			goto('/');
			return;
		}

		loading = false;
	});

	async function saveSettings() {
		saving = true;
		try {
			// TODO: 実際のAPI呼び出しを実装
			await new Promise((resolve) => setTimeout(resolve, 1000));
			alert('設定を保存しました');
		} catch (error) {
			console.error('Failed to save settings:', error);
			alert('設定の保存に失敗しました');
		} finally {
			saving = false;
		}
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
		<div class="max-w-4xl mx-auto">
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
						システム設定
					</h1>
				</div>
				<p class="text-gray-400 ml-14">アプリケーション設定とAPI管理</p>
			</div>

			<div class="space-y-6">
				<!-- API Settings -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6">
					<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
						API設定
					</h2>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-400 mb-2">TMDB API Key</label>
							<input
								type="password"
								bind:value={apiSettings.tmdbApiKey}
								class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
								placeholder="Enter TMDB API Key"
							/>
							<p class="mt-1 text-xs text-gray-500">映画データの取得に使用されます</p>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-400 mb-2">OpenAI API Key</label>
							<input
								type="password"
								bind:value={apiSettings.openaiApiKey}
								class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
								placeholder="Enter OpenAI API Key"
							/>
							<p class="mt-1 text-xs text-gray-500">AI推薦機能に使用されます</p>
						</div>
					</div>
				</div>

				<!-- System Settings -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6">
					<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						システム設定
					</h2>
					<div class="space-y-4">
						<!-- Maintenance Mode -->
						<div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
							<div>
								<h3 class="text-white font-medium">メンテナンスモード</h3>
								<p class="text-sm text-gray-400">有効にするとサイトが一時的に利用不可になります</p>
							</div>
							<button
								onclick={() => (systemSettings.maintenanceMode = !systemSettings.maintenanceMode)}
								class="relative w-14 h-7 rounded-full transition-colors {systemSettings.maintenanceMode ? 'bg-purple-600' : 'bg-slate-700'}"
							>
								<div
									class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform {systemSettings.maintenanceMode ? 'translate-x-7' : ''}"
								></div>
							</button>
						</div>

						<!-- Registration -->
						<div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
							<div>
								<h3 class="text-white font-medium">新規登録</h3>
								<p class="text-sm text-gray-400">新規ユーザーの登録を許可します</p>
							</div>
							<button
								onclick={() => (systemSettings.registrationEnabled = !systemSettings.registrationEnabled)}
								class="relative w-14 h-7 rounded-full transition-colors {systemSettings.registrationEnabled ? 'bg-purple-600' : 'bg-slate-700'}"
							>
								<div
									class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform {systemSettings.registrationEnabled ? 'translate-x-7' : ''}"
								></div>
							</button>
						</div>

						<!-- Max Favorites -->
						<div class="p-4 bg-slate-800/50 rounded-lg">
							<label class="block text-white font-medium mb-2">ユーザーあたりの最大お気に入り数</label>
							<input
								type="number"
								bind:value={systemSettings.maxFavoritesPerUser}
								min="1"
								max="1000"
								class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
							/>
							<p class="mt-1 text-xs text-gray-400">デフォルト: 100</p>
						</div>
					</div>
				</div>

				<!-- Database Info -->
				<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6">
					<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
						</svg>
						データベース情報
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="p-4 bg-slate-800/50 rounded-lg">
							<p class="text-sm text-gray-400 mb-1">データベース</p>
							<p class="text-lg font-semibold text-white">Firebase Firestore</p>
						</div>
						<div class="p-4 bg-slate-800/50 rounded-lg">
							<p class="text-sm text-gray-400 mb-1">接続状態</p>
							<p class="text-lg font-semibold text-green-400">正常</p>
						</div>
					</div>
				</div>

				<!-- Save Button -->
				<div class="flex justify-end">
					<button
						onclick={saveSettings}
						disabled={saving}
						class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-semibold transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? '保存中...' : '設定を保存'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
