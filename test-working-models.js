import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY が設定されていません');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// 無料枠で使いやすそうなモデルを優先順位順にリスト
const modelsToTest = [
  'models/gemini-2.0-flash-lite',        // 軽量版 - 無料枠に優しい
  'models/gemini-flash-lite-latest',     // 最新の軽量版
  'models/gemini-2.5-flash-lite',        // 新しい軽量版
  'models/gemini-2.0-flash',             // 元のモデル（プレフィックス付き）
  'models/gemini-flash-latest',          // 最新版
  'models/gemini-2.5-flash',             // より新しいバージョン
];

async function testModel(modelName) {
  try {
    console.log(`\nテスト中: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('こんにちは');
    const response = await result.response;
    const text = response.text();
    console.log(`✅ 成功: ${modelName}`);
    console.log(`   レスポンス: ${text.substring(0, 50)}...`);
    return modelName;
  } catch (error) {
    console.log(`❌ 失敗: ${modelName}`);
    if (error.status === 429) {
      console.log(`   エラー: クォータ超過 (429)`);
    } else {
      console.log(`   エラー: ${error.message.substring(0, 100)}`);
    }
    return null;
  }
}

async function findWorkingModel() {
  console.log('無料枠で利用可能なモデルを検索中...\n');
  console.log('優先順位: 軽量版 > 標準版\n');

  const workingModels = [];

  for (const modelName of modelsToTest) {
    const working = await testModel(modelName);
    if (working) {
      workingModels.push(working);
    }
    // 少し待機してレート制限を避ける
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (workingModels.length > 0) {
    console.log(`\n✨ 利用可能なモデルが見つかりました (${workingModels.length}個):`);
    workingModels.forEach((model, i) => {
      console.log(`  ${i + 1}. ${model} ${i === 0 ? '⭐ 推奨' : ''}`);
    });
    console.log(`\n推奨モデル: ${workingModels[0]}`);
  } else {
    console.log('\n⚠️  利用可能なモデルが見つかりませんでした');
    console.log('APIキーのクォータを確認してください: https://ai.dev/rate-limit');
  }
}

findWorkingModel();
