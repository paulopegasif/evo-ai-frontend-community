import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MessageText from './MessageText';
import { formatWhatsAppText } from './whatsappFormat';

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

describe('WhatsApp inline formatting', () => {
  it('renders _italic_, *bold* and ~strike~ without the markers', () => {
    const { container } = render(
      <MessageText content={'Olá _tudo bem_? Isso é *importante* e ~antigo~.'} contentType="text" />,
    );
    expect(container.querySelector('em')?.textContent).toBe('tudo bem');
    expect(container.querySelector('strong')?.textContent).toBe('importante');
    expect(container.querySelector('s')?.textContent).toBe('antigo');
    expect(container.textContent).not.toContain('_tudo');
  });

  it('keeps snake_case, arithmetic and URLs literal', () => {
    const { container } = render(
      <MessageText content={'use meu_campo_novo, 2*3*4 e https://x.com/a_b_c'} contentType="text" />,
    );
    expect(container.querySelector('em')).toBeNull();
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toContain('meu_campo_novo');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://x.com/a_b_c');
  });

  it('supports nesting and leaves unmatched markers alone', () => {
    const { container } = render(<>{formatWhatsAppText('*negrito _e itálico_* e *aberto')}</>);
    expect(container.querySelector('strong em')?.textContent).toBe('e itálico');
    expect(container.textContent).toContain('*aberto');
  });
});
