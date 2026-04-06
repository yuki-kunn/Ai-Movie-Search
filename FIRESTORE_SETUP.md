# Firestore セキュリティルールの設定方法

このアプリケーションを正しく動作させるには、Firebaseコンソールでセキュリティルールを設定する必要があります。

## セキュリティルールの設定手順

### 方法1: Firebaseコンソールから直接設定（推奨）

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 左側メニューから「Firestore Database」を選択
4. 「ルール」タブをクリック
5. 以下のルールをコピーして貼り付け

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザープロフィールのルール
    match /users/{userId} {
      // 認証済みユーザーは自分のプロフィールを読み書き可能
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // お気に入りのルール
    match /users/{userId}/favorites/{favoriteId} {
      // 認証済みユーザーは自分のお気に入りを読み書き可能
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // デフォルトは全てのアクセスを拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. 「公開」ボタンをクリック

### 方法2: Firebase CLIを使用（オプション）

Firebase CLIをインストールしている場合、以下のコマンドでデプロイできます：

```bash
# Firebase CLIのインストール（未インストールの場合）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトを初期化（初回のみ）
firebase init firestore

# セキュリティルールをデプロイ
firebase deploy --only firestore:rules
```

## セキュリティルールの説明

### ユーザープロフィール (`/users/{userId}`)
- **読み取り**: ユーザーは自分自身のプロフィールのみ読み取り可能
- **書き込み**: ユーザーは自分自身のプロフィールのみ作成・更新可能
- **認証必須**: ログインしていないユーザーはアクセス不可

### お気に入り (`/users/{userId}/favorites/{favoriteId}`)
- **読み取り**: ユーザーは自分自身のお気に入りのみ読み取り可能
- **書き込み**: ユーザーは自分自身のお気に入りのみ追加・削除可能
- **認証必須**: ログインしていないユーザーはアクセス不可

### デフォルトルール
- 上記以外の全てのアクセスは拒否されます

## トラブルシューティング

### エラー: "Missing or insufficient permissions"

このエラーが表示される場合、セキュリティルールが正しく設定されていません。上記の手順に従ってルールを設定してください。

### エラー: "Permission denied"

ユーザーが認証されていないか、他のユーザーのデータにアクセスしようとしています。正しくログインしているか確認してください。

## 開発・テスト用のルール（本番環境では使用しないでください）

開発中のみ、以下のルールを使用してアクセス制限を緩和できます：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/favorites/{favoriteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**⚠️ 警告**: 本番環境では必ず適切なセキュリティルールを設定してください。
