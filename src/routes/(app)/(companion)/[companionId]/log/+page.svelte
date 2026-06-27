<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Plus, Trash2, Calendar } from '@lucide/svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { enhance } from '$app/forms';
	import { t, getLocale } from '$lib/i18n';
	import LocalTime from '$lib/components/LocalTime.svelte';
	import ByLine from '$lib/components/ByLine.svelte';

	const locale = getLocale();

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let companion = $derived(data.companion);
	let events = $derived(data.events);
	let today = $derived(data.today);

	let showAddForm = $state(false);
	let newEvent = $state('');
	let newLoggedAt = $state(today);
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
						<label for="event" class="block text-sm font-medium mb-1.5">
							{t(locale, 'page.log.eventLabel')}
						</label>
						<Textarea
							id="event"
							name="event"
							bind:value={newEvent}
							rows={3}
							placeholder={t(locale, 'page.log.eventPlaceholder')}
							required
						/>
					</div>
					<div>
						<label for="loggedAt" class="block text-sm font-medium mb-1.5">
							{t(locale, 'page.log.loggedAtLabel')}
						</label>
						<Input
							id="loggedAt"
							name="loggedAt"
							type="date"
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
							newEvent = '';
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
						<p class="text-sm text-foreground whitespace-pre-wrap">{event.event}</p>
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
