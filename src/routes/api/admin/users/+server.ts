import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export const GET: RequestHandler = async ({ request }) => {
	try {
		// ユーザー一覧を取得
		const usersRef = collection(db, 'users');
		const q = query(usersRef, orderBy('createdAt', 'desc'));
		const usersSnapshot = await getDocs(q);

		const users = usersSnapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				uid: data.uid,
				email: data.email,
				username: data.username,
				gender: data.gender || 'not_specified',
				createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
			};
		});

		// 各ユーザーのお気に入り数を取得
		const usersWithFavorites = await Promise.all(
			users.map(async (user) => {
				const favoritesSnapshot = await getDocs(
					query(collection(db, 'favorites'), orderBy('addedAt', 'desc'))
				);

				const userFavorites = favoritesSnapshot.docs.filter(
					(doc) => doc.data().userId === user.uid
				);

				return {
					...user,
					favoritesCount: userFavorites.length,
				};
			})
		);

		return json(usersWithFavorites);
	} catch (err) {
		console.error('Error fetching users:', err);
		throw error(500, 'Failed to fetch users');
	}
};
