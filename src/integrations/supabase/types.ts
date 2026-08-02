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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_outputs: {
        Row: {
          agent_run_id: string
          created_at: string
          id: string
          output_type: string
          payload: Json
        }
        Insert: {
          agent_run_id: string
          created_at?: string
          id?: string
          output_type: string
          payload: Json
        }
        Update: {
          agent_run_id?: string
          created_at?: string
          id?: string
          output_type?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_name: string
          error_message: string | null
          finished_at: string | null
          id: string
          model: string | null
          prompt_version: string | null
          proponent_id: string | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          agent_name: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          model?: string | null
          prompt_version?: string | null
          proponent_id?: string | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          agent_name?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          model?: string | null
          prompt_version?: string | null
          proponent_id?: string | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          reason: string | null
          row_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          row_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      chunk_embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          embedding: string
          id: string
          modelo: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          embedding: string
          id?: string
          modelo?: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          embedding?: string
          id?: string
          modelo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunk_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_entries: {
        Row: {
          cached_tokens: number
          cost: number
          created_at: string
          edital_id: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          proponent_id: string | null
          stage: string
        }
        Insert: {
          cached_tokens?: number
          cost?: number
          created_at?: string
          edital_id: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          proponent_id?: string | null
          stage: string
        }
        Update: {
          cached_tokens?: number
          cost?: number
          created_at?: string
          edital_id?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          proponent_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_entries_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_entries_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      criterion_scores: {
        Row: {
          applied_band: string | null
          approved_score: number | null
          criterion: string
          edital_id: string | null
          human_review_required: boolean
          id: string
          justification: string | null
          max_score: number
          proponent_id: string
          proposed_score: number | null
          updated_at: string
        }
        Insert: {
          applied_band?: string | null
          approved_score?: number | null
          criterion: string
          edital_id?: string | null
          human_review_required?: boolean
          id?: string
          justification?: string | null
          max_score: number
          proponent_id: string
          proposed_score?: number | null
          updated_at?: string
        }
        Update: {
          applied_band?: string | null
          approved_score?: number | null
          criterion?: string
          edital_id?: string | null
          human_review_required?: boolean
          id?: string
          justification?: string | null
          max_score?: number
          proponent_id?: string
          proposed_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "criterion_scores_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criterion_scores_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle1_awardees: {
        Row: {
          created_at: string
          id: string
          nome: string
          origem_edital: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          origem_edital?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          origem_edital?: string
          tipo?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          created_at: string
          file_id: string
          file_version_id: string
          id: string
          ordem: number
          pagina_final: number
          pagina_inicial: number
          proponent_id: string
          texto: string
          tokens_estimados: number
        }
        Insert: {
          created_at?: string
          file_id: string
          file_version_id: string
          id?: string
          ordem: number
          pagina_final: number
          pagina_inicial: number
          proponent_id: string
          texto: string
          tokens_estimados?: number
        }
        Update: {
          created_at?: string
          file_id?: string
          file_version_id?: string
          id?: string
          ordem?: number
          pagina_final?: number
          pagina_inicial?: number
          proponent_id?: string
          texto?: string
          tokens_estimados?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_file_version_id_fkey"
            columns: ["file_version_id"]
            isOneToOne: false
            referencedRelation: "file_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_classifications: {
        Row: {
          confianca: number | null
          created_at: string
          criado_por_agente: string
          file_id: string
          file_version_id: string | null
          id: string
          justificativa: string | null
          tipo_documental: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          confianca?: number | null
          created_at?: string
          criado_por_agente?: string
          file_id: string
          file_version_id?: string | null
          id?: string
          justificativa?: string | null
          tipo_documental: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          confianca?: number | null
          created_at?: string
          criado_por_agente?: string
          file_id?: string
          file_version_id?: string | null
          id?: string
          justificativa?: string | null
          tipo_documental?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "document_classifications_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_classifications_file_version_id_fkey"
            columns: ["file_version_id"]
            isOneToOne: false
            referencedRelation: "file_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          created_at: string
          file_id: string
          file_version_id: string
          id: string
          numero_pagina: number
          precisa_visao: boolean
          printable_ratio: number | null
          qualidade: Database["public"]["Enums"]["page_quality"]
          storage_path_imagem: string | null
          text_length: number
          texto: string
        }
        Insert: {
          created_at?: string
          file_id: string
          file_version_id: string
          id?: string
          numero_pagina: number
          precisa_visao?: boolean
          printable_ratio?: number | null
          qualidade?: Database["public"]["Enums"]["page_quality"]
          storage_path_imagem?: string | null
          text_length?: number
          texto?: string
        }
        Update: {
          created_at?: string
          file_id?: string
          file_version_id?: string
          id?: string
          numero_pagina?: number
          precisa_visao?: boolean
          printable_ratio?: number | null
          qualidade?: Database["public"]["Enums"]["page_quality"]
          storage_path_imagem?: string | null
          text_length?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_pages_file_version_id_fkey"
            columns: ["file_version_id"]
            isOneToOne: false
            referencedRelation: "file_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_connections: {
        Row: {
          connected_at: string
          connected_by: string | null
          google_email: string | null
          id: string
          refresh_token_encrypted: string
          revoked_at: string | null
          scope: string
        }
        Insert: {
          connected_at?: string
          connected_by?: string | null
          google_email?: string | null
          id?: string
          refresh_token_encrypted: string
          revoked_at?: string | null
          scope?: string
        }
        Update: {
          connected_at?: string
          connected_by?: string | null
          google_email?: string | null
          id?: string
          refresh_token_encrypted?: string
          revoked_at?: string | null
          scope?: string
        }
        Relationships: []
      }
      drive_sources: {
        Row: {
          connection_id: string
          created_at: string
          drive_folder_id: string
          edital_id: string | null
          folder_name: string | null
          id: string
          periodic_sync_enabled: boolean
        }
        Insert: {
          connection_id: string
          created_at?: string
          drive_folder_id: string
          edital_id?: string | null
          folder_name?: string | null
          id?: string
          periodic_sync_enabled?: boolean
        }
        Update: {
          connection_id?: string
          created_at?: string
          drive_folder_id?: string
          edital_id?: string | null
          folder_name?: string | null
          id?: string
          periodic_sync_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "drive_sources_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "drive_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_sources_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      editais: {
        Row: {
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          created_by: string | null
          cycle: string | null
          drive_source_id: string | null
          id: string
          max_individual_score: number
          name: string
          normative_version_id: string | null
          number: string
          organ: string | null
          reopened_reason: string | null
          status: Database["public"]["Enums"]["edital_status"]
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          cycle?: string | null
          drive_source_id?: string | null
          id?: string
          max_individual_score?: number
          name: string
          normative_version_id?: string | null
          number: string
          organ?: string | null
          reopened_reason?: string | null
          status?: Database["public"]["Enums"]["edital_status"]
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          cycle?: string | null
          drive_source_id?: string | null
          id?: string
          max_individual_score?: number
          name?: string
          normative_version_id?: string | null
          number?: string
          organ?: string | null
          reopened_reason?: string | null
          status?: Database["public"]["Enums"]["edital_status"]
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "editais_drive_source_id_fkey"
            columns: ["drive_source_id"]
            isOneToOne: false
            referencedRelation: "drive_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_categories: {
        Row: {
          created_at: string
          edital_id: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          edital_id: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          edital_id?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "edital_categories_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_costs: {
        Row: {
          alert_50_sent: boolean
          alert_75_sent: boolean
          alert_90_sent: boolean
          block_on_exceed: boolean
          budget_total: number
          edital_id: string
          id: string
          limit_per_application: number
          updated_at: string
        }
        Insert: {
          alert_50_sent?: boolean
          alert_75_sent?: boolean
          alert_90_sent?: boolean
          block_on_exceed?: boolean
          budget_total?: number
          edital_id: string
          id?: string
          limit_per_application?: number
          updated_at?: string
        }
        Update: {
          alert_50_sent?: boolean
          alert_75_sent?: boolean
          alert_90_sent?: boolean
          block_on_exceed?: boolean
          budget_total?: number
          edital_id?: string
          id?: string
          limit_per_application?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_costs_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: true
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_criteria: {
        Row: {
          bonus: boolean
          code: string
          created_at: string
          description: string
          edital_id: string
          eliminatory: boolean
          evaluation_mode: Database["public"]["Enums"]["criterion_evaluation_mode"]
          id: string
          maximum_score: number
          order_index: number
          rubric: Json
          title: string
          updated_at: string
        }
        Insert: {
          bonus?: boolean
          code: string
          created_at?: string
          description?: string
          edital_id: string
          eliminatory?: boolean
          evaluation_mode?: Database["public"]["Enums"]["criterion_evaluation_mode"]
          id?: string
          maximum_score: number
          order_index?: number
          rubric?: Json
          title: string
          updated_at?: string
        }
        Update: {
          bonus?: boolean
          code?: string
          created_at?: string
          description?: string
          edital_id?: string
          eliminatory?: boolean
          evaluation_mode?: Database["public"]["Enums"]["criterion_evaluation_mode"]
          id?: string
          maximum_score?: number
          order_index?: number
          rubric?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_criteria_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_segments: {
        Row: {
          category_id: string | null
          created_at: string
          edital_id: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          edital_id: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          edital_id?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "edital_segments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "edital_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edital_segments_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_snapshots: {
        Row: {
          approved_at: string
          approved_by: string | null
          edital_id: string
          evaluation_id: string | null
          id: string
          normative_version: string | null
          payload: Json
          proponent_id: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          edital_id: string
          evaluation_id?: string | null
          id?: string
          normative_version?: string | null
          payload: Json
          proponent_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          edital_id?: string
          evaluation_id?: string | null
          id?: string
          normative_version?: string | null
          payload?: Json
          proponent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_snapshots_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_snapshots_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          bonus_subtotal: number
          edital_id: string | null
          export_ready: boolean
          id: string
          individual_total: number
          mandatory_subtotal: number
          proponent_id: string
          status: string
          updated_at: string
          zero_in_mandatory_criterion: boolean
        }
        Insert: {
          bonus_subtotal?: number
          edital_id?: string | null
          export_ready?: boolean
          id?: string
          individual_total?: number
          mandatory_subtotal?: number
          proponent_id: string
          status?: string
          updated_at?: string
          zero_in_mandatory_criterion?: boolean
        }
        Update: {
          bonus_subtotal?: number
          edital_id?: string | null
          export_ready?: boolean
          id?: string
          individual_total?: number
          mandatory_subtotal?: number
          proponent_id?: string
          status?: string
          updated_at?: string
          zero_in_mandatory_criterion?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: true
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          ano_da_acao: number | null
          bairro: string | null
          created_at: string
          criado_por_agente: string
          criterion: string
          data_da_acao: string | null
          descricao_factual: string
          duplicata_de: string | null
          edital_id: string | null
          file_id: string | null
          file_version_id: string | null
          id: string
          local: string | null
          observacoes: string | null
          pagina_final: number | null
          pagina_inicial: number | null
          parceiros: string | null
          proponent_id: string
          publico: string | null
          regiao_administrativa: string | null
          resultado_comprovado: string | null
          robustez: Database["public"]["Enums"]["evidence_robustez"]
          tipo_documental: Database["public"]["Enums"]["document_type"] | null
          trecho_relevante: string | null
          validado_pelo_humano: boolean
        }
        Insert: {
          ano_da_acao?: number | null
          bairro?: string | null
          created_at?: string
          criado_por_agente: string
          criterion: string
          data_da_acao?: string | null
          descricao_factual: string
          duplicata_de?: string | null
          edital_id?: string | null
          file_id?: string | null
          file_version_id?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          pagina_final?: number | null
          pagina_inicial?: number | null
          parceiros?: string | null
          proponent_id: string
          publico?: string | null
          regiao_administrativa?: string | null
          resultado_comprovado?: string | null
          robustez: Database["public"]["Enums"]["evidence_robustez"]
          tipo_documental?: Database["public"]["Enums"]["document_type"] | null
          trecho_relevante?: string | null
          validado_pelo_humano?: boolean
        }
        Update: {
          ano_da_acao?: number | null
          bairro?: string | null
          created_at?: string
          criado_por_agente?: string
          criterion?: string
          data_da_acao?: string | null
          descricao_factual?: string
          duplicata_de?: string | null
          edital_id?: string | null
          file_id?: string | null
          file_version_id?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          pagina_final?: number | null
          pagina_inicial?: number | null
          parceiros?: string | null
          proponent_id?: string
          publico?: string | null
          regiao_administrativa?: string | null
          resultado_comprovado?: string | null
          robustez?: Database["public"]["Enums"]["evidence_robustez"]
          tipo_documental?: Database["public"]["Enums"]["document_type"] | null
          trecho_relevante?: string | null
          validado_pelo_humano?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evidence_duplicata_de_fkey"
            columns: ["duplicata_de"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_file_version_id_fkey"
            columns: ["file_version_id"]
            isOneToOne: false
            referencedRelation: "file_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string
          file_id: string
          id: string
          minimizado: boolean
          sha256: string | null
          storage_path: string
          tamanho_kb: number | null
          versao: number
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          minimizado?: boolean
          sha256?: string | null
          storage_path: string
          tamanho_kb?: number | null
          versao?: number
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          minimizado?: boolean
          sha256?: string | null
          storage_path?: string
          tamanho_kb?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          caminho_relativo: string | null
          created_at: string
          created_by: string | null
          drive_checksum: string | null
          drive_file_id: string | null
          drive_modified_time: string | null
          drive_seen_at: string | null
          edital_id: string | null
          id: string
          mime_type: string | null
          nome: string
          proponent_id: string
          storage_path: string
          tipo_documental: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          caminho_relativo?: string | null
          created_at?: string
          created_by?: string | null
          drive_checksum?: string | null
          drive_file_id?: string | null
          drive_modified_time?: string | null
          drive_seen_at?: string | null
          edital_id?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          proponent_id: string
          storage_path: string
          tipo_documental?: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          caminho_relativo?: string | null
          created_at?: string
          created_by?: string | null
          drive_checksum?: string | null
          drive_file_id?: string | null
          drive_modified_time?: string | null
          drive_seen_at?: string | null
          edital_id?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          proponent_id?: string
          storage_path?: string
          tipo_documental?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "files_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string
          criado_por_agente: string | null
          descricao: string
          edital_id: string | null
          file_id: string | null
          id: string
          pagina: number | null
          proponent_id: string
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          criado_por_agente?: string | null
          descricao: string
          edital_id?: string | null
          file_id?: string | null
          id?: string
          pagina?: number | null
          proponent_id: string
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          criado_por_agente?: string | null
          descricao?: string
          edital_id?: string | null
          file_id?: string | null
          id?: string
          pagina?: number | null
          proponent_id?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          attempts: number
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_id: string
          order_index: number
          preserved: boolean
          retryable: boolean
          stage: string
          started_at: string | null
          state: Database["public"]["Enums"]["job_stage_state"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          order_index?: number
          preserved?: boolean
          retryable?: boolean
          stage: string
          started_at?: string | null
          state?: Database["public"]["Enums"]["job_stage_state"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          order_index?: number
          preserved?: boolean
          retryable?: boolean
          stage?: string
          started_at?: string | null
          state?: Database["public"]["Enums"]["job_stage_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pareceres: {
        Row: {
          aprovado_pela_avaliadora: boolean
          created_at: string
          edital_id: string | null
          gerado_por_agente: string
          id: string
          proponent_id: string
          texto: string
          versao: number
        }
        Insert: {
          aprovado_pela_avaliadora?: boolean
          created_at?: string
          edital_id?: string | null
          gerado_por_agente?: string
          id?: string
          proponent_id: string
          texto: string
          versao?: number
        }
        Update: {
          aprovado_pela_avaliadora?: boolean
          created_at?: string
          edital_id?: string | null
          gerado_por_agente?: string
          id?: string
          proponent_id?: string
          texto?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "pareceres_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pareceres_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          created_at: string
          edital_id: string
          error_code: string | null
          error_message: string | null
          external_job_id: string | null
          finished_at: string | null
          id: string
          proponent_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_stage_state"]
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          edital_id: string
          error_code?: string | null
          error_message?: string | null
          external_job_id?: string | null
          finished_at?: string | null
          id?: string
          proponent_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_stage_state"]
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          edital_id?: string
          error_code?: string | null
          error_message?: string | null
          external_job_id?: string | null
          finished_at?: string | null
          id?: string
          proponent_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_stage_state"]
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      proponent_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          origem: string
          proponent_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          origem: string
          proponent_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          origem?: string
          proponent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proponent_aliases_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      proponents: {
        Row: {
          atualizado_em: string
          categoria: string | null
          ciclo1_alerta: string | null
          created_at: string
          created_by: string | null
          edital_id: string | null
          id: string
          nome_canonico: string
          status: Database["public"]["Enums"]["proponent_status"]
          tipo_proponente: Database["public"]["Enums"]["tipo_proponente"] | null
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          ciclo1_alerta?: string | null
          created_at?: string
          created_by?: string | null
          edital_id?: string | null
          id?: string
          nome_canonico: string
          status?: Database["public"]["Enums"]["proponent_status"]
          tipo_proponente?:
            | Database["public"]["Enums"]["tipo_proponente"]
            | null
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          ciclo1_alerta?: string | null
          created_at?: string
          created_by?: string | null
          edital_id?: string | null
          id?: string
          nome_canonico?: string
          status?: Database["public"]["Enums"]["proponent_status"]
          tipo_proponente?:
            | Database["public"]["Enums"]["tipo_proponente"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "proponents_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          hash: string
          id: string
          reference_document_id: string
          status: Database["public"]["Enums"]["normative_status"]
          storage_path: string | null
          versao: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          hash: string
          id?: string
          reference_document_id: string
          status?: Database["public"]["Enums"]["normative_status"]
          storage_path?: string | null
          versao: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          hash?: string
          id?: string
          reference_document_id?: string
          status?: Database["public"]["Enums"]["normative_status"]
          storage_path?: string | null
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_document_versions_reference_document_id_fkey"
            columns: ["reference_document_id"]
            isOneToOne: false
            referencedRelation: "reference_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_documents: {
        Row: {
          created_at: string
          id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      source_folders: {
        Row: {
          caminho: string | null
          created_at: string
          drive_folder_id: string
          drive_source_id: string
          id: string
          nome_pasta: string
          proponent_id: string | null
        }
        Insert: {
          caminho?: string | null
          created_at?: string
          drive_folder_id: string
          drive_source_id: string
          id?: string
          nome_pasta: string
          proponent_id?: string | null
        }
        Update: {
          caminho?: string | null
          created_at?: string
          drive_folder_id?: string
          drive_source_id?: string
          id?: string
          nome_pasta?: string
          proponent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_folders_drive_source_id_fkey"
            columns: ["drive_source_id"]
            isOneToOne: false
            referencedRelation: "drive_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_folders_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_changes: {
        Row: {
          acao_necessaria: string | null
          antes: string | null
          change_type: string
          depois: string | null
          detectado_em: string
          file_id: string | null
          id: string
          proponent_id: string | null
          sync_run_id: string
        }
        Insert: {
          acao_necessaria?: string | null
          antes?: string | null
          change_type: string
          depois?: string | null
          detectado_em?: string
          file_id?: string | null
          id?: string
          proponent_id?: string | null
          sync_run_id: string
        }
        Update: {
          acao_necessaria?: string | null
          antes?: string | null
          change_type?: string
          depois?: string | null
          detectado_em?: string
          file_id?: string | null
          id?: string
          proponent_id?: string | null
          sync_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_changes_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_changes_proponent_id_fkey"
            columns: ["proponent_id"]
            isOneToOne: false
            referencedRelation: "proponents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_changes_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          drive_source_id: string
          edital_id: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          kind: string
          started_at: string
          stats: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          drive_source_id: string
          edital_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          started_at?: string
          stats?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          drive_source_id?: string
          edital_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          stats?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_drive_source_id_fkey"
            columns: ["drive_source_id"]
            isOneToOne: false
            referencedRelation: "drive_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_runs_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      match_document_chunks: {
        Args: {
          p_match_count?: number
          p_proponent_id: string
          p_query_embedding: string
        }
        Returns: {
          file_id: string
          id: string
          pagina_final: number
          pagina_inicial: number
          similarity: number
          texto: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "administradora"
        | "agente_merito"
        | "agente_administrativo"
        | "auditor"
      criterion_evaluation_mode: "ai" | "deterministic" | "hybrid" | "human"
      document_type:
        | "formulario"
        | "identidade"
        | "portfolio"
        | "comprobatorio"
        | "grp"
        | "zimbra"
        | "outro"
      edital_status:
        | "rascunho"
        | "configuracao"
        | "ativo"
        | "pausado"
        | "encerrado"
        | "arquivado"
      evidence_robustez: "alta" | "media" | "declaratoria"
      job_stage_state:
        | "aguardando"
        | "na_fila"
        | "processando"
        | "concluido"
        | "falhou"
        | "revisao"
        | "cancelado"
      normative_status: "vigente" | "arquivado"
      page_quality: "boa" | "baixa" | "imagem_pura"
      proponent_status:
        | "nao_importado"
        | "importado"
        | "inventariado"
        | "em_analise"
        | "avaliacao_proposta"
        | "auditoria_concluida"
        | "pendencia_humana"
        | "aprovado_pela_avaliadora"
        | "bloqueado"
        | "reaberto"
        | "finalizado"
        | "pendencia_administrativa"
      tipo_proponente: "pessoa_fisica" | "pessoa_juridica_ou_coletivo"
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
      app_role: [
        "administradora",
        "agente_merito",
        "agente_administrativo",
        "auditor",
      ],
      criterion_evaluation_mode: ["ai", "deterministic", "hybrid", "human"],
      document_type: [
        "formulario",
        "identidade",
        "portfolio",
        "comprobatorio",
        "grp",
        "zimbra",
        "outro",
      ],
      edital_status: [
        "rascunho",
        "configuracao",
        "ativo",
        "pausado",
        "encerrado",
        "arquivado",
      ],
      evidence_robustez: ["alta", "media", "declaratoria"],
      job_stage_state: [
        "aguardando",
        "na_fila",
        "processando",
        "concluido",
        "falhou",
        "revisao",
        "cancelado",
      ],
      normative_status: ["vigente", "arquivado"],
      page_quality: ["boa", "baixa", "imagem_pura"],
      proponent_status: [
        "nao_importado",
        "importado",
        "inventariado",
        "em_analise",
        "avaliacao_proposta",
        "auditoria_concluida",
        "pendencia_humana",
        "aprovado_pela_avaliadora",
        "bloqueado",
        "reaberto",
        "finalizado",
        "pendencia_administrativa",
      ],
      tipo_proponente: ["pessoa_fisica", "pessoa_juridica_ou_coletivo"],
    },
  },
} as const
