import { useState, useEffect, useRef } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder = "Select option", size = "md", style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`custom-select-container ${size}`} ref={dropdownRef} style={style}>
      <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${isOpen ? 'open' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.length > 7 && (
            <div className="custom-select-search-container">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="custom-select-search-input"
                onClick={(e) => e.stopPropagation()} // Prevent close on input click
              />
            </div>
          )}
          <div className="custom-select-list">
            {filteredOptions.length === 0 ? (
              <div className="custom-select-no-results">No results found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
