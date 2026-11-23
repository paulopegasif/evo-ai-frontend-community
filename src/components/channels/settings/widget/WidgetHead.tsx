import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WidgetConfig } from '../helpers/widgetHelpers';
import { getReplyTimeDisplayText } from '../helpers/widgetHelpers';

interface WidgetHeadProps {
  config: WidgetConfig & {
    isOnline?: boolean;
    isDefaultScreen?: boolean;
  };
}

export default function WidgetHead({ config }: WidgetHeadProps) {
  const isDefaultScreen = config.isDefaultScreen &&
    (config.welcomeHeading || config.welcomeTagline);

  return (
    <div
      className={`
        rounded-t-lg flex-shrink-0 transition-all duration-300
        ${isDefaultScreen
          ? 'bg-muted/48 px-4 py-5'
          : 'bg-card p-4'
        }
      `}
    >
      <div className="relative">
        <div className="flex items-center justify-start">
          {/* Avatar */}
          {config.avatarUrl && (
            <Avatar
              className={`mr-3 ${!isDefaultScreen ? 'w-8 h-8 mb-1' : 'w-12 h-12 mb-2'}`}
            >
              <AvatarImage src={config.avatarUrl} alt="Avatar" />
              <AvatarFallback className="bg-muted">
                {config.websiteName?.charAt(0) || 'W'}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Header Content */}
          {!isDefaultScreen && (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-foreground">
                  {config.websiteName}
                </span>
                {config.isOnline && (
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {getReplyTimeDisplayText(config.replyTime)}
              </span>
            </div>
          )}
        </div>

        {/* Welcome Section (Default Screen) */}
        {isDefaultScreen && (
          <div className="overflow-auto max-h-60 mt-2">
            {config.welcomeHeading && (
              <h2 className="mb-2 text-2xl font-bold break-words text-foreground">
                {config.welcomeHeading}
              </h2>
            )}
            {config.welcomeTagline && (
              <div
                className="text-sm break-words text-foreground"
                dangerouslySetInnerHTML={{ __html: config.welcomeTagline }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
