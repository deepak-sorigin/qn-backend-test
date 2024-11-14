import { configs } from '../config';
import { ApiUtils } from './api';

export class OpenAiUtils {
  private apiKey: string;

  constructor() {
    this.apiKey = configs.QN_OPEN_AI_API_KEY;
  }

  // fetch response from OpenAI for a given prompt
  async chatCompletion(prompt: string) {
    return await ApiUtils.callApi({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      data: {
        model: 'gpt-3.5-turbo',
        //gpt-3.5-turbo, gpt-4
        messages: [{ role: 'assistant', content: prompt }],
        temperature: 0.2
      }
    });
  }

  // fetch embeddings for keywords
  async embeddings(keywords: string[]) {
    return await ApiUtils.callApi({
      url: 'https://api.openai.com/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      data: {
        model: 'text-embedding-ada-002',
        input: keywords
      }
    });
  }

  // transform response from OpenAI to a list of keywords
  transformKeywordResponse(data: any): string[] {
    // extract keywords from response
    const responseContent = data.choices[0].message.content;
    let keywordList: string[] = [];
    try {
      // handle JSON response
      keywordList = JSON.parse(responseContent);
    } catch (e) {
      try {
        // handle numbered list
        keywordList = ('\n' + responseContent)
          .split('\n')
          .filter((item) => /^\d+\.\s/.test(item))
          .map((item) => item.replace(/^\d+\.\s/, ''));
      } catch (e) {
        // handle comma separated list
        keywordList = responseContent.split(', ');
      }
    }

    // return transformed list as filter items
    return keywordList;
  }
}
