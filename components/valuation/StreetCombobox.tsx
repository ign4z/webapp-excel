'use client';

import { useId, useState } from 'react';
import { searchStreets, type StreetOption } from '@/lib/street-search';
import { tokens } from './shared';

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
 */
export function StreetCombobox({ streets, value, city, disabled, placeholder, invalid, onTextChange, onSelect }: StreetComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const suggestions = open ? searchStreets(streets, value) : [];
  const activeIndex = Math.min(active, Math.max(suggestions.length - 1, 0));

  function choose(street: StreetOption) {
    onSelect(street);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' && open && suggestions[activeIndex]) {
      e.preventDefault(); // non inviare il form: seleziona la via evidenziata
      choose(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="street-combo">
      <style>{`
        .street-combo { position: relative; }
        .street-list {
          position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 4px);
          margin: 0; padding: 4px; list-style: none;
          background: ${tokens.paperDark}; border: 1px solid ${tokens.border}; border-radius: 8px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5); max-height: 18rem; overflow-y: auto;
        }
        .street-option {
          display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem;
          padding: 0.65rem 0.75rem; border-radius: 6px; cursor: pointer;
          font-family: 'Hanken Grotesk', system-ui, sans-serif; font-size: 0.95rem; color: ${tokens.ink};
        }
        .street-option[aria-selected="true"] { background: ${tokens.gold}26; }
        .street-option-city { font-size: 0.75rem; color: ${tokens.muted}; white-space: nowrap; }
        .street-empty { padding: 0.65rem 0.75rem; font-size: 0.85rem; color: ${tokens.inkSoft}; }
        .vl-input.street-invalid { border-color: ${tokens.error}; }
      `}</style>
      <input
        className={`vl-input${invalid ? ' street-invalid' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={listId} role="listbox" className="street-list">
          {suggestions.map((s, i) => (
            <li
              key={s.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className="street-option"
              // mousedown (non click): scatta prima del blur dell'input, che chiuderebbe la lista
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
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
