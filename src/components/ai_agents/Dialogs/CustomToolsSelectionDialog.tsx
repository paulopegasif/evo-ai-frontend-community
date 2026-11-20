import { useState, useEffect, useRef } from 'react';
import { HttpMethodBadge } from '@/components/agents/resourceCard';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Code, Tag, Plus, ExternalLink } from 'lucide-react';
import { listCustomTools, createCustomTool } from '@/services/agents/customToolsService';
import { CustomTool, CustomToolFormData } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';
import CustomToolForm from '@/components/customTools/CustomToolForm';
import { toast } from 'sonner';

interface CustomToolsSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (selectedTools: CustomTool[]) => void;
  initialSelectedTools?: CustomTool[];
}

const CustomToolsSelectionDialog = ({
  open,
  onOpenChange,
  onSave,
  initialSelectedTools = [],
}: CustomToolsSelectionDialogProps) => {
  const { t } = useLanguage('aiAgents');
  const { t: tTools } = useLanguage('customTools');
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<CustomTool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreatingTool, setIsCreatingTool] = useState(false);

  const hasLoadedRef = useRef(false);
  const initialSelectionSetRef = useRef(false);

  // Initialize selected tools when dialog opens
  useEffect(() => {
    if (open && !initialSelectionSetRef.current) {
      setSelectedTools([...initialSelectedTools]);
      initialSelectionSetRef.current = true;
    }
  }, [open, initialSelectedTools]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      setCustomTools([]);
      setSelectedTools([]);
      setSearchTerm('');
      setLoading(false);
      setShowCreateDialog(false);
      hasLoadedRef.current = false;
      initialSelectionSetRef.current = false;
    }
  }, [open]);

  // Load all tools when dialog opens
  useEffect(() => {
    if (!open || hasLoadedRef.current) {
      return;
    }

    const loadTools = async () => {
      try {
        setLoading(true);
        hasLoadedRef.current = true;

        const tools = await listCustomTools({ skip: 0, limit: 100 });
        setCustomTools(tools);
      } catch (error) {
        console.error('Error loading custom tools:', error);
        setCustomTools([]);
        hasLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadTools();
  }, [open]);

  const reloadTools = async () => {
    try {
      const tools = await listCustomTools({ skip: 0, limit: 100 });
      setCustomTools(tools);
    } catch (error) {
      console.error('Error reloading custom tools:', error);
    }
  };

  const handleCreateTool = async (data: CustomToolFormData) => {
    setIsCreatingTool(true);
    try {
      const newTool = await createCustomTool(data);
      await reloadTools();
      setSelectedTools(prev => [...prev, newTool]);
      setShowCreateDialog(false);
      toast.success(tTools('messages.createSuccess'));
    } catch (error) {
      console.error('Error creating custom tool:', error);
      toast.error(tTools('messages.createError'));
    } finally {
      setIsCreatingTool(false);
    }
  };

  const toggleTool = (tool: CustomTool) => {
    const isSelected = selectedTools.some(t => t.id === tool.id);
    if (isSelected) {
      setSelectedTools(selectedTools.filter(t => t.id !== tool.id));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleSave = () => {
    onSave(selectedTools);
    onOpenChange(false);
  };


  const filteredTools = customTools.filter(tool => {
    if (!searchTerm) return true;
    return (
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(tool.tags) &&
        tool.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              {t('dialogs.customTools.title')}
            </DialogTitle>
            <DialogDescription>{t('tools.customTools.subtitle')}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search + Create */}
              <div className="p-4 border-b flex gap-2 items-center">
                <InputGroup>
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder={t('dialogs.customTools.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateDialog(true)}
                  className="gap-2 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  {t('tools.customTools.create')}
                </Button>
              </div>

              {/* Tools List */}
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/32"></div>
                  </div>
                ) : filteredTools.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTools.map(tool => {
                      const isSelected = selectedTools.some(t => t.id === tool.id);
                      return (
                        <div
                          key={tool.id}
                          className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-border hover:border-primary/30'
                          }`}
                          onClick={() => toggleTool(tool)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTool(tool)}
                              className="mt-1 data-checked:bg-primary data-checked:border-primary/32"
                              onClick={e => e.stopPropagation()}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Code className="h-4 w-4 text-primary flex-shrink-0" />
                                <h3 className="font-medium truncate">{tool.name}</h3>
                                <HttpMethodBadge method={tool.method} />
                              </div>

                              {tool.description && (
                                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                  {tool.description}
                                </p>
                              )}

                              <div className="flex items-center gap-1 mb-2">
                                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground font-mono truncate">
                                  {tool.endpoint}
                                </span>
                              </div>

                              {Array.isArray(tool.tags) && tool.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tool.tags.slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {tool.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{tool.tags.length - 3} {t('dialogs.customTools.more')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Code className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? t('messages.noResults') : t('tools.customTools.noTools')}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1 mb-3">
                      {!searchTerm && t('dialogs.customTools.createFirst')}
                    </p>
                    {!searchTerm && (
                      <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t('tools.customTools.create')}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Count */}
              {selectedTools.length > 0 && (
                <div className="border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    {t('dialogs.customTools.toolsSelected', { count: selectedTools.length })}
                  </p>
                </div>
              )}
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={selectedTools.length === 0}>
              {selectedTools.length === 0
                ? t('dialogs.customTools.selectTools')
                : t('dialogs.customTools.addSelected', { count: selectedTools.length })}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {/* Inline create tool sub-dialog — preserves wizard state */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogPopup className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {t('tools.customTools.create')}
            </DialogTitle>
          </DialogHeader>
          <DialogPanel>
            <CustomToolForm
              mode="create"
              loading={isCreatingTool}
              onSubmit={handleCreateTool}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </>
  );
};

export default CustomToolsSelectionDialog;
