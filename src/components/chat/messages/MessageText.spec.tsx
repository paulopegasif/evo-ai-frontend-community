import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MessageText from './MessageText';

describe('MessageText HTML detection', () => {
  it('renders long composer rich text with the theme-aware rich-content path', () => {
    const content = '<p>Muito obrigada pelo seu retorno Marli! Tenha uma ótima semana.</p>';
    const { container } = render(<MessageText content={content} contentType="text" />);

    expect(container.querySelector('.rich-content')).not.toBeNull();
    expect(container.querySelector('.email-html-content')).toBeNull();
  });

  it('keeps full email documents on the email path', () => {
    const content = '<!DOCTYPE html><html><body><table><tr><td>Newsletter</td></tr></table></body></html>';
    const { container } = render(<MessageText content={content} contentType="text" />);

    expect(container.querySelector('.email-html-content')).not.toBeNull();
  });
});
