import type { ReactNode } from 'react';
import BrandIcon from '@/components/BrandIcon';
import AsanaService from '@/services/integrations/asanaService';
import AtlassianService from '@/services/integrations/atlassianService';
import CanvaService from '@/services/integrations/canvaService';
import GitHubService from '@/services/integrations/githubService';
import HubSpotService from '@/services/integrations/hubspotService';
import LinearService from '@/services/integrations/linearService';
import MondayService from '@/services/integrations/mondayService';
import NotionService from '@/services/integrations/notionService';
import PayPalService from '@/services/integrations/paypalService';
import StripeService from '@/services/integrations/stripeService';
import SupabaseService from '@/services/integrations/supabaseService';
import type { DiscoverToolsResponse } from '@/types/integrations';

export type OAuthMCPProviderId =
  | 'github'
  | 'notion'
  | 'stripe'
  | 'linear'
  | 'monday'
  | 'atlassian'
  | 'asana'
  | 'hubspot'
  | 'paypal'
  | 'canva'
  | 'supabase';

/** Common shape every OAuth MCP config persisted per agent shares. */
export interface OAuthMCPConfig {
  provider: OAuthMCPProviderId;
  username?: string;
  email?: string;
  connected?: boolean;
  tools?: string[];
}

export interface OAuthMCPService {
  generateAuthorization(agentId: string): Promise<{ url: string }>;
  getConfiguration(agentId: string): Promise<Partial<OAuthMCPConfig> | null>;
  saveConfiguration(agentId: string, config: OAuthMCPConfig): Promise<unknown>;
  disconnect(agentId: string): Promise<unknown>;
  discoverTools(agentId: string): Promise<DiscoverToolsResponse>;
}

export interface OAuthMCPProvider {
  id: OAuthMCPProviderId;
  /** Brand name used in titles and toasts. */
  name: string;
  /** i18n namespace holding `edit.integrations.<id>.*`. */
  namespace: 'aiAgents' | 'agents';
  icon: ReactNode;
  service: OAuthMCPService;
  /** Whether saving/disconnecting also adds/removes the entry in the agent's mcpServers. */
  syncsMcpServers: boolean;
  /** Show the brand mark inside the connect button. */
  connectButtonIcon: boolean;
  /** Pre-i18n fallbacks, kept identical to the former per-provider dialogs. */
  fallbacks: {
    title: string;
    connectDescription: string;
    connectedDescription: string;
  };
}

// GitHub and Notion marks are black/white: follow the text color so both themes work.
const MONOCHROME = new Set(['github', 'notion']);
const brand = (id: string) => (
  <BrandIcon id={id} size={20} color={MONOCHROME.has(id) ? 'currentColor' : undefined} />
);
const image = (src: string, alt: string) => <img src={src} alt={alt} />;

const svc = (service: unknown) => service as OAuthMCPService;

export const OAUTH_MCP_PROVIDERS: Record<OAuthMCPProviderId, OAuthMCPProvider> = {
  github: {
    id: 'github',
    name: 'GitHub',
    namespace: 'agents',
    icon: brand('github'),
    service: svc(GitHubService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'GitHub',
      connectDescription: 'Permita que o agente acesse repositórios, issues e pull requests do GitHub',
      connectedDescription:
        'O agente agora pode acessar repositórios, issues, pull requests e outras informações do GitHub.',
    },
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    namespace: 'aiAgents',
    icon: brand('notion'),
    service: svc(NotionService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Notion',
      connectDescription: 'Permita que o agente acesse páginas, bancos de dados e conteúdo do Notion',
      connectedDescription:
        'O agente agora pode acessar páginas, bancos de dados e outras informações do Notion.',
    },
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    namespace: 'aiAgents',
    icon: brand('stripe'),
    service: svc(StripeService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Stripe',
      connectDescription:
        'Permita que o agente acesse pagamentos, assinaturas e informações de clientes do Stripe',
      connectedDescription:
        'O agente agora pode acessar pagamentos, assinaturas e outras informações do Stripe.',
    },
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    namespace: 'aiAgents',
    icon: brand('linear'),
    service: svc(LinearService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Linear',
      connectDescription:
        'Conecte sua conta Linear para permitir que o agente acesse issues, projetos e roadmaps',
      connectedDescription: 'O agente agora pode acessar issues, projetos e roadmaps do Linear.',
    },
  },
  monday: {
    id: 'monday',
    name: 'Monday',
    namespace: 'aiAgents',
    icon: image('/integrations/monday.png', 'Monday'),
    service: svc(MondayService),
    syncsMcpServers: false,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Monday.com',
      connectDescription:
        'Conecte sua conta Monday.com para permitir que o agente acesse boards, itens e automações',
      connectedDescription: 'O agente agora pode acessar boards, itens e outras informações do Monday.',
    },
  },
  atlassian: {
    id: 'atlassian',
    name: 'Atlassian',
    namespace: 'aiAgents',
    icon: brand('atlassian'),
    service: svc(AtlassianService),
    syncsMcpServers: false,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Atlassian',
      connectDescription:
        'Conecte sua conta Atlassian para permitir que o agente acesse Jira, Confluence e outras ferramentas',
      connectedDescription:
        'O agente agora pode acessar Jira, Confluence e outras ferramentas do Atlassian.',
    },
  },
  asana: {
    id: 'asana',
    name: 'Asana',
    namespace: 'aiAgents',
    icon: brand('asana'),
    service: svc(AsanaService),
    syncsMcpServers: false,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Asana.com',
      connectDescription:
        'Conecte sua conta Asana.com para permitir que o agente acesse boards, itens e automações',
      connectedDescription: 'O agente agora pode acessar boards, itens e outras informações do Asana.',
    },
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    namespace: 'aiAgents',
    icon: brand('hubspot'),
    service: svc(HubSpotService),
    syncsMcpServers: false,
    connectButtonIcon: false,
    fallbacks: {
      title: 'HubSpot',
      connectDescription:
        'Permita que o agente acesse contatos, empresas e outras informações do HubSpot',
      connectedDescription:
        'O agente agora pode acessar contatos, empresas e outras informações do HubSpot.',
    },
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    namespace: 'aiAgents',
    icon: brand('paypal'),
    service: svc(PayPalService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'PayPal',
      connectDescription:
        'Permita que o agente acesse informações de pagamentos, assinaturas e transações do PayPal',
      connectedDescription:
        'O agente agora pode acessar informações de pagamentos, assinaturas e transações do PayPal.',
    },
  },
  canva: {
    id: 'canva',
    name: 'Canva',
    namespace: 'aiAgents',
    icon: image('/integrations/canva.png', 'Canva'),
    service: svc(CanvaService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Canva',
      connectDescription:
        'Permita que o agente acesse informações de pagamentos, assinaturas e transações do Canva',
      connectedDescription:
        'O agente agora pode acessar informações de pagamentos, assinaturas e transações do Canva.',
    },
  },
  supabase: {
    id: 'supabase',
    name: 'Supabase',
    namespace: 'aiAgents',
    icon: brand('supabase'),
    service: svc(SupabaseService),
    syncsMcpServers: true,
    connectButtonIcon: true,
    fallbacks: {
      title: 'Supabase',
      connectDescription:
        'Permita que o agente acesse e gerencie seus projetos e bancos de dados Supabase',
      connectedDescription:
        'O agente agora pode acessar e gerenciar seus projetos e bancos de dados Supabase.',
    },
  },
};

/** Render order of the dialogs (matches the former IntegrationDialogs order). */
export const OAUTH_MCP_PROVIDER_IDS = Object.keys(OAUTH_MCP_PROVIDERS) as OAuthMCPProviderId[];

export const isOAuthMCPProvider = (id: string): id is OAuthMCPProviderId =>
  id in OAUTH_MCP_PROVIDERS;
