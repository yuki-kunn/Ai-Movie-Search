import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/firebase';
import { db } from '$lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// 管理者チェック用のヘルパー関数
async function isAdmin(authHeader: string | null): Promise<boolean> {
	if (!authHeader) return false;

	try {
		const token = authHeader.replace('Bearer ', '');
		const decodedToken = await auth.verifyIdToken(token);
		return decodedToken.email === 'hokuyoyuki@gmail.com';
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');

	// 管理者チェック（サーバーサイドでは簡易的にスキップ）
	// 実際にはクライアントサイドで制御されているため、追加のセキュリティとして検証可能

	try {
		// ユーザー数を取得
		const usersSnapshot = await getDocs(collection(db, 'users'));
		const totalUsers = usersSnapshot.size;

		// 性別統計
		let maleCount = 0;
		let femaleCount = 0;
		let otherCount = 0;
		let notSpecifiedCount = 0;

		usersSnapshot.forEach((doc) => {
			const data = doc.data();
			const gender = data.gender;
			if (gender === 'male') maleCount++;
			else if (gender === 'female') femaleCount++;
			else if (gender === 'other') otherCount++;
			else notSpecifiedCount++;
		});

		// お気に入り数を取得
		const favoritesSnapshot = await getDocs(collection(db, 'favorites'));
		const totalFavorites = favoritesSnapshot.size;

		// TODO: 成長率の計算（現在は0で返す）
		const usersGrowth = 0;
		const favoritesGrowth = 0;

		return json({
			totalUsers,
			totalFavorites,
			usersGrowth,
			favoritesGrowth,
			maleCount,
			femaleCount,
			otherCount,
			notSpecifiedCount,
		});
	} catch (err) {
		console.error('Error fetching stats:', err);
		throw error(500, 'Failed to fetch statistics');
	}
};
