import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY が設定されていません');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'models/gemini-pro',
  'models/gemini-1.5-flash',
];

async function testModel(modelName) {
  try {
    console.log(`\nテスト中: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    console.log(`✅ 成功: ${modelName}`);
    console.log(`   レスポンス: ${text.substring(0, 50)}...`);
    return modelName;
  } catch (error) {
    console.log(`❌ 失敗: ${modelName}`);
    console.log(`   エラー: ${error.message}`);
    return null;
  }
}

async function findWorkingModel() {
  console.log('利用可能なモデルを検索中...\n');

  for (const modelName of modelsToTest) {
    const working = await testModel(modelName);
    if (working) {
      console.log(`\n✨ 利用可能なモデルが見つかりました: ${working}`);
      return;
    }
  }

  console.log('\n⚠️  利用可能なモデルが見つかりませんでした');
}

findWorkingModel();
