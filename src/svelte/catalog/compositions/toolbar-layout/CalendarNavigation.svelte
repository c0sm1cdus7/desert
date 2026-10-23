<script lang="ts">
  import * as Calendar from "../../../vendor/components/ui/calendar/index.js";
</script>

<!-- Private calendar-context bridge. Consumers cannot replace the controls. -->
<Calendar.PrevButton variant="secondary" aria-label="Previous month" />
<Calendar.NextButton variant="secondary" aria-label="Next month" />
