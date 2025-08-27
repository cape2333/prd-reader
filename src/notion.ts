import axios from 'axios';

export interface NotionConfig {
  token: string;
}

export interface NotionPage {
  id: string;
  title: string;
  content: string;
  url: string;
}

export class NotionClient {
  private config: NotionConfig;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(config: NotionConfig) {
    this.config = config;
  }

  async getPageByUrl(pageUrl: string): Promise<NotionPage> {
    const pageId = this.extractPageIdFromUrl(pageUrl);
    return this.getPageById(pageId);
  }

  private extractPageIdFromUrl(url: string): string {
    const match = url.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (!match) {
      throw new Error(`Cannot extract page ID from URL: ${url}`);
    }
    return match[1].replace(/-/g, '');
  }

  async getPageById(pageId: string): Promise<NotionPage> {
    try {
      const pageResponse = await axios.get(
        `${this.baseUrl}/pages/${pageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Notion-Version': '2022-06-28',
          },
        }
      );

      const page = pageResponse.data;
      const title = this.extractTitle(page);
      
      const blocksResponse = await axios.get(
        `${this.baseUrl}/blocks/${pageId}/children`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Notion-Version': '2022-06-28',
          },
        }
      );

      const content = this.extractContent(blocksResponse.data.results);

      return {
        id: page.id,
        title,
        content,
        url: page.url || `https://www.notion.so/${pageId.replace(/-/g, '')}`
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Notion API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  private extractTitle(page: any): string {
    if (page.properties?.title?.title) {
      return page.properties.title.title.map((t: any) => t.text?.content || '').join('');
    }
    
    if (page.properties?.Name?.title) {
      return page.properties.Name.title.map((t: any) => t.text?.content || '').join('');
    }

    for (const [key, prop] of Object.entries(page.properties)) {
      if ((prop as any).type === 'title') {
        return ((prop as any).title || []).map((t: any) => t.text?.content || '').join('');
      }
    }

    return 'Untitled';
  }

  private extractContent(blocks: any[]): string {
    const content: string[] = [];

    for (const block of blocks) {
      const text = this.extractBlockText(block);
      if (text.trim()) {
        content.push(text);
      }
    }

    return content.join('\n\n');
  }

  private extractBlockText(block: any): string {
    const { type } = block;
    
    switch (type) {
      case 'paragraph':
        return this.extractRichText(block.paragraph?.rich_text || []);
      
      case 'heading_1':
        return `# ${this.extractRichText(block.heading_1?.rich_text || [])}`;
      
      case 'heading_2':
        return `## ${this.extractRichText(block.heading_2?.rich_text || [])}`;
      
      case 'heading_3':
        return `### ${this.extractRichText(block.heading_3?.rich_text || [])}`;
      
      case 'bulleted_list_item':
        return `• ${this.extractRichText(block.bulleted_list_item?.rich_text || [])}`;
      
      case 'numbered_list_item':
        return `1. ${this.extractRichText(block.numbered_list_item?.rich_text || [])}`;
      
      case 'to_do':
        const checked = block.to_do?.checked ? '[x]' : '[ ]';
        return `${checked} ${this.extractRichText(block.to_do?.rich_text || [])}`;
      
      case 'code':
        const language = block.code?.language || '';
        const codeText = this.extractRichText(block.code?.rich_text || []);
        return `\`\`\`${language}\n${codeText}\n\`\`\``;
      
      case 'quote':
        return `> ${this.extractRichText(block.quote?.rich_text || [])}`;
      
      case 'callout':
        const icon = block.callout?.icon?.emoji || '💡';
        return `${icon} ${this.extractRichText(block.callout?.rich_text || [])}`;
      
      case 'divider':
        return '---';
      
      default:
        return '';
    }
  }

  private extractRichText(richText: any[]): string {
    return richText.map((text: any) => text.text?.content || '').join('');
  }
}