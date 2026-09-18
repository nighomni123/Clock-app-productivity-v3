/**
 * Session tags/categories for focus session analytics
 */
import { SessionTag } from '../types';

const STORAGE_KEY = 'focus_session_tags';

const DEFAULT_TAGS: Omit<SessionTag, 'createdAt'>[] = [
  { id: 'math', name: 'Mathematics', color: '#3B82F6' },
  { id: 'science', name: 'Science', color: '#10B981' },
  { id: 'programming', name: 'Programming', color: '#8B5CF6' },
  { id: 'reading', name: 'Reading', color: '#F59E0B' },
  { id: 'writing', name: 'Writing', color: '#EC4899' },
  { id: 'language', name: 'Language Learning', color: '#06B6D4' },
  { id: 'review', name: 'Review/Revision', color: '#6366F1' },
  { id: 'project', name: 'Project Work', color: '#F97316' },
  { id: 'exam_prep', name: 'Exam Preparation', color: '#EF4444' },
  { id: 'creative', name: 'Creative Work', color: '#14B8A6' }
];

export function loadSessionTags(): SessionTag[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_TAGS.map(tag => ({
        ...tag,
        createdAt: Date.now()
      }));
    }
    return JSON.parse(raw) as SessionTag[];
  } catch {
    return DEFAULT_TAGS.map(tag => ({
      ...tag,
      createdAt: Date.now()
    }));
  }
}

export function saveSessionTags(tags: SessionTag[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // Storage full - non-fatal
  }
}

export function addSessionTag(name: string, color: string): SessionTag {
  const tags = loadSessionTags();
  const newTag: SessionTag = {
    id: `tag_${Date.now()}`,
    name,
    color,
    createdAt: Date.now()
  };
  tags.push(newTag);
  saveSessionTags(tags);
  return newTag;
}

export function updateSessionTag(id: string, updates: Partial<SessionTag>): void {
  const tags = loadSessionTags();
  const index = tags.findIndex(t => t.id === id);
  if (index !== -1) {
    tags[index] = { ...tags[index], ...updates };
    saveSessionTags(tags);
  }
}

export function deleteSessionTag(id: string): void {
  const tags = loadSessionTags();
  const filtered = tags.filter(t => t.id !== id);
  saveSessionTags(filtered);
}

export function getSessionTagById(id: string): SessionTag | undefined {
  const tags = loadSessionTags();
  return tags.find(t => t.id === id);
}

export function getAllSessionTags(): SessionTag[] {
  return loadSessionTags();
}

export function getTagColor(id: string): string {
  const tag = getSessionTagById(id);
  return tag?.color || '#6B7280'; // Default gray
}

export function getTagName(id: string): string {
  const tag = getSessionTagById(id);
  return tag?.name || 'Unknown';
}
