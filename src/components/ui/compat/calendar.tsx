import type * as React from 'react';
import { Calendar as CossCalendar } from '../calendar';

type CalendarProps = React.ComponentProps<typeof CossCalendar> & {
  /** react-day-picker v8/v9 name; DayPicker v10 calls it autoFocus. */
  initialFocus?: boolean;
};

/** shadcn-style Calendar API on top of the coss Calendar (DayPicker v10). */
export function Calendar({ initialFocus, autoFocus, ...props }: CalendarProps): React.ReactElement {
  return <CossCalendar autoFocus={autoFocus ?? initialFocus} {...(props as React.ComponentProps<typeof CossCalendar>)} />;
}
