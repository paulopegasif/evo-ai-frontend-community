// Cores/labels EXATOS do protótipo de referência (Melhorias CRM Chat §3.2) —
// não são as classes Tailwind genéricas usadas em outros lugares do CRM.
// Compartilhado entre ConversationStatusButton (botão de ação) e o pill de
// status no ChatHeader — a paleta precisa bater entre os dois.
export const STATUS_META: Record<string, { color: string; dark: string; label: string }> = {
  pending: { color: '#C77D14', dark: '#A9670F', label: 'Pendente' },
  open: { color: '#2563C9', dark: '#1E52A8', label: 'Atendimento em Aberto' },
  resolved: { color: '#359558', dark: '#2C834E', label: 'Atendimento concluído' },
  snoozed: { color: '#6B7280', dark: '#565C64', label: 'Conversa pausada' },
};
