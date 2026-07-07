import { NavLink, useLocation } from 'react-router-dom'
import { Home, BookOpen, Bookmark, User } from 'lucide-react'

const ITEMS = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/glosario', label: 'Glosario', Icon: BookOpen, end: false },
  { to: '/guardados', label: 'Guardados', Icon: Bookmark, end: false },
  { to: '/perfil', label: 'Perfil', Icon: User, end: false },
]

// Fixed bottom bar, 64px + safe-area (UI-02).
// Active item: filled indigo pill, white icon + visible label. Inactive: thin line icon, muted, no label.
// Hidden during a practice session — the session frame's bottom action button replaces it.
export default function BottomNav() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/session')) return null
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 bg-surface pb-[env(safe-area-inset-bottom)] shadow-soft">
      <div className="mx-auto flex h-16 max-w-[480px] items-center justify-around px-4">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            {({ isActive }) =>
              isActive ? (
                <span className="flex items-center gap-2 rounded-full bg-indigo px-4 py-2 text-white">
                  <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
                  <span className="text-[14px] font-bold">{label}</span>
                </span>
              ) : (
                <span className="text-muted">
                  <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                </span>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
