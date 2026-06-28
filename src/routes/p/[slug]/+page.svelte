<script lang="ts">
	import type { PageData } from './$types';
	import WeightSparkline from '$lib/components/WeightSparkline.svelte';
	import LocalTime from '$lib/components/LocalTime.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ClipboardList, Bell, HeartPulse, Globe, Activity, X } from '@lucide/svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { tick } from 'svelte';
	import { renderMarkdown, stripMarkdown } from '$lib/markdown';
	import { ACTIVITY_ICONS, REMINDER_ICONS } from '$lib/i18n/labels';
	import { t, getLocale } from '$lib/i18n';
	import { formatRecurrence } from '$lib/reminderRecurrence';
	import { careStatus } from '$lib/careStatus';

	let { data }: { data: PageData } = $props();
	let { companion, recentHealth, recentDaily, upcomingReminders, recentWeights } = $derived(data);

	const locale = getLocale();

	function age(dob: string | null): string {
		if (!dob) return 'Unknown age';
		const birth = new Date(dob);
		const now = new Date();
		const months =
			(now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
		if (months < 12) return `${months}mo old`;
		const y = Math.floor(months / 12);
		const m = months % 12;
		return m > 0 ? `${y}y ${m}mo` : `${y}y old`;
	}

	const ACTIVITY_ICON = ACTIVITY_ICONS;

	let status = $derived(
		careStatus(
			upcomingReminders.map((r) => ({ dueAt: r.dueAt, completedAt: r.completedAt ?? null }))
		)
	);

	let latestWeight = $derived(recentWeights.length > 0 ? recentWeights[0] : null);
	let nextReminder = $derived(
		upcomingReminders.find((r) => r.type === 'vet' || r.type === 'vaccination') ?? null
	);
	let activityCount = $derived(recentDaily.length);

	let sparklinePoints = $derived(
		[...recentWeights].reverse().map((w) => ({ date: w.recordedAt, kg: w.weight }))
	);

	type ActivityItem =
		| { kind: 'activity'; ts: Date; item: (typeof recentDaily)[0] }
		| { kind: 'health'; ts: Date; item: (typeof recentHealth)[0] };

	let activityTimeline = $derived(
		(
			[
				...recentDaily.map((e) => ({
					kind: 'activity' as const,
					ts: new Date(e.loggedAt),
					item: e
				})),
				...recentHealth.map((e) => ({
					kind: 'health' as const,
					ts: new Date(e.occurredAt),
					item: e
				}))
			] as ActivityItem[]
		)
			.filter((e) => e.ts.getTime() <= Date.now())
			.sort((a, b) => b.ts.getTime() - a.ts.getTime())
			.slice(0, 8)
	);

	function reminderUrgency(dueAt: Date | string): 'overdue' | 'today' | 'upcoming' {
		const dueMs = new Date(dueAt).getTime();
		const nowMs = Date.now();
		if (dueMs < nowMs) return 'overdue';
		const d = new Date(nowMs);
		const todayEndMs = new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			23,
			59,
			59,
			999
		).getTime();
		if (dueMs <= todayEndMs) return 'today';
		return 'upcoming';
	}

	// Detail modal
	type SelectedItem =
		| { kind: 'reminder'; item: (typeof upcomingReminders)[0] }
		| { kind: 'weight'; item: (typeof recentWeights)[0] }
		| { kind: 'activity'; item: (typeof recentDaily)[0] }
		| { kind: 'health'; item: (typeof recentHealth)[0] };

	let selected = $state<SelectedItem | null>(null);
	let dialogEl = $state<HTMLElement | null>(null);

	// Avatar lightbox
	let avatarLightboxOpen = $state(false);
	let avatarUrl = $derived(companion.avatarPath ? `/api/public/avatars/${companion.id}` : null);

	function closeAvatarLightbox() {
		avatarLightboxOpen = false;
		(document.activeElement as HTMLElement)?.blur();
	}

	function handleWindowKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (avatarLightboxOpen) {
				closeAvatarLightbox();
				return;
			}
			if (selected) {
				closeDetail();
				return;
			}
		}
	}

	async function openDetail(s: SelectedItem) {
		selected = s;
		await tick();
		dialogEl?.focus();
	}

	function closeDetail() {
		selected = null;
	}

	function trapFocus(e: KeyboardEvent) {
		if (!dialogEl) return;
		const focusable = Array.from(
			dialogEl.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => !el.hasAttribute('disabled'));
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (e.key === 'Tab') {
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	}
</script>

<svelte:window onkeydown={handleWindowKey} />

<svelte:head>
	<title>{companion.name} | EinVault</title>
</svelte:head>

<!-- Avatar lightbox -->
{#if avatarLightboxOpen && avatarUrl}
	<div
		role="dialog"
		aria-modal="true"
		aria-label={t(locale, 'aria.viewPhoto', { name: companion.name })}
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
		onclick={closeAvatarLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeAvatarLightbox()}
		tabindex="-1"
	>
		<div
			role="presentation"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			class="relative max-w-sm w-full"
		>
			<div class="flex justify-end mb-2">
				<button
					type="button"
					onclick={closeAvatarLightbox}
					class="text-white/70 hover:text-white p-1 rounded"
					aria-label={t(locale, 'common.close')}
				>
					<X class="h-5 w-5" />
				</button>
			</div>
			<img
				src={avatarUrl}
				alt={t(locale, 'component.avatar.alt', { name: companion.name })}
				class="w-full rounded-xl object-contain max-h-[80vh] shadow-2xl"
			/>
		</div>
	</div>
{/if}

<!-- Detail modal -->
{#if selected}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
		<button
			tabindex="-1"
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			aria-label={t(locale, 'page.dashboard.closeDialog')}
			onclick={closeDetail}
		></button>
		<div
			bind:this={dialogEl}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onkeydown={trapFocus}
			class="relative z-10 w-full max-w-md rounded-xl border bg-card text-card-foreground shadow-xl focus:outline-none
				animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
		>
			<div class="flex items-center justify-between px-5 pt-5 pb-3">
				<h2 class="font-semibold text-base text-foreground">
					{#if selected.kind === 'reminder'}
						{selected.item.title}
					{:else if selected.kind === 'weight'}
						{t(locale, 'page.dashboard.modalWeightEntry')}
					{:else if selected.kind === 'activity'}
						{ACTIVITY_ICON[selected.item.type] ?? '📝'}
						{selected.item.type.charAt(0).toUpperCase() + selected.item.type.slice(1)}
					{:else if selected.kind === 'health'}
						{selected.item.title}
					{/if}
				</h2>
				<button
					onclick={closeDetail}
					aria-label={t(locale, 'common.close')}
					class="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<Separator />

			<div class="px-5 py-4 space-y-3 text-sm">
				{#if selected.kind === 'reminder'}
					{@const r = selected.item}
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelType')}</span
						>
						<Badge variant="coral" class="capitalize">{r.type}</Badge>
					</div>
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelDue')}</span
						>
						<span class="text-foreground"><LocalTime date={r.dueAt} format="datetime" /></span>
					</div>
					{#if r.isRecurring}
						<div class="flex items-center gap-3">
							<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
								>{t(locale, 'page.dashboard.modalLabelRepeats')}</span
							>
							<span class="text-foreground">{formatRecurrence(r, locale, 'full')}</span>
						</div>
					{/if}
					{#if r.description}
						<div class="pt-1">
							<p class="text-xs font-medium text-muted-foreground mb-1">
								{t(locale, 'page.dashboard.modalLabelNotes')}
							</p>
							<div class="prose prose-sm dark:prose-invert max-w-none">
								{@html renderMarkdown(r.description)}
							</div>
						</div>
					{/if}
				{:else if selected.kind === 'weight'}
					{@const w = selected.item}
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelWeight')}</span
						>
						<span class="text-xl font-bold text-foreground"
							>{w.weight}
							<span class="text-sm font-normal text-muted-foreground">{w.unit}</span></span
						>
					</div>
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelRecorded')}</span
						>
						<span class="text-foreground"><LocalTime date={w.recordedAt} format="datetime" /></span>
					</div>
					{#if w.notes}
						<div class="pt-1">
							<p class="text-xs font-medium text-muted-foreground mb-1">
								{t(locale, 'page.dashboard.modalLabelNotes')}
							</p>
							<div class="prose prose-sm dark:prose-invert max-w-none">
								{@html renderMarkdown(w.notes)}
							</div>
						</div>
					{/if}
				{:else if selected.kind === 'activity'}
					{@const e = selected.item}
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelType')}</span
						>
						<Badge variant="gold" class="capitalize">{e.type}</Badge>
					</div>
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelLogged')}</span
						>
						<span class="text-foreground"
							><LocalTime date={e.loggedAt} format="datetime" /></span
						>
					</div>
					{#if e.durationMinutes}
						<div class="flex items-center gap-3">
							<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
								>{t(locale, 'page.dashboard.modalLabelDuration')}</span
							>
							<span class="text-foreground">{e.durationMinutes} min</span>
						</div>
					{/if}
					{#if e.notes}
						<div class="pt-1">
							<p class="text-xs font-medium text-muted-foreground mb-1">
								{t(locale, 'page.dashboard.modalLabelNotes')}
							</p>
							<div class="prose prose-sm dark:prose-invert max-w-none">
								{@html renderMarkdown(e.notes)}
							</div>
						</div>
					{/if}
				{:else if selected.kind === 'health'}
					{@const h = selected.item}
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelType')}</span
						>
						<Badge variant="teal" class="capitalize">{h.type.replace('_', ' ')}</Badge>
					</div>
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
							>{t(locale, 'page.dashboard.modalLabelDate')}</span
						>
						<span class="text-foreground"
							><LocalTime date={h.occurredAt} format="datetime" /></span
						>
					</div>
					{#if h.vetName || h.vetClinic}
						<div class="flex items-center gap-3">
							<span class="w-20 shrink-0 text-xs font-medium text-muted-foreground"
								>{t(locale, 'page.dashboard.modalLabelVet')}</span
							>
							<span class="text-foreground"
								>{[h.vetName, h.vetClinic].filter(Boolean).join(', ')}</span
							>
						</div>
					{/if}
					{#if h.notes}
						<div class="pt-1">
							<p class="text-xs font-medium text-muted-foreground mb-1">
								{t(locale, 'page.dashboard.modalLabelNotes')}
							</p>
							<div class="prose prose-sm dark:prose-invert max-w-none">
								{@html renderMarkdown(h.notes)}
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<Separator />

			<div class="flex gap-2 px-5 py-4">
				<button
					onclick={closeDetail}
					class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				>
					{t(locale, 'common.close')}
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="max-w-2xl mx-auto px-4 py-6 space-y-4">
	<!-- Hero card -->
	<Card class="overflow-hidden">
		<div
			class="relative px-5 py-6"
			style="background: radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--color-teal) 25%, transparent), transparent 55%), radial-gradient(120% 140% at 0% 120%, color-mix(in srgb, var(--color-coral) 20%, transparent), transparent 55%), var(--color-card);"
		>
			<!-- Avatar + name row -->
			<div class="flex items-start gap-4">
				{#if avatarUrl}
					<button
						type="button"
						class="shrink-0 rounded-full overflow-hidden w-16 h-16 border-2 border-border/40 focus:outline-none focus:ring-2 focus:ring-ring"
						onclick={() => (avatarLightboxOpen = true)}
						aria-label={t(locale, 'aria.viewPhoto', { name: companion.name })}
					>
						<img
							src={avatarUrl}
							alt={companion.name}
							class="w-full h-full object-cover"
						/>
					</button>
				{:else}
					<div
						class="shrink-0 w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border-2 border-border/40"
					>
						{companion.name.charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<div class="flex items-start justify-between gap-2 flex-wrap">
						<h1 class="font-display text-2xl font-bold text-foreground leading-tight">
							{companion.name}
						</h1>
						<Badge variant="secondary" class="text-xs shrink-0 flex items-center gap-1">
							<Globe class="h-3 w-3" />
							{t(locale, 'page.public.badge')}
						</Badge>
					</div>
					<p class="text-sm text-muted-foreground mt-0.5">
						{companion.breed ?? t(locale, 'page.dashboard.mixedBreed')} · {age(
							companion.dob
						)}{companion.sex ? ` · ${companion.sex}` : ''}
					</p>
					<div class="mt-2">
						{#if status === 'up-to-date'}
							<Badge variant="teal" class="text-xs">
								<HeartPulse class="h-3 w-3 mr-1" />
								{t(locale, 'overview.careStatus.upToDate')}
							</Badge>
						{:else if status === 'due-today'}
							<Badge variant="gold" class="text-xs">
								<HeartPulse class="h-3 w-3 mr-1" />
								{t(locale, 'overview.careStatus.dueToday')}
							</Badge>
						{:else}
							<Badge variant="coral" class="text-xs">
								<HeartPulse class="h-3 w-3 mr-1" />
								{t(locale, 'overview.careStatus.needsAttention')}
							</Badge>
						{/if}
					</div>
				</div>
			</div>

			<!-- Quick stats row -->
			<div class="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-4">
				<div class="col-span-2 flex flex-col gap-0.5 sm:col-span-1">
					<span class="text-xs text-muted-foreground font-medium uppercase tracking-wide"
						>{t(locale, 'page.dashboard.cardWeight')}</span
					>
					{#if latestWeight}
						<button
							type="button"
							onclick={() => latestWeight && openDetail({ kind: 'weight', item: latestWeight })}
							class="flex items-end gap-3 text-left rounded-md px-1 py-0.5 -mx-1 hover:bg-accent transition-colors"
						>
							<span class="text-base font-bold text-foreground"
								>{latestWeight.weight}
								<span class="text-xs font-normal text-muted-foreground">{latestWeight.unit}</span
								></span
							>
							{#if sparklinePoints.length >= 2}
								<span class="text-teal shrink-0">
									<WeightSparkline points={sparklinePoints} width={88} height={28} />
								</span>
							{/if}
						</button>
					{:else}
						<span class="text-sm text-muted-foreground italic">—</span>
					{/if}
				</div>

				<div class="flex flex-col gap-0.5 min-w-0 sm:flex-1">
					<span class="text-xs text-muted-foreground font-medium uppercase tracking-wide"
						>{t(locale, 'page.dashboard.nextVet')}</span
					>
					{#if nextReminder}
						<button
							type="button"
							onclick={() => nextReminder && openDetail({ kind: 'reminder', item: nextReminder })}
							class="text-base font-bold text-foreground truncate text-left rounded-md px-1 py-0.5 -mx-1 hover:bg-accent transition-colors"
						>
							{nextReminder.title}
						</button>
					{:else}
						<span class="text-base font-bold text-muted-foreground italic">—</span>
					{/if}
				</div>

				<div class="flex flex-col gap-0.5 min-w-0">
					<span class="text-xs text-muted-foreground font-medium uppercase tracking-wide"
						>{t(locale, 'page.dashboard.cardActivity')}</span
					>
					<span class="text-base font-bold text-foreground"
						>{t(locale, 'page.dashboard.heroRecentActivity', {
							count: String(activityCount)
						})}</span
					>
				</div>
			</div>
		</div>
	</Card>

	<!-- About section -->
	{#if companion.bio}
		<section>
			<h2 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
				About {companion.name}
			</h2>
			<div class="prose prose-sm dark:prose-invert max-w-none">
				{@html renderMarkdown(companion.bio)}
			</div>
		</section>
	{/if}

	<!-- Schedules section -->
	{#if companion.feedingSchedule || companion.walkSchedule || companion.medicationSchedule}
		<section>
			<h2 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
				Schedules
			</h2>
			<div class="flex flex-col sm:flex-row gap-4">
				{#if companion.feedingSchedule}
					<div class="flex-1 min-w-0 rounded-xl border border-border bg-card p-4">
						<p class="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
							<span>🍖</span> Feeding Schedule
						</p>
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{@html renderMarkdown(companion.feedingSchedule)}
						</div>
					</div>
				{/if}
				{#if companion.walkSchedule}
					<div class="flex-1 min-w-0 rounded-xl border border-border bg-card p-4">
						<p class="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
							<span>🚶</span> Walk Schedule
						</p>
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{@html renderMarkdown(companion.walkSchedule)}
						</div>
					</div>
				{/if}
				{#if companion.medicationSchedule}
					<div class="flex-1 min-w-0 rounded-xl border border-border bg-card p-4">
						<p class="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
							<span>💊</span> Medication Schedule
						</p>
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{@html renderMarkdown(companion.medicationSchedule)}
						</div>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Notes for Sitter section -->
	{#if companion.notesForSitter}
		<section>
			<h2 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
				Notes for Sitter
			</h2>
			<div class="prose prose-sm dark:prose-invert max-w-none">
				{@html renderMarkdown(companion.notesForSitter)}
			</div>
		</section>
	{/if}

	<!-- Contacts section -->
	{#if companion.vetName || companion.vetPhone || companion.vetClinic || companion.emergencyContactName}
		<section>
			<h2 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
				Contacts
			</h2>
			<div class="flex flex-col sm:flex-row gap-4">
				{#if companion.vetName || companion.vetPhone || companion.vetClinic}
					<div class="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 space-y-1 text-sm">
						<p class="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
							<span>🏥</span> Vet Info
						</p>
						{#if companion.vetName}
							<p class="font-medium">{companion.vetName}</p>
						{/if}
						{#if companion.vetClinic}
							<p class="text-muted-foreground">{companion.vetClinic}</p>
						{/if}
						{#if companion.vetPhone}
							<p>📞 <a href="tel:{companion.vetPhone}" class="hover:underline font-medium text-primary-link">{companion.vetPhone}</a></p>
						{/if}
					</div>
				{/if}
				{#if companion.emergencyContactName || companion.emergencyContactPhone || companion.emergencyContact2Name || companion.emergencyContact2Phone}
					<div class="flex-1 min-w-0 rounded-xl border border-coral/30 bg-card p-4 space-y-2 text-sm">
						<p class="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
							<span>🚨</span> Emergency Contacts
						</p>
						{#if companion.emergencyContactName || companion.emergencyContactPhone}
							<div class="space-y-1">
								{#if companion.emergencyContactName}
									<p class="font-medium">{companion.emergencyContactName}</p>
								{/if}
								{#if companion.emergencyContactPhone}
									<p>📞 <a href="tel:{companion.emergencyContactPhone}" class="hover:underline font-medium text-primary-link">{companion.emergencyContactPhone}</a></p>
								{/if}
							</div>
						{/if}
						{#if companion.emergencyContact2Name || companion.emergencyContact2Phone}
							<div class="space-y-1">
								{#if companion.emergencyContact2Name}
									<p class="font-medium">{companion.emergencyContact2Name}</p>
								{/if}
								{#if companion.emergencyContact2Phone}
									<p>📞 <a href="tel:{companion.emergencyContact2Phone}" class="hover:underline font-medium text-primary-link">{companion.emergencyContact2Phone}</a></p>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Upcoming reminders card -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-sm font-semibold flex items-center gap-2">
				<Bell class="h-4 w-4" />
				{t(locale, 'page.dashboard.cardUpcomingReminders')}
			</CardTitle>
		</CardHeader>
		<CardContent class="pt-0">
			{#if upcomingReminders.length === 0}
				<EmptyState tint="coral" title={t(locale, 'page.dashboard.noUpcomingReminders')}>
					{#snippet icon()}<Bell class="h-5 w-5" />{/snippet}
				</EmptyState>
			{:else}
				<div class="space-y-1">
					{#each upcomingReminders.slice(0, 5) as reminder (reminder.id)}
						{@const urgency = reminderUrgency(reminder.dueAt)}
						<button
							type="button"
							onclick={() => openDetail({ kind: 'reminder', item: reminder })}
							class="flex-1 flex items-center gap-3 text-sm rounded-md px-2 py-2 w-full
									hover:bg-accent transition-colors text-left min-w-0"
						>
							<span
								class="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-sm bg-coral/15 text-coral"
							>
								{REMINDER_ICONS[reminder.type] ?? '📌'}
							</span>
							<div class="flex-1 min-w-0">
								<p class="truncate text-foreground font-medium text-xs">
									{reminder.title}
								</p>
								{#if reminder.isRecurring}
									<p class="text-xs text-muted-foreground truncate">
										{formatRecurrence(reminder, locale, 'short')}
									</p>
								{/if}
							</div>
							<Badge
								variant={urgency === 'overdue'
									? 'coral'
									: urgency === 'today'
										? 'gold'
										: 'secondary'}
								class="shrink-0 text-xs"
							>
								{#if urgency === 'overdue'}
									{t(locale, 'page.dashboard.reminderOverdue')}
								{:else if urgency === 'today'}
									{t(locale, 'page.dashboard.reminderToday')}
								{:else}
									<LocalTime date={reminder.dueAt} />
								{/if}
							</Badge>
						</button>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Recent activity timeline -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-sm font-semibold flex items-center gap-2">
				<ClipboardList class="h-4 w-4" />
				{t(locale, 'page.dashboard.cardRecentActivity')}
			</CardTitle>
		</CardHeader>
		<CardContent class="pt-0">
			{#if activityTimeline.length === 0}
				<EmptyState tint="gold" title={t(locale, 'page.dashboard.activityEmpty')}>
					{#snippet icon()}<Activity class="h-5 w-5" />{/snippet}
				</EmptyState>
			{:else}
				<div class="space-y-0.5">
					{#each activityTimeline as entry (entry.item.id)}
						{#if entry.kind === 'activity'}
							{@const event = entry.item}
							<button
								type="button"
								onclick={() => openDetail({ kind: 'activity', item: event })}
								class="w-full rounded-md px-2 py-2 -mx-2 hover:bg-accent transition-colors text-left"
							>
								<div class="flex items-center gap-3 text-sm">
									<span
										class="w-7 h-7 shrink-0 rounded-lg bg-gold/15 flex items-center justify-center text-base"
									>
										{ACTIVITY_ICON[event.type] ?? '📝'}
									</span>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<Badge variant="gold" class="capitalize text-xs">{event.type}</Badge>
											{#if event.notes}
												<span class="truncate text-xs text-muted-foreground">
													{stripMarkdown(event.notes)}
												</span>
											{/if}
										</div>
										<div class="flex items-center gap-1 mt-0.5">
											<span class="text-xs text-muted-foreground">
												<LocalTime date={event.loggedAt} format="relative" />
											</span>
										</div>
									</div>
								</div>
							</button>
						{:else if entry.kind === 'health'}
							{@const event = entry.item}
							<button
								type="button"
								onclick={() => openDetail({ kind: 'health', item: event })}
								class="w-full rounded-md px-2 py-2 -mx-2 hover:bg-accent transition-colors text-left"
							>
								<div class="flex items-center gap-3 text-sm">
									<span
										class="w-7 h-7 shrink-0 rounded-lg bg-teal/10 flex items-center justify-center text-base"
									>
										<HeartPulse class="h-3.5 w-3.5 text-teal" />
									</span>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<Badge variant="teal" class="capitalize text-xs"
												>{event.type.replace('_', ' ')}</Badge
											>
											<span class="truncate text-xs text-foreground">{event.title}</span>
										</div>
										<div class="flex items-center gap-1 mt-0.5">
											<span class="text-xs text-muted-foreground">
												<LocalTime date={event.occurredAt} format="relative" />
											</span>
										</div>
									</div>
								</div>
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
