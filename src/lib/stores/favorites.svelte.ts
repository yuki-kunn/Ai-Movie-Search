import { db } from '$lib/firebase';
import {
	collection,
	doc,
	setDoc,
	deleteDoc,
	getDocs,
	query,
	orderBy,
	type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { authStore } from './auth.svelte';

type FavoriteMovie = {
	id: number;
	title: string;
	overview: string;
	poster_path: string;
	release_date: string;
	vote_average: number;
	addedAt: Date;
};

class FavoritesStore {
	favorites = $state<FavoriteMovie[]>([]);
	loading = $state(false);

	// お気に入りに追加
	async addFavorite(movie: {
		id: number;
		title: string;
		overview: string;
		poster_path: string;
		release_date: string;
		vote_average: number;
	}) {
		const user = authStore.user;
		if (!user) throw new Error('User not authenticated');

		try {
			const favoriteRef = doc(db, 'users', user.uid, 'favorites', movie.id.toString());
			await setDoc(favoriteRef, {
				...movie,
				addedAt: new Date(),
			});
			await this.loadFavorites();
		} catch (error) {
			console.error('Add favorite error:', error);
			throw error;
		}
	}

	// お気に入りから削除
	async removeFavorite(movieId: number) {
		const user = authStore.user;
		if (!user) throw new Error('User not authenticated');

		try {
			await deleteDoc(doc(db, 'users', user.uid, 'favorites', movieId.toString()));
			await this.loadFavorites();
		} catch (error) {
			console.error('Remove favorite error:', error);
			throw error;
		}
	}

	// お気に入り一覧を読み込み
	async loadFavorites() {
		const user = authStore.user;
		if (!user) {
			this.favorites = [];
			return;
		}

		this.loading = true;
		try {
			const favoritesRef = collection(db, 'users', user.uid, 'favorites');
			const q = query(favoritesRef, orderBy('addedAt', 'desc'));
			const snapshot = await getDocs(q);

			this.favorites = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
				const data = doc.data();
				return {
					id: data.id,
					title: data.title,
					overview: data.overview,
					poster_path: data.poster_path,
					release_date: data.release_date,
					vote_average: data.vote_average,
					addedAt: data.addedAt?.toDate() || new Date(),
				};
			});
		} catch (error) {
			console.error('Load favorites error:', error);
		} finally {
			this.loading = false;
		}
	}

	// お気に入りに含まれているかチェック
	isFavorite(movieId: number): boolean {
		return this.favorites.some((fav) => fav.id === movieId);
	}

	// お気に入りをトグル
	async toggleFavorite(movie: {
		id: number;
		title: string;
		overview: string;
		poster_path: string;
		release_date: string;
		vote_average: number;
	}) {
		if (this.isFavorite(movie.id)) {
			await this.removeFavorite(movie.id);
		} else {
			await this.addFavorite(movie);
		}
	}
}

// シングルトンインスタンスをエクスポート
export const favoritesStore = new FavoritesStore();
