<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	// Abyssal-owned error dialog. Replaces the SDK's default ModalError (wired through the new
	// `error` snippet on the shared <Modals>). Unlike the SDK one it is CLOSEABLE (escape /
	// outside / the ✕) and wears the app's design — deep petrol glass, Cinzel, gold accent.
	//
	// Known RGS / bet-validation codes are turned into a friendly line; the raw payload stays
	// available under a "details" disclosure so nothing is lost when debugging. Copy is plain
	// English on purpose — it's a rare fallback dialog, not worth 15 locale files.
	const close = () => (stateModal.modal = null);

	// pull a status code out of whatever the machine threw (string, {error}, nested payload…)
	const raw = $derived(stateModal.modal?.name === 'error' ? stateModal.modal.error : undefined);
	const codeText = $derived.by(() => {
		const e: any = raw;
		const candidates = [
			typeof e === 'string' ? e : undefined,
			e?.error,
			e?.statusCode,
			e?.error?.statusCode,
			e?.message,
		];
		const joined = candidates.filter(Boolean).map(String).join(' ');
		const match = joined.match(/ERR_[A-Z]+/);
		return match?.[0];
	});

	// friendly, non-technical copy per known code (falls back to a generic line)
	const FRIENDLY: Record<string, { title: string; body: string }> = {
		ERR_VAL: {
			title: 'Bet too high for this mode',
			body: 'This purchase exceeds the maximum bet allowed for this feature. Lower your bet and try again.',
		},
		ERR_IPB: {
			title: 'Not enough balance',
			body: 'Your balance is too low for this bet. Lower your bet or top up to continue.',
		},
		ERR_GLE: {
			title: 'Limit reached',
			body: 'A betting or loss limit on your account has been reached. Try again later.',
		},
		ERR_IS: {
			title: 'Session expired',
			body: 'Your session has timed out. Please reload the game to continue.',
		},
		ERR_ATE: {
			title: 'Session expired',
			body: 'Your session has timed out. Please reload the game to continue.',
		},
	};
	const friendly = $derived(
		(codeText && FRIENDLY[codeText]) || {
			title: 'Something went wrong',
			body: 'We couldn’t complete that action. Please try again.',
		},
	);

	const detailsText = $derived.by(() => {
		try {
			return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
		} catch {
			return String(raw);
		}
	});
	let showDetails = $state(false);
</script>

{#if stateModal.modal?.name === 'error'}
	<Popup zIndex={zIndex.modal} onclose={close}>
		<!-- Popup itself provides the corner ✕, click-outside and Escape (non-persistent); the
		     gold button below is the primary on-brand dismiss. -->
		<div class="err">
			<div class="err-crest" aria-hidden="true">!</div>
			<h2 class="err-title">{friendly.title}</h2>
			<p class="err-body">{friendly.body}</p>

			{#if codeText}
				<div class="err-code">{codeText}</div>
			{/if}

			<button class="err-primary" onclick={close}>Close</button>

			<button class="err-details-toggle" onclick={() => (showDetails = !showDetails)}>
				{showDetails ? 'Hide details' : 'Show details'}
			</button>
			{#if showDetails}
				<pre class="err-details">{detailsText}</pre>
			{/if}
		</div>
	</Popup>
{/if}

<style lang="scss">
	$hero-bg: #0b2130; // deep petrol
	$panel: #10293b;
	$ink: #eaf3fb;
	$ink-soft: #9db4c8;
	$gold: #f0a81c;
	$gold-light: #ffd34d;
	$danger: #ff6a5a;

	.err {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: min(92vw, 30rem);
		padding: 2rem 1.6rem 1.6rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, $panel, $hero-bg);
		border: 1px solid rgba(255, 255, 255, 0.14);
		box-shadow: 0 1.4rem 3rem rgba(0, 0, 0, 0.55);
		color: $ink;
		font-family: 'Abyssal Cinzel', Georgia, serif;
		text-align: center;
	}

	.err-crest {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.4rem;
		height: 3.4rem;
		border-radius: 50%;
		font-size: 1.9rem;
		font-weight: 900;
		color: $hero-bg;
		background: linear-gradient(180deg, $gold-light, $gold);
		box-shadow: 0 0 1.6rem rgba(240, 168, 28, 0.5);
	}

	.err-title {
		margin: 0.2rem 0 0;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}

	.err-body {
		margin: 0;
		max-width: 24rem;
		color: $ink-soft;
		font-size: 0.98rem;
		line-height: 1.5;
	}

	.err-code {
		font-family: ui-monospace, monospace;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		color: $danger;
		opacity: 0.85;
	}

	.err-primary {
		margin-top: 0.4rem;
		padding: 0.7rem 2.4rem;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-weight: 800;
		font-size: 1rem;
		color: $hero-bg;
		background: linear-gradient(180deg, $gold-light, $gold);
		transition: filter 0.15s;
		&:hover {
			filter: brightness(1.06);
		}
	}

	.err-details-toggle {
		margin-top: 0.2rem;
		border: none;
		background: none;
		cursor: pointer;
		color: $ink-soft;
		font-family: inherit;
		font-size: 0.8rem;
		text-decoration: underline;
		opacity: 0.8;
	}

	.err-details {
		width: 100%;
		max-height: 8rem;
		overflow: auto;
		margin: 0;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.35);
		color: $ink-soft;
		font-family: ui-monospace, monospace;
		font-size: 0.7rem;
		text-align: left;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
