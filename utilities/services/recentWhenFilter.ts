import type {ObjectId} from "mongodb";
import dayjs from "dayjs";
import type {RecentWhen} from "armonia/src/modules/eCommerce/helpers/recentWhen";
import {companyTimeZoneOf} from "@coreModule/utilities/time/companyTimeZone";
import {addLocalDays, localDateOf, localDayInterval} from "@coreModule/utilities/time/timeWindows";

/**
 * The "When" quick filter as a range on `field`, on the company's calendar (GLB-09): today, this week
 * (from Monday), or before this week. No value, no filter.
 */
export async function recentWhenFilter(when: RecentWhen | undefined, companyId: ObjectId | undefined, field: string): Promise<Record<string, unknown>> {
    if (!when || !companyId) return {};
    const timeZone = await companyTimeZoneOf(companyId);
    const today = localDateOf(new Date(), timeZone);
    if (when === "today") {
        const day = localDayInterval(today, timeZone);
        return {[field]: {$gte: day.start, $lt: day.end}};
    }
    const daysSinceMonday = (dayjs(today).day() + 6) % 7;
    const weekStart = localDayInterval(addLocalDays(today, -daysSinceMonday), timeZone).start;
    return when === "thisWeek" ? {[field]: {$gte: weekStart}} : {[field]: {$lt: weekStart}};
}
