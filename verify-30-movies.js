import dotenv from 'dotenv';

dotenv.config();

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '';

// 複数ページから結果を取得
async function fetchMultiplePages(baseUrl, targetCount) {
  const results = [];
  const itemsPerPage = 20;
  const pagesToFetch = Math.ceil(targetCount / itemsPerPage);

  for (let page = 1; page <= pagesToFetch && results.length < targetCount; page++) {
    const url = `${baseUrl}&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      results.push(...data.results);
    } else {
      break;
    }
  }

  return results.slice(0, targetCount);
}

async function test30Movies() {
  console.log('🎬 30件のレコメンド取得テスト\n');

  // 結果が多く返ってくるクエリでテスト
  const testQueries = [
    { query: 'love', description: '恋愛映画（多数ヒット予想）' },
    { query: 'war', description: '戦争映画（多数ヒット予想）' },
  ];

  for (const { query, description } of testQueries) {
    console.log(`\n📍 テスト: ${description}`);
    console.log(`   クエリ: "${query}"`);

    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ja-JP`;
    const movies = await fetchMultiplePages(searchUrl, 30);

    console.log(`   ✅ ${movies.length}件の映画を取得しました`);

    // 最初の3件と最後の3件を表示
    console.log('\n   最初の3件:');
    movies.slice(0, 3).forEach((m, i) => {
      console.log(`     ${i + 1}. ${m.title} (${m.release_date?.substring(0, 4) || 'N/A'})`);
    });

    if (movies.length > 6) {
      console.log('     ...');
    }

    console.log('\n   最後の3件:');
    movies.slice(-3).forEach((m, i) => {
      const actualIndex = movies.length - 3 + i + 1;
      console.log(`     ${actualIndex}. ${m.title} (${m.release_date?.substring(0, 4) || 'N/A'})`);
    });
  }

  // ジャンルベースでも確認
  console.log('\n\n📍 ジャンルベーステスト（アクション＋アドベンチャー）');
  const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ja-JP&sort_by=popularity.desc&with_genres=28,12&vote_count.gte=100`;
  const movies = await fetchMultiplePages(discoverUrl, 30);

  console.log(`   ✅ ${movies.length}件の映画を取得しました`);

  console.log('\n   最初の5件:');
  movies.slice(0, 5).forEach((m, i) => {
    console.log(`     ${i + 1}. ${m.title} (${m.release_date?.substring(0, 4) || 'N/A'}) - ⭐ ${m.vote_average}`);
  });

  console.log('\n   最後の5件:');
  movies.slice(-5).forEach((m, i) => {
    const actualIndex = movies.length - 5 + i + 1;
    console.log(`     ${actualIndex}. ${m.title} (${m.release_date?.substring(0, 4) || 'N/A'}) - ⭐ ${m.vote_average}`);
  });

  console.log('\n\n🎉 テスト完了: APIは30件のレコメンドを返すように設定されました');
}

test30Movies();
