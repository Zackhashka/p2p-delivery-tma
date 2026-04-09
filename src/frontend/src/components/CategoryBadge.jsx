import React from 'react'

const CATEGORIES = {
  documents: { emoji: '📄', label: 'Документы', color: 'bg-blue-100 text-blue-700' },
  fragile: { emoji: '🤕', label: 'Хрупкое', color: 'bg-red-100 text-red-700' },
  food: { emoji: '🍔', label: 'Еда', color: 'bg-yellow-100 text-yellow-700' },
  tech: { emoji: '⚙️', label: 'Техника', color: 'bg-purple-100 text-purple-700' },
  clothes: { emoji: '👕', label: 'Одежда', color: 'bg-pink-100 text-pink-700' },
  books: { emoji: '📚/, label: 'Книги', color: 'bg-green-100 text-green-700' },
  furniture: { emoji: '🪑', label: 'Мебель', color: 'bg-amber-100 text-amber-700' },
  other: { emoji: '📦', label: 'Прочее', color: 'bg-gray-100 text-gray-700' }
}

const CategoryBadge = ({ category, size = 'sm', clickable = false, onClick = null }) => {
  const cat = CATEGORIES[category] || CATEGORIES.other

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-0.5',
    md: 'text-sm px-3 py-1.5 gap-1',
    lg: 'text-base px-4 py-2 gap-1.5'
  }

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium ${cat.color} ${sizeClasses[size]} ${
        clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      onClick={onClick}
    >
      <span>{cat.emoji}</span>
      <span>{cat.label}</span>
    </div>
  )
}

export default CategoryBadge
