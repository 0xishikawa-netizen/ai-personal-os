declare module 'turndown' {
  export default class TurndownService {
    constructor(options?: { headingStyle?: 'setext' | 'atx' });
    turndown(html: string): string;
  }
}
