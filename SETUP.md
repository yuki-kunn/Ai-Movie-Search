# AI Movie Search - セットアップガイド

このアプリケーションは、AIを活用した映画検索サービスです。以下の手順に従ってセットアップしてください。

## 必要なAPI キー

### 1. TMDB API キー（必須）
映画データの取得に使用します。

**取得方法:**
1. [TMDB](https://www.themoviedb.org/)にアクセス
2. アカウントを作成（無料）
3. Settings → API → Create → Developer を選択
4. 必要事項を入力して API Key を取得

### 2. Gemini API キー（任意）
AI による映画検索の最適化に使用します。なくても動作しますが、あるとより精度の高い検索が可能です。

**取得方法:**
1. [Google AI Studio](https://ai.google.dev/)にアクセス
2. Google アカウントでログイン
3. "Get API key" をクリック
4. API キーを取得

### 3. Firebase 設定（必須）
ユーザー認証とお気に入り機能に使用します。

**セットアップ方法:**
1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. Authentication を有効化:
   - Authentication → Sign-in method
   - Google を有効にする
4. Firestore Database を作成:
   - Firestore Database → データベースを作成
   - テストモードで開始（後で本番モードに変更推奨）
5. ウェブアプリを追加:
   - プロジェクト設定 → アプリを追加 → Web (</>) を選択
   - アプリのニックネームを入力
   - Firebase SDK の設定情報をコピー

## インストール手順

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd ai-movie-search
```

2. 依存パッケージをインストール:
```bash
npm install
```

3. 環境変数を設定:
```bash
cp .env.example .env
```

4. `.env` ファイルを編集して、取得した API キーを設定:
```
VITE_GEMINI_API_KEY=あなたのGemini APIキー
VITE_TMDB_API_KEY=あなたのTMDB APIキー
VITE_FIREBASE_API_KEY=あなたのFirebase APIキー
VITE_FIREBASE_AUTH_DOMAIN=あなたのプロジェクトID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=あなたのプロジェクトID
VITE_FIREBASE_STORAGE_BUCKET=あなたのプロジェクトID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=あなたのMessaging Sender ID
VITE_FIREBASE_APP_ID=あなたのApp ID
```

5. 開発サーバーを起動:
```bash
npm run dev
```

6. ブラウザで http://localhost:5173 を開く

## Firestore セキュリティルール（推奨）

本番環境では、Firestore のセキュリティルールを設定してください:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザープロフィール
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // お気に入り
      match /favorites/{movieId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## 機能

- 🔍 AI を活用した映画検索
- 🌐 日本語/英語の切り替え
- ⭐ お気に入り登録機能
- 👤 Google アカウントでログイン
- 📱 レスポンシブデザイン（PC/スマホ対応）
- 🎬 映画の詳細情報と配信サービスへのリンク

## トラブルシューティング

### Firebase エラーが出る
- Firebase Console でプロジェクトの設定を確認
- Authentication と Firestore が有効になっているか確認
- `.env` ファイルの設定値が正しいか確認

### 映画が検索できない
- TMDB API キーが正しく設定されているか確認
- インターネット接続を確認

### Gemini API エラー
- Gemini API は任意なので、エラーが出ても映画検索は動作します
- API キーが正しいか確認
- 無料枠の制限に達していないか確認

## ライセンス

MIT
