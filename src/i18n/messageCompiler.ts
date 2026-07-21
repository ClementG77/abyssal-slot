import { stateI18n } from 'state-shared';

// ---------------------------------------------------------------------------------------------
// Silences Lingui's "Uncompiled message detected!" console spam in the deployed build.
//
// WHAT IS ACTUALLY HAPPENING
// Our catalogs are hand-authored TS objects — `{ LOADER_CARD_1_TITLE: 'CHARGE THE GAZE' }` — not
// artefacts of `@lingui/cli compile`. Lingui calls those "raw", and in `I18n._()` it does:
//
//     if (isString(translation)) {
//       if (this._messageCompiler) translation = this._messageCompiler(translation);
//       else console.warn('Uncompiled message detected! ... > ' + translation);
//     }
//
// So the warning fires for EVERY message whose catalog value is a plain string, i.e. all of ours.
// It prints the resolved English text rather than the key, which is why the log reads like a
// missing-translation problem when nothing is actually missing. The keys resolve correctly and
// the right copy renders — it is pure noise, but it is one `console.warn` with a stack capture
// per message, and text props re-evaluate inside the rAF loop.
//
// WHY A PASS-THROUGH COMPILER IS THE RIGHT ANSWER HERE, NOT A CHEAT
// `setMessagesCompiler` is Lingui's documented hook for exactly this case: "Registers a
// MessageCompiler to enable the use of uncompiled catalogs at runtime." For a message with NO ICU
// tokens, the real compiler (`@lingui/message-utils/compileMessage`) returns the string unchanged,
// and `_()` then takes the same `if (isString(translation)) return translation` branch it takes
// today. Verified against @lingui/core 5.2.0: for our catalogs this is byte-identical output,
// minus the warning. It also avoids pulling the full ICU parser into the bundle for a game that
// has no plurals or interpolation to parse.
//
// THE CATCH, AND THE GUARD
// A pass-through is only equivalent while the catalogs stay token-free. Every message across the
// app catalogs AND the merged `components-ui-pixi` / `components-ui-html` maps is currently static
// text — no `{name}`, no `plural`. If someone adds ICU later, a silent pass-through would render
// `{amount}` literally instead of interpolating, and the warning that would have caught it is the
// very thing this file removes. So the guard below keeps that safety net: token-free messages pass
// through quietly, anything with ICU syntax still shouts.
//
// If ICU is ever genuinely needed, the fix is to add `@lingui/message-utils` as a direct dependency
// (it is already present transitively at the matching 5.2.0) and swap the body for its
// `compileMessage`. The guard is what will tell you that day has come.
// ---------------------------------------------------------------------------------------------

const ICU_SYNTAX = /\{[^}]*\}/;

let installed = false;

export const installMessageCompiler = () => {
	if (installed) return;
	installed = true;

	// Configured through `stateI18n.i18n`, NOT a fresh `import { i18n } from '@lingui/core'`.
	// All three packages pin 5.2.0 so pnpm should dedupe to one instance, but going through the
	// object the SDK actually translates with removes the possibility of configuring a different
	// copy of the singleton and wondering why nothing changed.
	stateI18n.i18n.setMessagesCompiler((message: string) => {
		if (ICU_SYNTAX.test(message)) {
			console.warn(
				`[i18n] ICU syntax in an uncompiled message — it will render literally, not interpolate.\n` +
					`Message: ${message}\n` +
					`Fix: add @lingui/message-utils and use its compileMessage in src/i18n/messageCompiler.ts.`,
			);
		}
		return message;
	});
};
