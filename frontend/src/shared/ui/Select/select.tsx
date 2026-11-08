import {
  type ComponentProps,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { TextSize } from '../../model/typography';
import { Icon } from '../Icon';

import sizes from '../typography.module.scss';
import styles from './select.module.scss';

type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = Omit<
  ComponentProps<'button'>,
  'children' | 'onChange' | 'value' | 'defaultValue'
> & {
  size?: TextSize;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
};

export const Select = ({
  size = 'xs',
  className = '',
  options,
  value,
  onChange,
  id,
  name,
  disabled,
  onKeyDown,
  onBlur,
  onClick,
  ...props
}: SelectProps) => {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-options`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedIndex = options.findIndex((option) => option.value === value);

  function closeMenu() {
    menuRef.current?.hidePopover();
  }

  function openMenu(index = selectedIndex) {
    if (triggerRef.current?.matches(':disabled')) return;
    setActiveIndex(
      index >= 0 && !options[index]?.disabled
        ? index
        : options.findIndex((option) => !option.disabled),
    );
    menuRef.current?.showPopover();
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled || triggerRef.current?.matches(':disabled')) return;
    closeMenu();
    triggerRef.current?.focus();
    if (option.value !== value) onChange(option.value);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current!;
    const menu = menuRef.current!;

    function positionMenu() {
      const bounds = trigger.getBoundingClientRect();
      const gutter = 8;
      const gap = 6;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const below = viewportHeight - bounds.bottom - gutter - gap;
      const above = bounds.top - gutter - gap;
      const placeAbove = below < Math.min(menu.scrollHeight, 240) && above > below;
      const width = Math.min(Math.max(bounds.width, 160), viewportWidth - gutter * 2);
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${Math.max(0, Math.min(288, placeAbove ? above : below))}px`;
      menu.style.left = `${Math.max(gutter, Math.min(bounds.left, viewportWidth - width - gutter))}px`;
      menu.style.top = `${placeAbove ? bounds.top - menu.offsetHeight - gap : bounds.bottom + gap}px`;
    }

    positionMenu();
    const observer = new ResizeObserver(positionMenu);
    observer.observe(trigger);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, listId, open]);

  useEffect(() => {
    if (disabled) menuRef.current?.hidePopover();
  }, [disabled]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    } else if (event.key === 'Tab') {
      closeMenu();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) selectOption(activeIndex);
      else openMenu();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const enabledIndices = options.flatMap((option, index) => (option.disabled ? [] : [index]));
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      const current = enabledIndices.indexOf(activeIndex);
      const next =
        event.key === 'Home'
          ? enabledIndices[0]
          : event.key === 'End'
            ? enabledIndices[enabledIndices.length - 1]
            : enabledIndices[(current + direction + enabledIndices.length) % enabledIndices.length];
      if (open) setActiveIndex(next ?? -1);
      else openMenu(event.key === 'Home' || event.key === 'End' ? next : selectedIndex);
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - searchRef.current.time < 700 ? searchRef.current.text : '') + event.key;
      searchRef.current = { text, time: now };
      const query = [...text].every((character) => character === text[0]) ? text[0] : text;
      const start = open ? activeIndex : selectedIndex;
      const match = options.findIndex((_, offset) => {
        const option = options[(start + 1 + offset) % options.length];
        return (
          !option.disabled && option.label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase())
        );
      });
      if (match >= 0) {
        const index = (start + 1 + match) % options.length;
        if (open) setActiveIndex(index);
        else openMenu(index);
      }
    }
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <button
        {...props}
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        role="combobox"
        popoverTarget={listId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={`${styles.select} ${sizes[`size-${size}`]} ${className}`}
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          if (open) closeMenu();
          else openMenu();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          closeMenu();
        }}
      >
        <span className={styles.value}>{options[selectedIndex]?.label}</span>
        <Icon name="down" size={14} className={styles.chevron} />
      </button>
      <div
        ref={menuRef}
        id={listId}
        popover="auto"
        role="listbox"
        aria-labelledby={triggerId}
        className={`${styles.menu} ${sizes[`size-${size}`]}`}
        onToggle={(event) => {
          setOpen(event.newState === 'open');
          if (event.newState === 'closed') searchRef.current = { text: '', time: 0 };
        }}
        onPointerDown={(event) => event.preventDefault()}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            data-active={index === activeIndex || undefined}
            className={styles.option}
            onPointerMove={() => {
              if (!option.disabled) setActiveIndex(index);
            }}
            onClick={() => selectOption(index)}
          >
            <span className={styles.value}>{option.label}</span>
            {option.value === value && <Icon name="check" size={15} />}
          </div>
        ))}
      </div>
    </>
  );
};
