import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export interface GoogleDocsConfig {
  credentials: string;
}

export interface GoogleDoc {
  id: string;
  title: string;
  content: string;
  url: string;
}

export class GoogleDocsClient {
  private config: GoogleDocsConfig;
  private docs: any;
  private auth: JWT;

  constructor(config: GoogleDocsConfig) {
    this.config = config;
    this.setupAuth();
  }

  private setupAuth() {
    let credentials;
    try {
      credentials = JSON.parse(this.config.credentials);
    } catch (error) {
      throw new Error('Invalid JSON format in credentials');
    }

    this.auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/documents.readonly'],
    });

    this.docs = google.docs({ version: 'v1', auth: this.auth });
  }

  async getDocByUrl(docUrl: string): Promise<GoogleDoc> {
    const docId = this.extractDocIdFromUrl(docUrl);
    return this.getDocById(docId);
  }

  private extractDocIdFromUrl(url: string): string {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error(`Cannot extract document ID from URL: ${url}`);
    }
    return match[1];
  }

  async getDocById(docId: string): Promise<GoogleDoc> {
    try {
      const response = await this.docs.documents.get({
        documentId: docId,
      });

      const doc = response.data;
      const title = doc.title || 'Untitled Document';
      const content = this.extractContent(doc.body);

      return {
        id: docId,
        title,
        content,
        url: `https://docs.google.com/document/d/${docId}`
      };
    } catch (error) {
      throw new Error(`Google Docs API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractContent(body: any): string {
    const content: string[] = [];

    if (!body?.content) {
      return '';
    }

    for (const element of body.content) {
      const text = this.extractElementText(element);
      if (text.trim()) {
        content.push(text);
      }
    }

    return content.join('\n\n');
  }

  private extractElementText(element: any): string {
    if (element.paragraph) {
      return this.extractParagraphText(element.paragraph);
    } else if (element.table) {
      return this.extractTableText(element.table);
    } else if (element.sectionBreak) {
      return '---';
    }

    return '';
  }

  private extractParagraphText(paragraph: any): string {
    if (!paragraph.elements) {
      return '';
    }

    let text = '';
    for (const element of paragraph.elements) {
      if (element.textRun?.content) {
        text += element.textRun.content;
      }
    }

    if (paragraph.paragraphStyle?.namedStyleType) {
      const styleType = paragraph.paragraphStyle.namedStyleType;
      switch (styleType) {
        case 'HEADING_1':
          return `# ${text.trim()}`;
        case 'HEADING_2':
          return `## ${text.trim()}`;
        case 'HEADING_3':
          return `### ${text.trim()}`;
        case 'HEADING_4':
          return `#### ${text.trim()}`;
        case 'HEADING_5':
          return `##### ${text.trim()}`;
        case 'HEADING_6':
          return `###### ${text.trim()}`;
        default:
          return text.trim();
      }
    }

    return text.trim();
  }

  private extractTableText(table: any): string {
    if (!table.tableRows) {
      return '';
    }

    const rows: string[] = [];
    let isFirstRow = true;

    for (const row of table.tableRows) {
      const cells: string[] = [];
      
      if (row.tableCells) {
        for (const cell of row.tableCells) {
          let cellText = '';
          if (cell.content) {
            for (const element of cell.content) {
              cellText += this.extractElementText(element);
            }
          }
          cells.push(cellText.trim() || ' ');
        }
      }

      rows.push(`| ${cells.join(' | ')} |`);
      
      if (isFirstRow && cells.length > 0) {
        rows.push(`| ${cells.map(() => '---').join(' | ')} |`);
        isFirstRow = false;
      }
    }

    return rows.join('\n');
  }
}