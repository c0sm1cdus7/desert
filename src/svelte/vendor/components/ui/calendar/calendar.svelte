<script lang="ts">
	import { isEqualMonth, today, getLocalTimeZone, type DateValue } from "@internationalized/date";
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "@desert/svelte/vendor/utils.js";
	import * as Calendar from "./index.js";
	import CalendarGridViewport from "./calendar-grid-viewport.svelte";
	import type { ButtonVariant } from "../button/button.svelte";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		value = $bindable(),
		placeholder = $bindable(Array.isArray(value) ? value[0] ?? today(getLocalTimeZone()) : value ?? today(getLocalTimeZone())),
		class: className,
		weekdayFormat = "short",
		buttonVariant = "ghost",
		captionLayout = "label",
		presentation = "inline",
		locale = "en-US",
		months: monthsProp,
		years,
		monthFormat: monthFormatProp,
		yearFormat = "numeric",
		day,
		header,
		disableDaysOutsideMonth = false,
		...restProps
	}: WithoutChildrenOrChild<CalendarPrimitive.RootProps> & {
		buttonVariant?: ButtonVariant;
		presentation?: "inline" | "picker";
		captionLayout?: "dropdown" | "dropdown-months" | "dropdown-years" | "label";
		months?: CalendarPrimitive.MonthSelectProps["months"];
		years?: CalendarPrimitive.YearSelectProps["years"];
		monthFormat?: CalendarPrimitive.MonthSelectProps["monthFormat"];
		yearFormat?: CalendarPrimitive.YearSelectProps["yearFormat"];
		day?: Snippet<[{ day: DateValue; outsideMonth: boolean }]>;
		/** Host chrome rendered inside the calendar context, retaining native navigation semantics. */
		header?: Snippet<[DateValue]>;
	} = $props();

	const monthFormat = $derived.by(() => {
		if (monthFormatProp) return monthFormatProp;
		if (captionLayout.startsWith("dropdown")) return "short";
		return "long";
	});
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<CalendarPrimitive.Root
	bind:value={value as never}
	bind:ref
	bind:placeholder
	{weekdayFormat}
	{disableDaysOutsideMonth}
	class={cn(
		"@container/calendar min-w-0 max-w-full p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] group/calendar bg-background in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
		presentation === "picker" && "w-full bg-transparent [--cell-radius:0.75rem] [--cell-size:max(2rem,calc(100cqi/7))] [&_[data-calendar-day]]:min-h-(--cell-size)",
		className
	)}
	{locale}
	{monthFormat}
	{yearFormat}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		{#if header && months[0]}{@render header(months[0].value)}{/if}
		<Calendar.Months class="min-h-0">
			{#if !header}
			<Calendar.Nav>
				<Calendar.PrevButton variant={buttonVariant} />
				<Calendar.NextButton variant={buttonVariant} />
			</Calendar.Nav>
			{/if}
			{#each months as month, monthIndex (month)}
				<Calendar.Month class="min-h-0">
					{#if !header}<Calendar.Header>
						<Calendar.Caption
							{captionLayout}
							months={monthsProp}
							{monthFormat}
							{years}
							{yearFormat}
							month={month.value}
							bind:placeholder
							{locale}
							{monthIndex}
						/>
					</Calendar.Header>{/if}
					<CalendarGridViewport>
					<Calendar.Grid class="w-max min-w-full">
						<Calendar.GridHead>
							<Calendar.GridRow class="select-none">
								{#each weekdays as weekday, i (i)}
									<Calendar.HeadCell>
										{weekday.slice(0, 2)}
									</Calendar.HeadCell>
								{/each}
							</Calendar.GridRow>
						</Calendar.GridHead>
						<Calendar.GridBody>
							{#each month.weeks as weekDates (weekDates)}
								<Calendar.GridRow class="mt-2 w-full">
									{#each weekDates as date (date)}
										<Calendar.Cell {date} month={month.value}>
											{#if day}
												{@render day({
													day: date,
													outsideMonth: !isEqualMonth(date, month.value),
												})}
											{:else}
												<Calendar.Day />
											{/if}
										</Calendar.Cell>
									{/each}
								</Calendar.GridRow>
							{/each}
						</Calendar.GridBody>
					</Calendar.Grid>
					</CalendarGridViewport>
				</Calendar.Month>
			{/each}
		</Calendar.Months>
	{/snippet}
</CalendarPrimitive.Root>
