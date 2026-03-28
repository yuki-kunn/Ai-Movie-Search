import { auth, googleProvider, db } from '$lib/firebase';
import {
	signInWithPopup,
	signOut as firebaseSignOut,
	onAuthStateChanged,
	type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

type UserProfile = {
	uid: string;
	email: string | null;
	username: string;
	createdAt: Date;
};

// 認証状態を管理するストア
class AuthStore {
	user = $state<User | null>(null);
	userProfile = $state<UserProfile | null>(null);
	loading = $state(true);

	constructor() {
		// 認証状態の監視
		onAuthStateChanged(auth, async (user) => {
			this.user = user;
			if (user) {
				await this.loadUserProfile(user.uid);
			} else {
				this.userProfile = null;
			}
			this.loading = false;
		});
	}

	// Googleでサインイン
	async signInWithGoogle() {
		try {
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;

			// ユーザープロフィールを確認
			const userDoc = await getDoc(doc(db, 'users', user.uid));

			if (userDoc.exists()) {
				// 既存ユーザーの場合のみプロフィールを読み込む
				await this.loadUserProfile(user.uid);
			}
			// 新規ユーザーの場合は、ユーザー名設定後にプロフィールを作成する

			return user;
		} catch (error) {
			console.error('Sign in error:', error);
			throw error;
		}
	}

	// サインアウト
	async signOut() {
		try {
			await firebaseSignOut(auth);
			this.user = null;
			this.userProfile = null;
		} catch (error) {
			console.error('Sign out error:', error);
			throw error;
		}
	}

	// ユーザープロフィールを読み込み
	async loadUserProfile(uid: string) {
		try {
			const userDoc = await getDoc(doc(db, 'users', uid));
			if (userDoc.exists()) {
				const data = userDoc.data();
				this.userProfile = {
					uid: data.uid,
					email: data.email,
					username: data.username,
					createdAt: data.createdAt?.toDate() || new Date(),
				};
			}
		} catch (error) {
			console.error('Load user profile error:', error);
		}
	}

	// ユーザー名を更新
	async updateUsername(newUsername: string) {
		if (!this.user) return;

		try {
			// ユーザープロフィールが存在するか確認
			const userDoc = await getDoc(doc(db, 'users', this.user.uid));

			if (userDoc.exists()) {
				// 既存ユーザー: 更新
				await updateDoc(doc(db, 'users', this.user.uid), {
					username: newUsername,
				});
			} else {
				// 新規ユーザー: 作成
				await setDoc(doc(db, 'users', this.user.uid), {
					uid: this.user.uid,
					email: this.user.email,
					username: newUsername,
					createdAt: new Date(),
				});
			}

			// プロフィールを再読み込みして反映
			await this.loadUserProfile(this.user.uid);
		} catch (error) {
			console.error('Update username error:', error);
			throw error;
		}
	}
}

// シングルトンインスタンスをエクスポート
export const authStore = new AuthStore();
