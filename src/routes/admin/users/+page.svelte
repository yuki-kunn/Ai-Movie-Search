<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	type User = {
		uid: string;
		email: string | null;
		username: string;
		gender: string;
		createdAt: string;
		favoritesCount: number;
	};

	let users = $state<User[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let genderFilter = $state<'all' | 'male' | 'female' | 'other' | 'not_specified'>('all');

	onMount(async () => {
		// 管理者でない場合はホームにリダイレクト
		if (!authStore.isAdmin()) {
			goto('/');
			return;
		}

		// ユーザー一覧を取得
		try {
			const res = await fetch('/api/admin/users');
			if (res.ok) {
				users = await res.json();
			}
		} catch (error) {
			console.error('Failed to load users:', error);
		} finally {
			loading = false;
		}
	});

	// フィルタリングされたユーザー一覧
	const filteredUsers = $derived.by(() => {
		let filtered = users;

		// 性別でフィルター
		if (genderFilter !== 'all') {
			filtered = filtered.filter((user) => user.gender === genderFilter);
		}

		// 検索クエリでフィルター
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(user) =>
					user.username.toLowerCase().includes(query) ||
					user.email?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

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

	function getGenderIcon(gender: string): string {
		switch (gender) {
			case 'male':
				return '♂';
			case 'female':
				return '♀';
			case 'other':
				return '⚥';
			default:
				return '?';
		}
	}

	function getGenderColor(gender: string): string {
		switch (gender) {
			case 'male':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
			case 'female':
				return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
			case 'other':
				return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
			default:
				return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
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
						ユーザー管理
					</h1>
				</div>
				<p class="text-gray-400 ml-14">登録ユーザーの一覧と詳細情報</p>
			</div>

			<!-- Filters -->
			<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-6 mb-6">
				<div class="flex flex-col md:flex-row gap-4">
					<!-- Search -->
					<div class="flex-1">
						<div class="relative">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="ユーザー名またはメールで検索..."
								class="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
							/>
							<svg
								class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>

					<!-- Gender Filter -->
					<div class="flex gap-2">
						<button
							onclick={() => (genderFilter = 'all')}
							class="px-4 py-2 rounded-lg transition-all {genderFilter === 'all'
								? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
								: 'bg-slate-800 text-gray-400 hover:text-white'}"
						>
							全て
						</button>
						<button
							onclick={() => (genderFilter = 'male')}
							class="px-4 py-2 rounded-lg transition-all {genderFilter === 'male'
								? 'bg-blue-600 text-white'
								: 'bg-slate-800 text-gray-400 hover:text-white'}"
						>
							男性
						</button>
						<button
							onclick={() => (genderFilter = 'female')}
							class="px-4 py-2 rounded-lg transition-all {genderFilter === 'female'
								? 'bg-rose-600 text-white'
								: 'bg-slate-800 text-gray-400 hover:text-white'}"
						>
							女性
						</button>
						<button
							onclick={() => (genderFilter = 'other')}
							class="px-4 py-2 rounded-lg transition-all {genderFilter === 'other'
								? 'bg-purple-600 text-white'
								: 'bg-slate-800 text-gray-400 hover:text-white'}"
						>
							その他
						</button>
					</div>
				</div>

				<!-- Stats -->
				<div class="mt-4 flex items-center gap-4 text-sm text-gray-400">
					<span>総ユーザー数: <span class="text-white font-semibold">{users.length}</span></span>
					<span>|</span>
					<span>表示中: <span class="text-white font-semibold">{filteredUsers.length}</span></span>
				</div>
			</div>

			<!-- Users Table -->
			<div class="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-slate-800/50 border-b border-slate-700">
							<tr>
								<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">ユーザー</th>
								<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">メール</th>
								<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">性別</th>
								<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">お気に入り</th>
								<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">登録日</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-700">
							{#each filteredUsers as user}
								<tr class="hover:bg-slate-800/30 transition-colors">
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
												{user.username.charAt(0).toUpperCase()}
											</div>
											<span class="text-white font-medium">{user.username}</span>
										</div>
									</td>
									<td class="px-6 py-4 text-gray-400">{user.email || 'N/A'}</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border {getGenderColor(user.gender)}">
											<span>{getGenderIcon(user.gender)}</span>
											<span>{getGenderLabel(user.gender)}</span>
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="text-yellow-400 font-semibold">{user.favoritesCount}</span>
									</td>
									<td class="px-6 py-4 text-gray-400">{formatDate(user.createdAt)}</td>
								</tr>
							{:else}
								<tr>
									<td colspan="5" class="px-6 py-12 text-center text-gray-400">
										ユーザーが見つかりませんでした
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
{/if}
