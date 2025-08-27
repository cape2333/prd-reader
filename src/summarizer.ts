import Anthropic from '@anthropic-ai/sdk';

export interface SummarizerConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class DocumentSummarizer {
  private anthropic: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: SummarizerConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-3-haiku-20240307';
    this.maxTokens = config.maxTokens || 1000;
  }

  async summarize(content: string, title?: string): Promise<string> {
    const prompt = this.buildPrompt(content, title);

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      return textContent?.text || 'Unable to generate summary';
    } catch (error) {
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildPrompt(content: string, title?: string): string {
    const titleText = title ? `Document Title: ${title}\n\n` : '';
    return `You are an expert at summarizing Product Requirement Documents. Please provide a clear, concise summary that captures the key requirements, objectives, and important details.

${titleText}Focus on:
1. Main objectives and goals
2. Key requirements and features
3. Target audience or users
4. Success criteria or metrics
5. Important constraints or considerations

Document Content:
${content}

Please provide a comprehensive summary:`;
  }

  async extractKeyPoints(content: string, title?: string): Promise<string[]> {
    const prompt = this.buildKeyPointsPrompt(content, title);

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      const keyPointsText = textContent?.text || '';
      
      return keyPointsText
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.trim().replace(/^[•-]\s*/, '').replace(/^\d+\.\s*/, ''));
    } catch (error) {
      throw new Error(`Key points extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildKeyPointsPrompt(content: string, title?: string): string {
    const titleText = title ? `Document Title: ${title}\n\n` : '';
    return `Extract the most important key points from this Product Requirement Document. Format as bullet points using • symbol:

${titleText}Document Content:
${content}

Please extract key points:`;
  }
}