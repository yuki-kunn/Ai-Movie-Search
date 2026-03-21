# AI-Powered Movie Search（AI映画レコメンド）

気分やキーワードを入力すると、AIがおすすめの映画を提案してくれるアプリケーション。

## 概要

このアプリケーションは、ユーザーの気分やキーワードに基づいて、Google Gemini AIが最適な映画を選定し、The Movie Database (TMDB) APIから詳細情報を取得して表示します。

## 技術スタック

- **SvelteKit**: モダンなWebフレームワーク
- **Google Gemini AI**: 映画のレコメンデーション生成
- **TMDB API**: 映画の詳細情報と画像取得
- **Svelte Motion**: スムーズなアニメーション
- **TailwindCSS**: スタイリング

## セットアップ

### 1. 依存関係のインストール

```sh
npm install
```

### 2. APIキーの取得と設定

1. **Gemini API Key**を取得: [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **TMDB API Key**を取得: [TMDB Settings](https://www.themoviedb.org/settings/api)
3. `.env.example`をコピーして`.env`を作成:

```sh
cp .env.example .env
```

4. `.env`ファイルに取得したAPIキーを設定:

```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_TMDB_API_KEY=your_tmdb_api_key
```

### 3. 開発サーバーの起動

```sh
npm run dev
```

ブラウザで `http://localhost:5173` を開いて確認できます。

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
