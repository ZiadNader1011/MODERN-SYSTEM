import * as React from "react";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value: string; // Expected: "YYYY-MM-DD"
  onChange: (date: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const toDisplay = (iso: string) => {
    if (!iso || iso.length !== 10) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };

  const [displayValue, setDisplayValue] = React.useState(toDisplay(value));
  const isFocused = React.useRef(false);

  // Sync if external value changes (e.g. form reset), but NOT while they are actively typing!
  React.useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(toDisplay(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayValue(val);

    if (val.trim() === "") {
      onChange("");
      return;
    }

    // Attempt to silently sync the valid date behind the scenes without interrupting typing
    const parts = val.split(/[\/\-\.]+/);
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (y.length === 2 || y.length === 4) {
        if (y.length === 2) y = "20" + y;
        
        const pD = parseInt(d, 10);
        const pM = parseInt(m, 10);
        const pY = parseInt(y, 10);

        if (pD > 0 && pD <= 31 && pM > 0 && pM <= 12 && pY > 1900 && pY < 2100) {
          const cleanD = pD.toString().padStart(2, '0');
          const cleanM = pM.toString().padStart(2, '0');
          onChange(`${pY}-${cleanM}-${cleanD}`);
          return;
        }
      }
    }

    const digitsOnly = val.replace(/[^0-9]/g, "");
    if (digitsOnly.length === 8) {
      const pD = parseInt(digitsOnly.slice(0, 2), 10);
      const pM = parseInt(digitsOnly.slice(2, 4), 10);
      const pY = parseInt(digitsOnly.slice(4, 8), 10);

      if (pD > 0 && pD <= 31 && pM > 0 && pM <= 12 && pY > 1900 && pY < 2100) {
        const cleanD = pD.toString().padStart(2, '0');
        const cleanM = pM.toString().padStart(2, '0');
        onChange(`${pY}-${cleanM}-${cleanD}`);
        return;
      }
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    // Visually format their value exactly matched to the correct parsed state
    setDisplayValue(toDisplay(value));
  };

  return (
    <Input
      type="text"
      placeholder="DD/MM/YYYY"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      dir="ltr"
    />
  );
}
