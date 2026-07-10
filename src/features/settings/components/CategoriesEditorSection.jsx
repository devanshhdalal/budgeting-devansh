import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Tag } from 'lucide-react';
import { saveTransaction } from '@/services/storage';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { CategoryIcon } from '@/utils/categoryIcons';
import { CATEGORY_ICON_OPTIONS } from '@/config/categoryIcons';

const OTHER_VALUE = 'Other';

const toCategoryValue = (label) =>
  label
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const CategoriesEditorSection = ({
  categories,
  budgetConfig,
  cards,
  transactions,
  setTransactions,
  onPersistConfig,
  setSaveStatus,
}) => {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('MoreHorizontal');
  const [isDeleting, setIsDeleting] = useState(false);

  const updateCategory = (index, patch) => {
    const nextCategories = categories.map((cat, i) => (i === index ? { ...cat, ...patch } : cat));
    onPersistConfig({ CATEGORIES: nextCategories });
  };

  const moveCategory = (index, direction) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onPersistConfig({ CATEGORIES: next });
  };

  const addCategory = () => {
    const label = newLabel.trim();
    if (!label) return;

    const value = toCategoryValue(label);
    if (!value) return;
    if (categories.some((c) => c.value === value)) {
      toast.error('Category already exists', { description: `"${value}" is already in your list.` });
      return;
    }

    const nextCategories = [...categories, { value, label, icon: newIcon }];
    const nextBudget = { ...budgetConfig, [value]: 0 };
    const nextCards = Object.fromEntries(
      Object.entries(cards).map(([name, data]) => [
        name,
        {
          ...data,
          multipliers: { ...data.multipliers, [value]: 1, Base: data.multipliers?.Base ?? 1 },
        },
      ])
    );

    onPersistConfig({
      CATEGORIES: nextCategories,
      BUDGET_CONFIG: nextBudget,
      CARDS: nextCards,
    });
    setNewLabel('');
    setNewIcon('MoreHorizontal');
  };

  const deleteCategory = async (cat) => {
    if (cat.value === OTHER_VALUE) return;

    const affected = transactions.filter((t) => t.Category === cat.value);
    const count = affected.length;
    const noun = count === 1 ? 'transaction' : 'transactions';
    const message =
      count > 0
        ? `${count} ${noun} use "${cat.label}". They will be moved to Other.`
        : `Remove category "${cat.label}"?`;

    const ok = await confirm({
      title: count > 0 ? 'Reassign transactions?' : 'Remove category?',
      message,
      confirmLabel: count > 0 ? 'Reassign and remove' : 'Remove',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    setSaveStatus('saving');

    if (count > 0) {
      const updates = await Promise.all(
        affected.map((tx) => saveTransaction({ ...tx, Category: OTHER_VALUE }))
      );
      const failed = updates.find((r) => !r.ok);
      if (failed) {
        setSaveStatus('error');
        setIsDeleting(false);
        toast.error('Could not reassign transactions', { description: failed.error });
        return;
      }
      setTransactions((prev) =>
        prev.map((t) => (t.Category === cat.value ? { ...t, Category: OTHER_VALUE } : t))
      );
    }

    const nextCategories = categories.filter((c) => c.value !== cat.value);
    const nextBudget = { ...budgetConfig };
    delete nextBudget[cat.value];

    const nextCards = Object.fromEntries(
      Object.entries(cards).map(([name, data]) => {
        const multipliers = { ...data.multipliers };
        delete multipliers[cat.value];
        return [name, { ...data, multipliers }];
      })
    );

    const saved = await onPersistConfig(
      {
        CATEGORIES: nextCategories,
        BUDGET_CONFIG: nextBudget,
        CARDS: nextCards,
      },
      count > 0
        ? `Category removed. ${count} ${noun} reassigned to Other.`
        : 'Category removed'
    );

    setIsDeleting(false);
    if (!saved) return;
  };

  return (
    <div className="categories-editor">
      <ul className="categories-editor-list">
        {categories.map((cat, index) => (
          <li key={cat.value} className="categories-editor-row">
            <div className="categories-editor-icon" aria-hidden>
              <CategoryIcon category={cat.value} categories={categories} />
            </div>
            <input
              className="form-input categories-editor-label"
              value={cat.label}
              onChange={(e) => updateCategory(index, { label: e.target.value })}
              aria-label={`Label for ${cat.value}`}
            />
            <select
              className="form-input categories-editor-icon-select"
              value={cat.icon || 'MoreHorizontal'}
              onChange={(e) => updateCategory(index, { icon: e.target.value })}
              aria-label={`Icon for ${cat.label}`}
            >
              {CATEGORY_ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <div className="categories-editor-actions">
              <button
                type="button"
                className="btn-icon"
                onClick={() => moveCategory(index, -1)}
                disabled={index === 0 || isDeleting}
                aria-label={`Move ${cat.label} up`}
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => moveCategory(index, 1)}
                disabled={index === categories.length - 1 || isDeleting}
                aria-label={`Move ${cat.label} down`}
              >
                <ChevronDown size={18} />
              </button>
              {cat.value !== OTHER_VALUE && (
                <button
                  type="button"
                  className="btn-icon btn-icon-danger"
                  onClick={() => deleteCategory(cat)}
                  disabled={isDeleting}
                  aria-label={`Delete ${cat.label}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="categories-editor-add">
        <Tag size={18} className="categories-editor-add-icon" />
        <input
          className="form-input"
          placeholder="New category label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <select
          className="form-input categories-editor-icon-select"
          value={newIcon}
          onChange={(e) => setNewIcon(e.target.value)}
          aria-label="Icon for new category"
        >
          {CATEGORY_ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={addCategory} disabled={!newLabel.trim()}>
          <Plus size={18} />
          Add
        </button>
      </div>
      {confirmDialog}
    </div>
  );
};

export default CategoriesEditorSection;
