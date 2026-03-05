import { useState, useCallback, useMemo } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean;
  defaultWidth?: number;
  minWidth?: number;
}

export interface ColumnSettings {
  visible: boolean;
  width: number;
}

function loadSettings(storageKey: string, columns: ColumnDef[]): Record<string, ColumnSettings> {
  try {
    const raw = localStorage.getItem(`col-settings-${storageKey}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults: Record<string, ColumnSettings> = {};
  columns.forEach(c => {
    defaults[c.key] = { visible: c.defaultVisible !== false, width: c.defaultWidth || 0 };
  });
  return defaults;
}

function saveSettings(storageKey: string, settings: Record<string, ColumnSettings>) {
  localStorage.setItem(`col-settings-${storageKey}`, JSON.stringify(settings));
}

export function useColumnSettings(storageKey: string, columns: ColumnDef[]) {
  const [settings, setSettings] = useState<Record<string, ColumnSettings>>(() => loadSettings(storageKey, columns));

  const update = useCallback((next: Record<string, ColumnSettings>) => {
    setSettings(next);
    saveSettings(storageKey, next);
  }, [storageKey]);

  const toggleColumn = useCallback((key: string) => {
    const next = { ...settings, [key]: { ...settings[key], visible: !settings[key]?.visible } };
    update(next);
  }, [settings, update]);

  const setColumnWidth = useCallback((key: string, width: number) => {
    const next = { ...settings, [key]: { ...settings[key], width } };
    update(next);
  }, [settings, update]);

  const resetAll = useCallback(() => {
    const defaults: Record<string, ColumnSettings> = {};
    columns.forEach(c => {
      defaults[c.key] = { visible: c.defaultVisible !== false, width: c.defaultWidth || 0 };
    });
    update(defaults);
  }, [columns, update]);

  const isVisible = useCallback((key: string) => {
    return settings[key]?.visible !== false;
  }, [settings]);

  const getWidth = useCallback((key: string) => {
    const w = settings[key]?.width;
    return w ? `${w}px` : undefined;
  }, [settings]);

  const visibleColumns = useMemo(() => columns.filter(c => isVisible(c.key)), [columns, isVisible]);

  return { settings, toggleColumn, setColumnWidth, resetAll, isVisible, getWidth, visibleColumns, columns };
}
