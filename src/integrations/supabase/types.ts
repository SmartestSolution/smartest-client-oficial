export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          project_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          sidebar_color: string | null
          sla_high_hours: number
          sla_low_hours: number
          sla_medium_hours: number
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          sidebar_color?: string | null
          sla_high_hours?: number
          sla_low_hours?: number
          sla_medium_hours?: number
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          sidebar_color?: string | null
          sla_high_hours?: number
          sla_low_hours?: number
          sla_medium_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_links: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          order_index: number
          platform: string
          project_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          platform?: string
          project_id: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          platform?: string
          project_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_path: string
          file_size: number | null
          id: string
          is_public: boolean
          name: string
          parent_document_id: string | null
          project_id: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_path: string
          file_size?: number | null
          id?: string
          is_public?: boolean
          name: string
          parent_document_id?: string | null
          project_id: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_path?: string
          file_size?: number | null
          id?: string
          is_public?: boolean
          name?: string
          parent_document_id?: string | null
          project_id?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_stage_items: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          document_id: string | null
          end_date: string | null
          evolution_stage_id: string
          id: string
          is_completed: boolean
          item_type: string
          order_index: number
          priority: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          evolution_stage_id: string
          id?: string
          is_completed?: boolean
          item_type?: string
          order_index?: number
          priority?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          evolution_stage_id?: string
          id?: string
          is_completed?: boolean
          item_type?: string
          order_index?: number
          priority?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_stage_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_stage_items_evolution_stage_id_fkey"
            columns: ["evolution_stage_id"]
            isOneToOne: false
            referencedRelation: "evolution_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          evolution_id: string
          id: string
          notes: string | null
          order_index: number
          stage_name: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          evolution_id: string
          id?: string
          notes?: string | null
          order_index?: number
          stage_name: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          evolution_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          stage_name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_stages_evolution_id_fkey"
            columns: ["evolution_id"]
            isOneToOne: false
            referencedRelation: "project_evolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          notification_type: string
          project_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          notification_type?: string
          project_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          notification_type?: string
          project_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_announcements: {
        Row: {
          announcement_type: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_announcements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_evolutions: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          project_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          project_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          project_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_evolutions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          milestone_type: string
          project_id: string
          recurrence: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          milestone_type?: string
          project_id: string
          recurrence?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          milestone_type?: string
          project_id?: string
          recurrence?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_items: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          document_id: string | null
          end_date: string | null
          id: string
          is_completed: boolean
          item_type: string
          order_index: number
          priority: string
          stage_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          id?: string
          is_completed?: boolean
          item_type?: string
          order_index?: number
          priority?: string
          stage_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          id?: string
          is_completed?: boolean
          item_type?: string
          order_index?: number
          priority?: string
          stage_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stage_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_index: number
          project_id: string
          stage_name: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          project_id: string
          stage_name: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          project_id?: string
          stage_name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_milestones: {
        Row: {
          created_at: string
          days_offset: number
          description: string | null
          id: string
          order_index: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          days_offset?: number
          description?: string | null
          id?: string
          order_index?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          days_offset?: number
          description?: string | null
          id?: string
          order_index?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_milestones_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_stage_items: {
        Row: {
          created_at: string
          id: string
          item_type: string
          order_index: number
          priority: string
          template_stage_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type?: string
          order_index?: number
          priority?: string
          template_stage_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          order_index?: number
          priority?: string
          template_stage_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_stage_items_template_stage_id_fkey"
            columns: ["template_stage_id"]
            isOneToOne: false
            referencedRelation: "project_template_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_stages: {
        Row: {
          created_at: string
          id: string
          order_index: number
          stage_name: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          stage_name: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          stage_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_users: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string
          release_notes: string | null
          released_at: string
          title: string
          updated_at: string
          version_number: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id: string
          release_notes?: string | null
          released_at?: string
          title: string
          updated_at?: string
          version_number: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string
          release_notes?: string | null
          released_at?: string
          title?: string
          updated_at?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_type: Database["public"]["Enums"]["project_type"]
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_type?: Database["public"]["Enums"]["project_type"]
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_type?: Database["public"]["Enums"]["project_type"]
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          assignee_id: string | null
          attachment_url: string | null
          category: string
          created_at: string
          end_at: string | null
          end_date: string | null
          id: string
          message: string
          priority: string
          project_id: string | null
          resolution_notes: string | null
          responded_at: string | null
          responded_by: string | null
          start_at: string | null
          start_date: string | null
          status: string
          subject: string
          ticket_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          assignee_id?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          end_at?: string | null
          end_date?: string | null
          id?: string
          message: string
          priority?: string
          project_id?: string | null
          resolution_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          start_at?: string | null
          start_date?: string | null
          status?: string
          subject: string
          ticket_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          assignee_id?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          end_at?: string | null
          end_date?: string | null
          id?: string
          message?: string
          priority?: string
          project_id?: string | null
          resolution_notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          start_at?: string | null
          start_date?: string | null
          status?: string
          subject?: string
          ticket_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_public: boolean
          name: string
          order_index: number | null
          project_id: string | null
          theme: string | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean
          name: string
          order_index?: number | null
          project_id?: string | null
          theme?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean
          name?: string
          order_index?: number | null
          project_id?: string | null
          theme?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      log_document_download: {
        Args: { _document_id: string }
        Returns: undefined
      }
      user_has_project_access: {
        Args: { _project_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      document_type: "technical_docs" | "data_modeling" | "user_manuals"
      project_type: "bi" | "automation" | "sql"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      document_type: ["technical_docs", "data_modeling", "user_manuals"],
      project_type: ["bi", "automation", "sql"],
    },
  },
} as const
