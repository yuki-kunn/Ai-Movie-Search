import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '';

// Gemini API結果のキャッシュ
const geminiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15分

// サーキットブレーカー
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 30 * 60 * 1000; // 30分

function isCircuitBreakerOpen() {
  if (!circuitBreakerOpen) {
    return false;
  }

  if (Date.now() - circuitBreakerOpenTime > CIRCUIT_BREAKER_TIMEOUT) {
    circuitBreakerOpen = false;
    console.log('✅ サーキットブレーカー: リセット - Gemini APIの使用を再開します');
    return false;
  }

  return true;
}

function openCircuitBreaker() {
  if (!circuitBreakerOpen) {
    circuitBreakerOpen = true;
    circuitBreakerOpenTime = Date.now();
    const minutes = CIRCUIT_BREAKER_TIMEOUT / 60 / 1000;
    console.log(`⚠️  サーキットブレーカー: OPEN - Gemini APIの使用を${minutes}分間停止します`);
  }
}

async function testRecommend(mood) {
  console.log(`\n🎬 テスト: "${mood}"`);
  console.log('─'.repeat(60));

  let movies = [];

  // Gemini APIが利用可能な場合は使用
  if (GEMINI_API_KEY && !isCircuitBreakerOpen()) {
    try {
      const cacheKey = mood.toLowerCase().trim();
      const cached = geminiCache.get(cacheKey);
      let analysis;

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        analysis = cached.analysis;
        console.log('💾 Gemini AI分析結果（キャッシュから取得）:', analysis);
      } else {
        console.log('🔄 Gemini APIを呼び出し中...');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-lite-latest' });

        const prompt = `ユーザーの入力: "${mood}"

この入力を分析して、映画検索に最適な情報を抽出してください。
以下のJSON形式で返してください：

{
  "genres": ["ジャンル1", "ジャンル2"],
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "searchQuery": "TMDB APIで検索するための最適なクエリ"
}

利用可能なジャンル: action, comedy, drama, horror, romance, sci-fi, thriller, animation, adventure, fantasy, mystery, crime

JSON以外の説明やマークダウンは含めず、JSONのみを返してください。`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let analysisText = response.text().trim();

        analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        analysis = JSON.parse(analysisText);

        geminiCache.set(cacheKey, {
          analysis,
          timestamp: Date.now()
        });

        console.log('✅ Gemini AI分析結果（APIから取得）:', analysis);
      }

      // 分析結果を使ってTMDB APIで検索
      if (analysis.searchQuery) {
        console.log(`🔍 TMDB検索: "${analysis.searchQuery}"`);
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(analysis.searchQuery)}&language=ja-JP`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.results && searchData.results.length > 0) {
          movies = searchData.results.slice(0, 30);
          console.log(`📽️  ${movies.length}件の映画が見つかりました`);
          movies.slice(0, 5).forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.title} (${m.release_date?.substring(0, 4) || 'N/A'}) - ⭐ ${m.vote_average}`);
          });
          if (movies.length > 5) {
            console.log(`   ... 他${movies.length - 5}件`);
          }
        }
      }
    } catch (geminiError) {
      if (geminiError?.status === 429) {
        openCircuitBreaker();
        console.error('❌ Gemini API クォータ超過により、TMDBのみで動作します');
      } else {
        console.error('❌ Gemini API error:', geminiError.message);
      }
    }
  } else if (GEMINI_API_KEY && isCircuitBreakerOpen()) {
    console.log('🚫 サーキットブレーカー: OPEN - Gemini APIをスキップし、TMDBのみで検索します');
  }

  console.log('✅ テスト完了\n');
}

async function runTests() {
  console.log('🎯 映画推薦APIのテスト開始\n');
  console.log(`Gemini API Key: ${GEMINI_API_KEY ? '設定済み ✅' : '未設定 ❌'}`);
  console.log(`TMDB API Key: ${TMDB_API_KEY ? '設定済み ✅' : '未設定 ❌'}\n`);

  await testRecommend('アクション映画');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testRecommend('感動するドラマ');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testRecommend('アクション映画'); // キャッシュヒットを確認

  console.log('🎉 全テスト完了');
}

runTests();
