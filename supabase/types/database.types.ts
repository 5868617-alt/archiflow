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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          from_date: string
          id: string
          kind: Database["public"]["Enums"]["absence_kind"]
          note: string | null
          office_id: string
          to_date: string
          user_id: string
        }
        Insert: {
          from_date: string
          id?: string
          kind: Database["public"]["Enums"]["absence_kind"]
          note?: string | null
          office_id: string
          to_date: string
          user_id: string
        }
        Update: {
          from_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          note?: string | null
          office_id?: string
          to_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          link: string | null
          office_id: string
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          link?: string | null
          office_id: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          link?: string | null
          office_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          publish_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          publish_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          publish_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          amount: number | null
          client_comment: string | null
          contact_id: string
          decided_at: string | null
          decided_by: string | null
          due_at: string | null
          id: string
          kind: Database["public"]["Enums"]["approval_kind"]
          office_id: string
          project_id: string
          ref_id: string | null
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          title: string
        }
        Insert: {
          amount?: number | null
          client_comment?: string | null
          contact_id: string
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["approval_kind"]
          office_id: string
          project_id: string
          ref_id?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
        }
        Update: {
          amount?: number | null
          client_comment?: string | null
          contact_id?: string
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["approval_kind"]
          office_id?: string
          project_id?: string
          ref_id?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_is_super_admin: boolean
          created_at: string
          id: number
          new_data: Json | null
          office_id: string | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_is_super_admin?: boolean
          created_at?: string
          id?: never
          new_data?: Json | null
          office_id?: string | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_is_super_admin?: boolean
          created_at?: string
          id?: never
          new_data?: Json | null
          office_id?: string | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          category: string
          id: string
          office_id: string
          planned: number
          project_id: string
        }
        Insert: {
          category: string
          id?: string
          office_id: string
          planned: number
          project_id: string
        }
        Update: {
          category?: string
          id?: string
          office_id?: string
          planned?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          office_id: string
          phone: string | null
          portal_status: Database["public"]["Enums"]["portal_status"]
          role_title: string | null
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          office_id: string
          phone?: string | null
          portal_status?: Database["public"]["Enums"]["portal_status"]
          role_title?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          office_id?: string
          phone?: string | null
          portal_status?: Database["public"]["Enums"]["portal_status"]
          role_title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          office_id: string
          source: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          office_id: string
          source?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          office_id?: string
          source?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          file_path: string | null
          id: string
          note: string | null
          office_id: string
          size_bytes: number | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          document_id: string
          file_path?: string | null
          id?: string
          note?: string | null
          office_id: string
          size_bytes?: number | null
          uploaded_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          document_id?: string
          file_path?: string | null
          id?: string
          note?: string | null
          office_id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access: Database["public"]["Enums"]["doc_access"]
          created_at: string
          description: string | null
          file_type: Database["public"]["Enums"]["file_kind"]
          folder: string
          id: string
          name: string
          office_id: string
          project_id: string | null
          shared_with_client: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["doc_access"]
          created_at?: string
          description?: string | null
          file_type: Database["public"]["Enums"]["file_kind"]
          folder: string
          id?: string
          name: string
          office_id: string
          project_id?: string | null
          shared_with_client?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          access?: Database["public"]["Enums"]["doc_access"]
          created_at?: string
          description?: string | null
          file_type?: Database["public"]["Enums"]["file_kind"]
          folder?: string
          id?: string
          name?: string
          office_id?: string
          project_id?: string | null
          shared_with_client?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
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
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          office_id: string | null
          payload: Json
          related_link: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string
          to_email: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          office_id?: string | null
          payload?: Json
          related_link?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string
          to_email: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          office_id?: string | null
          payload?: Json
          related_link?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          office_id: string
          paid_by: Database["public"]["Enums"]["payer"]
          po_id: string | null
          project_id: string
          receipt_path: string | null
          status: Database["public"]["Enums"]["expense_status"]
          supplier_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          office_id: string
          paid_by?: Database["public"]["Enums"]["payer"]
          po_id?: string | null
          project_id: string
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          office_id?: string
          paid_by?: Database["public"]["Enums"]["payer"]
          po_id?: string | null
          project_id?: string
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_definitions: {
        Row: {
          grp: string
          key: string
          label: string
        }
        Insert: {
          grp: string
          key: string
          label: string
        }
        Update: {
          grp?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      fee_milestones: {
        Row: {
          amount: number
          due_date: string | null
          id: string
          office_id: string
          paid_at: string | null
          pct: number | null
          project_id: string
          status: Database["public"]["Enums"]["fee_status"]
          title: string
        }
        Insert: {
          amount: number
          due_date?: string | null
          id?: string
          office_id: string
          paid_at?: string | null
          pct?: number | null
          project_id: string
          status?: Database["public"]["Enums"]["fee_status"]
          title: string
        }
        Update: {
          amount?: number
          due_date?: string | null
          id?: string
          office_id?: string
          paid_at?: string | null
          pct?: number | null
          project_id?: string
          status?: Database["public"]["Enums"]["fee_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_milestones_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fee_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          client_contact_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string | null
          office_id: string
          role: Database["public"]["Enums"]["invite_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token_hash: string
        }
        Insert: {
          client_contact_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          office_id: string
          role: Database["public"]["Enums"]["invite_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash: string
        }
        Update: {
          client_contact_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          office_id?: string
          role?: Database["public"]["Enums"]["invite_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          id: string
          issued_at: string
          number: string
          office_id: string
          pdf_path: string | null
          period_from: string | null
          period_to: string | null
          plan_id: string | null
          provider_invoice_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          vat: number
        }
        Insert: {
          amount: number
          id?: string
          issued_at: string
          number: string
          office_id: string
          pdf_path?: string | null
          period_from?: string | null
          period_to?: string | null
          plan_id?: string | null
          provider_invoice_id?: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          vat: number
        }
        Update: {
          amount?: number
          id?: string
          issued_at?: string
          number?: string
          office_id?: string
          pdf_path?: string | null
          period_from?: string | null
          period_to?: string | null
          plan_id?: string | null
          provider_invoice_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          meeting_id: string
          office_id: string
          user_id: string
        }
        Insert: {
          meeting_id: string
          office_id: string
          user_id: string
        }
        Update: {
          meeting_id?: string
          office_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_contacts: {
        Row: {
          contact_id: string
          meeting_id: string
          office_id: string
        }
        Insert: {
          contact_id: string
          meeting_id: string
          office_id: string
        }
        Update: {
          contact_id?: string
          meeting_id?: string
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_contacts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_contacts_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_suppliers: {
        Row: {
          meeting_id: string
          office_id: string
          supplier_id: string
        }
        Insert: {
          meeting_id: string
          office_id: string
          supplier_id: string
        }
        Update: {
          meeting_id?: string
          office_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_suppliers_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_suppliers_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string[]
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["meeting_kind"]
          location: string | null
          office_id: string
          project_id: string | null
          shared_with_client: boolean
          starts_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          summary: string | null
          title: string
        }
        Insert: {
          agenda?: string[]
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          kind?: Database["public"]["Enums"]["meeting_kind"]
          location?: string | null
          office_id: string
          project_id?: string | null
          shared_with_client?: boolean
          starts_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          summary?: string | null
          title: string
        }
        Update: {
          agenda?: string[]
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["meeting_kind"]
          location?: string | null
          office_id?: string
          project_id?: string | null
          shared_with_client?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          office_id: string
          project_id: string
          side: Database["public"]["Enums"]["message_side"]
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          office_id: string
          project_id: string
          side: Database["public"]["Enums"]["message_side"]
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          office_id?: string
          project_id?: string
          side?: Database["public"]["Enums"]["message_side"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          done: boolean
          due_date: string
          id: string
          office_id: string
          project_id: string
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date: string
          id?: string
          office_id: string
          project_id: string
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string
          id?: string
          office_id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          kind: string
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          kind: string
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          office_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          office_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          office_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_members: {
        Row: {
          joined_at: string
          office_id: string
          role: Database["public"]["Enums"]["office_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          office_id: string
          role?: Database["public"]["Enums"]["office_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          joined_at?: string
          office_id?: string
          role?: Database["public"]["Enums"]["office_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_members_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_settings: {
        Row: {
          admin_can_manage_billing: boolean
          budget_warn_pct: number
          client_sees_budget_summary: boolean
          member_can_see_finance: boolean
          member_sees_all_projects: boolean
          office_id: string
          updated_at: string
        }
        Insert: {
          admin_can_manage_billing?: boolean
          budget_warn_pct?: number
          client_sees_budget_summary?: boolean
          member_can_see_finance?: boolean
          member_sees_all_projects?: boolean
          office_id: string
          updated_at?: string
        }
        Update: {
          admin_can_manage_billing?: boolean
          budget_warn_pct?: number
          client_sees_budget_summary?: boolean
          member_can_see_finance?: boolean
          member_sees_all_projects?: boolean
          office_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_settings_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: true
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancel_at: string | null
          current_period_end: string
          office_id: string
          pending_plan_id: string | null
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["sub_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancel_at?: string | null
          current_period_end?: string
          office_id: string
          pending_plan_id?: string | null
          plan_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancel_at?: string | null
          current_period_end?: string
          office_id?: string
          pending_plan_id?: string | null
          plan_id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_subscriptions_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: true
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          legal_name: string | null
          logo_text: string | null
          name: string
          phone: string | null
          specialties: string[]
          updated_at: string
          vat_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_text?: string | null
          name: string
          phone?: string | null
          specialties?: string[]
          updated_at?: string
          vat_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_text?: string | null
          name?: string
          phone?: string | null
          specialties?: string[]
          updated_at?: string
          vat_id?: string | null
        }
        Relationships: []
      }
      plan_annotations: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_simulated: boolean
          kind: Database["public"]["Enums"]["annotation_kind"]
          office_id: string
          plan_id: string
          plan_version_id: string
          severity: Database["public"]["Enums"]["severity"] | null
          status: Database["public"]["Enums"]["open_status"]
          task_id: string | null
          x: number
          x2: number | null
          y: number
          y2: number | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_simulated?: boolean
          kind: Database["public"]["Enums"]["annotation_kind"]
          office_id: string
          plan_id: string
          plan_version_id: string
          severity?: Database["public"]["Enums"]["severity"] | null
          status?: Database["public"]["Enums"]["open_status"]
          task_id?: string | null
          x: number
          x2?: number | null
          y: number
          y2?: number | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_simulated?: boolean
          kind?: Database["public"]["Enums"]["annotation_kind"]
          office_id?: string
          plan_id?: string
          plan_version_id?: string
          severity?: Database["public"]["Enums"]["severity"] | null
          status?: Database["public"]["Enums"]["open_status"]
          task_id?: string | null
          x?: number
          x2?: number | null
          y?: number
          y2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_annotations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_annotations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_annotations_plan_version_id_fkey"
            columns: ["plan_version_id"]
            isOneToOne: false
            referencedRelation: "plan_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_annotations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          enabled: boolean
          feature_key: string
          plan_id: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          plan_id: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          created_at: string
          file_path: string | null
          file_type: Database["public"]["Enums"]["file_kind"]
          id: string
          note: string | null
          office_id: string
          plan_id: string
          processing: Database["public"]["Enums"]["processing_status"]
          size_bytes: number | null
          status: Database["public"]["Enums"]["plan_status"]
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_type: Database["public"]["Enums"]["file_kind"]
          id?: string
          note?: string | null
          office_id: string
          plan_id: string
          processing?: Database["public"]["Enums"]["processing_status"]
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["plan_status"]
          uploaded_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_type?: Database["public"]["Enums"]["file_kind"]
          id?: string
          note?: string | null
          office_id?: string
          plan_id?: string
          processing?: Database["public"]["Enums"]["processing_status"]
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["plan_status"]
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          category: string | null
          created_at: string
          id: string
          number: string
          office_id: string
          project_id: string
          scale: string | null
          shared_with_client: boolean
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          number: string
          office_id: string
          project_id: string
          scale?: string | null
          shared_with_client?: boolean
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          number?: string
          office_id?: string
          project_id?: string
          scale?: string | null
          shared_with_client?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_changes: {
        Row: {
          changed_by: string | null
          created_at: string
          field: string
          id: number
          new_value: string | null
          note: string | null
          old_value: string | null
          plan_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field: string
          id?: never
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          plan_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field?: string
          id?: never
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_changes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_super_admin: boolean
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_super_admin?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_super_admin?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string
          office_id: string
          project_id: string
          role_in_project: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          office_id: string
          project_id: string
          role_in_project?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          office_id?: string
          project_id?: string
          role_in_project?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["project_status"] | null
          id: number
          note: string | null
          office_id: string
          project_id: string
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["project_status"] | null
          id?: never
          note?: string | null
          office_id: string
          project_id: string
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["project_status"] | null
          id?: never
          note?: string | null
          office_id?: string
          project_id?: string
          to_status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_status_history_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          area_sqm: number | null
          city: string | null
          client_id: string
          code: string
          created_at: string
          description: string | null
          due_date: string | null
          exec_budget: number
          fee_total: number
          fee_type: Database["public"]["Enums"]["fee_type"]
          id: string
          lead_id: string | null
          name: string
          office_id: string
          phase: number
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          status_note: string | null
          tags: string[]
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_sqm?: number | null
          city?: string | null
          client_id: string
          code: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          exec_budget?: number
          fee_total?: number
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          lead_id?: string | null
          name: string
          office_id: string
          phase?: number
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          status_note?: string | null
          tags?: string[]
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_sqm?: number | null
          city?: string | null
          client_id?: string
          code?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          exec_budget?: number
          fee_total?: number
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          lead_id?: string | null
          name?: string
          office_id?: string
          phase?: number
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          status_note?: string | null
          tags?: string[]
          type?: string | null
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
          {
            foreignKeyName: "projects_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          name: string
          office_id: string
          po_id: string
          qty: number
          received_qty: number
          spec_item_id: string | null
          unit: string
          unit_price: number
        }
        Insert: {
          id?: string
          name: string
          office_id: string
          po_id: string
          qty: number
          received_qty?: number
          spec_item_id?: string | null
          unit?: string
          unit_price: number
        }
        Update: {
          id?: string
          name?: string
          office_id?: string
          po_id?: string
          qty?: number
          received_qty?: number
          spec_item_id?: string | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_spec_item_id_fkey"
            columns: ["spec_item_id"]
            isOneToOne: false
            referencedRelation: "spec_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          number: string
          office_id: string
          paid_by: Database["public"]["Enums"]["payer"]
          project_id: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          number: string
          office_id: string
          paid_by?: Database["public"]["Enums"]["payer"]
          project_id: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          number?: string
          office_id?: string
          paid_by?: Database["public"]["Enums"]["payer"]
          project_id?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          action: string
          data_type: string
          id: string
          is_draft: boolean
          period: string
          updated_at: string
        }
        Insert: {
          action: string
          data_type: string
          id?: string
          is_draft?: boolean
          period: string
          updated_at?: string
        }
        Update: {
          action?: string
          data_type?: string
          id?: string
          is_draft?: boolean
          period?: string
          updated_at?: string
        }
        Relationships: []
      }
      spec_alternatives: {
        Row: {
          id: string
          name: string
          note: string | null
          office_id: string
          spec_item_id: string
          supplier_id: string | null
          unit_price: number
        }
        Insert: {
          id?: string
          name: string
          note?: string | null
          office_id: string
          spec_item_id: string
          supplier_id?: string | null
          unit_price: number
        }
        Update: {
          id?: string
          name?: string
          note?: string | null
          office_id?: string
          spec_item_id?: string
          supplier_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "spec_alternatives_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_alternatives_spec_item_id_fkey"
            columns: ["spec_item_id"]
            isOneToOne: false
            referencedRelation: "spec_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_alternatives_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_path: string | null
          lead_time_weeks: number | null
          name: string
          notes: string | null
          office_id: string
          project_id: string
          qty: number
          room: string
          shared_with_client: boolean
          sku: string | null
          status: Database["public"]["Enums"]["spec_status"]
          supplier_id: string | null
          swatch: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          lead_time_weeks?: number | null
          name: string
          notes?: string | null
          office_id: string
          project_id: string
          qty: number
          room: string
          shared_with_client?: boolean
          sku?: string | null
          status?: Database["public"]["Enums"]["spec_status"]
          supplier_id?: string | null
          swatch?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          lead_time_weeks?: number | null
          name?: string
          notes?: string | null
          office_id?: string
          project_id?: string
          qty?: number
          room?: string
          shared_with_client?: boolean
          sku?: string | null
          status?: Database["public"]["Enums"]["spec_status"]
          supplier_id?: string | null
          swatch?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_items_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "spec_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          office_id: string
          project_id: string
          snapshot: Json | null
          summary: string
          total: number
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          office_id: string
          project_id: string
          snapshot?: Json | null
          summary: string
          total?: number
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          office_id?: string
          project_id?: string
          snapshot?: Json | null
          summary?: string
          total?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "spec_versions_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "spec_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event: string
          id: number
          office_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: never
          office_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: never
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          currency: string
          id: string
          is_active: boolean
          max_active_projects: number | null
          max_users: number | null
          name: string
          price_confirmed: boolean
          price_monthly: number
          price_yearly_per_month: number | null
          storage_gb: number
          tagline: string | null
          trial_days: number
          updated_at: string
          vat_included: boolean
        }
        Insert: {
          currency?: string
          id: string
          is_active?: boolean
          max_active_projects?: number | null
          max_users?: number | null
          name: string
          price_confirmed?: boolean
          price_monthly: number
          price_yearly_per_month?: number | null
          storage_gb?: number
          tagline?: string | null
          trial_days?: number
          updated_at?: string
          vat_included?: boolean
        }
        Update: {
          currency?: string
          id?: string
          is_active?: boolean
          max_active_projects?: number | null
          max_users?: number | null
          name?: string
          price_confirmed?: boolean
          price_monthly?: number
          price_yearly_per_month?: number | null
          storage_gb?: number
          tagline?: string | null
          trial_days?: number
          updated_at?: string
          vat_included?: boolean
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          category: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["supplier_kind"]
          name: string
          notes: string | null
          office_id: string
          payment_terms: string | null
          phone: string | null
          rating: number | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["supplier_kind"]
          name: string
          notes?: string | null
          office_id: string
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
        }
        Update: {
          category?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["supplier_kind"]
          name?: string
          notes?: string | null
          office_id?: string
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          category: string | null
          created_at: string
          created_by: string
          id: string
          number: number
          office_id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          number?: never
          office_id: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          number?: never
          office_id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          created_at: string
          id: number
          level: Database["public"]["Enums"]["event_level"]
          message: string
          office_id: string | null
          service: string
        }
        Insert: {
          created_at?: string
          id?: never
          level?: Database["public"]["Enums"]["event_level"]
          message: string
          office_id?: string | null
          service: string
        }
        Update: {
          created_at?: string
          id?: never
          level?: Database["public"]["Enums"]["event_level"]
          message?: string
          office_id?: string | null
          service?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_events_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          body: string
          done: boolean
          id: string
          office_id: string
          position: number
          task_id: string
        }
        Insert: {
          body: string
          done?: boolean
          id?: string
          office_id: string
          position?: number
          task_id: string
        }
        Update: {
          body?: string
          done?: boolean
          id?: string
          office_id?: string
          position?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          office_id: string
          task_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          office_id: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          office_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          office_id: string
          priority: Database["public"]["Enums"]["priority"]
          project_id: string | null
          source_id: string | null
          source_kind: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          office_id: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          source_id?: string | null
          source_kind?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          office_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          source_id?: string | null
          source_kind?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_finance"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          office_id: string
          side: Database["public"]["Enums"]["ticket_side"]
          ticket_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          office_id: string
          side: Database["public"]["Enums"]["ticket_side"]
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          office_id?: string
          side?: Database["public"]["Enums"]["ticket_side"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      work_template_items: {
        Row: {
          id: string
          office_id: string
          offset_days: number
          position: number
          priority: Database["public"]["Enums"]["priority"]
          role_label: string | null
          template_id: string
          title: string
        }
        Insert: {
          id?: string
          office_id: string
          offset_days?: number
          position?: number
          priority?: Database["public"]["Enums"]["priority"]
          role_label?: string | null
          template_id: string
          title: string
        }
        Update: {
          id?: string
          office_id?: string
          offset_days?: number
          position?: number
          priority?: Database["public"]["Enums"]["priority"]
          role_label?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_template_items_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "work_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      work_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          office_id: string
          used_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          office_id: string
          used_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          office_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_templates_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_finance: {
        Row: {
          actual: number | null
          committed: number | null
          fee_paid: number | null
          fee_total: number | null
          name: string | null
          office_id: string | null
          paid: number | null
          planned: number | null
          project_id: string | null
        }
        Insert: {
          actual?: never
          committed?: never
          fee_paid?: never
          fee_total?: number | null
          name?: string | null
          office_id?: string | null
          paid?: never
          planned?: never
          project_id?: string | null
        }
        Update: {
          actual?: never
          committed?: never
          fee_paid?: never
          fee_total?: number | null
          name?: string | null
          office_id?: string | null
          paid?: never
          planned?: never
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      admin_set_subscription_status: {
        Args: {
          p_note: string
          p_office: string
          p_status: Database["public"]["Enums"]["sub_status"]
        }
        Returns: undefined
      }
      annotation_to_task: {
        Args: { p_annotation: string; p_assignee: string; p_due?: string }
        Returns: string
      }
      apply_template: {
        Args: { p_assignee: string; p_project: string; p_template: string }
        Returns: number
      }
      cancel_approval: { Args: { p_approval: string }; Returns: undefined }
      client_budget_summary: {
        Args: { p_project: string }
        Returns: {
          actual: number
          planned: number
        }[]
      }
      create_office: {
        Args: { p_city?: string; p_name: string; p_plan?: string }
        Returns: string
      }
      decide_approval: {
        Args: {
          p_approval: string
          p_comment?: string
          p_decision: Database["public"]["Enums"]["approval_status"]
        }
        Returns: undefined
      }
      invite_client_contact: { Args: { p_contact: string }; Returns: string }
      invite_member: {
        Args: {
          p_email: string
          p_full_name: string
          p_office: string
          p_role: Database["public"]["Enums"]["invite_role"]
        }
        Returns: string
      }
      request_approval: {
        Args: {
          p_amount?: number
          p_contact: string
          p_due?: string
          p_kind: Database["public"]["Enums"]["approval_kind"]
          p_project: string
          p_ref: string
          p_title: string
        }
        Returns: string
      }
      request_cancellation: {
        Args: { p_office: string; p_reason: string }
        Returns: undefined
      }
      request_plan_change: {
        Args: {
          p_cycle: Database["public"]["Enums"]["billing_cycle"]
          p_office: string
          p_plan: string
        }
        Returns: string
      }
      resume_subscription: { Args: { p_office: string }; Returns: undefined }
      set_project_status: {
        Args: {
          p_note?: string
          p_project: string
          p_status: Database["public"]["Enums"]["project_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      absence_kind: "vacation" | "sick" | "reserve_duty" | "training"
      annotation_kind: "comment" | "issue" | "measure"
      announcement_status: "draft" | "scheduled" | "published"
      approval_kind: "spec" | "plan" | "document" | "quote" | "budget_change"
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "change_requested"
        | "cancelled"
      billing_cycle: "monthly" | "yearly"
      client_type: "private" | "business"
      doc_access: "project_team" | "office" | "owners_admins"
      email_status: "queued" | "sent" | "failed" | "cancelled"
      event_level: "info" | "warn" | "error"
      expense_status: "paid" | "pending_payment"
      fee_status: "paid" | "requested" | "future" | "overdue"
      fee_type: "fixed" | "percent_of_execution" | "hourly"
      file_kind: "PDF" | "DWG" | "DXF" | "JPG" | "PNG" | "DOCX" | "XLSX" | "ZIP"
      invite_role: "admin" | "member" | "client"
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      invoice_status: "paid" | "open" | "failed" | "refunded"
      meeting_kind: "client" | "site" | "team" | "supplier"
      meeting_status: "scheduled" | "held" | "cancelled"
      member_status: "active" | "disabled"
      message_side: "studio" | "client"
      notification_kind:
        | "approval"
        | "task"
        | "meeting"
        | "budget"
        | "comment"
        | "system"
        | "plan"
      office_role: "owner" | "admin" | "member"
      open_status: "open" | "resolved"
      payer: "client_direct" | "via_office"
      plan_status:
        | "draft"
        | "internal_review"
        | "sent_to_client"
        | "approved"
        | "changes_required"
        | "superseded"
      po_status:
        | "draft"
        | "sent"
        | "confirmed"
        | "in_production"
        | "partially_delivered"
        | "delivered"
        | "cancelled"
      portal_status: "none" | "invited" | "active" | "suspended"
      priority: "low" | "medium" | "high" | "urgent"
      processing_status: "ready" | "processing" | "failed" | "unsupported"
      project_status:
        | "lead"
        | "initial_design"
        | "design_development"
        | "pending_approval"
        | "design_approved"
        | "execution"
        | "pre_handover"
        | "completed"
        | "on_hold"
      severity: "low" | "medium" | "high"
      spec_status:
        | "draft"
        | "pending_client"
        | "approved"
        | "change_requested"
        | "rejected"
      sub_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancel_at_period_end"
        | "cancelled"
        | "expired"
      supplier_kind: "supplier" | "contractor" | "tradesperson"
      task_status: "todo" | "in_progress" | "waiting" | "done"
      ticket_priority: "low" | "normal" | "high" | "critical"
      ticket_side: "user" | "support"
      ticket_status: "open" | "in_progress" | "waiting_user" | "closed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      absence_kind: ["vacation", "sick", "reserve_duty", "training"],
      annotation_kind: ["comment", "issue", "measure"],
      announcement_status: ["draft", "scheduled", "published"],
      approval_kind: ["spec", "plan", "document", "quote", "budget_change"],
      approval_status: [
        "pending",
        "approved",
        "rejected",
        "change_requested",
        "cancelled",
      ],
      billing_cycle: ["monthly", "yearly"],
      client_type: ["private", "business"],
      doc_access: ["project_team", "office", "owners_admins"],
      email_status: ["queued", "sent", "failed", "cancelled"],
      event_level: ["info", "warn", "error"],
      expense_status: ["paid", "pending_payment"],
      fee_status: ["paid", "requested", "future", "overdue"],
      fee_type: ["fixed", "percent_of_execution", "hourly"],
      file_kind: ["PDF", "DWG", "DXF", "JPG", "PNG", "DOCX", "XLSX", "ZIP"],
      invite_role: ["admin", "member", "client"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      invoice_status: ["paid", "open", "failed", "refunded"],
      meeting_kind: ["client", "site", "team", "supplier"],
      meeting_status: ["scheduled", "held", "cancelled"],
      member_status: ["active", "disabled"],
      message_side: ["studio", "client"],
      notification_kind: [
        "approval",
        "task",
        "meeting",
        "budget",
        "comment",
        "system",
        "plan",
      ],
      office_role: ["owner", "admin", "member"],
      open_status: ["open", "resolved"],
      payer: ["client_direct", "via_office"],
      plan_status: [
        "draft",
        "internal_review",
        "sent_to_client",
        "approved",
        "changes_required",
        "superseded",
      ],
      po_status: [
        "draft",
        "sent",
        "confirmed",
        "in_production",
        "partially_delivered",
        "delivered",
        "cancelled",
      ],
      portal_status: ["none", "invited", "active", "suspended"],
      priority: ["low", "medium", "high", "urgent"],
      processing_status: ["ready", "processing", "failed", "unsupported"],
      project_status: [
        "lead",
        "initial_design",
        "design_development",
        "pending_approval",
        "design_approved",
        "execution",
        "pre_handover",
        "completed",
        "on_hold",
      ],
      severity: ["low", "medium", "high"],
      spec_status: [
        "draft",
        "pending_client",
        "approved",
        "change_requested",
        "rejected",
      ],
      sub_status: [
        "trialing",
        "active",
        "past_due",
        "cancel_at_period_end",
        "cancelled",
        "expired",
      ],
      supplier_kind: ["supplier", "contractor", "tradesperson"],
      task_status: ["todo", "in_progress", "waiting", "done"],
      ticket_priority: ["low", "normal", "high", "critical"],
      ticket_side: ["user", "support"],
      ticket_status: ["open", "in_progress", "waiting_user", "closed"],
    },
  },
} as const
