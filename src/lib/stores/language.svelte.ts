import { browser } from '$app/environment';

type Language = 'ja' | 'en';

class LanguageStore {
	language = $state<Language>('ja');

	constructor() {
		// ブラウザ環境でのみlocalStorageから読み込み
		if (browser) {
			const saved = localStorage.getItem('ai-movie-search-language');
			if (saved === 'ja' || saved === 'en') {
				this.language = saved;
			}
		}
	}

	// 言語を切り替え
	setLanguage(lang: Language) {
		this.language = lang;
		if (browser) {
			localStorage.setItem('ai-movie-search-language', lang);
		}
	}
}

// シングルトンインスタンスをエクスポート
export const languageStore = new LanguageStore();
