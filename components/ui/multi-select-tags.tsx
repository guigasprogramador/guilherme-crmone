import * as React from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectTagsProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export const MultiSelectTags: React.FC<MultiSelectTagsProps> = ({ options, value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredOptions = options.filter(
    (opt) =>
      (!inputValue || opt.label.toLowerCase().includes(inputValue.toLowerCase())) &&
      !value.includes(opt.value)
  );

  const handleSelect = (option: Option) => {
    if (!value.includes(option.value)) {
      onChange([...value, option.value]);
      setInputValue("");
      setIsOpen(false);
    }
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="w-full">
      <div
        className="flex flex-wrap gap-2 border rounded-md px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setIsOpen(true)}
      >
        {value.map((val) => {
          const opt = options.find((o) => o.value === val);
          return (
            <span
              key={val}
              className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs cursor-pointer"
            >
              {opt?.label || val}
              <button
                type="button"
                className="ml-1 text-blue-600 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(val);
                }}
                aria-label={`Remover ${opt?.label || val}`}
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          type="text"
          className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-40 overflow-auto">
          {filteredOptions.map((opt) => (
            <div
              key={opt.value}
              className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-sm"
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
