import type { BookEvent } from '../game/typesBookEvent';
import booksJson from './base_books.json';

// Real base-mode books pulled from `books_base.jsonl.zst` (the production upload set):
//  - id 0  → a winning base spin (reveal → winInfo → updateTumbleWin → gazeStep →
//            tumbleBoard → setWin → setTotalWin → finalWin), Gaze charges, no Eye lands.
//  - id 3  → a losing spin (reveal → setTotalWin 0 → finalWin 0).
// Regenerate with the `scan/extract` Node snippet if the math is re-simmed (ids change).

export type Book = {
	id: number;
	payoutMultiplier: number;
	events: BookEvent[];
};

export default booksJson as unknown as Book[];
