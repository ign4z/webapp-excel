'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { searchStreets, type StreetOption } from '@/lib/street-search';
import { tokens } from './shared';

/** Sotto questa larghezza il campo via si apre a tutta pagina */
const FULLSCREEN_QUERY = '(max-width: 640px)';

interface StreetComboboxProps {
  streets: StreetOption[];
  /** Testo nel campo */
  value: string;
  city: string;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  onTextChange: (text: string) => void;
  onSelect: (street: StreetOption) => void;
}

/**
 * Campo via con suggerimenti presi dalle vie del comune (niente Google): tastiera (↑ ↓ Invio Esc) e mouse/touch.
 * Il nome selezionato coincide sempre con la chiave della lista prezzi.
 * Su mobile lo stesso input diventa un pannello a tutta pagina (resta lo stesso elemento: focus e tastiera non si perdono).
 */
export function StreetCombobox({ streets, value, city, disabled, placeholder, invalid, onTextChange, onSelect }: StreetComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isFullscreen = open && fullscreen;
  const suggestions = open ? searchStreets(streets, value, isFullscreen ? 50 : 8) : [];
  const activeIndex = Math.min(active, Math.max(suggestions.length - 1, 0));

  // A tutta pagina: blocca lo scroll della pagina e segue la viewport visibile (con tastiera aperta è più bassa di 100dvh)
  useEffect(() => {
    if (!isFullscreen) return;
    const root = rootRef.current;
    const vv = window.visualViewport;
    const fit = () => {
      if (!root || !vv) return;
      root.style.top = `${vv.offsetTop}px`;
      root.style.height = `${vv.height}px`;
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    return () => {
      document.body.style.overflow = prevOverflow;
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      root?.style.removeProperty('top');
      root?.style.removeProperty('height');
    };
  }, [isFullscreen]);

  // L'opzione evidenziata con ↑ ↓ resta visibile
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function openList() {
    setFullscreen(window.matchMedia(FULLSCREEN_QUERY).matches);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    inputRef.current?.blur();
  }

  function choose(street: StreetOption) {
    onSelect(street);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) openList();
      setActive(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' && open && suggestions[activeIndex]) {
      e.preventDefault(); // non inviare il form: seleziona la via evidenziata
      choose(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  return (
    <div ref={rootRef} className={`street-combo${isFullscreen ? ' street-combo-full' : ''}`}>
      <style>{`
        .street-combo { position: relative; }
        .street-bar { display: flex; align-items: center; gap: 0.5rem; }
        .street-bar .vl-input { flex: 1; min-width: 0; }
        .street-list {
          position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 4px);
          margin: 0; padding: 4px; list-style: none;
          background: ${tokens.paperDark}; border: 1px solid ${tokens.border}; border-radius: 8px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5); max-height: 18rem; overflow-y: auto;
        }
        .street-option {
          display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem;
          padding: 0.65rem 0.75rem; border-radius: 6px; cursor: pointer;
          font-family: 'Hanken Grotesk', system-ui, sans-serif; font-size: 1rem; color: ${tokens.ink};
        }
        .street-option[aria-selected="true"] { background: ${tokens.gold}26; }
        .street-option-city { font-size: 0.75rem; color: ${tokens.muted}; white-space: nowrap; }
        .street-empty { padding: 0.65rem 0.75rem; font-size: 0.9rem; color: ${tokens.inkSoft}; }
        .vl-input.street-invalid { border-color: ${tokens.error}; }

        /* ─── Mobile: pannello a tutta pagina ─── */
        .street-combo-full {
          position: fixed; z-index: 1000; left: 0; right: 0; top: 0; height: 100dvh;
          display: flex; flex-direction: column;
          background: ${tokens.paper};
        }
        .street-combo-full .street-bar {
          padding: 0.75rem 1rem; border-bottom: 1px solid ${tokens.border};
          padding-top: max(0.75rem, env(safe-area-inset-top));
        }
        .street-back {
          flex-shrink: 0; width: 2.75rem; height: 2.75rem;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid ${tokens.border}; border-radius: 6px;
          color: ${tokens.ink}; font-size: 1.2rem; cursor: pointer;
        }
        .street-combo-full .street-list {
          position: static; flex: 1; max-height: none;
          border: none; border-radius: 0; box-shadow: none; background: transparent;
          padding: 0.25rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom));
          overscroll-behavior: contain;
        }
        .street-combo-full .street-option {
          flex-direction: column; align-items: flex-start; gap: 0.15rem;
          min-height: 3.25rem; justify-content: center; padding: 0.6rem 0.75rem;
          border-bottom: 1px solid ${tokens.border}; border-radius: 0;
        }
        .street-combo-full .street-option[aria-selected="true"] { background: transparent; }
        .street-combo-full .street-option:active { background: ${tokens.gold}26; }
      `}</style>
      <div className="street-bar">
        {isFullscreen && (
          <button type="button" className="street-back" aria-label="Chiudi elenco vie" onClick={close}>
            ←
          </button>
        )}
        <input
          ref={inputRef}
          className={`vl-input${invalid ? ' street-invalid' : ''}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onTextChange(e.target.value);
            if (!open) openList();
            setActive(0);
          }}
          onFocus={openList}
          // A tutta pagina il blur (es. chiusura tastiera) non chiude: si esce con ←, Esc o scegliendo una via
          onBlur={() => { if (!fullscreen) setOpen(false); }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <ul ref={listRef} id={listId} role="listbox" className="street-list">
          {suggestions.map((s, i) => (
            <li
              key={s.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className="street-option"
              // mousedown annullato: l'input non perde il focus, quindi la lista resta aperta fino al click
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              onMouseEnter={() => setActive(i)}
            >
              <span>{s.label}</span>
              <span className="street-option-city">{city}</span>
            </li>
          ))}
          {suggestions.length === 0 && value.trim() && (
            <li className="street-empty">Nessuna via di {city} corrisponde a &quot;{value.trim()}&quot;</li>
          )}
        </ul>
      )}
    </div>
  );
}
