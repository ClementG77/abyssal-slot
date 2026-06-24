<script lang="ts">
	// Player-facing game information shown in the "info" (gameRules) modal: the idea, how a
	// spin plays, the paytable (with symbol art), the Eye/Gaze feature, Free Spins, the play
	// modes, and the slot's key numbers. Mirrors docs/ABYSSAL_GAME_OVERVIEW.md (no wild — the
	// Eye is the sole multiplier). Paytable values are bet multipliers; the Eye applies on top.
	//
	// Symbol art is rendered straight from the `eye` atlas via CSS sprites (the old per-symbol PNG
	// icons were removed). Frame coords mirror eye.json; every cell is a uniform 393×415 inside the
	// 1572×1660 sheet. The PNG URL uses the deploy-root-safe `new URL(..., import.meta.url)` form
	// (a root-absolute `/assets/...` would 403 on Stake).
	const ATLAS = new URL('../../assets/symbols/eye/eye.png', import.meta.url).href;
	const ATLAS_W = 1572;
	const ATLAS_H = 1660;
	const CELL_W = 393;
	const CELL_H = 415;
	const FRAME: Record<string, [number, number]> = {
		H1: [393, 0], H2: [0, 0], H3: [1179, 0], H4: [786, 0],
		L1: [786, 415], L2: [0, 415], L3: [393, 415], L4: [0, 830], L5: [1179, 415],
		SCATTER: [393, 830], ADD_EYE: [1179, 830], MULT_EYE: [0, 1245], CLOSE_EYE: [786, 830],
	};

	const highs = [
		{ sym: 'H1', name: 'Anglerfish', pays: ['10.00×', '25.00×', '50.00×'] },
		{ sym: 'H2', name: 'Nautilus', pays: ['2.50×', '10.00×', '25.00×'] },
		{ sym: 'H3', name: 'Diving Helmet', pays: ['2.00×', '5.00×', '15.00×'] },
		{ sym: 'H4', name: 'Jellyfish', pays: ['1.50×', '2.00×', '12.00×'] },
	];
	const lows = [
		{ sym: 'L1', name: 'Cyan gem', pays: ['1.00×', '1.50×', '10.00×'] },
		{ sym: 'L2', name: 'Teal gem', pays: ['0.80×', '1.20×', '8.00×'] },
		{ sym: 'L3', name: 'Sapphire gem', pays: ['0.50×', '1.00×', '8.00×'] },
		{ sym: 'L4', name: 'Violet gem', pays: ['0.40×', '0.90×', '6.00×'] },
		{ sym: 'L5', name: 'Aqua gem', pays: ['0.20×', '0.70×', '5.00×'] },
	];

	const modes = [
		{ name: 'Base', cost: '1× bet', text: 'The standard game. The Eye is rare, mostly the friendly ADD type.' },
		{ name: 'Ante', cost: '1.25× bet', text: 'Pay 25% more for more frequent Eyes and Scatters.' },
		{ name: 'Buy Free Spins', cost: '100× bet', text: 'Buy straight into the Free Spins feature.' },
		{ name: 'Super Spins', cost: '20× bet', text: 'One single spin with the Eye guaranteed — no bonus round.' },
		{ name: 'Super Bonus', cost: '500× bet', text: 'Free Spins with the Gaze charging twice as fast and MULTIPLY Eyes common.' },
		{ name: 'Ultimate', cost: '300× bet', text: 'One spin with several Eyes at once that combine — huge or nothing.' },
	];

</script>

{#snippet symIcon(name: string, size = 30)}
	{@const fx = FRAME[name][0]}
	{@const fy = FRAME[name][1]}
	{@const s = size / CELL_W}
	<span
		class="sym-icon"
		style="width:{CELL_W * s}px; height:{CELL_H * s}px; background-image:url('{ATLAS}'); background-size:{ATLAS_W *
			s}px {ATLAS_H * s}px; background-position:{-fx * s}px {-fy * s}px;"
	></span>
{/snippet}

<div class="game-info">
	<header>
		<h1>ABYSSAL</h1>
		<p class="tag">DEEP-SEA TUMBLE SLOT</p>
	</header>

	<p class="lead">
		Symbols drop onto a <strong>6×5 board</strong>. You win whenever <strong>8 or more of the
		same symbol</strong> land <strong>anywhere</strong> — no paylines. Winners burst and new
		symbols tumble in, which can chain into more wins from a single spin.
		There is <strong>no wild</strong>; the <strong>Eye</strong> is the sole multiplier.
	</p>

	<section>
		<h2>How a spin plays</h2>
		<ol class="steps">
			<li>The board fills with 30 symbols.</li>
			<li>Any symbol with 8+ on the board wins and bursts.</li>
			<li>Symbols above fall and new ones drop in — a <strong>tumble</strong>.</li>
			<li>Wins are checked again, repeating until a drop pays nothing.</li>
		</ol>
	</section>

	<section>
		<h2>Paytable</h2>
		<p class="note">Pays are a multiple of your bet, by how many land — before any Eye multiplier.</p>

		{#snippet payColumn(title: string, list: typeof highs, high: boolean)}
			<div class="pay-col" class:high>
				<h3>{title}</h3>
				<table>
					<thead>
						<tr><th class="sym">Symbol</th><th>8–9</th><th>10–11</th><th>12+</th></tr>
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
			{@render payColumn('High symbols', highs, true)}
			{@render payColumn('Low symbols', lows, false)}
		</div>
	</section>

	<section>
		<h2>Special symbols</h2>
		<div class="specials">
			<div class="special">
				{@render symIcon('SCATTER', 56)}
				<div class="special-name">Leviathan — Scatter</div>
				<p>
					<strong>4+</strong> triggers Free Spins and pays instantly:
					<strong>4 = 3×</strong>, <strong>5 = 5×</strong>, <strong>6 = 100×</strong>.
				</p>
			</div>
			<div class="special">
				{@render symIcon('ADD_EYE', 56)}
				<div class="special-name">ADD Eye</div>
				<p>Common. Multiplier = <strong>start&nbsp;+&nbsp;Gaze</strong>.</p>
			</div>
			<div class="special">
				{@render symIcon('MULT_EYE', 56)}
				<div class="special-name">MULTIPLY Eye</div>
				<p>Rare &amp; explosive. Multiplier = <strong>start&nbsp;×&nbsp;Gaze</strong>.</p>
			</div>
		</div>
	</section>

	<section>
		<h2>The Eye &amp; the Gaze</h2>
		<p>
			Every winning tumble charges the <strong>Gaze</strong> by 1. If an <strong>Eye</strong> is
			on the board at the end of a winning spin, it turns the Gaze into one big multiplier applied
			to everything you won that spin.
		</p>
		<p class="note">
			Example: a 2× win with a Gaze of 3 and an ADD Eye starting at 10 → ×13 → pays 26×.
			A MULTIPLY Eye → ×30 → pays 60×.
		</p>
	</section>

	<section>
		<h2>Free Spins</h2>
		<ul class="bullets">
			<li>Land <strong>4+ Leviathan (Scatter)</strong> — they can drop mid-tumble — to trigger.</li>
			<li>You get a flat <strong>15 free spins</strong>.</li>
			<li>A <strong>banked multiplier</strong> starts at ×1 and only grows, paying off on Eye spins.</li>
			<li>Retrigger with 3+ Scatters for <strong>+5 spins</strong> (up to 30).</li>
		</ul>
	</section>

	<section>
		<h2>Ways to play</h2>
		<div class="modes">
			{#each modes as m}
				<div class="mode">
					<div class="mode-head"><span class="mode-name">{m.name}</span><span class="mode-cost">{m.cost}</span></div>
					<p>{m.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>General Disclaimer</h2>
		<p class="disclaimer">
			Malfunction voids all wins and plays. A consistent internet connection is required. In the
			event of a disconnection, reload the game to finish any uncompleted rounds. The expected
			return is calculated over many plays. The game display is not representative of any physical
			device and is for illustrative purposes only. Winnings are settled according to the amount
			received from the Remote Game Server and not from events within the web browser. TM and ©
			2026 Stake Engine.
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
	strong {
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
