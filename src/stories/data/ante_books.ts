import type { Book } from './base_books';
import booksJson from './ante_books.json';

// Real ante-mode books (showcase feature / normal win / loss / win-cap) from books_ante.jsonl.zst.
export default booksJson as unknown as Book[];
