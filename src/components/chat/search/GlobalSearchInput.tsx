import type React from 'react';
import { Search } from '@/components/icons';
import { AutocompleteInput } from '@/components/ui/autocomplete';

type Props = Omit<React.ComponentProps<typeof AutocompleteInput>, 'startAddon' | 'value' | 'onChange'>;

/**
 * Search field for the global search. Must be rendered as a child of
 * `GlobalSearchPanel` so arrow keys/Enter drive the result list; the value is
 * controlled by the panel's `rawInputValue` / `onInputValueChange`.
 */
export default function GlobalSearchInput(props: Props) {
  return <AutocompleteInput type="search" startAddon={<Search />} {...props} />;
}
