import React, { useEffect, useState } from 'react';
import { parseSoftCap, type SoftPointCap } from '../utils/softCap';

export function SoftCapInput({
  value,
  onChange,
  id,
}: {
  value: SoftPointCap;
  onChange: (cap: SoftPointCap) => void;
  id?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);

  return (
    <input
      id={id}
      className="soft-cap-input"
      type="text"
      inputMode="text"
      autoComplete="off"
      placeholder="Off"
      aria-label="Soft point cap"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== '' && !/^\d{1,2}$/.test(raw)) return;
        setText(raw);
        if (raw.trim() === '') {
          onChange(null);
          return;
        }
        const parsed = parseSoftCap(raw);
        if (parsed != null) onChange(parsed);
      }}
      onBlur={() => {
        const parsed = parseSoftCap(text);
        onChange(parsed);
        setText(parsed == null ? '' : String(parsed));
      }}
    />
  );
}
