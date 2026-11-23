import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger } from '@/components/ui/select';
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  Plus,
  MoveRight,
  Layers,
  Grid3X3,
  type LucideIcon
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { useDnD } from '@/contexts/DnDContext';

// Tipos para configuração de nodes
export interface NodeType {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category?: string;
  // English synonyms / aliases checked in addition to the locale-resolved
  // name + description by the palette search. Lets users find a node by
  // technical or alternative terms (e.g. "tag" for add-label).
  searchKeywords?: string[];
}

export interface NodeCategory {
  value: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface BaseNodePanelProps {
  // Configuração dos nodes
  nodeTypes: Record<string, NodeType[]>;
  categories: NodeCategory[];

  // Callbacks
  onClose?: () => void;
  onNodeAdd?: (nodeId: string) => void;

  // Configurações visuais
  title?: string;
  subtitle?: string;
  width?: string;
  maxHeight?: string;

  // Configurações de funcionalidade
  enableSearch?: boolean;
  enableCategories?: boolean;
  showAllCategory?: boolean;
  defaultCategory?: string;

  // Classes CSS customizadas
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  nodeClassName?: string;
}

export function BaseNodePanel({
  nodeTypes,
  categories,
  onClose,
  onNodeAdd,
  title,
  subtitle,
  width = 'w-[420px]',
  maxHeight = 'max-h-[60vh]',
  enableSearch = true,
  enableCategories = true,
  showAllCategory = true,
  defaultCategory = 'todos',
  className,
  headerClassName,
  contentClassName,
  nodeClassName,
}: BaseNodePanelProps) {
  const { t } = useLanguage('common');
  const { setType } = useDnD();
  const finalTitle = title || t('base.flow.panel.title');
  const finalSubtitle = subtitle || t('base.flow.panel.subtitle');

  // Estados
  const [activeTab, setActiveTab] = useState(defaultCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Preparar categorias com "Todos" se habilitado
  const allCategories = showAllCategory
    ? [
      { value: 'todos', label: t('base.flow.panel.allComponents'), icon: Grid3X3, description: t('base.flow.panel.allDescription') },
      ...categories
    ]
    : categories;

  // Funções utilitárias
  const getAllNodes = () => {
    return Object.values(nodeTypes).flat();
  };

  const getFilteredNodes = (nodes: NodeType[]) => {
    if (!searchQuery) return nodes;

    if (!Array.isArray(nodes)) return [];

    const q = searchQuery.toLowerCase();
    return nodes.filter(node =>
      node.name.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      (node.searchKeywords ?? []).some(kw => kw.toLowerCase().includes(q))
    );
  };

  // Handlers
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeAdd = (nodeId: string) => {
    if (onNodeAdd) {
      onNodeAdd(nodeId);
    }
  };

  // Determinar nodes a mostrar
  const getNodesToShow = () => {
    let nodesToShow: NodeType[];

    if (searchQuery) {
      nodesToShow = getFilteredNodes(getAllNodes());
    } else {
      if (activeTab === 'todos') {
        nodesToShow = getAllNodes();
      } else {
        nodesToShow = nodeTypes[activeTab as keyof typeof nodeTypes] || [];
      }
    }

    return nodesToShow;
  };

  const nodesToShow = getNodesToShow();

  // EVO-1268 AC#1: the 'All' view groups nodes under category headers
  // instead of showing a flat list, so the user can scan the palette
  // by purpose. The grouped layout activates only when 'All' is active
  // AND there is no active search query (search keeps a flat list
  // because the matches span categories).
  const useGroupedLayout = activeTab === 'todos' && !searchQuery && enableCategories;
  const groupsToRender = useGroupedLayout
    ? categories
        .map(cat => ({ category: cat, nodes: nodeTypes[cat.value] ?? [] }))
        .filter(group => group.nodes.length > 0)
    : null;

  const renderNodeCard = (node: NodeType) => (
    <TooltipProvider key={node.id} delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              draggable
              onDragStart={event => onDragStart(event, node.id)}
              className={cn(
                'group flex cursor-grab items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-200',
                'hover:bg-accent hover:shadow-md',
                nodeClassName,
              )}
            />
          }
        >
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg border transition-all duration-200',
              'bg-muted/48 group-hover:scale-105',
            )}
          >
            <node.icon className={cn('size-5', node.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-medium text-foreground text-sm">{node.name}</span>
            <span className="block truncate text-muted-foreground text-xs">{node.description}</span>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleNodeAdd(node.id)}
            aria-label={t('base.flow.panel.addNode', { name: node.name })}
            className="text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipPopup side="right">
          <div className="max-w-[200px] p-2">
            <p className="font-medium text-sm">{node.name}</p>
            <p className="mt-1 text-muted-foreground text-xs">{node.description}</p>
            <div className="mt-2 flex items-center border-t pt-2 text-muted-foreground text-xs">
              <MoveRight className="me-1.5 size-3" />
              <span>{t('base.flow.panel.dragToAdd')}</span>
            </div>
          </div>
        </TooltipPopup>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={cn(
      'overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg transition-all duration-300 ease-in-out',
      width,
      className
    )}>
      {/* Header */}
      <div className={cn(
        'border-b px-4 pt-4 pb-3',
        headerClassName
      )}>
        <div className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{finalTitle}</h3>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={t('base.flow.panel.close')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X />
            </Button>
          )}
        </div>
        <p className="mt-1 text-muted-foreground text-sm">{finalSubtitle}</p>
      </div>

      {/* Controles de busca e categoria */}
      <div className="space-y-3 border-b px-4 pt-3 pb-3">
        {/* Busca */}
        {enableSearch && (
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder={t('base.flow.panel.search')}
              aria-label={t('base.flow.panel.search')}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        )}

        {/* Seletor de categoria */}
        {enableCategories && !searchQuery && (
          <Select
            items={allCategories.map(category => ({ value: category.value, label: category.label }))}
            value={activeTab || null}
            onValueChange={value => setActiveTab(value == null ? '' : String(value))}
          >
            <SelectTrigger className="h-auto min-h-14 w-full px-3 py-2.5">
              <div className="flex items-center gap-3 w-full">
                {(() => {
                  const currentCategory = allCategories.find(cat => cat.value === activeTab);
                  const IconComponent = currentCategory?.icon || Grid3X3;
                  return (
                    <>
                      <IconComponent className="h-5 w-5 shrink-0" />
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="text-sm font-medium leading-tight">{currentCategory?.label}</span>
                        <span className="truncate text-muted-foreground text-xs leading-tight">{currentCategory?.description}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {allCategories.map(category => {
                const IconComponent = category.icon;
                return (
                  <SelectItem key={category.value} value={category.value} className="py-2.5">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium leading-tight">{category.label}</span>
                        <span className="text-muted-foreground text-xs leading-tight">{category.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectPopup>
          </Select>
        )}

        {/* Indicador de busca */}
        {searchQuery && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Grid3X3 className="h-4 w-4" />
            <span>{t('base.flow.panel.searchAll')}</span>
          </div>
        )}
      </div>

      {/* Lista de nodes */}
      <div className={cn(
        'px-4 pt-4 pb-4 space-y-3 overflow-y-auto',
        maxHeight,
        contentClassName,
      )}>
        {nodesToShow.length === 0 && searchQuery ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              {t('base.flow.panel.noResults', { query: searchQuery })}
            </p>
          </div>
        ) : groupsToRender ? (
          groupsToRender.map(({ category, nodes }) => {
            const Icon = category.icon;
            return (
              <section key={category.value} className="space-y-2" aria-labelledby={`palette-group-${category.value}`}>
                <div className="flex items-center gap-2 pt-3 pb-1">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <h4
                    id={`palette-group-${category.value}`}
                    className="font-semibold text-muted-foreground text-xs uppercase tracking-wider"
                  >
                    {category.label}
                  </h4>
                  <span className="ms-auto text-muted-foreground/72 text-xs">{nodes.length}</span>
                </div>
                <div className="space-y-2">
                  {nodes.map(node => renderNodeCard(node))}
                </div>
              </section>
            );
          })
        ) : (
          nodesToShow.map(node => renderNodeCard(node))
        )}
      </div>
    </div>
  );
}
