import React from 'react';
import { Badge } from '@/components/ui/compat';
import { Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface WebSocketStatusProps {
  isConnected: boolean;
  className?: string;
  showText?: boolean;
}

/**
 * WebSocketStatus Component
 * Mostra o status da conexão WebSocket
 */
const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  isConnected,
  className = '',
  showText = true,
}) => {
  const { t } = useLanguage('chat');

  const getStatusConfig = () => {
    if (isConnected) {
      return {
        variant: 'default' as const,
        icon: <Wifi className="h-3 w-3" />,
        text: t('webSocketStatus.connected'),
        bgColor: 'bg-success/10',
        textColor: 'text-success-foreground',
        borderColor: 'border-success/20',
      };
    } else {
      return {
        variant: 'destructive' as const,
        icon: <WifiOff className="h-3 w-3" />,
        text: t('webSocketStatus.reconnecting'),
        bgColor: 'bg-warning/10',
        textColor: 'text-warning-foreground',
        borderColor: 'border-warning/20',
      };
    }
  };

  const config = getStatusConfig();

  if (showText) {
    return (
      <Badge
        variant="outline"
        className={`${config.bgColor} ${config.textColor} ${config.borderColor} gap-1.5 ${className}`}
      >
        {config.icon}
        {config.text}
      </Badge>
    );
  }

  // Versão apenas com ícone
  return (
    <div
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.bgColor} ${config.textColor} ${className}`}
      title={config.text}
    >
      {config.icon}
    </div>
  );
};

export default WebSocketStatus;
