export interface LinkItem {
  id: string
  title: string
  url: string
  description: string | null
  icon: string | null
  active: boolean
  clicks: number
  createdAt: number
  updatedAt: number
}

export interface CreateLinkBody {
  title?: string
  url?: string
  description?: string | null
  icon?: string | null
  active?: boolean
}

export interface UpdateLinkBody {
  title?: string
  url?: string
  description?: string | null
  icon?: string | null
  active?: boolean
}

export interface ReorderItem {
  id: string
  order: number
}

export interface ReorderBody {
  items?: ReorderItem[]
}
