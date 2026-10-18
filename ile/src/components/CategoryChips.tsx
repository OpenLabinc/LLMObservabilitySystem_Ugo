import {
  Building2,
  Castle,
  FerrisWheel,
  Flame,
  Home,
  Palmtree,
  Tent,
  Trees,
  Waves,
} from 'lucide-react'
import type { StayCategory } from '../types'

const chips: Array<{ id: StayCategory | 'all'; label: string; icon: typeof Home }> = [
  { id: 'all', label: 'All', icon: Flame },
  { id: 'rooms', label: 'Rooms', icon: Home },
  { id: 'cities', label: 'Cities', icon: Building2 },
  { id: 'beach', label: 'Beach', icon: Waves },
  { id: 'countryside', label: 'Countryside', icon: Trees },
  { id: 'cabins', label: 'Cabins', icon: Tent },
  { id: 'luxury', label: 'Luxury', icon: Castle },
  { id: 'family', label: 'Family', icon: FerrisWheel },
  { id: 'unique', label: 'Unique', icon: Palmtree },
]

export function CategoryChips({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="hide-scrollbar flex gap-6 overflow-x-auto border-b border-line px-1 pb-3">
      {chips.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex shrink-0 flex-col items-center gap-1.5 pb-2 text-xs font-semibold ${
              active
                ? 'border-b-2 border-ink text-ink'
                : 'border-b-2 border-transparent text-mute hover:text-ink'
            }`}
          >
            <Icon size={22} strokeWidth={1.6} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
