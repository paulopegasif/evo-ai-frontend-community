import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { BookOpen, Code, Download, FileText, Info, Lightbulb, Search, Video } from 'lucide-react';

const NAV_SECTIONS: { key: string; icon: LucideIcon; items: string[] }[] = [
  { key: 'quickStart', icon: BookOpen, items: ['introduction', 'firstSteps', 'initialSetup', 'basicTutorial'] },
  {
    key: 'guides',
    icon: FileText,
    items: ['managingAgents', 'knowledgeBase', 'chatSettings', 'apiIntegration', 'backupRestore'],
  },
  {
    key: 'apiReference',
    icon: Code,
    items: ['authentication', 'agentEndpoints', 'chatApi', 'webhooks', 'errorCodes'],
  },
  { key: 'videoTutorials', icon: Video, items: ['initialSetup', 'firstAgent', 'advancedChat', 'bestPractices'] },
];

const Documentacao = () => {
  const { t } = useLanguage('documentation');

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between md:p-6">
        <div>
          <h1 className="font-semibold text-xl md:text-2xl">{t('header.title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t('header.subtitle')}</p>
        </div>
        <Button variant="outline">
          <Download />
          {t('header.downloadPdf')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col border-b md:w-72 md:border-r md:border-b-0">
          <div className="border-b p-4">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder={t('search.placeholder')}
                aria-label={t('search.placeholder')}
              />
            </InputGroup>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-5">
              {NAV_SECTIONS.map(({ key, icon: Icon, items }) => (
                <div key={key}>
                  <h3 className="mb-1.5 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {t(`sections.${key}.title`)}
                  </h3>
                  <ul className="flex flex-col gap-0.5">
                    {items.map(item => (
                      <li key={item}>
                        <Button variant="ghost" size="sm" className="w-full justify-start font-normal">
                          <Icon className="text-muted-foreground" />
                          {t(`sections.${key}.items.${item}`)}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div>
              <h2 className="font-semibold text-lg">{t('content.title')}</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {t('content.lastUpdated', { date: '15 de dezembro de 2024' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                {t('content.edit')}
              </Button>
              <Button variant="outline" size="sm">
                {t('content.share')}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-3xl text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:text-foreground [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:ps-5">
              <Alert variant="info" className="not-prose mb-8">
                <Info />
                <AlertTitle>{t('content.welcome.title')}</AlertTitle>
                <AlertDescription>{t('content.welcome.description')}</AlertDescription>
              </Alert>

              <h2>{t('content.whatIs.title')}</h2>
              <p>
                {t('content.whatIs.description')}
              </p>

              <h2>{t('content.mainFeatures.title')}</h2>
              <ul>
                <li>
                  <strong>{t('content.mainFeatures.customAgents.title')}</strong> {t('content.mainFeatures.customAgents.description')}
                </li>
                <li>
                  <strong>{t('content.mainFeatures.smartChat.title')}</strong> {t('content.mainFeatures.smartChat.description')}
                </li>
                <li>
                  <strong>{t('content.mainFeatures.knowledgeBase.title')}</strong> {t('content.mainFeatures.knowledgeBase.description')}
                </li>
                <li>
                  <strong>{t('content.mainFeatures.advancedSettings.title')}</strong> {t('content.mainFeatures.advancedSettings.description')}
                </li>
              </ul>

              <h2>{t('content.gettingStarted.title')}</h2>
              <p>{t('content.gettingStarted.description')}</p>

              <ol>
                <li dangerouslySetInnerHTML={{ __html: t('content.gettingStarted.steps.step1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('content.gettingStarted.steps.step2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('content.gettingStarted.steps.step3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('content.gettingStarted.steps.step4') }} />
              </ol>

              <Alert variant="warning" className="not-prose mt-8">
                <Lightbulb />
                <AlertTitle>{t('content.tip.title')}</AlertTitle>
                <AlertDescription>{t('content.tip.description')}</AlertDescription>
              </Alert>

              <h2>{t('content.support.title')}</h2>
              <p>
                {t('content.support.description')}
              </p>
              <ul>
                <li>{t('content.support.email')}</li>
                <li>{t('content.support.chat')}</li>
                <li>{t('content.support.documentation')}</li>
              </ul>

              <div className="mt-8 border-t py-8 text-center">
                <p className="text-muted-foreground">
                  {t('content.demo.message')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentacao;
