import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const GET: RequestHandler = async ({ request }) => {
	try {
		// お気に入りデータを取得
		const favoritesSnapshot = await getDocs(collection(db, 'favorites'));

		// 映画ごとのお気に入り数を集計
		const movieFavorites = new Map<number, { count: number; title: string; genres: string[] }>();
		const genreCounts = new Map<string, number>();

		favoritesSnapshot.forEach((doc) => {
			const data = doc.data();
			const movieId = data.movieId;
			const title = data.title || 'Unknown';
			const genres = data.genres || [];

			// 映画ごとのカウント
			if (movieFavorites.has(movieId)) {
				const current = movieFavorites.get(movieId)!;
				movieFavorites.set(movieId, { ...current, count: current.count + 1 });
			} else {
				movieFavorites.set(movieId, { count: 1, title, genres });
			}

			// ジャンルごとのカウント
			genres.forEach((genre: string) => {
				genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
			});
		});

		// 人気映画トップ10
		const topMovies = Array.from(movieFavorites.entries())
			.sort((a, b) => b[1].count - a[1].count)
			.slice(0, 10)
			.map(([movieId, data]) => ({
				movieId,
				title: data.title,
				genres: data.genres,
				count: data.count,
			}));

		// 人気ジャンルトップ10
		const topGenres = Array.from(genreCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([genre, count]) => ({
				genre,
				count,
			}));

		// 性別ごとの統計
		const usersSnapshot = await getDocs(collection(db, 'users'));
		const genderStats = {
			male: { users: 0, favorites: 0 },
			female: { users: 0, favorites: 0 },
			other: { users: 0, favorites: 0 },
			not_specified: { users: 0, favorites: 0 },
		};

		usersSnapshot.forEach((doc) => {
			const data = doc.data();
			const gender = data.gender || 'not_specified';
			const userId = data.uid;

			// ユーザー数をカウント
			if (gender in genderStats) {
				genderStats[gender as keyof typeof genderStats].users++;
			}

			// そのユーザーのお気に入り数をカウント
			const userFavoritesCount = Array.from(favoritesSnapshot.docs).filter(
				(fav) => fav.data().userId === userId
			).length;

			if (gender in genderStats) {
				genderStats[gender as keyof typeof genderStats].favorites += userFavoritesCount;
			}
		});

		return json({
			topMovies,
			topGenres,
			genderStats,
			totalFavorites: favoritesSnapshot.size,
		});
	} catch (err) {
		console.error('Error fetching statistics:', err);
		throw error(500, 'Failed to fetch statistics');
	}
};
