<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authStore } from '$lib/stores/auth.svelte';
	import { favoritesStore } from '$lib/stores/favorites.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	let menuOpen = $state(false);
	let showUsernameDialog = $state(false);
	let newUsername = $state('');
	let selectedGender = $state<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say');
	let savingUsername = $state(false);
	let isFirstTimeUser = $state(false); // 初回ユーザーかどうか

	// ユーザーがログインしたらお気に入りを読み込む
	$effect(() => {
		if (authStore.user) {
			favoritesStore.loadFavorites();
		}
	});

	// ページ遷移時にメニューを閉じる
	$effect(() => {
		$page.url.pathname;
		menuOpen = false;
	});

	function switchLanguage(lang: 'ja' | 'en') {
		languageStore.setLanguage(lang);
	}

	async function handleSignIn() {
		try {
			const result = await authStore.signInWithGoogle();
			if (result) {
				menuOpen = false;

				// 新規ユーザーの場合、ユーザー名設定ダイアログを表示
				const { getDoc, doc } = await import('firebase/firestore');
				const { db } = await import('$lib/firebase');
				const userDoc = await getDoc(doc(db, 'users', result.uid));

				if (!userDoc.exists()) {
					// 新規ユーザー
					isFirstTimeUser = true;
					newUsername = result.displayName || result.email?.split('@')[0] || '';
					showUsernameDialog = true;
				}
			}
		} catch (error) {
			console.error('Sign in failed:', error);
		}
	}

	async function handleSignOut() {
		try {
			await authStore.signOut();
			menuOpen = false;
			goto('/');
		} catch (error) {
			console.error('Sign out failed:', error);
		}
	}

	async function handleUpdateUsername() {
		if (!newUsername.trim()) return;

		savingUsername = true;
		try {
			await authStore.updateProfile({
				username: newUsername.trim(),
				gender: selectedGender,
			});
			showUsernameDialog = false;
			isFirstTimeUser = false;
			newUsername = '';
			selectedGender = 'prefer_not_to_say';
		} catch (error) {
			console.error('Failed to update username:', error);
			alert(languageStore.language === 'ja' ? 'ユーザー名の更新に失敗しました' : 'Failed to update username');
		} finally {
			savingUsername = false;
		}
	}

	function openUsernameDialog() {
		isFirstTimeUser = false; // 設定から開いた場合は既存ユーザー
		newUsername = authStore.userProfile?.username || '';
		selectedGender = authStore.userProfile?.gender || 'prefer_not_to_say';
		showUsernameDialog = true;
		menuOpen = false;
	}

	function getGenderLabel(gender: string): string {
		switch (gender) {
			case 'male':
				return languageStore.language === 'ja' ? '男性' : 'Male';
			case 'female':
				return languageStore.language === 'ja' ? '女性' : 'Female';
			case 'other':
				return languageStore.language === 'ja' ? 'その他' : 'Other';
			default:
				return languageStore.language === 'ja' ? '回答しない' : 'Prefer not to say';
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
	<!-- PC Navbar -->
	<nav class="hidden md:block fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<!-- Logo -->
				<a href="/" class="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
					AI Movie Search
				</a>

				<div class="flex items-center gap-6">
					<!-- Navigation Links -->
					<a
						href="/"
						class="px-3 py-2 rounded-lg transition-all font-medium {$page.url.pathname === '/'
							? 'text-white bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50'
							: 'text-gray-300 hover:text-white hover:bg-slate-800'}"
					>
						{languageStore.language === 'ja' ? '検索' : 'Search'}
					</a>
					{#if authStore.user}
						<a
							href="/favorites"
							class="px-3 py-2 rounded-lg transition-all font-medium {$page.url.pathname === '/favorites'
								? 'text-white bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50'
								: 'text-gray-300 hover:text-white hover:bg-slate-800'}"
						>
							{languageStore.language === 'ja' ? 'お気に入り' : 'Favorites'}
						</a>
					{/if}
					{#if authStore.isAdmin()}
						<a
							href="/admin"
							class="px-3 py-2 rounded-lg transition-all font-medium {$page.url.pathname.startsWith('/admin')
								? 'text-white bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/50'
								: 'text-gray-300 hover:text-white hover:bg-slate-800'}"
						>
							{languageStore.language === 'ja' ? '管理画面' : 'Admin'}
						</a>
					{/if}

					<!-- Language Toggle -->
					<div class="relative inline-flex bg-slate-800 rounded-full p-1">
						<div
							class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-transform duration-300 ease-out"
							style="transform: translateX({languageStore.language === 'ja' ? '0%' : '100%'})"
						></div>
						<button
							onclick={() => switchLanguage('ja')}
							class="relative z-10 px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-300 {languageStore.language === 'ja' ? 'text-white' : 'text-gray-400'}"
						>
							🇯🇵
						</button>
						<button
							onclick={() => switchLanguage('en')}
							class="relative z-10 px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-300 {languageStore.language === 'en' ? 'text-white' : 'text-gray-400'}"
						>
							🇺🇸
						</button>
					</div>

					<!-- User Menu -->
					{#if authStore.user}
						<div class="flex items-center gap-3">
							<div class="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
								<span class="text-sm text-gray-300 font-medium">
									{authStore.userProfile?.username || (languageStore.language === 'ja' ? 'ユーザーネーム未設定' : 'Username not set')}
								</span>
							</div>
							<button
								onclick={openUsernameDialog}
								class="p-2 text-gray-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-all"
								title={languageStore.language === 'ja' ? '設定' : 'Settings'}
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</button>
							<button
								onclick={handleSignOut}
								class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
							>
								{languageStore.language === 'ja' ? 'ログアウト' : 'Sign Out'}
							</button>
						</div>
					{:else}
						<button
							onclick={handleSignIn}
							class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-purple-500/30"
						>
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							{languageStore.language === 'ja' ? 'Googleでログイン' : 'Sign in with Google'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<!-- Mobile Hamburger Menu -->
	<div class="md:hidden fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 z-40">
		<div class="flex justify-between items-center px-4 h-14">
			<a href="/" class="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
				AI Movie Search
			</a>
			<button
				onclick={() => (menuOpen = !menuOpen)}
				class="p-2 text-gray-300 hover:text-white"
				aria-label="Menu"
			>
				{#if menuOpen}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if menuOpen}
			<div class="bg-slate-900 border-t border-slate-700 animate-in slide-in-from-top duration-200">
				<div class="px-4 py-3 space-y-2">
					<a
						href="/"
						onclick={() => (menuOpen = false)}
						class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all {$page.url.pathname === '/'
							? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30'
							: 'text-gray-300 hover:bg-slate-800'}"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						{languageStore.language === 'ja' ? '検索' : 'Search'}
					</a>
					{#if authStore.user}
						<a
							href="/favorites"
							onclick={() => (menuOpen = false)}
							class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all {$page.url.pathname === '/favorites'
								? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30'
								: 'text-gray-300 hover:bg-slate-800'}"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
							</svg>
							{languageStore.language === 'ja' ? 'お気に入り' : 'Favorites'}
						</a>
					{/if}
					{#if authStore.isAdmin()}
						<a
							href="/admin"
							onclick={() => (menuOpen = false)}
							class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all {$page.url.pathname.startsWith('/admin')
								? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30'
								: 'text-gray-300 hover:bg-slate-800'}"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
							{languageStore.language === 'ja' ? '管理画面' : 'Admin'}
						</a>
					{/if}

					<!-- Divider -->
					<div class="border-t border-slate-700 my-2"></div>

					<!-- Language Toggle -->
					<div class="px-2">
						<p class="text-xs text-gray-500 mb-2 px-2">{languageStore.language === 'ja' ? '言語' : 'Language'}</p>
						<div class="relative inline-flex bg-slate-800 rounded-lg p-1 w-full border border-slate-700">
							<div
								class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-purple-600 to-pink-600 rounded-md transition-transform duration-300 ease-out shadow-lg"
								style="transform: translateX({languageStore.language === 'ja' ? '0%' : '100%'})"
							></div>
							<button
								onclick={() => switchLanguage('ja')}
								class="relative z-10 flex-1 py-2 rounded-md text-sm font-semibold transition-colors duration-300 {languageStore.language === 'ja' ? 'text-white' : 'text-gray-400'}"
							>
								🇯🇵 JP
							</button>
							<button
								onclick={() => switchLanguage('en')}
								class="relative z-10 flex-1 py-2 rounded-md text-sm font-semibold transition-colors duration-300 {languageStore.language === 'en' ? 'text-white' : 'text-gray-400'}"
							>
								🇺🇸 EN
							</button>
						</div>
					</div>

					<!-- Divider -->
					<div class="border-t border-slate-700 my-2"></div>

					{#if authStore.user}
						<div class="px-2">
							<p class="text-xs text-gray-500 mb-2 px-2">{languageStore.language === 'ja' ? 'アカウント' : 'Account'}</p>
							<div class="px-3 py-2 mb-2 bg-slate-800/50 rounded-lg border border-slate-700">
								<p class="text-xs text-gray-500">{languageStore.language === 'ja' ? 'ユーザー名' : 'Username'}</p>
								<p class="text-sm text-white font-medium">
									{authStore.userProfile?.username || (languageStore.language === 'ja' ? 'ユーザーネーム未設定' : 'Username not set')}
								</p>
							</div>
							<button
								onclick={openUsernameDialog}
								class="w-full flex items-center gap-2 px-3 py-2 text-purple-400 hover:bg-slate-800 rounded-lg transition-colors mb-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
								</svg>
								{languageStore.language === 'ja' ? 'ユーザー名変更' : 'Change Username'}
							</button>
							<button
								onclick={handleSignOut}
								class="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
								</svg>
								{languageStore.language === 'ja' ? 'ログアウト' : 'Sign Out'}
							</button>
						</div>
					{:else}
						<div class="px-2">
							<button
								onclick={handleSignIn}
								class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-purple-500/30"
							>
								<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
									<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
									<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
									<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
									<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
								</svg>
								{languageStore.language === 'ja' ? 'Googleでログイン' : 'Sign in with Google'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Main Content -->
	<div class="pt-14 md:pt-16">
		{@render children()}
	</div>

	<!-- Username Dialog -->
	{#if showUsernameDialog}
		<div
			class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
			onclick={(e) => {
				// 初回ユーザーの場合は外側クリックでも閉じない
				if (!isFirstTimeUser && e.target === e.currentTarget) {
					showUsernameDialog = false;
				}
			}}
			onkeydown={(e) => {
				// 初回ユーザーの場合はEscキーでも閉じない
				if (!isFirstTimeUser && e.key === 'Escape') {
					showUsernameDialog = false;
				}
			}}
		>
			<div class="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
				<h2 class="text-xl font-bold mb-2">
					{isFirstTimeUser
						? (languageStore.language === 'ja' ? 'ようこそ！' : 'Welcome!')
						: (languageStore.language === 'ja' ? 'プロフィール設定' : 'Profile Settings')}
				</h2>
				{#if isFirstTimeUser}
					<p class="text-sm text-gray-400 mb-4">
						{languageStore.language === 'ja' ? 'プロフィールを設定してください' : 'Please set your profile'}
					</p>
				{/if}

				<!-- Username -->
				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-400 mb-2">
						{languageStore.language === 'ja' ? 'ユーザー名' : 'Username'}
					</label>
					<input
						type="text"
						bind:value={newUsername}
						onkeydown={(e) => {
							if (e.key === 'Enter' && newUsername.trim()) {
								handleUpdateUsername();
							}
						}}
						placeholder={languageStore.language === 'ja' ? 'ユーザー名を入力' : 'Enter username'}
						class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
						autofocus
					/>
				</div>

				<!-- Gender -->
				<div class="mb-4">
					<label class="block text-sm font-medium text-gray-400 mb-2">
						{languageStore.language === 'ja' ? '性別（任意）' : 'Gender (Optional)'}
					</label>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							onclick={() => (selectedGender = 'male')}
							class="px-4 py-2 rounded-lg border transition-all {selectedGender === 'male'
								? 'bg-blue-600 border-blue-500 text-white'
								: 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'}"
						>
							{languageStore.language === 'ja' ? '男性' : 'Male'}
						</button>
						<button
							type="button"
							onclick={() => (selectedGender = 'female')}
							class="px-4 py-2 rounded-lg border transition-all {selectedGender === 'female'
								? 'bg-rose-600 border-rose-500 text-white'
								: 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'}"
						>
							{languageStore.language === 'ja' ? '女性' : 'Female'}
						</button>
						<button
							type="button"
							onclick={() => (selectedGender = 'other')}
							class="px-4 py-2 rounded-lg border transition-all {selectedGender === 'other'
								? 'bg-purple-600 border-purple-500 text-white'
								: 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'}"
						>
							{languageStore.language === 'ja' ? 'その他' : 'Other'}
						</button>
						<button
							type="button"
							onclick={() => (selectedGender = 'prefer_not_to_say')}
							class="px-4 py-2 rounded-lg border transition-all {selectedGender === 'prefer_not_to_say'
								? 'bg-gray-600 border-gray-500 text-white'
								: 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'}"
						>
							{languageStore.language === 'ja' ? '回答しない' : 'Prefer not to say'}
						</button>
					</div>
				</div>
				<div class="flex gap-3">
					{#if !isFirstTimeUser}
						<button
							onclick={() => {
								showUsernameDialog = false;
								newUsername = '';
							}}
							class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
							disabled={savingUsername}
						>
							{languageStore.language === 'ja' ? 'キャンセル' : 'Cancel'}
						</button>
					{/if}
					<button
						onclick={handleUpdateUsername}
						class="{isFirstTimeUser ? 'w-full' : 'flex-1'} px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={savingUsername || !newUsername.trim()}
					>
						{savingUsername ? (languageStore.language === 'ja' ? '保存中...' : 'Saving...') : (languageStore.language === 'ja' ? '保存' : 'Save')}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
