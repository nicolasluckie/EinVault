<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Select } from '$lib/components/ui/select/index.js';
	import { Plus, Trash2, Calendar } from '@lucide/svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { enhance } from '$app/forms';
	import { t, getLocale } from '$lib/i18n';
	import { activityTypeOptions, activityLabel } from '$lib/i18n/labels';
	import LocalTime from '$lib/components/LocalTime.svelte';
	import ByLine from '$lib/components/ByLine.svelte';

	const locale = getLocale();

	let { data }: { data: PageData } = $props();

	let companion = $derived(data.companion);
	let events = $derived(data.events);
	let today = $derived(data.today);

	let showAddForm = $state(false);
	let newType = $state('');
	let newNotes = $state('');
	let newLoggedAt = $state(today);

	const ACTIVITY_TYPES = activityTypeOptions(locale);
</script>

<svelte:head>
	<title>{t(locale, 'page.log.title')} | {companion.name} | EinVault</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6 pb-24 md:pb-0">
	{#if !companion.isActive}
		<div class="rounded-lg bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground mb-4">
			{t(locale, 'page.log.archivedNotice', { name: companion.name })}
		</div>
	{/if}

	<!-- Header -->
	<PageHeader title={t(locale, 'page.log.title')} tint="blue">
		{#snippet icon()}<Calendar class="h-5 w-5" />{/snippet}
		{#snippet actions()}
			{#if companion.isActive !== false}
				<Button onclick={() => (showAddForm = true)} size="sm">
					<Plus class="h-4 w-4 mr-1" />
					{t(locale, 'page.log.addEvent')}
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Add Event Form -->
	{#if showAddForm && companion.isActive !== false}
		<div class="rounded-xl border bg-card p-5 space-y-4">
			<h3 class="font-semibold text-sm">{t(locale, 'page.log.addEventTitle')}</h3>
			<form method="POST" action="?/add" use:enhance>
				<div class="space-y-3">
					<div>
						<Label for="type">Type</Label>
						<Select id="type" name="type" bind:value={newType} required>
							<option value="">Select activity type...</option>
							{#each ACTIVITY_TYPES as at (at.value)}
								<option value={at.value}>{at.icon} {at.label}</option>
							{/each}
						</Select>
					</div>
					<div>
						<Label for="notes">Notes</Label>
						<Textarea
							id="notes"
							name="notes"
							bind:value={newNotes}
							rows={2}
							placeholder="Optional notes..."
						/>
					</div>
					<div>
						<Label for="loggedAt">Time</Label>
						<Input
							id="loggedAt"
							name="loggedAt"
							type="datetime-local"
							bind:value={newLoggedAt}
							required
						/>
					</div>
				</div>
				<div class="flex gap-2 pt-2">
					<Button type="submit" size="sm">
						{t(locale, 'common.save')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={() => {
							showAddForm = false;
							newType = '';
							newNotes = '';
							newLoggedAt = today;
						}}
					>
						{t(locale, 'common.cancel')}
					</Button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Events List -->
	{#if events.length === 0}
		<div class="rounded-xl border bg-card">
			<EmptyState
				tint="blue"
				title={t(locale, 'page.log.emptyTitle')}
				body={t(locale, 'page.log.emptyBody', { name: companion.name })}
			>
				{#snippet icon()}<Calendar class="h-5 w-5" />{/snippet}
			</EmptyState>
		</div>
	{:else}
		<div class="rounded-xl border bg-card divide-y">
			{#each events as event (event.id)}
				<div class="p-4 flex items-start justify-between gap-4">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="text-lg"
								>{ACTIVITY_TYPES.find((at) => at.value === event.type)?.icon || '📝'}</span
							>
							<span class="text-sm font-medium">{activityLabel(locale, event.type)}</span>
						</div>
						{#if event.notes}
							<p class="text-sm text-muted-foreground mt-1">{event.notes}</p>
						{/if}
						<div class="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
							<LocalTime date={event.loggedAt} format="datetime" />
							<ByLine user={event.logger} variant="inline" />
						</div>
					</div>
					{#if companion.isActive !== false}
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={event.id} />
							<Button
								type="submit"
								variant="ghost"
								size="icon-sm"
								class="text-muted-foreground hover:text-destructive"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
