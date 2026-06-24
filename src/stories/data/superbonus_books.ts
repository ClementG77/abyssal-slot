import type { Book } from './base_books';
import booksJson from './superbonus_books.json';

// Real super-bonus books (charge +2 / MUL-common feature / normal / win-cap) from
// books_superbonus.jsonl.zst.
export default booksJson as unknown as Book[];
