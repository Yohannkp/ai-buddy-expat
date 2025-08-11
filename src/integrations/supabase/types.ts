export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          title: string
          description: string
          date: string
          location: string
          user_id: string
          created_at: string
          image_url: string | null
          video_url: string | null
          category: string
          tags: string[]
          seats: number | null
          seats_taken: number | null
          co_organizers: string[] | null
          lat: number | null
          lng: number | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          date: string
          location: string
          user_id: string
          created_at?: string
          image_url?: string | null
          video_url?: string | null
          category: string
          tags: string[]
          seats?: number | null
          seats_taken?: number | null
          co_organizers?: string[] | null
          lat?: number | null
          lng?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          date?: string
          location?: string
          user_id?: string
          created_at?: string
          image_url?: string | null
          video_url?: string | null
          category?: string
          tags?: string[]
          seats?: number | null
          seats_taken?: number | null
          co_organizers?: string[] | null
          lat?: number | null
          lng?: number | null
        }
      }
      likes: {
        Row: {
          id: string
          event_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          event_id: string
          user_id: string
          content: string
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          content: string
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          event_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
      registrations: {
        Row: {
          id: string
          event_id: string
          user_id: string
          created_at: string
          status: 'registered' | 'cancelled'
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          created_at?: string
          status?: 'registered' | 'cancelled'
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          created_at?: string
          status?: 'registered' | 'cancelled'
        }
      }
      polls: {
        Row: {
          id: string
          event_id: string
          question: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          question: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          question?: string
          created_at?: string
        }
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          text: string
        }
        Insert: {
          id?: string
          poll_id: string
          text: string
        }
        Update: {
          id?: string
          poll_id?: string
          text?: string
        }
      }
      poll_votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_id?: string
          user_id?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          target_type: 'event' | 'comment'
          target_id: string
          user_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          target_type: 'event' | 'comment'
          target_id: string
          user_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          target_type?: 'event' | 'comment'
          target_id?: string
          user_id?: string
          reason?: string
          created_at?: string
        }
      }
      user_points: {
        Row: {
          user_id: string
          points: number
          updated_at: string
        }
        Insert: {
          user_id: string
          points?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          points?: number
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
        }
      }
      user_badges: {
        Row: {
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
      }
    }
    Functions: {
      safe_register: {
        Args: { event_id: string }
        Returns: { success: boolean; message: string; seats_taken: number | null }
      }
      increment_points: {
        Args: { delta: number }
        Returns: { success: boolean; total: number }
      }
      translate_text: {
        Args: { text: string; target_lang: string }
        Returns: { translated: string; detected_lang: string }
      }
    }
  }
}

export type MessagingTables = Database['public']['Tables'] & {
  conversations: {
    Row: { id: string; created_at: string }
    Insert: { id?: string; created_at?: string }
    Update: { id?: string; created_at?: string }
  }
  conversation_participants: {
    Row: { conversation_id: string; user_id: string; joined_at: string }
    Insert: { conversation_id: string; user_id: string; joined_at?: string }
    Update: { conversation_id?: string; user_id?: string; joined_at?: string }
  }
  messages: {
    Row: { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; language: string | null }
    Insert: { id?: string; conversation_id: string; sender_id: string; content: string; created_at?: string; language?: string | null }
    Update: { id?: string; conversation_id?: string; sender_id?: string; content?: string; created_at?: string; language?: string | null }
  }
}
