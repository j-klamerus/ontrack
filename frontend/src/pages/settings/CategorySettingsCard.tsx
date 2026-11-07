import { Plus, Trash2 } from 'lucide-react'
import type { EventCategoryDefinition } from '../../constants/eventCategories'

type CategorySettingsCardProps = {
  categories: EventCategoryDefinition[]
  categoryName: string
  categoryColor: string
  categoryError: string
  onCategoryNameChange: (name: string) => void
  onCategoryColorChange: (color: string) => void
  onAddCategory: () => void
  onRemoveCategory: (category: EventCategoryDefinition) => void
}

function CategorySettingsCard({
  categories,
  categoryName,
  categoryColor,
  categoryError,
  onCategoryNameChange,
  onCategoryColorChange,
  onAddCategory,
  onRemoveCategory
}: CategorySettingsCardProps) {
  return (
    <div className="settings-card category-settings-card">
      <div className="card-header-row category-card-header">
        <div>
          <h3>Event &amp; Commitment Categories</h3>
          <p className="field-note">
            Categories are shared by events and commitments. Other is the default category.
          </p>
        </div>
      </div>

      <div className="category-list">
        {categories.map((category) => (
          <div className="category-row" key={category.name}>
            <span className="category-swatch" style={{ backgroundColor: category.color }} />
            <span className="category-name">{category.name}</span>
            <span className="category-kind">{category.isCustom ? 'Custom' : 'Default'}</span>
            {category.isCustom && (
              <button
                type="button"
                className="category-delete-button"
                aria-label={`Delete ${category.name} category`}
                onClick={() => onRemoveCategory(category)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="category-create-form">
        <label htmlFor="new-category-name">
          New category
          <input
            id="new-category-name"
            type="text"
            maxLength={32}
            value={categoryName}
            onChange={(event) => onCategoryNameChange(event.target.value)}
            placeholder="e.g. Project"
          />
        </label>
        <label className="category-color-field" htmlFor="new-category-color">
          Color
          <input
            id="new-category-color"
            type="color"
            value={categoryColor}
            onChange={(event) => onCategoryColorChange(event.target.value)}
          />
        </label>
        <button type="button" className="primary-button" onClick={onAddCategory}>
          <Plus size={16} aria-hidden="true" />
          Add category
        </button>
      </div>
      {categoryError && <p className="category-error" role="alert">{categoryError}</p>}
    </div>
  )
}

export default CategorySettingsCard
