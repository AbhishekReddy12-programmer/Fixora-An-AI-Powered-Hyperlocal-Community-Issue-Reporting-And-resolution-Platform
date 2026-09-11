const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface UserResponse {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: string;
  karma_points: number;
  credibility_score: number;
  ward_id: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface IssueResponse {
  id: string;
  tracking_code: string;
  title: string;
  description: string | null;
  category: string;
  severity: number;
  status: string;
  address_text: string | null;
  before_image_url: string;
  after_image_url: string | null;
  ai_metadata: Record<string, unknown> | null;
  verification_count: number;
  confidence_score: number;
  priority_score: number;
  reopened_count: number;
  reporter_id: string;
  department_id: string | null;
  assigned_worker_id: string | null;
  ward_id: string | null;
  resolved_at: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface IssueNearbyResponse extends IssueResponse {
  distance_meters: number;
}

export interface NotificationResponse {
  id: string;
  user_id: string;
  issue_id: string | null;
  ward_id: string | null;
  type: string;
  title: string;
  message: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  unread_count: number;
  items: NotificationResponse[];
}

export interface AdminMetrics {
  total_issues: number;
  awaiting_verification: number;
  verified_pending_action: number;
  in_progress: number;
  solved_pending_confirmation: number;
  reopened_disputed: number;
  closed: number;
  average_resolution_hours: number;
}

export interface AdminOverviewResponse {
  ward_id: string | null;
  ward_name: string | null;
  metrics: AdminMetrics;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  karma_points: number;
  credibility_score: number;
  is_active: boolean;
}


export interface LeaderboardUser {
  rank: number;
  user_id: string;
  full_name: string;
  points: number;
  tier: string;
  badges_count: number;
}

export interface LeaderboardResponse {
  ward_id: string | null;
  ward_name: string;
  user_rank: number;
  user_points: number;
  leaderboard: LeaderboardUser[];
}

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers = new Headers(options?.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Fallback to default
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
