import type { Book } from './base_books';
import booksJson from './bonus_books.json';

// Real bonus-buy books (free-spins feature / normal / win-cap) from books_bonus.jsonl.zst.
export default booksJson as unknown as Book[];
