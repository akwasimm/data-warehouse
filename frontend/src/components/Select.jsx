import { useEffect, useId, useRef, useState } from 'react';

/* A native <select> cannot be styled: the browser draws the open list itself, so
   every dropdown ends up looking like a different OS. This is the select-only
   combobox pattern from the ARIA practices — button trigger, listbox popup,
   DOM focus never leaves the button, arrows/Home/End move the active option.
   Options may be plain strings or { value, label }. */
export default function Select({ id, label, value, options, onChange, disabled }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const selected = opts[idx];

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(idx);
  const root = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const labelId = `${id}-lbl-${uid}`;
  const listId = `${id}-list-${uid}`;
  const optId = (i) => `${listId}-o${i}`;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (v) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    const last = opts.length - 1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        setOpen(true);
        setActive(idx);
      } else {
        setActive((a) => Math.min(last, Math.max(0, a + step)));
      }
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setActive(last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) commit(opts[active].value);
      else setOpen(true);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    // display:contents so the label and trigger stay direct flex children of
    // .controls and the existing row layout is untouched
    <div className="sel" ref={root}>
      <span className="controls__label" id={labelId}>
        {label}
      </span>

      <button
        type="button"
        id={id}
        className={`select${open ? ' is-open' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelId}
        aria-activedescendant={open && opts.length ? optId(active) : undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          // open reads the current state directly, so the highlighted row can be
          // seeded here instead of mirrored into state by an effect
          if (open) setOpen(false);
          else {
            setActive(idx);
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
      >
        <span className="select__value">{selected ? selected.label : '—'}</span>
        <svg className="select__caret" viewBox="0 0 12 8" aria-hidden="true">
          <path d="m1 1 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <ul className="select__menu" id={listId} role="listbox" aria-labelledby={labelId}>
          {opts.map((o, i) => (
            <li
              key={o.value}
              id={optId(i)}
              role="option"
              aria-selected={o.value === value}
              className={`select__opt${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              // keep focus on the trigger so the list does not vanish on mousedown
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg className="select__tick" viewBox="0 0 12 10" aria-hidden="true">
                  <path d="M1 5.5 4.5 9 11 1" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
