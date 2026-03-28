import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY が設定されていません');
  process.exit(1);
}

async function listModels() {
  try {
    console.log('利用可能なモデルを取得中...\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('エラー:', response.status, error);
      return;
    }

    const data = await response.json();

    if (data.models && data.models.length > 0) {
      console.log(`見つかったモデル数: ${data.models.length}\n`);

      data.models.forEach((model) => {
        console.log(`モデル名: ${model.name}`);
        console.log(`  表示名: ${model.displayName}`);
        console.log(`  説明: ${model.description || 'N/A'}`);
        console.log(`  サポートされているメソッド: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log('');
      });

      // generateContentをサポートしているモデルを抽出
      const generateModels = data.models.filter(m =>
        m.supportedGenerationMethods?.includes('generateContent')
      );

      if (generateModels.length > 0) {
        console.log('\n✅ generateContentをサポートしているモデル:');
        generateModels.forEach(m => console.log(`  - ${m.name}`));
      }
    } else {
      console.log('モデルが見つかりませんでした');
    }
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  }
}

listModels();
