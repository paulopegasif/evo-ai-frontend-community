import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/compat';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import AudioWaveform from './AudioWaveform';

// Ícones preenchidos customizados
const PlayFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const PauseFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

interface MessageAudioProps {
  attachments: Attachment[];
}

const MessageAudio: React.FC<MessageAudioProps> = ({ attachments }) => {
  const { t } = useLanguage('chat');
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  // Cache global de durações por attachment (persiste entre re-renders)
  const globalDurationsRef = useRef<Record<string, number>>({});

  const downloadFile = (attachment: Attachment) => {
    if (attachment.data_url) {
      const link = document.createElement('a');
      link.href = attachment.data_url;
      link.download = attachment.fallback_title || t('messages.messageAudio.audioFallback');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('messages.messageAudio.downloadStarted'), {
        description: attachment.fallback_title || t('messages.messageAudio.audioFallback'),
      });
    }
  };

  // const formatFileSize = (bytes: number) => {
  //   if (bytes === 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cache busting para áudios (como o Evolution)
  const timeStampAppendedURL = (dataUrl: string): string => {
    try {
      const url = new URL(dataUrl);
      if (!url.searchParams.has('t')) {
        url.searchParams.append('t', Date.now().toString());
      }
      return url.toString();
    } catch {
      return dataUrl;
    }
  };

  const loadDurationSimple = (url: string, attachmentId?: number | string) => {
    if (durations[url]) return;

    // Evitar reprocessamento do mesmo attachment ID
    if (attachmentId && globalDurationsRef.current[attachmentId]) {
      setDurations(prev => ({ ...prev, [url]: globalDurationsRef.current[attachmentId] }));
      return;
    }

    // PRIMEIRO: Para blobs locais, verificar se tem duração customizada
    if (url.startsWith('blob:')) {
      try {
        fetch(url)
          .then(response => response.blob())
          .then(blob => {
            const customDuration = (blob as any).__duration;
            if (customDuration && customDuration > 0) {
              setDurations(prev => ({ ...prev, [url]: customDuration }));

              if (attachmentId) {
                globalDurationsRef.current[attachmentId] = customDuration;
              }
              return;
            }

            // Fallback para método normal
            loadFromAudioElement();
          })
          .catch(() => {
            loadFromAudioElement();
          });
      } catch {
        loadFromAudioElement();
      }
    } else {
      // Para URLs do servidor, usar método normal diretamente
      loadFromAudioElement();
    }

    function loadFromAudioElement() {
      // CRIAR ELEMENTO TEMPORÁRIO SEPARADO - NÃO AFETA A REPRODUÇÃO
      const tempAudio = document.createElement('audio');
      const timestampedUrl = timeStampAppendedURL(url);

      const cleanup = () => {
        tempAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
        tempAudio.removeEventListener('error', onError);
        tempAudio.remove(); // Remove do DOM
      };

      const onLoadedMetadata = () => {
        const duration = tempAudio.duration;

        // SE DURAÇÃO É VÁLIDA, USAR DIRETO
        if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
          setDurations(prev => ({ ...prev, [url]: duration }));

          if (attachmentId) {
            globalDurationsRef.current[attachmentId] = duration;
          }

          cleanup();
          return;
        }

        // SE DURAÇÃO É INFINITY/NaN, APLICAR WORKAROUND
        if (duration === Infinity || isNaN(duration)) {
          // APLICAR FIX DO STACKOVERFLOW NO ELEMENTO TEMPORÁRIO
          tempAudio.currentTime = 1e101; // Força recálculo

          const onTimeUpdate = () => {
            const realDuration = tempAudio.duration;

            if (
              realDuration &&
              !isNaN(realDuration) &&
              isFinite(realDuration) &&
              realDuration > 0
            ) {
              setDurations(prev => ({ ...prev, [url]: realDuration }));

              if (attachmentId) {
                globalDurationsRef.current[attachmentId] = realDuration;
              }

              // Remove listener e limpa
              tempAudio.removeEventListener('timeupdate', onTimeUpdate);
              cleanup();
            }
          };

          // Adicionar listener para timeupdate
          tempAudio.addEventListener('timeupdate', onTimeUpdate);

          // Timeout de segurança (10 segundos)
          setTimeout(() => {
            tempAudio.removeEventListener('timeupdate', onTimeUpdate);
            cleanup();
          }, 10000);
        } else {
          cleanup();
        }
      };

      const onError = () => {
        cleanup();
      };

      // Configurar elemento temporário
      tempAudio.addEventListener('loadedmetadata', onLoadedMetadata);
      tempAudio.addEventListener('error', onError);
      tempAudio.preload = 'metadata';
      tempAudio.volume = 0; // Silencioso
      tempAudio.style.display = 'none'; // Invisível
      tempAudio.src = timestampedUrl;

      // Adicionar ao DOM temporariamente
      document.body.appendChild(tempAudio);
    }
  };

  // const loadDurationFromPlaybackElement = (url: string, attachmentId?: number | string) => {
  //   if (durations[url]) return;

  //   // PRIMEIRO: Para blobs locais, verificar se tem duração customizada
  //   if (url.startsWith('blob:')) {
  //     try {
  //       fetch(url)
  //         .then(response => response.blob())
  //         .then(blob => {
  //           const customDuration = (blob as any).__duration;
  //           if (customDuration && customDuration > 0) {
  //             setDurations(prev => ({ ...prev, [url]: customDuration }));

  //             if (attachmentId) {
  //               globalDurationsRef.current[attachmentId] = customDuration;
  //             }
  //             return;
  //           }

  //           // Fallback para elemento de reprodução
  //           usePlaybackElementForDuration();
  //         })
  //         .catch(() => {
  //           usePlaybackElementForDuration();
  //         });
  //     } catch {
  //       usePlaybackElementForDuration();
  //     }
  //   } else {
  //     // Para URLs do servidor, usar elemento de reprodução diretamente
  //     usePlaybackElementForDuration();
  //   }

  //   function usePlaybackElementForDuration() {

  //     // CRIAR ELEMENTO SEPARADO PARA NÃO INTERFERIR NA REPRODUÇÃO
  //     const tempAudio = document.createElement('audio');

  //     const timestampedUrl = timeStampAppendedURL(url);

  //     const onLoadedMetadata = () => {
  //       const duration = tempAudio.duration;

  //       // SE DURAÇÃO É VÁLIDA, USAR DIRETO
  //       if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
  //         setDurations(prev => ({ ...prev, [url]: duration }));

  //         if (attachmentId) {
  //           globalDurationsRef.current[attachmentId] = duration;
  //         }

  //         cleanup();
  //         return;
  //       }

  //       // SE DURAÇÃO É INFINITY/NaN, APLICAR FIX DO STACKOVERFLOW
  //       if (duration === Infinity || isNaN(duration)) {

  //         // FORÇAR CURRENTTIME PARA VALOR ALTO PARA "QUEBRAR" O INFINITY
  //         tempAudio.currentTime = 1e101; // Número gigante como no StackOverflow

  //         const onTimeUpdate = () => {
  //           const realDuration = tempAudio.duration;

  //           if (
  //             realDuration &&
  //             !isNaN(realDuration) &&
  //             isFinite(realDuration) &&
  //             realDuration > 0
  //           ) {

  //             // NÃO PRECISA RESETAR PORQUE É ELEMENTO TEMPORÁRIO

  //             setDurations(prev => ({ ...prev, [url]: realDuration }));

  //             if (attachmentId) {
  //               globalDurationsRef.current[attachmentId] = realDuration;
  //             }

  //             // Remover listener específico do timeupdate
  //             tempAudio.removeEventListener('timeupdate', onTimeUpdate);
  //             cleanup();
  //           }
  //         };

  //         // Adicionar listener para timeupdate
  //         tempAudio.addEventListener('timeupdate', onTimeUpdate);

  //         // Timeout de segurança para evitar loop infinito
  //         setTimeout(() => {
  //           tempAudio.removeEventListener('timeupdate', onTimeUpdate);
  //           cleanup();
  //         }, 5000);
  //       } else {
  //         cleanup();
  //       }
  //     };

  //     const onError = (error: any) => {
  //       cleanup();
  //     };

  //     const cleanup = () => {
  //       tempAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
  //       tempAudio.removeEventListener('error', onError);
  //       tempAudio.remove(); // Remover elemento temporário
  //     };

  //     // Configurar elemento temporário
  //     tempAudio.addEventListener('loadedmetadata', onLoadedMetadata);
  //     tempAudio.addEventListener('error', onError);
  //     tempAudio.preload = 'metadata';
  //     tempAudio.volume = 0; // Silencioso
  //     tempAudio.style.display = 'none';
  //     tempAudio.src = timestampedUrl;

  //     // Adicionar ao DOM temporariamente
  //     document.body.appendChild(tempAudio);

  //   }
  // };

  const currentPlayingRef = useRef<string | null>(null);
  currentPlayingRef.current = currentPlaying;

  // Progresso suave enquanto toca (timeupdate só dispara ~4x/s).
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const step = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  // Clique/arraste na onda: pula para a posição (e começa a tocar se era outro áudio).
  const seekTo = (attachment: Attachment, fraction: number) => {
    const url = attachment.data_url;
    const audio = audioRef.current;
    if (!url || !audio) return;
    const total =
      durations[url] ||
      (currentPlayingRef.current === url && Number.isFinite(audio.duration) ? audio.duration : 0);
    if (!total) {
      if (currentPlayingRef.current !== url) togglePlayback(attachment);
      return;
    }
    const target = Math.max(0, Math.min(total - 0.05, fraction * total));

    if (currentPlayingRef.current === url) {
      audio.currentTime = target;
      setCurrentTime(target);
      return;
    }

    audio.src = url;
    currentPlayingRef.current = url;
    setCurrentPlaying(url);
    setCurrentTime(target);
    audio.addEventListener(
      'loadedmetadata',
      () => {
        audio.currentTime = target;
      },
      { once: true },
    );
    audio.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  };

  const togglePlayback = (attachment: Attachment) => {
    if (!attachment.data_url) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (currentPlaying === attachment.data_url && isPlaying) {
      // Pausar
      audio.pause();
      setIsPlaying(false);
    } else {
      // Reproduzir
      if (currentPlaying !== attachment.data_url) {
        audio.src = attachment.data_url;
        setCurrentPlaying(attachment.data_url);
      }

      audio.play().catch(error => {
        console.error('Erro ao reproduzir áudio:', error);
        toast.error(t('messages.messageAudio.playbackError'), {
          description: t('messages.messageAudio.playbackErrorDescription'),
        });
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      // Verificar se a duração é válida
      if (duration && !isNaN(duration) && isFinite(duration)) {
        setDuration(duration);
        // Armazenar duração para o áudio atual
        if (audio.src) {
          setDurations(prev => ({ ...prev, [audio.src]: duration }));
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentPlaying(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Carregar durações usando o próprio elemento de reprodução
  useEffect(() => {
    // AGUARDAR UM POUCO PARA O DOM ESTAR PRONTO
    setTimeout(() => {
      attachments.forEach((attachment, _index) => {
        if (attachment.data_url) {
          // PRIMEIRO: Verificar cache global por ID do attachment
          if (attachment.id) {
            const cachedDuration = globalDurationsRef.current[attachment.id];
            if (cachedDuration) {
              setDurations(prev => ({ ...prev, [attachment.data_url!]: cachedDuration }));
              return;
            }
          }

          loadDurationSimple(attachment.data_url, attachment.id);
        }
      });
    }, 100); // 100ms de delay para garantir que o DOM está pronto
  }, [attachments]);

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      <div className="space-y-2">
        {attachments
          .filter(attachment => {
            // 🔒 FILTRAR: Apenas attachments com data_url válido e não vazio
            return attachment && attachment.data_url && attachment.data_url.trim() !== '';
          })
          .map((attachment, index) => {
            const isCurrentlyPlaying = currentPlaying === attachment.data_url && isPlaying;
            const totalDuration = durations[attachment.data_url!] || duration;
            const progressValue =
              currentPlaying === attachment.data_url && totalDuration > 0
                ? (currentTime / totalDuration) * 100
                : 0;

            const transcribedText =
              attachment.transcribed_text || attachment.meta?.transcribed_text;

            return (
              <div key={attachment.id || index} className="space-y-2">
                {/* Audio Player */}
                <div
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-current/[0.06] hover:bg-current/10 transition-colors"
                  style={{
                    minWidth: '200px',
                    maxWidth: 'min(280px, calc(100vw - 100px))',
                  }}
                >
                  {/* Botão Play/Pause estilo WhatsApp */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePlayback(attachment)}
                    aria-label={isCurrentlyPlaying ? t('messages.messageAudio.pause') : t('messages.messageAudio.play')}
                    className="h-9 w-9 rounded-full bg-current/15 hover:bg-current/25 text-current hover:text-current flex-shrink-0 border-0"
                  >
                    {isCurrentlyPlaying ? (
                      <PauseFilled className="h-4 w-4" />
                    ) : (
                      <PlayFilled className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>

                  {/* Waveform visual e tempo */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Onda real do áudio (WhatsApp-style): preenche com o progresso, clique/arraste para pular */}
                    <AudioWaveform
                      url={attachment.data_url!}
                      progress={progressValue / 100}
                      onSeek={fraction => seekTo(attachment, fraction)}
                      ariaLabel={t('messages.messageAudio.seek', 'Posição do áudio')}
                      valueText={`${formatDuration(currentPlaying === attachment.data_url ? currentTime : 0)} / ${formatDuration(durations[attachment.data_url!] || 0)}`}
                    />

                    {/* Tempo */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-current/70 font-mono tabular-nums">
                        {currentPlaying === attachment.data_url
                          ? formatDuration(currentTime)
                          : '0:00'}
                      </span>
                      <span className="text-current/70 font-mono tabular-nums">
                        {(() => {
                          const url = attachment.data_url;
                          const duration = url ? durations[url] : null;
                          return duration ? formatDuration(duration) : '0:00';
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Menu/Download */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadFile(attachment)}
                    aria-label={t('messages.messageAudio.download')}
                    className="h-7 w-7 rounded-full hover:bg-current/15 text-current/70 hover:text-current flex-shrink-0 p-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Transcription Text */}
                {transcribedText && (
                  <div className="px-2 py-2 rounded-lg bg-muted/48 border border-border">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      {t('messages.messageAudio.transcription')}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {transcribedText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
};

export default MessageAudio;
