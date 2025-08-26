import axios from 'axios';

export interface ConfluenceConfig {
  baseUrl: string;
  username: string;
  token: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  content: string;
  url: string;
}

export class ConfluenceClient {
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
  }

  async getPageByUrl(pageUrl: string): Promise<ConfluencePage> {
    const pageId = this.extractPageIdFromUrl(pageUrl);
    return this.getPageById(pageId);
  }

  private extractPageIdFromUrl(url: string): string {
    const match = url.match(/pages\/(\d+)/);
    if (!match) {
      throw new Error(`Cannot extract page ID from URL: ${url}`);
    }
    return match[1];
  }

  async getPageById(pageId: string): Promise<ConfluencePage> {
    const auth = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64');

    try {
      const response = await axios.get(
        `${this.config.baseUrl}/rest/api/content/${pageId}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
          params: {
            expand: 'body.storage,space'
          }
        }
      );

      const page = response.data;
      
      return {
        id: page.id,
        title: page.title,
        content: this.stripHtml(page.body.storage.value),
        url: `${this.config.baseUrl}${page._links.webui}`
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Confluence API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  static parseConfluenceUrl(url: string): { baseUrl: string; pageId: string } {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    const pageIdMatch = url.match(/pages\/(\d+)/);
    if (!pageIdMatch) {
      throw new Error(`Invalid Confluence URL format: ${url}`);
    }
    
    return {
      baseUrl,
      pageId: pageIdMatch[1]
    };
  }
}