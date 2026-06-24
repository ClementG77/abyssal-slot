import type { Book } from './base_books';
import booksJson from './superspins_books.json';

// Real super-spins books (guaranteed-Eye single spin / normal / loss / win-cap) from
// books_superspins.jsonl.zst.
export default booksJson as unknown as Book[];
