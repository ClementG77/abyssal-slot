<script lang="ts">
	import { i18nDerived } from '../i18n/i18nDerived';

	// Player-facing game information shown in the "info" (gameRules) modal: the idea, how a
	// spin plays, the paytable (with symbol art), the Eye/Gaze feature, Free Spins, the play
	// modes, and the slot's key numbers. Mirrors docs/ABYSSAL_GAME_OVERVIEW.md (no wild — the
	// Eye is the sole multiplier). Paytable values are bet multipliers; the Eye applies on top.
	//
	// Symbol art is rendered straight from the `symbol_black` atlas via CSS sprites (the old
	// per-symbol PNG icons were removed). Frame coords mirror spritesheet.json; every cell is a
	// uniform 495×501 inside the 1980×2004 sheet. The PNG URL uses the deploy-root-safe
	// `new URL(..., import.meta.url)` form (a root-absolute `/assets/...` would 403 on Stake).
	const ATLAS = new URL('../../assets/symbols/symbol_black/symbol_black.png', import.meta.url).href;
	const ATLAS_W = 1980;
	const ATLAS_H = 2004;
	const CELL_W = 495;
	const CELL_H = 501;
	// Local keys map to the atlas frames (ADD_EYE/MULT_EYE/CLOSE_EYE → the ACTIVE / PURPLE_CLOSE art).
	const FRAME: Record<string, [number, number]> = {
		H1: [0, 0],
		H2: [1485, 0],
		H3: [990, 0],
		H4: [495, 0],
		L1: [495, 501],
		L2: [0, 501],
		L3: [1485, 501],
		L4: [990, 501],
		L5: [1485, 1002],
		SCATTER: [0, 1503],
		ADD_EYE: [495, 1503],
		MULT_EYE: [1485, 1503],
		CLOSE_EYE: [0, 1002],
	};

	type PaySymbol = {
		sym: string;
		name: string;
		pays: [string, string, string];
	};
	type Mode = {
		name: string;
		cost: string;
		text: string;
	};

	const t = (key: string) => i18nDerived.gameInfo(key);
	const pay = (symbol: string, tier: string) => t(`PAY_${symbol}_${tier}`);

	const copy = $derived({
		title: t('TITLE'),
		tagline: t('TAGLINE'),
		leadHtml: t('LEAD_HTML'),
		howSpinPlaysTitle: t('HOW_SPIN_PLAYS_TITLE'),
		paytableTitle: t('PAYTABLE_TITLE'),
		paytableNote: t('PAYTABLE_NOTE'),
		paytableHighSymbols: t('PAYTABLE_HIGH_SYMBOLS'),
		paytableLowSymbols: t('PAYTABLE_LOW_SYMBOLS'),
		paytableSymbolHeader: t('PAYTABLE_SYMBOL_HEADER'),
		paytableCount8To9: t('PAYTABLE_COUNT_8_TO_9'),
		paytableCount10To11: t('PAYTABLE_COUNT_10_TO_11'),
		paytableCount12Plus: t('PAYTABLE_COUNT_12_PLUS'),
		specialSymbolsTitle: t('SPECIAL_SYMBOLS_TITLE'),
		specialScatterName: t('SPECIAL_SCATTER_NAME'),
		specialScatterDescriptionHtml: t('SPECIAL_SCATTER_DESCRIPTION_HTML'),
		specialAddEyeName: t('SPECIAL_ADD_EYE_NAME'),
		specialAddEyeDescriptionHtml: t('SPECIAL_ADD_EYE_DESCRIPTION_HTML'),
		specialMultEyeName: t('SPECIAL_MULT_EYE_NAME'),
		specialMultEyeDescriptionHtml: t('SPECIAL_MULT_EYE_DESCRIPTION_HTML'),
		eyeGazeTitle: t('EYE_GAZE_TITLE'),
		eyeGazeDescriptionHtml: t('EYE_GAZE_DESCRIPTION_HTML'),
		eyeGazeExampleHtml: t('EYE_GAZE_EXAMPLE_HTML'),
		freeSpinsTitle: t('FREE_SPINS_TITLE'),
		waysToPlayTitle: t('WAYS_TO_PLAY_TITLE'),
		generalDisclaimerTitle: t('GENERAL_DISCLAIMER_TITLE'),
		generalDisclaimerHtml: t('GENERAL_DISCLAIMER_HTML'),
	});

	const steps = $derived([
		t('HOW_SPIN_PLAYS_STEP_1'),
		t('HOW_SPIN_PLAYS_STEP_2'),
		t('HOW_SPIN_PLAYS_STEP_3_HTML'),
		t('HOW_SPIN_PLAYS_STEP_4'),
	]);
	const freeSpinBullets = $derived([
		t('FREE_SPINS_BULLET_1_HTML'),
		t('FREE_SPINS_BULLET_2_HTML'),
		t('FREE_SPINS_BULLET_3_HTML'),
		t('FREE_SPINS_BULLET_4_HTML'),
	]);
	const highs: PaySymbol[] = $derived([
		{
			sym: 'H1',
			name: t('SYMBOL_H1'),
			pays: [pay('H1', '8_TO_9'), pay('H1', '10_TO_11'), pay('H1', '12_PLUS')],
		},
		{
			sym: 'H2',
			name: t('SYMBOL_H2'),
			pays: [pay('H2', '8_TO_9'), pay('H2', '10_TO_11'), pay('H2', '12_PLUS')],
		},
		{
			sym: 'H3',
			name: t('SYMBOL_H3'),
			pays: [pay('H3', '8_TO_9'), pay('H3', '10_TO_11'), pay('H3', '12_PLUS')],
		},
		{
			sym: 'H4',
			name: t('SYMBOL_H4'),
			pays: [pay('H4', '8_TO_9'), pay('H4', '10_TO_11'), pay('H4', '12_PLUS')],
		},
	]);
	const lows: PaySymbol[] = $derived([
		{
			sym: 'L1',
			name: t('SYMBOL_L1'),
			pays: [pay('L1', '8_TO_9'), pay('L1', '10_TO_11'), pay('L1', '12_PLUS')],
		},
		{
			sym: 'L2',
			name: t('SYMBOL_L2'),
			pays: [pay('L2', '8_TO_9'), pay('L2', '10_TO_11'), pay('L2', '12_PLUS')],
		},
		{
			sym: 'L3',
			name: t('SYMBOL_L3'),
			pays: [pay('L3', '8_TO_9'), pay('L3', '10_TO_11'), pay('L3', '12_PLUS')],
		},
		{
			sym: 'L4',
			name: t('SYMBOL_L4'),
			pays: [pay('L4', '8_TO_9'), pay('L4', '10_TO_11'), pay('L4', '12_PLUS')],
		},
		{
			sym: 'L5',
			name: t('SYMBOL_L5'),
			pays: [pay('L5', '8_TO_9'), pay('L5', '10_TO_11'), pay('L5', '12_PLUS')],
		},
	]);
	const modes: Mode[] = $derived([
		{ name: t('MODE_BASE_NAME'), cost: t('MODE_BASE_COST'), text: t('MODE_BASE_TEXT') },
		{ name: t('MODE_ANTE_NAME'), cost: t('MODE_ANTE_COST'), text: t('MODE_ANTE_TEXT') },
		{
			name: t('MODE_BUY_FREE_SPINS_NAME'),
			cost: t('MODE_BUY_FREE_SPINS_COST'),
			text: t('MODE_BUY_FREE_SPINS_TEXT'),
		},
		{
			name: t('MODE_SUPER_SPINS_NAME'),
			cost: t('MODE_SUPER_SPINS_COST'),
			text: t('MODE_SUPER_SPINS_TEXT'),
		},
		{
			name: t('MODE_SUPER_BONUS_NAME'),
			cost: t('MODE_SUPER_BONUS_COST'),
			text: t('MODE_SUPER_BONUS_TEXT'),
		},
		{ name: t('MODE_ULTIMATE_NAME'), cost: t('MODE_ULTIMATE_COST'), text: t('MODE_ULTIMATE_TEXT') },
	]);
</script>

{#snippet symIcon(name: string, size = 30)}
	{@const fx = FRAME[name][0]}
	{@const fy = FRAME[name][1]}
	{@const s = size / CELL_W}
	<span
		class="sym-icon"
		style="width:{CELL_W * s}px; height:{CELL_H *
			s}px; background-image:url('{ATLAS}'); background-size:{ATLAS_W * s}px {ATLAS_H *
			s}px; background-position:{-fx * s}px {-fy * s}px;"
	></span>
{/snippet}

<div class="game-info">
	<header>
		<h1>{copy.title}</h1>
		<p class="tag">{copy.tagline}</p>
	</header>

	<p class="lead">
		{@html copy.leadHtml}
	</p>

	<section>
		<h2>{copy.howSpinPlaysTitle}</h2>
		<ol class="steps">
			{#each steps as step}
				<li>{@html step}</li>
			{/each}
		</ol>
	</section>

	<section>
		<h2>{copy.paytableTitle}</h2>
		<p class="note">{copy.paytableNote}</p>

		{#snippet payColumn(title: string, list: PaySymbol[], high: boolean)}
			<div class="pay-col" class:high>
				<h3>{title}</h3>
				<table>
					<thead>
						<tr>
							<th class="sym">{copy.paytableSymbolHeader}</th>
							<th>{copy.paytableCount8To9}</th>
							<th>{copy.paytableCount10To11}</th>
							<th>{copy.paytableCount12Plus}</th>
						</tr>
					</thead>
					<tbody>
						{#each list as s}
							<tr>
								<td class="sym">{@render symIcon(s.sym)}<span>{s.name}</span></td>
								<td>{s.pays[0]}</td>
								<td>{s.pays[1]}</td>
								<td>{s.pays[2]}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/snippet}

		<div class="paytables">
			{@render payColumn(copy.paytableHighSymbols, highs, true)}
			{@render payColumn(copy.paytableLowSymbols, lows, false)}
		</div>
	</section>

	<section>
		<h2>{copy.specialSymbolsTitle}</h2>
		<div class="specials">
			<div class="special">
				{@render symIcon('SCATTER', 56)}
				<div class="special-name">{copy.specialScatterName}</div>
				<p>
					{@html copy.specialScatterDescriptionHtml}
				</p>
			</div>
			<div class="special">
				{@render symIcon('ADD_EYE', 56)}
				<div class="special-name">{copy.specialAddEyeName}</div>
				<p>{@html copy.specialAddEyeDescriptionHtml}</p>
			</div>
			<div class="special">
				{@render symIcon('MULT_EYE', 56)}
				<div class="special-name">{copy.specialMultEyeName}</div>
				<p>{@html copy.specialMultEyeDescriptionHtml}</p>
			</div>
		</div>
	</section>

	<section>
		<h2>{@html copy.eyeGazeTitle}</h2>
		<p>
			{@html copy.eyeGazeDescriptionHtml}
		</p>
		<p class="note">
			{@html copy.eyeGazeExampleHtml}
		</p>
	</section>

	<section>
		<h2>{copy.freeSpinsTitle}</h2>
		<ul class="bullets">
			{#each freeSpinBullets as bullet}
				<li>{@html bullet}</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>{copy.waysToPlayTitle}</h2>
		<div class="modes">
			{#each modes as m}
				<div class="mode">
					<div class="mode-head">
						<span class="mode-name">{m.name}</span><span class="mode-cost">{m.cost}</span>
					</div>
					<p>{m.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>{copy.generalDisclaimerTitle}</h2>
		<p class="disclaimer">
			{@html copy.generalDisclaimerHtml}
		</p>
	</section>
</div>

<style lang="scss">
	$ink: #eef1f5;
	$muted: #9aa3ad;
	$line: rgba(255, 255, 255, 0.12);
	$accent: #6fe6ff;
	$panel: rgba(255, 255, 255, 0.035);

	.game-info {
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		text-align: center;
		color: $ink;
		font-family: 'Inter', system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.6rem;
		/* The popup centres its content, so tall content overflows above the viewport and the
		   shared scroll wrapper (max-height:100% of an auto-height parent) never engages.
		   Bound the height to the viewport here so this panel scrolls internally, top reachable. */
		max-height: 86vh;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding: 2.5rem 1rem 1.5rem;
	}
	/* slim scrollbar */
	.game-info {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
	}
	.game-info::-webkit-scrollbar {
		width: 8px;
	}
	.game-info::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.22);
		border-radius: 8px;
	}

	/* atlas-sprite symbol icon (box size set inline from the frame coords) */
	.sym-icon {
		display: inline-block;
		background-repeat: no-repeat;
		vertical-align: middle;
		flex: none;
	}

	header {
		h1 {
			margin: 0;
			font-size: clamp(30px, 5vw, 46px);
			font-weight: 900;
			letter-spacing: clamp(5px, 1.5vw, 14px);
		}
		.tag {
			margin: 5px 0 0;
			font-size: 12px;
			letter-spacing: 4px;
			color: $muted;
			font-weight: 600;
		}
	}

	.lead {
		max-width: 600px;
		margin: 0 auto;
		font-size: 14px;
		line-height: 1.6;
		color: #cdd6df;
	}

	section {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	h2 {
		margin: 0;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: $accent;
		position: relative;
		padding-bottom: 0.5rem;
		&::after {
			content: '';
			position: absolute;
			left: 50%;
			bottom: 0;
			transform: translateX(-50%);
			width: 46px;
			height: 2px;
			border-radius: 2px;
			background: $accent;
			opacity: 0.6;
		}
	}

	p,
	li {
		font-size: 13.5px;
		line-height: 1.55;
		margin: 0;
	}
	.note {
		color: $muted;
		font-size: 12.5px;
		max-width: 560px;
	}
	:global(strong) {
		color: #fff;
		font-weight: 800;
	}

	/* numbered / bulleted lists kept readable + left-aligned inside a centered block */
	.steps,
	.bullets {
		text-align: left;
		max-width: 560px;
		margin: 0 auto;
		padding-left: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	/* paytable — High and Low columns side by side */
	.paytables {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
		width: 100%;
		max-width: 660px;
	}
	.pay-col {
		border: 1px solid $line;
		border-radius: 12px;
		background: $panel;
		padding: 0.5rem 0.55rem 0.4rem;

		h3 {
			margin: 0.1rem 0 0.45rem;
			font-size: 11px;
			letter-spacing: 1.5px;
			text-transform: uppercase;
			color: $muted;
			text-align: center;
		}
		&.high h3 {
			color: #ffcf8a;
		}

		table {
			width: 100%;
			border-collapse: collapse;
			font-size: 11.5px;
		}
		th,
		td {
			padding: 5px 2px;
			border-bottom: 1px solid $line;
			text-align: center;
		}
		th {
			color: $muted;
			font-size: 9.5px;
			font-weight: 700;
		}
		.sym {
			text-align: left;
		}
		td.sym {
			display: flex;
			align-items: center;
			gap: 0.45rem;
			font-size: 10.5px;
			line-height: 1.2;
			.sym-icon {
				flex: none;
				filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
			}
		}
		tbody tr:last-child td {
			border-bottom: none;
		}
		&.high td:not(.sym) {
			color: #ffe9c2;
		}
	}

	/* special symbols */
	.specials {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		width: 100%;
		max-width: 600px;
	}
	.special {
		border: 1px solid $line;
		border-radius: 12px;
		background: $panel;
		padding: 0.9rem 0.7rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		.sym-icon {
			filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
		}
		.special-name {
			font-weight: 800;
			font-size: 12.5px;
			letter-spacing: 0.5px;
		}
		p {
			font-size: 12px;
			color: $muted;
		}
	}

	/* modes */
	.modes {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem;
		width: 100%;
		max-width: 600px;
	}
	.mode {
		border: 1px solid $line;
		border-radius: 10px;
		background: $panel;
		padding: 0.6rem 0.75rem;
		text-align: left;
		.mode-head {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			gap: 0.5rem;
			margin-bottom: 0.2rem;
		}
		.mode-name {
			font-weight: 800;
			font-size: 13px;
		}
		.mode-cost {
			font-size: 11.5px;
			color: $accent;
			white-space: nowrap;
		}
		p {
			font-size: 11.5px;
			color: $muted;
		}
	}

	/* disclaimer */
	.disclaimer {
		max-width: 600px;
		margin: 0 auto;
		font-size: 11px;
		line-height: 1.6;
		color: $muted;
		text-align: center;
	}

	@media screen and (max-width: 560px) {
		.specials,
		.modes,
		.paytables {
			grid-template-columns: 1fr;
		}
	}
</style>
