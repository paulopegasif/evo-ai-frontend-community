import { Contact } from '@/types/chat/api';

// Tipo genérico para qualquer contato com avatar
interface AvatarContact {
  avatar_url?: string | null;
  avatar?: string | null;
  thumbnail?: string | null; // Para compatibilidade com sistema de contatos
}

/**
 * Constrói a URL completa para o avatar de um contato
 * Prioriza avatar_url (URL completa) sobre avatar (path relativo)
 * Compatível com diferentes tipos de contato (Chat e Contacts)
 */
export const getContactAvatarUrl = (
  contact: Contact | AvatarContact | null | undefined,
): string | undefined => {
  if (!contact) return undefined;

  // Priorizar avatar_url (URL completa da API)
  if (contact.avatar_url) {
    return contact.avatar_url;
  }

  // Fallback para thumbnail (usado no sistema de contatos)
  if ('thumbnail' in contact && contact.thumbnail) {
    return contact.thumbnail;
  }

  // Fallback para avatar (pode ser um path relativo)
  if (contact.avatar) {
    // Se avatar já é uma URL completa, usar diretamente
    if (contact.avatar.startsWith('http') || contact.avatar.startsWith('//')) {
      return contact.avatar;
    }

    // Se começa com /, assumir que é um path absoluto no servidor
    if (contact.avatar.startsWith('/')) {
      return contact.avatar;
    }

    // Se não tem protocolo nem barra, assumir que é um path relativo
    // Construir URL baseada na estrutura típica do Evolution
    return `/uploads/${contact.avatar}`;
  }

  return undefined;
};

/**
 * Obtém as iniciais do nome de um contato
 * Retorna até 2 caracteres (primeira letra do primeiro e último nome)
 */
export const getContactInitials = (name: string | null | undefined): string => {
  if (!name) return '';

  const words = name
    .trim()
    .split(' ')
    .filter(word => word.length > 0);
  if (words.length === 0) return '';

  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Verifica se uma URL de avatar é válida
 * Útil para validar antes de fazer requests
 */
export const isValidAvatarUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;

  try {
    // Verificar se é uma URL válida
    new URL(url, window.location.origin);
    return true;
  } catch {
    // Se não é uma URL válida, verificar se é um path válido
    return url.startsWith('/') || url.startsWith('./') || !url.includes(' ');
  }
};

/**
 * Avatar fallback colors. coss ui keeps avatars neutral (initials on a muted
 * fill), so every contact gets the same treatment regardless of name.
 */
export const getContactAvatarColor = (_name?: string | null): string => 'bg-muted text-foreground/80';
