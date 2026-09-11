export const ISSUE_CATEGORIES = [
  { value: 'POTHOLE', label: 'Pothole', icon: '🕳️' },
  { value: 'ILLEGAL_DUMP', label: 'Illegal Dump', icon: '🗑️' },
  { value: 'BROKEN_STREETLIGHT', label: 'Broken Streetlight', icon: '💡' },
  { value: 'WATER_LEAK', label: 'Water Leak', icon: '💧' },
  { value: 'DAMAGED_SIDEWALK', label: 'Damaged Sidewalk', icon: '🚶' },
  { value: 'FALLEN_TREE', label: 'Fallen Tree', icon: '🌳' },
  { value: 'OPEN_MANHOLE', label: 'Open Manhole', icon: '⚠️' },
  { value: 'DRAINAGE', label: 'Drainage Issue', icon: '🌊' },
  { value: 'ROAD_DAMAGE', label: 'Road Damage', icon: '🛣️' },
  { value: 'OTHER', label: 'Other', icon: '📋' },
] as const;

export const ISSUE_STATUSES = [
  { value: 'REPORTED', label: 'Reported', color: '#F97316' },
  { value: 'UNDER_VERIFICATION', label: 'Under Verification', color: '#F97316' },
  { value: 'VERIFIED', label: 'Verified', color: '#3B82F6' },
  { value: 'UNDER_REVIEW', label: 'Under Review', color: '#3B82F6' },
  { value: 'ASSIGNED', label: 'Assigned', color: '#8B5CF6' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#8B5CF6' },
  { value: 'RESOLVED', label: 'Resolved', color: '#10B981' },
  { value: 'COMMUNITY_CONFIRMED', label: 'Community Confirmed', color: '#10B981' },
  { value: 'CLOSED', label: 'Closed', color: '#6B7280' },
] as const;

export const SEVERITY_LABELS = [
  { level: 1, label: 'Low', color: '#22C55E' },
  { level: 2, label: 'Moderate', color: '#EAB308' },
  { level: 3, label: 'Substantial', color: '#F97316' },
  { level: 4, label: 'Severe', color: '#EF4444' },
  { level: 5, label: 'Critical', color: '#DC2626' },
] as const;
