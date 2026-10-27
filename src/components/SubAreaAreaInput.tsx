import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MdSearch, MdClose, MdKeyboardArrowDown, MdAdd, MdLocationOn, MdLockOutline } from 'react-icons/md';

interface SubAreaAreaInputProps {
  label?: string;
  subAreaValue: string;
  areaValue: string;
  onSubAreaChange: (val: string) => void;
  onAreaChange: (val: string) => void;
  onSubAreaAdd?: (val: string) => void;
  onAreaAdd?: (val: string, currentSubArea: string) => void;
  subAreaOptions: string[];
  areaOptions: string[];
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SubAreaAreaInput: React.FC<SubAreaAreaInputProps> = ({
  label = 'Sub Area | Area',
  subAreaValue,
  areaValue,
  onSubAreaChange,
  onAreaChange,
  onSubAreaAdd,
  onAreaAdd,
  subAreaOptions,
  areaOptions,
  helperText = 'Sub Area is required. Area is optional.',
  disabled = false,
  required = true,
}) => {
  // Area is locked until a Sub Area is selected
  const isAreaLocked = disabled || !subAreaValue.trim();

  // Sub Area Section State
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [subQuery, setSubQuery] = useState('');
  const [subHighlightIdx, setSubHighlightIdx] = useState(0);

  // Area Section State
  const [isAreaOpen, setIsAreaOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState('');
  const [areaHighlightIdx, setAreaHighlightIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const subListRef = useRef<HTMLUListElement>(null);
  const areaListRef = useRef<HTMLUListElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSubOpen(false);
        setIsAreaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Sub Areas
  const filteredSubAreas = useMemo(() => {
    const q = subQuery.trim().toLowerCase();
    if (!q) return subAreaOptions;
    return subAreaOptions.filter((s) => s.toLowerCase().includes(q));
  }, [subAreaOptions, subQuery]);

  const trimmedSubQuery = subQuery.trim();
  const subExactMatch = useMemo(() => {
    if (!trimmedSubQuery) return true;
    return subAreaOptions.some((s) => s.toLowerCase() === trimmedSubQuery.toLowerCase());
  }, [subAreaOptions, trimmedSubQuery]);
  const canAddSub = Boolean(trimmedSubQuery && !subExactMatch);
  const totalSubCount = filteredSubAreas.length + (canAddSub ? 1 : 0);

  // Filtered Areas under selected Sub Area
  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return areaOptions;
    return areaOptions.filter((a) => a.toLowerCase().includes(q));
  }, [areaOptions, areaQuery]);

  const trimmedAreaQuery = areaQuery.trim();
  const areaExactMatch = useMemo(() => {
    if (!trimmedAreaQuery) return true;
    return areaOptions.some((a) => a.toLowerCase() === trimmedAreaQuery.toLowerCase());
  }, [areaOptions, trimmedAreaQuery]);
  const canAddArea = Boolean(trimmedAreaQuery && !areaExactMatch);
  const totalAreaCount = filteredAreas.length + (canAddArea ? 1 : 0);

  // Auto-scroll highlighted items into view
  useEffect(() => {
    if (isSubOpen && subListRef.current) {
      const activeEl = subListRef.current.children[subHighlightIdx] as HTMLElement;
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [subHighlightIdx, isSubOpen]);

  useEffect(() => {
    if (isAreaOpen && areaListRef.current) {
      const activeEl = areaListRef.current.children[areaHighlightIdx] as HTMLElement;
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [areaHighlightIdx, isAreaOpen]);

  // Handle Sub Area Select / Add -> unlocks Area cleanly without blocking popover
  const handleSelectSub = (val: string) => {
    onSubAreaChange(val);
    setSubQuery('');
    setIsSubOpen(false);
  };

  const handleAddNewSub = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    if (onSubAreaAdd) onSubAreaAdd(clean);
    onSubAreaChange(clean);
    setSubQuery('');
    setIsSubOpen(false);
  };

  // Handle Area Select / Add
  const handleSelectArea = (val: string) => {
    onAreaChange(val);
    setAreaQuery('');
    setIsAreaOpen(false);
  };

  const handleAddNewArea = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    if (onAreaAdd) onAreaAdd(clean, subAreaValue);
    onAreaChange(clean);
    setAreaQuery('');
    setIsAreaOpen(false);
  };

  // Keyboard Navigation: Sub Area
  const handleSubKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isSubOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsSubOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSubHighlightIdx((prev) => (totalSubCount > 0 ? (prev + 1) % totalSubCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSubHighlightIdx((prev) => (totalSubCount > 0 ? (prev - 1 + totalSubCount) % totalSubCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (canAddSub && subHighlightIdx === filteredSubAreas.length) {
        handleAddNewSub(trimmedSubQuery);
      } else if (filteredSubAreas[subHighlightIdx]) {
        handleSelectSub(filteredSubAreas[subHighlightIdx]);
      } else if (canAddSub) {
        handleAddNewSub(trimmedSubQuery);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSubOpen(false);
    }
  };

  // Keyboard Navigation: Area
  const handleAreaKeyDown = (e: React.KeyboardEvent) => {
    if (isAreaLocked) return;

    if (!isAreaOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsAreaOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAreaHighlightIdx((prev) => (totalAreaCount > 0 ? (prev + 1) % totalAreaCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAreaHighlightIdx((prev) => (totalAreaCount > 0 ? (prev - 1 + totalAreaCount) % totalAreaCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (canAddArea && areaHighlightIdx === filteredAreas.length) {
        handleAddNewArea(trimmedAreaQuery);
      } else if (filteredAreas[areaHighlightIdx]) {
        handleSelectArea(filteredAreas[areaHighlightIdx]);
      } else if (canAddArea) {
        handleAddNewArea(trimmedAreaQuery);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAreaOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Header Label: Clear emphasis that Sub Area is Required and Area is Optional */}
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <MdLocationOn className="text-primary text-sm" />
          <span>
            Sub Area <span className="text-red-500">*</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
          <span className="text-slate-500 dark:text-slate-400 font-semibold">
            Area <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
          </span>
        </label>

        {(subAreaValue || areaValue) && (
          <button
            type="button"
            onClick={() => {
              onSubAreaChange('');
              onAreaChange('');
              setSubQuery('');
              setAreaQuery('');
              setIsSubOpen(false);
              setIsAreaOpen(false);
            }}
            className="text-[10px] text-slate-400 hover:text-red-500 transition cursor-pointer font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* SINGLE UNIFIED INPUT CONTAINER */}
      <div
        className={`w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark grid grid-cols-2 divide-x divide-stroke dark:divide-strokedark overflow-visible shadow-xs focus-within:bg-white dark:focus-within:bg-boxdark focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
        }`}
      >
        {/* LEFT PART: SUB AREA (Important / Required) */}
        <div className="relative flex items-center px-3 py-2.5">
          <input
            ref={subInputRef}
            type="text"
            disabled={disabled}
            placeholder="Sub Area *"
            value={isSubOpen ? subQuery : subAreaValue}
            onChange={(e) => {
              setSubQuery(e.target.value);
              if (!isSubOpen) setIsSubOpen(true);
            }}
            onFocus={() => {
              setIsSubOpen(true);
              setIsAreaOpen(false);
              setSubQuery(subAreaValue || '');
            }}
            onKeyDown={handleSubKeyDown}
            className="w-full bg-transparent text-slate-900 dark:text-white text-xs font-semibold outline-none placeholder:text-slate-400 placeholder:font-normal truncate pr-6"
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {subAreaValue && !isSubOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubAreaChange('');
                  onAreaChange('');
                  setSubQuery('');
                  setAreaQuery('');
                  setIsAreaOpen(false);
                }}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                title="Clear Sub Area"
              >
                <MdClose size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSubOpen(!isSubOpen);
                setIsAreaOpen(false);
                if (!isSubOpen) setTimeout(() => subInputRef.current?.focus(), 50);
              }}
              className="text-slate-400 hover:text-primary transition"
            >
              <MdKeyboardArrowDown
                size={16}
                className={`transition-transform duration-200 ${isSubOpen ? 'rotate-180 text-primary' : ''}`}
              />
            </button>
          </div>

          {/* Sub Area Dropdown List */}
          {isSubOpen && (
            <div className="absolute top-full left-0 z-99999 mt-1.5 w-[260px] sm:w-[320px] rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark shadow-2xl overflow-hidden animate-in fade-in duration-100">
              <ul ref={subListRef} className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
                {filteredSubAreas.length === 0 && !canAddSub && (
                  <li className="px-3 py-3 text-center text-xs text-slate-400">
                    No matching sub areas found
                  </li>
                )}

                {filteredSubAreas.map((item, idx) => {
                  const isSelected = subAreaValue.toLowerCase() === item.toLowerCase();
                  const isHighlighted = idx === subHighlightIdx;

                  return (
                    <li
                      key={idx}
                      onClick={() => handleSelectSub(item)}
                      onMouseEnter={() => setSubHighlightIdx(idx)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition flex items-center justify-between ${
                        isHighlighted
                          ? 'bg-primary/10 text-primary font-bold'
                          : isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-primary font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-primary/20 text-primary">
                          Selected
                        </span>
                      )}
                    </li>
                  );
                })}

                {/* Add New Sub Area Option */}
                {canAddSub && (
                  <li
                    onClick={() => handleAddNewSub(trimmedSubQuery)}
                    onMouseEnter={() => setSubHighlightIdx(filteredSubAreas.length)}
                    className={`px-2.5 py-2 text-xs rounded-lg cursor-pointer transition flex items-center justify-between border-t border-dashed border-primary/40 mt-1 ${
                      subHighlightIdx === filteredSubAreas.length
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <MdAdd className="shrink-0" size={14} />
                      <span className="truncate">Add <b>"{trimmedSubQuery}"</b></span>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0">
                      Enter ↵
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT PART: AREA (Optional - Unlocks when Sub Area chosen) */}
        <div
          onClick={() => {
            if (isAreaLocked) {
              setIsSubOpen(true);
              setTimeout(() => subInputRef.current?.focus(), 50);
            }
          }}
          className={`relative flex items-center px-3 py-2.5 transition ${
            isAreaLocked
              ? 'bg-slate-100/70 dark:bg-slate-800/40 cursor-not-allowed select-none'
              : 'cursor-text'
          }`}
        >
          <input
            ref={areaInputRef}
            type="text"
            disabled={isAreaLocked}
            placeholder={isAreaLocked ? 'Select Sub Area first...' : 'Area (Optional)'}
            value={isAreaOpen ? areaQuery : areaValue}
            onChange={(e) => {
              if (isAreaLocked) return;
              setAreaQuery(e.target.value);
              if (!isAreaOpen) setIsAreaOpen(true);
            }}
            onFocus={() => {
              if (isAreaLocked) return;
              setIsAreaOpen(true);
              setIsSubOpen(false);
              setAreaQuery(areaValue || '');
            }}
            onKeyDown={handleAreaKeyDown}
            className={`w-full bg-transparent text-xs font-semibold outline-none truncate pr-6 ${
              isAreaLocked
                ? 'text-slate-400 placeholder:text-slate-400 placeholder:italic cursor-not-allowed'
                : 'text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal'
            }`}
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {isAreaLocked ? (
              <span title="Please select Sub Area first" className="text-slate-400">
                <MdLockOutline size={14} />
              </span>
            ) : (
              <>
                {areaValue && !isAreaOpen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAreaChange('');
                      setAreaQuery('');
                    }}
                    className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                    title="Clear Area"
                  >
                    <MdClose size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsAreaOpen(!isAreaOpen);
                    setIsSubOpen(false);
                    if (!isAreaOpen) setTimeout(() => areaInputRef.current?.focus(), 50);
                  }}
                  className="text-slate-400 hover:text-primary transition"
                >
                  <MdKeyboardArrowDown
                    size={16}
                    className={`transition-transform duration-200 ${isAreaOpen ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
              </>
            )}
          </div>

          {/* Area Dropdown List */}
          {isAreaOpen && !isAreaLocked && (
            <div className="absolute top-full right-0 z-99999 mt-1.5 w-[260px] sm:w-[320px] rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark shadow-2xl overflow-hidden animate-in fade-in duration-100">
              <ul ref={areaListRef} className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
                {filteredAreas.length === 0 && !canAddArea && (
                  <li className="px-3 py-3 text-center text-xs text-slate-400">
                    No matching areas found
                  </li>
                )}

                {filteredAreas.map((item, idx) => {
                  const isSelected = areaValue.toLowerCase() === item.toLowerCase();
                  const isHighlighted = idx === areaHighlightIdx;

                  return (
                    <li
                      key={idx}
                      onClick={() => handleSelectArea(item)}
                      onMouseEnter={() => setAreaHighlightIdx(idx)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition flex items-center justify-between ${
                        isHighlighted
                          ? 'bg-primary/10 text-primary font-bold'
                          : isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-primary font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-primary/20 text-primary">
                          Selected
                        </span>
                      )}
                    </li>
                  );
                })}

                {/* Add New Area Option */}
                {canAddArea && (
                  <li
                    onClick={() => handleAddNewArea(trimmedAreaQuery)}
                    onMouseEnter={() => setAreaHighlightIdx(filteredAreas.length)}
                    className={`px-2.5 py-2 text-xs rounded-lg cursor-pointer transition flex items-center justify-between border-t border-dashed border-primary/40 mt-1 ${
                      areaHighlightIdx === filteredAreas.length
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <MdAdd className="shrink-0" size={14} />
                      <span className="truncate">Add <b>"{trimmedAreaQuery}"</b></span>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0">
                      Enter ↵
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default SubAreaAreaInput;
